/* ===================== TOOL: Add Page Numbers ===================== */
function mountPageNumbers(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Number settings</label>
    <div class="row"><div><label for="ps" style="font-weight:600">Position</label><select id="ps"><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></div>
      <div><label for="fm" style="font-weight:600">Format</label><select id="fm"><option value="n">1</option><option value="p">Page 1</option><option value="of">1 / 10</option><option value="pof">Page 1 of 10</option></select></div>
      <div><label for="sz" style="font-weight:600">Size</label><select id="sz"><option value="9">Small</option><option value="12" selected>Medium</option><option value="16">Large</option></select></div></div>
    <div class="row" style="margin-top:12px"><div><label for="fp" style="font-weight:600">Start numbering on page</label><input id="fp" type="number" min="1" step="1" value="1"></div>
      <div><label for="sn" style="font-weight:600">First number</label><input id="sn" type="number" min="0" step="1" value="1"></div></div>
    <p class="hint">Tip: to skip a cover page, start numbering on page 2.</p>
    <div class="row" style="margin-top:12px"><div><button id="go">Add page numbers</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let bytes = null, n = 0, name = "document";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; bytes = null; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; }
    catch(err){ bytes = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; const first = Math.floor(+$("fp").value || 1), start = Math.floor(+$("sn").value);
    if(first < 1 || first > n) return fail("Start numbering on a page between 1 and " + n + ".");
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Adding numbers..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), font = await doc.embedFont(PDFLib.StandardFonts.Helvetica), size = +$("sz").value, pos = $("ps").value, fm = $("fm").value, margin = 28, last = start + (n - first);
      doc.getPages().forEach((page, i) => {
        if(i + 1 < first) return; const k = start + (i + 1 - first);
        const t = fm === "n" ? "" + k : fm === "p" ? "Page " + k : fm === "of" ? k + " / " + last : "Page " + k + " of " + last;
        const d = PL.dims(page), tw = font.widthOfTextAtSize(t, size);
        const x = pos.endsWith("left") ? margin : pos.endsWith("right") ? d.Wd - margin - tw : (d.Wd - tw) / 2, y = pos.startsWith("top") ? d.Hd - margin - size * 0.8 : margin;
        const [px, py] = PL.toPage(d, x, y); page.drawText(t, {x:px, y:py, size, font, color:PDFLib.rgb(0.15, 0.15, 0.15), rotate:PDFLib.degrees(d.r)});
      });
      await PL.finish(await doc.save(), name + "_numbered.pdf", "Page numbers added to " + (n - first + 1) + " page(s).", first); $("status").textContent = "";
    }catch(err){ fail("Could not add page numbers to this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return PL.cleanup;
}
mountPageNumbers(document.getElementById("tool"));
