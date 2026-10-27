/* ===================== TOOL: Edit PDF Info (metadata) ===================== */
function mountPdfMetadata(root){
  const F = [["ti", "Title"], ["au", "Author"], ["su", "Subject"], ["kw", "Keywords (separate with commas)"], ["cr", "Created with (app name)"], ["pr", "PDF producer"]];
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. PDF information</label>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">${F.map(([id, l]) => `<div><label for="${id}" style="font-weight:600;font-size:.9rem">${l}</label><input id="${id}" type="text"></div>`).join("")}</div>
    <p class="hint" id="dates"></p>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="dt" type="checkbox"> Remove the created and modified dates</label>
    <div class="row" style="margin-top:14px"><div><button id="go">Save PDF</button></div><div><button id="clr" class="alt" type="button">Clear all information</button></div></div>
    <p class="hint">Clear all information removes the author, title, software name, dates and other details that are saved inside the file, so you can share it without them.</p>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let bytes = null, name = "document";
  const fmtD = d => d ? d.toLocaleString() : "none";
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true, updateMetadata:false}); if(d.isEncrypted) throw new Error("enc");
      $("ti").value = d.getTitle() || ""; $("au").value = d.getAuthor() || ""; $("su").value = d.getSubject() || ""; $("kw").value = (d.getKeywords() || "").replace(/\s+/g, " ").trim(); $("cr").value = d.getCreator() || ""; $("pr").value = d.getProducer() || "";
      $("dates").textContent = "Created: " + fmtD(d.getCreationDate()) + "   ·   Modified: " + fmtD(d.getModificationDate()); $("dt").checked = false;
      $("info").textContent = file.name + " (" + d.getPageCount() + " pages)"; $("set").hidden = false;
    }catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("clr").onclick = () => { F.forEach(([id]) => { $(id).value = ""; }); $("dt").checked = true; $("status").className = ""; $("status").textContent = "All fields cleared. Click Save PDF to remove them from the file."; };
  $("go").onclick = async () => {
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Saving..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true, updateMetadata:false}), info = d.getInfoDict(), N = PDFLib.PDFName.of;
      const put = (key, val) => { const v = val.trim(); if(v) info.set(N(key), PDFLib.PDFHexString.fromText(v)); else info.delete(N(key)); };
      put("Title", $("ti").value); put("Author", $("au").value); put("Subject", $("su").value); put("Keywords", $("kw").value); put("Creator", $("cr").value); put("Producer", $("pr").value);
      if($("dt").checked){ info.delete(N("CreationDate")); info.delete(N("ModDate")); } else if(!d.getCreationDate()) { /* keep as is */ }
      const allEmpty = F.every(([id]) => !$(id).value.trim()); if(allEmpty) d.catalog.delete(N("Metadata"));
      await PL.finish(await d.save({updateFieldAppearances:false}), name + "_info.pdf", allEmpty ? "All information removed." : "PDF information saved.", 1); $("status").textContent = "";
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not save this PDF."; }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return PL.cleanup;
}
mountPdfMetadata(document.getElementById("tool"));
