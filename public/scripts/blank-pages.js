/* ===================== TOOL: Add or Remove Blank Pages ===================== */
/* fraction of dark pixels in the inside of a page image (the outer 4% is ignored so scan shadows do not count) */
function inkRatio(d, w, h){
  const mx = Math.floor(w * 0.04), my = Math.floor(h * 0.04); let ink = 0, tot = 0;
  for(let y = my; y < h - my; y++) for(let x = mx; x < w - mx; x++){ const i = (y * w + x) * 4; tot++; if(d[i + 3] > 20 && (d[i] + d[i + 1] + d[i + 2]) / 3 < 215) ink++; }
  return tot ? ink / tot : 0;
}
/* END CORE */

function mountBlankPages(root){
  let tab = "remove"; try{ tab = (JSON.parse(root.dataset.preset || "null") || {}).mode || "remove"; }catch(e){}
  root.innerHTML = `<style>
  .bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:12px}
  .bp-t{position:relative;border:2px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;cursor:pointer}
  .bp-t canvas{display:block;width:100%;height:auto}.bp-t.rm{border-color:#d64545;box-shadow:0 0 0 2px rgba(214,69,69,.35)}.bp-t.rm canvas{opacity:.35}
  .bp-t .num{position:absolute;left:5px;bottom:5px;background:rgba(12,26,41,.82);color:#fff;font-size:.75rem;padding:0 7px;border-radius:999px}
  .bp-t .tag{position:absolute;right:5px;top:5px;background:#d64545;color:#fff;font-size:.7rem;font-weight:700;padding:0 7px;border-radius:999px;display:none}.bp-t.rm .tag{display:block}
  .sg-tabs{display:flex;gap:6px;margin-bottom:14px}.sg-tabs button{padding:8px 16px}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden>
    <div class="sg-tabs"><button id="t1" type="button">Remove blank pages</button><button id="t2" type="button" class="alt">Add blank pages</button></div>
    <div id="m1"><label for="th" style="display:flex;justify-content:space-between">How empty must a page be? <span id="thv"></span></label>
      <input id="th" type="range" min="0.1" max="5" step="0.1" value="0.5" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">Pages with less ink than this are treated as blank. Raise it if scanned blank pages are not found. Click a page to keep or remove it.</p>
      <progress id="bar" hidden max="1" value="0"></progress><p id="cnt" style="font-weight:700;margin:10px 0 0"></p><div id="grid" class="bp-grid"></div>
      <div class="row" style="margin-top:14px"><div><button id="go1">Download without the red pages</button></div></div></div>
    <div id="m2" hidden><div class="row"><div><label for="nb" style="font-weight:600">How many blank pages</label><input id="nb" type="number" min="1" max="50" step="1" value="1"></div>
        <div><label for="wh" style="font-weight:600">Where</label><select id="wh"><option value="start">Before the first page</option><option value="end">After the last page</option><option value="after">After page number...</option><option value="every">After every page</option><option value="before">Before every page</option></select></div>
        <div id="pw" hidden><label for="pn" style="font-weight:600">Page number</label><input id="pn" type="number" min="1" step="1" value="1"></div></div>
      <p class="hint">Blank pages are the same size as the page next to them.</p>
      <div class="row" style="margin-top:14px"><div><button id="go2">Add blank pages</button></div></div></div>
    <div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let bytes = null, pd = null, n = 0, name = "document", ratios = [], thumbs = [], rm = new Set(), tok = 0;
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const setTab = t => { tab = t; $("m1").hidden = t !== "remove"; $("m2").hidden = t !== "add"; $("t1").className = t === "remove" ? "" : "alt"; $("t2").className = t === "add" ? "" : "alt"; };
  $("t1").onclick = () => setTab("remove"); $("t2").onclick = () => setTab("add"); setTab(tab);
  $("wh").onchange = () => { $("pw").hidden = $("wh").value !== "after"; };
  function paint(){
    const t = +$("th").value; $("thv").textContent = t + "%"; $("cnt").textContent = rm.size + " of " + n + " pages will be removed";
    document.querySelectorAll(".bp-t").forEach(el => el.classList.toggle("rm", rm.has(+el.dataset.i)));
  }
  function auto(){ const t = +$("th").value / 100; rm = new Set(); ratios.forEach((r, i) => { if(r < t) rm.add(i); }); paint(); }
  $("th").oninput = auto;
  async function analyse(){
    const my = ++tok; $("grid").innerHTML = ""; ratios = []; thumbs = []; $("bar").hidden = false; $("cnt").textContent = "Looking at your pages...";
    for(let i = 0; i < n; i++){
      if(my !== tok) return; const c = document.createElement("canvas"); await PL.render(pd, i + 1, c, 150); const g = c.getContext("2d", {willReadFrequently:true}); ratios.push(inkRatio(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)); $("bar").value = (i + 1) / n;
      const d = document.createElement("div"); d.className = "bp-t"; d.dataset.i = i; d.appendChild(c); d.insertAdjacentHTML("beforeend", '<span class="num">' + (i + 1) + '</span><span class="tag">REMOVE</span>'); d.onclick = () => { rm.has(i) ? rm.delete(i) : rm.add(i); paint(); }; $("grid").appendChild(d);
    }
    $("bar").hidden = true; auto();
  }
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; tok++; if(pd){ pd.destroy(); pd = null; } if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); pd = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;
      $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; analyse(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go1").onclick = async () => {
    const keep = Array.from({length:n}, (_, i) => i).filter(i => !rm.has(i)); if(!keep.length) return fail("That would remove every page."); if(keep.length === n) return fail("No pages are selected for removal.");
    try{ const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), out = await PDFLib.PDFDocument.create(); (await out.copyPages(src, keep)).forEach(p => out.addPage(p)); await PL.finish(await out.save(), name + "_no-blanks.pdf", rm.size + " page(s) removed. " + keep.length + " left.", 1); $("status").textContent = ""; }
    catch(err){ fail("Could not build the PDF."); }
  };
  $("go2").onclick = async () => {
    const k = Math.max(1, Math.min(50, Math.floor(+$("nb").value) || 1)), w = $("wh").value, after = Math.floor(+$("pn").value) || 1; if(w === "after" && (after < 1 || after > n)) return fail("Page number must be between 1 and " + n + ".");
    try{
      const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), out = await PDFLib.PDFDocument.create(), pages = await out.copyPages(src, src.getPageIndices()), size = i => { const s = src.getPage(Math.max(0, Math.min(n - 1, i))).getSize(); return [s.width, s.height]; };
      const blanks = ref => { for(let j = 0; j < k; j++) out.addPage(size(ref)); }; let added = 0;
      if(w === "start"){ blanks(0); added += k; }
      pages.forEach((p, i) => { if(w === "before"){ blanks(i); added += k; } out.addPage(p); if(w === "every" || (w === "after" && i + 1 === after)){ blanks(i); added += k; } });
      if(w === "end"){ blanks(n - 1); added += k; }
      await PL.finish(await out.save(), name + "_with-blanks.pdf", added + " blank page(s) added. " + out.getPageCount() + " pages in total.", 1); $("status").textContent = "";
    }catch(err){ fail("Could not build the PDF."); }
  };
  return () => { tok++; if(pd) pd.destroy(); PL.cleanup(); };
}
mountBlankPages(document.getElementById("tool"));
