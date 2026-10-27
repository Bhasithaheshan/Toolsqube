/* ===================== TOOL: Resize PDF Pages ===================== */
function mountResizePdf(root){
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. New page size</label>
      <div class="row"><div><label for="sz" style="font-weight:600">Size</label><select id="sz"><option value="a4">A4</option><option value="a3">A3</option><option value="a5">A5</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom (mm)</option></select></div>
        <div><label for="or" style="font-weight:600">Orientation</label><select id="or"><option value="auto">Match each page</option><option value="p">Portrait</option><option value="l">Landscape</option></select></div></div>
      <div class="row" id="cu" hidden style="margin-top:12px"><div><label for="cw" style="font-weight:600">Width (mm)</label><input id="cw" type="number" min="20" step="1" value="210"></div><div><label for="ch" style="font-weight:600">Height (mm)</label><input id="ch" type="number" min="20" step="1" value="297"></div></div>
      <div class="row" style="margin-top:12px"><div><label for="fm" style="font-weight:600">How to fit the content</label><select id="fm"><option value="fit">Fit inside the page</option><option value="fill">Fill the page (edges can be cut off)</option></select></div>
        <div><label for="mg" style="font-weight:600">Margin (mm)</label><input id="mg" type="number" min="0" max="50" step="1" value="0"></div></div>
      <p class="hint">The content keeps its shape. It is made bigger or smaller, and centered on the new page.</p>
      <div class="row" style="margin-top:12px"><div><button id="go">Resize PDF</button></div></div>
      <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
    <div class="card pv-card"><label>Preview of page 1</label><canvas id="pvc" width="10" height="10"></canvas><p id="pvnote" class="hint" style="margin:8px 0 0"></p></div></div>${PL.resultCard}`;
  let bytes = null, pd = null, n = 0, name = "document", thumb = null, p1 = null;
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const MM = 72 / 25.4;
  function target(d){
    let [w, h] = $("sz").value === "custom" ? [(+$("cw").value || 210) * MM, (+$("ch").value || 297) * MM] : PL.SIZES[$("sz").value].slice(); const o = $("or").value;
    if(o === "p" && w > h || o === "l" && h > w || (o === "auto" && (d.Wd > d.Hd) !== (w > h))) [w, h] = [h, w]; return [w, h];
  }
  function preview(){
    if(!thumb) return; $("cu").hidden = $("sz").value !== "custom"; const [tw, th] = target(p1), mg = (+$("mg").value || 0) * MM, c = $("pvc"), sc = 340 / Math.max(tw, th);
    c.width = Math.round(tw * sc); c.height = Math.round(th * sc); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    const bw = tw - 2 * mg, bh = th - 2 * mg, fill = $("fm").value === "fill", s = fill ? Math.max(bw / p1.Wd, bh / p1.Hd) : Math.min(bw / p1.Wd, bh / p1.Hd), w = p1.Wd * s * sc, h = p1.Hd * s * sc;
    g.save(); g.beginPath(); g.rect(0, 0, c.width, c.height); g.clip(); g.drawImage(thumb, (c.width - w) / 2, (c.height - h) / 2, w, h); g.restore(); g.strokeStyle = "#999"; g.strokeRect(.5, .5, c.width - 1, c.height - 1);
    $("pvnote").textContent = "New size: " + (tw / MM).toFixed(0) + " x " + (th / MM).toFixed(0) + " mm";
  }
  ["sz", "or", "cw", "ch", "fm", "mg"].forEach(k => { $(k).oninput = preview; $(k).onchange = preview; });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; thumb = null; if(pd){ pd.destroy(); pd = null; } if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); p1 = PL.dims(d.getPage(0));
      pd = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; thumb = document.createElement("canvas"); await PL.render(pd, 1, thumb, 700);
      $("info").textContent = file.name + " (" + n + " pages, first page " + Math.round(p1.Wd / MM) + " x " + Math.round(p1.Hd / MM) + " mm)"; $("set").hidden = false; preview();
    }catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Resizing..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), out = await PDFLib.PDFDocument.create(), emb = await out.embedPdf(src, src.getPageIndices()), mg = (+$("mg").value || 0) * MM, fill = $("fm").value === "fill";
      emb.forEach((e, i) => { const d = PL.dims(src.getPage(i)), [tw, th] = target(d), pg = out.addPage([tw, th]); PL.drawFit(pg, e, d, mg, mg, tw - 2 * mg, th - 2 * mg, fill); });
      await PL.finish(await out.save(), name + "_resized.pdf", n + " page(s) resized.", 1); $("status").textContent = "";
    }catch(err){ fail("Could not resize this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(pd) pd.destroy(); PL.cleanup(); };
}
mountResizePdf(document.getElementById("tool"));
