/* ===================== TOOL: Split PDF ===================== */
function mountSplitPdf(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label for="md">2. How to split it</label>
    <select id="md"><option value="every">Every N pages</option><option value="single">Each page as its own file</option><option value="ranges">Custom page ranges</option></select>
    <div id="m_every" style="margin-top:12px"><label for="en" style="font-weight:600">Pages in each file</label><input id="en" type="number" min="1" step="1" value="10"></div>
    <div id="m_ranges" hidden style="margin-top:12px"><label for="rg" style="font-weight:600">Ranges (each one becomes a file)</label><input id="rg" type="text" placeholder="1-3, 4-7, 8-10">
      <p class="hint">Example: 1-3, 4-7, 8-10 makes three files.</p></div>
    <p id="plan" class="hint" style="font-weight:600"></p>
    <div class="row" style="margin-top:12px"><div><button id="go">Split PDF</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <div class="row" style="margin-bottom:8px"><div><button id="zip" class="alt">Download all as ZIP</button></div></div><div id="list"></div></div>`;
  let src = null, n = 0, name = "document", results = [], urls = [];
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  function groups(){
    const m = $("md").value;
    if(m === "single") return {groups:Array.from({length:n}, (_, i) => [i])};
    if(m === "every"){ const k = Math.max(1, Math.floor(+$("en").value || 0)); const g = []; for(let i = 0; i < n; i += k) g.push(Array.from({length:Math.min(k, n - i)}, (_, j) => i + j)); return {groups:g}; }
    return PL.ranges($("rg").value, n);
  }
  function plan(){
    $("m_every").hidden = $("md").value !== "every"; $("m_ranges").hidden = $("md").value !== "ranges";
    if(!src) return; const r = groups(); $("plan").className = "hint" + (r.err ? "" : ""); $("plan").textContent = r.err ? (($("md").value === "ranges" && !$("rg").value.trim()) ? "" : r.err) : r.groups.length + " file(s) will be made.";
  }
  ["md", "en", "rg"].forEach(k => $(k).oninput = plan); $("md").onchange = plan;
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; src = null; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      src = await PDFLib.PDFDocument.load(await file.arrayBuffer(), {ignoreEncryption:true});
      if(src.isEncrypted){ src = null; throw new Error("enc"); }
      n = src.getPageCount(); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; plan();
    }catch(err){ src = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    const r = groups(); if(r.err) return fail(r.err);
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; urls.forEach(u => URL.revokeObjectURL(u)); urls = []; results = []; $("list").innerHTML = ""; $("out").hidden = false;
    try{
      const pad = String(r.groups.length).length;
      for(let k = 0; k < r.groups.length; k++){
        const g = r.groups[k]; $("status").textContent = "Making file " + (k + 1) + " of " + r.groups.length + "..."; $("bar").value = k / r.groups.length; if(k % 5 === 0) await new Promise(x => setTimeout(x, 0));
        const out = await PDFLib.PDFDocument.create(); (await out.copyPages(src, g)).forEach(p => out.addPage(p));
        const blob = new Blob([await out.save()], {type:"application/pdf"}), u = URL.createObjectURL(blob); urls.push(u);
        const lbl = g.length === 1 ? "page " + (g[0] + 1) : "pages " + (g[0] + 1) + "-" + (g[g.length - 1] + 1), fn = name + "_part-" + String(k + 1).padStart(pad, "0") + ".pdf";
        results.push({name:fn, blob});
        const d = document.createElement("div"); d.className = "part"; d.innerHTML = '<b></b><a style="color:var(--acc);font-weight:700" download></a>';
        d.querySelector("b").textContent = "File " + (k + 1) + ": " + lbl + " (" + PL.sz(blob.size) + ")"; const a = d.querySelector("a"); a.href = u; a.download = fn; a.textContent = "Download " + fn; $("list").appendChild(d);
      }
      $("status").textContent = "Done. " + r.groups.length + " file(s) ready."; $("zip").hidden = results.length < 2;
    }catch(err){ fail("Could not split this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), name + "_split.zip"); $("zip").disabled = false; };
  return () => urls.forEach(u => URL.revokeObjectURL(u));
}
mountSplitPdf(document.getElementById("tool"));
