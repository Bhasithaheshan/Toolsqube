/* ===================== TOOL: Multiple Pages per Sheet ===================== */
const NUP = {2:[1,2], 4:[2,2], 6:[2,3], 8:[2,4], 9:[3,3], 16:[4,4]};
function mountPagesPerSheet(root){
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. Layout</label>
      <div class="row"><div><label for="np" style="font-weight:600">Pages on each sheet</label><select id="np"><option value="2">2</option><option value="4" selected>4</option><option value="6">6</option><option value="8">8</option><option value="9">9</option><option value="16">16</option></select></div>
        <div><label for="sz" style="font-weight:600">Sheet size</label><select id="sz"><option value="a4">A4</option><option value="a3">A3</option><option value="letter">Letter</option><option value="legal">Legal</option></select></div>
        <div><label for="or" style="font-weight:600">Sheet direction</label><select id="or"><option value="auto">Automatic</option><option value="p">Portrait</option><option value="l">Landscape</option></select></div></div>
      <div class="row" style="margin-top:12px"><div><label for="mg" style="font-weight:600">Margin (mm)</label><input id="mg" type="number" min="0" max="30" step="1" value="8"></div><div><label for="gp" style="font-weight:600">Gap between pages (mm)</label><input id="gp" type="number" min="0" max="30" step="1" value="4"></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="bd" type="checkbox" checked> Draw a thin border around each page</label>
      <p class="hint">Pages are placed left to right, then top to bottom. Good for saving paper when you print.</p>
      <div class="row" style="margin-top:12px"><div><button id="go">Make sheets</button></div></div>
      <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
    <div class="card pv-card"><label>Preview of one sheet</label><canvas id="pvc" width="10" height="10"></canvas><p id="pvnote" class="hint" style="margin:8px 0 0"></p></div></div>${PL.resultCard}`;
  let bytes = null, n = 0, name = "document", d1 = null;
  const MM = 72 / 25.4, fail = m => { $("status").className = "err"; $("status").textContent = m; };
  function plan(){
    const k = +$("np").value, [c, r] = NUP[k], [sw, sh] = PL.SIZES[$("sz").value], mg = (+$("mg").value || 0) * MM, gp = (+$("gp").value || 0) * MM;
    const cell = (W, H) => { const [cc, rr] = W > H ? [r, c] : [c, r]; return {cols:cc, rows:rr, cw:(W - 2 * mg - gp * (cc - 1)) / cc, ch:(H - 2 * mg - gp * (rr - 1)) / rr}; };
    const opt = o => o === "l" ? cell(sh, sw) : cell(sw, sh), o = $("or").value;
    let land; if(o === "p") land = false; else if(o === "l") land = true; else { const a = opt("p"), b = opt("l"); land = Math.min(b.cw / d1.Wd, b.ch / d1.Hd) > Math.min(a.cw / d1.Wd, a.ch / d1.Hd); }
    const [W, H] = land ? [sh, sw] : [sw, sh]; return {W, H, mg, gp, ...cell(W, H)};
  }
  function preview(){
    if(!d1) return; const p = plan(), c = $("pvc"), sc = 340 / Math.max(p.W, p.H); c.width = Math.round(p.W * sc); c.height = Math.round(p.H * sc); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#999"; g.strokeRect(.5, .5, c.width - 1, c.height - 1); g.fillStyle = "#e8eef3"; g.font = "bold " + Math.round(18 * sc * 1.2) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for(let i = 0; i < p.cols * p.rows; i++){ const cx = p.mg + (i % p.cols) * (p.cw + p.gp), cy = p.mg + Math.floor(i / p.cols) * (p.ch + p.gp), s = Math.min(p.cw / d1.Wd, p.ch / d1.Hd), w = d1.Wd * s, h = d1.Hd * s, x = cx + (p.cw - w) / 2, y = cy + (p.ch - h) / 2;
      g.fillRect(x * sc, y * sc, w * sc, h * sc); g.strokeStyle = "#7a8a99"; g.strokeRect(x * sc, y * sc, w * sc, h * sc); g.fillStyle = "#58697d"; g.fillText(i + 1, (x + w / 2) * sc, (y + h / 2) * sc); g.fillStyle = "#e8eef3"; }
    $("pvnote").textContent = Math.ceil(n / (p.cols * p.rows)) + " sheet(s) from " + n + " pages";
  }
  ["np", "sz", "or", "mg", "gp"].forEach(k => { $(k).oninput = preview; $(k).onchange = preview; });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); d1 = PL.dims(d.getPage(0)); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; preview(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Making sheets..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), out = await PDFLib.PDFDocument.create(), emb = await out.embedPdf(src, src.getPageIndices()), p = plan(), per = p.cols * p.rows; let sheet = null;
      emb.forEach((e, i) => {
        if(i % per === 0) sheet = out.addPage([p.W, p.H]); const k = i % per, cx = p.mg + (k % p.cols) * (p.cw + p.gp), cy = p.H - p.mg - (Math.floor(k / p.cols) + 1) * p.ch - Math.floor(k / p.cols) * p.gp, d = PL.dims(src.getPage(i));
        const s = PL.drawFit(sheet, e, d, cx, cy, p.cw, p.ch, false);
        if($("bd").checked){ const w = d.Wd * s, h = d.Hd * s; sheet.drawRectangle({x:cx + (p.cw - w) / 2, y:cy + (p.ch - h) / 2, width:w, height:h, borderColor:PDFLib.rgb(.6, .6, .6), borderWidth:.6}); }
      });
      await PL.finish(await out.save(), name + "_" + per + "-per-sheet.pdf", n + " pages on " + out.getPageCount() + " sheet(s).", 1); $("status").textContent = "";
    }catch(err){ fail("Could not make the sheets."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return PL.cleanup;
}
mountPagesPerSheet(document.getElementById("tool"));
