/* ===================== TOOL: Add Watermark ===================== */
function mountWatermark(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label for="tx">2. Watermark text</label>
    <input id="tx" type="text" value="CONFIDENTIAL" maxlength="60">
    <div class="row" style="margin-top:12px"><div><label for="ly" style="font-weight:600">Layout</label><select id="ly"><option value="diag">Diagonal, center</option><option value="hor">Horizontal, center</option><option value="tile">Repeated across the page</option></select></div>
      <div><label for="cl" style="font-weight:600">Color</label><select id="cl"><option value="0.45,0.45,0.45">Gray</option><option value="0.85,0.1,0.1">Red</option><option value="0.1,0.3,0.8">Blue</option><option value="0,0,0">Black</option></select></div></div>
    <div style="margin-top:14px"><label for="sz" style="display:flex;justify-content:space-between">Text size <span id="szv"></span></label><input id="sz" type="range" min="16" max="140" step="2" value="60" style="width:100%;accent-color:var(--acc)"></div>
    <div style="margin-top:12px"><label for="op" style="display:flex;justify-content:space-between">Opacity <span id="opv"></span></label><input id="op" type="range" min="5" max="100" step="5" value="25" style="width:100%;accent-color:var(--acc)"></div>
    <div style="margin-top:12px"><label for="rg" style="font-weight:600">Pages (empty = all pages)</label><input id="rg" type="text" placeholder="e.g. 1-3, 5"></div>
    <p class="hint">Use English letters, numbers and common symbols.</p>
    <div class="row" style="margin-top:12px"><div><button id="go">Add watermark</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let bytes = null, n = 0, name = "document";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const lab = () => { $("szv").textContent = $("sz").value; $("opv").textContent = $("op").value + "%"; }; ["sz", "op"].forEach(k => $(k).oninput = lab); lab();
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; bytes = null; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); n = d.getPageCount(); $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; }
    catch(err){ bytes = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!bytes) return; const text = $("tx").value.trim(); if(!text) return fail("Type the watermark text.");
    let only = null; if($("rg").value.trim()){ const r = PL.ranges($("rg").value, n); if(r.err) return fail(r.err); only = new Set(r.groups.flat()); }
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Adding the watermark..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const size = +$("sz").value, opacity = +$("op").value / 100, [r, g, b] = $("cl").value.split(",").map(Number), color = PDFLib.rgb(r, g, b), ly = $("ly").value, tw = font.widthOfTextAtSize(text, size);
      let first = -1;
      doc.getPages().forEach((page, i) => {
        if(only && !only.has(i)) return; if(first < 0) first = i;
        const d = PL.dims(page), put = (x, y, ang) => { const [px, py] = PL.toPage(d, x, y); page.drawText(text, {x:px, y:py, size, font, color, opacity, rotate:PDFLib.degrees(ang + d.r)}); };
        const at = (cx, cy, ang, ox, oy) => { const c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180); return [cx + ox * c - oy * s, cy + ox * s + oy * c]; };
        if(ly === "tile"){
          const a = 30, sx = tw + size * 2, sy = size * 3.5, c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), N = Math.ceil(Math.hypot(d.Wd, d.Hd) / Math.min(sx, sy)) + 1;
          for(let j = -N; j <= N; j++) for(let i = -N; i <= N; i++){
            const u = (i + (j % 2 ? 0.5 : 0)) * sx, v = j * sy, x = d.Wd / 2 + u * c - v * s, y = d.Hd / 2 + u * s + v * c;
            if(x > -tw && x < d.Wd + tw && y > -tw && y < d.Hd + tw) put(x, y, a);
          }
        }else{
          const ang = ly === "diag" ? 45 : 0, [x, y] = at(d.Wd / 2, d.Hd / 2, ang, -tw / 2, -size * 0.3); put(x, y, ang);
        }
      });
      if(first < 0) throw new Error("none");
      await PL.finish(await doc.save(), name + "_watermarked.pdf", "Watermark added.", first + 1); $("status").textContent = "";
    }catch(err){ fail(err.message === "none" ? "No pages matched that range." : "Could not add the watermark. Use English letters, numbers and common symbols."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return PL.cleanup;
}
mountWatermark(document.getElementById("tool"));
