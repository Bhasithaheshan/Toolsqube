/* ===================== TOOL: PDF to JPG ===================== */
function mountPdfToJpg(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Settings</label>
    <div class="row"><div><label for="fm" style="font-weight:600">Image format</label><select id="fm"><option value="jpg">JPG (smaller)</option><option value="png">PNG (sharper text)</option></select></div>
      <div><label for="rs" style="font-weight:600">Quality</label><select id="rs"><option value="1">Normal</option><option value="2" selected>Good</option><option value="3">High (large files)</option></select></div>
      <div><label for="rg" style="font-weight:600">Pages (empty = all)</label><input id="rg" type="text" placeholder="e.g. 1-3, 8"></div></div>
    <div class="row" style="margin-top:14px"><div><button id="go">Convert to images</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <div class="row" style="margin-bottom:12px"><div><button id="zip" class="alt">Download all as ZIP</button></div></div>
    <div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px"></div></div>`;
  let doc = null, name = "document", n = 0, results = [], urls = [];
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(doc){ doc.destroy(); doc = null; }
    if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ doc = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; n = doc.numPages; $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err && err.name === "PasswordException" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!doc) return; let pages = [];
    if($("rg").value.trim()){ const r = PL.ranges($("rg").value, n); if(r.err) return fail(r.err); pages = [...new Set(r.groups.flat())].sort((a, b) => a - b); } else pages = Array.from({length:n}, (_, i) => i);
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; urls.forEach(u => URL.revokeObjectURL(u)); urls = []; results = []; $("grid").innerHTML = ""; $("out").hidden = false;
    const png = $("fm").value === "png", ext = png ? "png" : "jpg", sc = +$("rs").value;
    try{
      for(let k = 0; k < pages.length; k++){
        $("status").textContent = "Converting page " + (pages[k] + 1) + " (" + (k + 1) + " of " + pages.length + ")..."; $("bar").value = k / pages.length;
        const page = await doc.getPage(pages[k] + 1); let s = sc * 1.3333; const base = page.getViewport({scale:1}); if(base.width * base.height * s * s > 3e7) s = Math.sqrt(3e7 / (base.width * base.height));
        const vp = page.getViewport({scale:s}), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); await page.render({canvasContext:g, viewport:vp}).promise;
        const blob = await new Promise(r => c.toBlob(r, png ? "image/png" : "image/jpeg", .92)), u = URL.createObjectURL(blob); urls.push(u);
        const fn = name + "_page-" + String(pages[k] + 1).padStart(String(n).length, "0") + "." + ext; results.push({name:fn, blob});
        const d = document.createElement("div"); d.innerHTML = '<img alt="" style="width:100%;border:1px solid var(--line);border-radius:8px;background:#fff;display:block"><a style="font-weight:700;color:var(--acc);font-size:.9rem" download></a><br><small style="color:var(--mute)"></small>';
        d.querySelector("img").src = u; const a = d.querySelector("a"); a.href = u; a.download = fn; a.textContent = "Page " + (pages[k] + 1); d.querySelector("small").textContent = PL.sz(blob.size); $("grid").appendChild(d);
      }
      $("status").textContent = "Done. " + pages.length + " image(s) ready."; $("zip").hidden = results.length < 2;
    }catch(err){ fail("Could not convert this PDF. Try fewer pages or a lower quality."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), name + "_images.zip"); $("zip").disabled = false; };
  return () => { urls.forEach(u => URL.revokeObjectURL(u)); if(doc) doc.destroy(); };
}
mountPdfToJpg(document.getElementById("tool"));
