/* ===================== TOOL: Extract Images from PDF ===================== */
/* turn a pdf.js image object into plain RGBA pixels */
function imgPixels(img, kind){
  const w = img.width, h = img.height, out = new Uint8ClampedArray(w * h * 4), d = img.data;
  if(!d) return null;
  if(kind === 3 || d.length === w * h * 4){ out.set(d.subarray(0, w * h * 4)); }
  else if(kind === 2 || d.length === w * h * 3){ for(let i = 0, j = 0; i < w * h; i++){ out[j++] = d[i * 3]; out[j++] = d[i * 3 + 1]; out[j++] = d[i * 3 + 2]; out[j++] = 255; } }
  else if(kind === 1){ const rb = (w + 7) >> 3; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, j = (y * w + x) * 4; out[j] = out[j + 1] = out[j + 2] = v; out[j + 3] = 255; } }
  else if(d.length === w * h){ for(let i = 0; i < w * h; i++){ const j = i * 4; out[j] = out[j + 1] = out[j + 2] = d[i]; out[j + 3] = 255; } }
  else return null;
  return {w, h, rgba:out};
}
async function pageImages(page, OPS, cb){
  const ops = await page.getOperatorList(), found = [], seen = new Set();
  for(let i = 0; i < ops.fnArray.length; i++){
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    if(fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat || fn === OPS.paintJpegXObject){ const id = a[0]; if(seen.has(id)) continue; seen.add(id); const store = String(id).startsWith("g_") ? page.commonObjs : page.objs;
      const img = await new Promise(res => { let done = false; const t = setTimeout(() => { if(!done){ done = true; res(null); } }, 4000); try{ store.get(id, o => { if(!done){ done = true; clearTimeout(t); res(o); } }); }catch(e){ clearTimeout(t); res(null); } }); if(img) found.push(img); }
    else if(fn === OPS.paintInlineImageXObject && a[0]) found.push(a[0]);
  }
  return found;
}
/* END CORE */

function mountExtractImages(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Options</label>
    <div class="row"><div><label for="fm" style="font-weight:600">Save images as</label><select id="fm"><option value="png">PNG (keeps transparency)</option><option value="jpg">JPG (smaller)</option></select></div>
      <div><label for="mn" style="font-weight:600">Skip images smaller than (px)</label><input id="mn" type="number" min="1" max="500" step="1" value="50"></div>
      <div><label for="rg" style="font-weight:600">Pages (empty = all)</label><input id="rg" type="text" placeholder="e.g. 1-5"></div></div>
    <div class="row" style="margin-top:14px"><div><button id="go">Find images</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden><p id="cnt" style="font-weight:700;margin:0 0 10px"></p><div class="row" style="margin-bottom:12px"><div><button id="zip" class="alt">Download all as ZIP</button></div></div>
    <div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px"></div></div>`;
  let doc = null, n = 0, name = "document", results = [], urls = [];
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(doc){ doc.destroy(); doc = null; } if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ doc = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; n = doc.numPages; $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err && err.name === "PasswordException" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!doc) return; let pages; if($("rg").value.trim()){ const r = PL.ranges($("rg").value, n); if(r.err) return fail(r.err); pages = [...new Set(r.groups.flat())].sort((a, b) => a - b); } else pages = Array.from({length:n}, (_, i) => i);
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; urls.forEach(u => URL.revokeObjectURL(u)); urls = []; results = []; $("grid").innerHTML = ""; $("out").hidden = false;
    const png = $("fm").value === "png", ext = png ? "png" : "jpg", mn = +$("mn").value || 1, keys = new Set(); let count = 0;
    try{
      for(let k = 0; k < pages.length; k++){
        $("status").textContent = "Looking at page " + (pages[k] + 1) + "..."; $("bar").value = k / pages.length; const page = await doc.getPage(pages[k] + 1), imgs = await pageImages(page, pdfjsLib.OPS);
        for(const im of imgs){
          let c = document.createElement("canvas"), w, h;
          if(im.bitmap){ w = im.bitmap.width; h = im.bitmap.height; if(w < mn || h < mn) continue; c.width = w; c.height = h; c.getContext("2d").drawImage(im.bitmap, 0, 0); }
          else{ const px = imgPixels(im, im.kind); if(!px) continue; w = px.w; h = px.h; if(w < mn || h < mn) continue; c.width = w; c.height = h; c.getContext("2d").putImageData(new ImageData(px.rgba, w, h), 0, 0); }
          const key = w + "x" + h + ":" + (im.data ? im.data.length + ":" + im.data[0] + im.data[(im.data.length >> 1)] + im.data[im.data.length - 1] : "b"); if(keys.has(key)) continue; keys.add(key);
          if(!png){ const f = document.createElement("canvas"); f.width = w; f.height = h; const g = f.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(c, 0, 0); c = f; }
          const blob = await new Promise(r => c.toBlob(r, png ? "image/png" : "image/jpeg", .93)), u = URL.createObjectURL(blob); urls.push(u); count++;
          const fn = name + "_p" + (pages[k] + 1) + "_img" + count + "." + ext; results.push({name:fn, blob});
          const d = document.createElement("div"); d.innerHTML = '<div style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:8px;overflow:hidden"><img alt="" style="width:100%;display:block"></div><a style="font-weight:700;color:var(--acc);font-size:.9rem" download></a><br><small style="color:var(--mute)"></small>';
          d.querySelector("img").src = u; const a = d.querySelector("a"); a.href = u; a.download = fn; a.textContent = "Download"; d.querySelector("small").textContent = "Page " + (pages[k] + 1) + " · " + w + " x " + h + " · " + PL.sz(blob.size); $("grid").appendChild(d);
        }
      }
      $("cnt").textContent = count ? count + " image(s) found" : "No images found in these pages."; $("zip").hidden = count < 2; $("status").textContent = "";
    }catch(err){ fail("Could not read the images of this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), name + "_images.zip"); $("zip").disabled = false; };
  return () => { urls.forEach(u => URL.revokeObjectURL(u)); if(doc) doc.destroy(); };
}
mountExtractImages(document.getElementById("tool"));
