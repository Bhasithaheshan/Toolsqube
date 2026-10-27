/* ===================== TOOL: Add Page Numbers ===================== */
function mountPageNumbers(root){
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. Number settings</label>
      <div class="row"><div><label for="ps" style="font-weight:600">Position</label><select id="ps"><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></div>
        <div><label for="fm" style="font-weight:600">Format</label><select id="fm"><option value="n">1</option><option value="p">Page 1</option><option value="of">1 / 10</option><option value="pof">Page 1 of 10</option></select></div></div>
      <div class="row" style="margin-top:12px"><div><label for="sz" style="font-weight:600">Size</label><select id="sz"><option value="9">Small</option><option value="12" selected>Medium</option><option value="16">Large</option><option value="22">Extra large</option></select></div>
        <div><label for="mg" style="font-weight:600">Distance from the edge</label><select id="mg"><option value="18">Close</option><option value="28" selected>Normal</option><option value="48">Far</option></select></div></div>
      <div class="row" style="margin-top:12px"><div><label for="fp" style="font-weight:600">Start numbering on page</label><input id="fp" type="number" min="1" step="1" value="1"></div>
        <div><label for="sn" style="font-weight:600">First number</label><input id="sn" type="number" min="0" step="1" value="1"></div></div>
      <p class="hint">Tip: to skip a cover page, start numbering on page 2.</p>
      <div class="row" style="margin-top:12px"><div><button id="go">Add page numbers</button></div></div>
      <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
    ${PL.pvCard}</div>${PL.resultCard}`;
  let bytes = null, n = 0, name = "document", font = null;
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const opts = () => ({pos:$("ps").value, fm:$("fm").value, size:+$("sz").value, margin:+$("mg").value, first:Math.max(1, Math.floor(+$("fp").value || 1)), start:Math.floor(+$("sn").value) || 0});
  const textFor = (o, i) => { const k = o.start + (i + 1 - o.first), last = o.start + (n - o.first); return o.fm === "n" ? "" + k : o.fm === "p" ? "Page " + k : o.fm === "of" ? k + " / " + last : "Page " + k + " of " + last; };
  function place(o, t, Wd, Hd){ const tw = font.widthOfTextAtSize(t, o.size); return {x:o.pos.endsWith("left") ? o.margin : o.pos.endsWith("right") ? Wd - o.margin - tw : (Wd - tw) / 2, y:o.pos.startsWith("top") ? Hd - o.margin - o.size * 0.8 : o.margin}; }
  const pv = PL.makePreview((g, c) => {
    const o = opts(); if(c.page < o.first) return "No number on this page. Numbering starts on page " + o.first + ".";
    const t = textFor(o, c.page - 1), p = place(o, t, c.W, c.H); g.fillStyle = "#262626"; g.font = (o.size * c.sc) + "px Helvetica, Arial, sans-serif"; g.textBaseline = "alphabetic"; g.fillText(t, p.x * c.sc, (c.H - p.y) * c.sc); return "";
  });
  const refresh = () => pv.refresh(); ["ps", "fm", "sz", "mg", "fp", "sn"].forEach(k => { $(k).oninput = refresh; $(k).onchange = refresh; });
  $("pvp").onclick = () => pv.step(-1); $("pvn").onclick = () => pv.step(1);
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; bytes = null; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc");
      n = d.getPageCount(); font = await d.embedFont(PDFLib.StandardFonts.Helvetica); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; await pv.open(new Uint8Array(bytes));
    }catch(err){ bytes = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; const o = opts(); if(o.first > n) return fail("Start numbering on a page between 1 and " + n + ".");
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Adding numbers..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), f = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      doc.getPages().forEach((page, i) => {
        if(i + 1 < o.first) return; const t = textFor(o, i), d = PL.dims(page), tw = f.widthOfTextAtSize(t, o.size);
        const x = o.pos.endsWith("left") ? o.margin : o.pos.endsWith("right") ? d.Wd - o.margin - tw : (d.Wd - tw) / 2, y = o.pos.startsWith("top") ? d.Hd - o.margin - o.size * 0.8 : o.margin;
        const [px, py] = PL.toPage(d, x, y); page.drawText(t, {x:px, y:py, size:o.size, font:f, color:PDFLib.rgb(0.15, 0.15, 0.15), rotate:PDFLib.degrees(d.r)});
      });
      await PL.finish(await doc.save(), name + "_numbered.pdf", "Page numbers added to " + (n - o.first + 1) + " page(s).", 1, true); $("status").textContent = "";
    }catch(err){ fail("Could not add page numbers to this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { pv.destroy(); PL.cleanup(); };
}
mountPageNumbers(document.getElementById("tool"));
