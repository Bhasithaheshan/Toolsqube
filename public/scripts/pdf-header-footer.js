/* ===================== TOOL: Add Header and Footer ===================== */
function mountHeaderFooter(root){
  const cell = (id, lbl, v) => `<div><label for="${id}" style="font-weight:600;font-size:.9rem">${lbl}</label><input id="${id}" type="text" value="${v}" maxlength="80"></div>`;
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. Header (top of each page)</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">${cell("hl", "Left", "")}${cell("hc", "Center", "")}${cell("hr", "Right", "")}</div>
      <label style="margin-top:16px">Footer (bottom of each page)</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">${cell("fl", "Left", "")}${cell("fc", "Center", "Page {page} of {pages}")}${cell("fr", "Right", "")}</div>
      <p class="hint">You can use <b>{page}</b> (page number), <b>{pages}</b> (total pages), <b>{date}</b> (today) and <b>{name}</b> (file name).</p>
      <div class="row" style="margin-top:8px"><div><label for="ft" style="font-weight:600">Font</label><select id="ft"><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times</option><option value="Courier">Courier</option></select></div>
        <div><label for="sz" style="font-weight:600">Size</label><select id="sz"><option>8</option><option>9</option><option selected>10</option><option>12</option><option>14</option></select></div>
        <div><label for="cl" style="font-weight:600">Color</label><select id="cl"><option value="0.25,0.25,0.25">Dark gray</option><option value="0,0,0">Black</option><option value="0.1,0.3,0.8">Blue</option><option value="0.8,0.1,0.1">Red</option></select></div></div>
      <div class="row" style="margin-top:12px"><div><label for="mt" style="font-weight:600">Distance from the edge (mm)</label><input id="mt" type="number" min="3" max="40" step="1" value="10"></div><div><label for="fp" style="font-weight:600">Start on page</label><input id="fp" type="number" min="1" step="1" value="1"></div></div>
      <div class="row" style="margin-top:12px"><div><button id="go">Add header and footer</button></div></div><progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
    ${PL.pvCard}</div>${PL.resultCard}`;
  let bytes = null, n = 0, name = "document", font = null, fontKey = "";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const SIDE = 28, tmpDoc = () => PDFLib.PDFDocument.create();
  async function setFont(){ if(fontKey === $("ft").value) return; const d = await tmpDoc(); font = await d.embedFont(PDFLib.StandardFonts[$("ft").value]); fontKey = $("ft").value; }
  const o = () => ({size:+$("sz").value, col:$("cl").value.split(",").map(Number), mt:(+$("mt").value || 10) * 72 / 25.4, first:Math.max(1, Math.floor(+$("fp").value) || 1)});
  const sub = (t, i) => t.replace(/\{page\}/gi, i + 1).replace(/\{pages\}/gi, n).replace(/\{date\}/gi, new Date().toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"})).replace(/\{name\}/gi, name);
  const spots = () => [["hl", "top", "left"], ["hc", "top", "center"], ["hr", "top", "right"], ["fl", "bottom", "left"], ["fc", "bottom", "center"], ["fr", "bottom", "right"]];
  function where(op, Wd, Hd, t, v, h){ const tw = font.widthOfTextAtSize(t, op.size); return {x:h === "left" ? SIDE : h === "right" ? Wd - SIDE - tw : (Wd - tw) / 2, y:v === "top" ? Hd - op.mt - op.size * 0.8 : op.mt}; }
  const pv = PL.makePreview((g, c) => {
    const op = o(); if(!font) return ""; if(c.page < op.first) return "No header or footer on this page. It starts on page " + op.first + ".";
    g.fillStyle = "rgb(" + op.col.map(v => Math.round(v * 255)).join(",") + ")"; g.textBaseline = "alphabetic"; g.font = (op.size * c.sc) + "px " + ({Helvetica:"Helvetica, Arial, sans-serif", TimesRoman:'"Times New Roman", Times, serif', Courier:'"Courier New", Courier, monospace'})[$("ft").value];
    try{ for(const [id, v, h] of spots()){ const t = sub($(id).value, c.page - 1); if(!t) continue; const p = where(op, c.W, c.H, t, v, h); g.fillText(t, p.x * c.sc, (c.H - p.y) * c.sc); } return ""; }catch(e){ return "Use English letters, numbers and common symbols."; }
  });
  const refresh = async () => { await setFont(); pv.refresh(); }; ["hl", "hc", "hr", "fl", "fc", "fr", "ft", "sz", "cl", "mt", "fp"].forEach(k => { $(k).oninput = refresh; $(k).onchange = refresh; });
  $("pvp").onclick = () => pv.step(-1); $("pvn").onclick = () => pv.step(1);
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); await setFont(); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; await pv.open(new Uint8Array(bytes)); }
    catch(err){ bytes = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; const op = o(); $("go").disabled = true; $("status").className = ""; $("status").textContent = "Adding..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), f = await doc.embedFont(PDFLib.StandardFonts[$("ft").value]), color = PDFLib.rgb(...op.col); let k = 0;
      doc.getPages().forEach((page, i) => {
        if(i + 1 < op.first) return; k++; const d = PL.dims(page);
        for(const [id, v, h] of spots()){ const t = sub($(id).value, i); if(!t) continue; const tw = f.widthOfTextAtSize(t, op.size), x = h === "left" ? SIDE : h === "right" ? d.Wd - SIDE - tw : (d.Wd - tw) / 2, y = v === "top" ? d.Hd - op.mt - op.size * 0.8 : op.mt, [px, py] = PL.toPage(d, x, y);
          page.drawText(t, {x:px, y:py, size:op.size, font:f, color, rotate:PDFLib.degrees(d.r)}); }
      });
      if(!k) throw new Error("none"); await PL.finish(await doc.save(), name + "_hf.pdf", "Header and footer added to " + k + " page(s).", 1, true); $("status").textContent = "";
    }catch(err){ fail(err.message === "none" ? "Start page is after the last page." : "Could not add the text. Use English letters, numbers and common symbols."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { pv.destroy(); PL.cleanup(); };
}
mountHeaderFooter(document.getElementById("tool"));
