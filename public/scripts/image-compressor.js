/* ===================== TOOL: Image Compressor ===================== */
function mountImageCompressor(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label>
    <input id="f" type="file" accept="image/*">
    <div id="orig" hidden style="margin-top:14px">
      <img id="oimg" alt="Original image preview" style="max-width:100%;max-height:260px;border-radius:12px;display:block">
      <p style="margin:10px 0 0;font-size:1.05rem"><b>Original size: <span id="osz"></span></b></p>
      <p id="odim" class="hint" style="margin-top:2px"></p>
    </div>
    <p id="info" class="hint">No image chosen.</p></div>
  <div class="card"><label for="n">2. Compress it to under</label>
    <div class="row"><input id="n" type="number" min="1" step="any" value="1" aria-label="Target size">
      <select id="u" aria-label="Unit"><option value="1024">KB</option><option value="1048576" selected>MB</option></select>
      <select id="fmt" aria-label="Output format"><option value="image/jpeg">JPEG (best for photos)</option><option value="image/webp">WebP (smaller files)</option></select></div>
    <div class="row" style="margin-top:12px">
      <button type="button" class="alt" data-p="100|1024">100 KB</button><button type="button" class="alt" data-p="500|1024">500 KB</button>
      <button type="button" class="alt" data-p="1|1048576">1 MB</button><button type="button" class="alt" data-p="2|1048576">2 MB</button></div>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Compress image</button></div></div>
    <progress id="bar" hidden></progress><div id="status"></div>
    <p class="hint">The tool lowers the quality first, and shrinks the image dimensions only if that is not enough. PNG files are saved as JPEG or WebP (transparent areas become white for JPEG).</p></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.15rem;font-weight:700;margin:0 0 4px"></p>
    <p id="resd" class="hint" style="margin:0 0 14px"></p>
    <img id="rimg" alt="Compressed image preview" style="max-width:100%;max-height:340px;border-radius:12px;display:block;margin-bottom:14px">
    <a id="dl" class="btn" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  try{ const pr = JSON.parse(root.dataset.preset || "null"); if(pr){ $("n").value = pr.size; $("u").value = pr.unit === "MB" ? "1048576" : "1024"; } }catch(e){}
  let img = null, file = null, urls = [];
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  root.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const [v, u] = b.dataset.p.split("|"); $("n").value = v; $("u").value = u; });
  $("f").onchange = e => {
    file = e.target.files[0]; img = null; $("go").disabled = true; $("out").hidden = true; $("orig").hidden = true; $("status").textContent = "";
    if(!file) return;
    const url = URL.createObjectURL(file); urls.push(url);
    const im = new Image();
    im.onload = () => {
      img = im; $("oimg").src = url; $("osz").textContent = sz(file.size); $("odim").textContent = im.naturalWidth + " x " + im.naturalHeight + " px";
      $("orig").hidden = false; $("info").textContent = file.name; $("go").disabled = false;
    };
    im.onerror = () => { $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; };
    $("info").className = "hint"; $("info").textContent = "Loading...";
    im.src = url;
  };
  const blobOf = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  async function compress(target, type){
    let scale = 1;
    for(let round = 0; round < 14; round++){
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      let hiB = await blobOf(c, type, .95);
      if(!hiB || hiB.type !== type) throw new Error("format");
      if(hiB.size <= target) return {blob:hiB, w, h, q:.95};
      let lo = .4, loB = await blobOf(c, type, lo);
      if(loB.size > target){ scale *= Math.max(.5, Math.min(.92, Math.sqrt(target / loB.size) * .97)); if(scale < .05) break; continue; }
      let hi = .95, best = loB;
      for(let i = 0; i < 7; i++){
        const mid = (lo + hi) / 2, t = await blobOf(c, type, mid);
        if(t.size <= target){ best = t; lo = mid; } else hi = mid;
      }
      return {blob:best, w, h, q:lo};
    }
    return null;
  }
  $("go").onclick = async () => {
    if(!img) return;
    const target = (parseFloat($("n").value) || 0) * parseFloat($("u").value);
    if(target < 5120) return fail("Enter a size of at least 5 KB.");
    if(target >= file.size) return fail("Your image is already smaller than that (" + sz(file.size) + "). Enter a smaller size.");
    const type = $("fmt").value;
    $("go").disabled = true; $("bar").hidden = false; $("out").hidden = true; $("status").className = ""; $("status").textContent = "Compressing...";
    await new Promise(r => setTimeout(r, 30));
    try{
      const r = await compress(target, type);
      if(!r) return fail("Could not reach that size. Try a larger target.");
      const url = URL.createObjectURL(r.blob); urls.push(url);
      const ext = type === "image/webp" ? "webp" : "jpg", base = file.name.replace(/\.[^.]+$/, "");
      const saved = Math.round((1 - r.blob.size / file.size) * 100);
      $("res").textContent = sz(file.size) + "  to  " + sz(r.blob.size) + "  (" + saved + "% smaller)";
      const resized = r.w !== img.naturalWidth;
      $("resd").textContent = (resized ? "Resized from " + img.naturalWidth + " x " + img.naturalHeight + " to " + r.w + " x " + r.h + " px. " : "Same dimensions (" + r.w + " x " + r.h + " px). ") + "Quality: " + Math.round(r.q * 100) + "%.";
      $("rimg").src = url; $("dl").href = url; $("dl").download = base + "_compressed." + ext; $("dl").textContent = "Download " + base + "_compressed." + ext;
      $("out").hidden = false; $("status").textContent = "Done."; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){
      fail(err.message === "format" ? "Your browser can't save this format. Choose JPEG instead." : "Compression failed. Try another image.");
    }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => urls.forEach(u => URL.revokeObjectURL(u));
}

mountImageCompressor(document.getElementById("tool"));
