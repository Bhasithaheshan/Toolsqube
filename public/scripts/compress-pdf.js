/* ===================== TOOL: Compress PDF ===================== */
const CP_LEVELS = [[200,.9],[170,.85],[150,.8],[130,.75],[110,.7],[100,.62],[90,.55],[80,.5],[72,.45],[60,.4],[50,.35],[40,.3]];
async function cpSample(ctx, idxs, lvl, gray){ let t = 0; for(const i of idxs){ const c = await ctx.renderPage(i, CP_LEVELS[lvl][0]); t += (await ctx.encode(c, CP_LEVELS[lvl][1], gray)).length; } return t; }
async function cpBuild(ctx, lvl, gray, progress){
  const doc = await PDFLib.PDFDocument.create();
  for(let i = 0; i < ctx.n; i++){
    const {w, h} = ctx.pageSize(i), c = await ctx.renderPage(i, CP_LEVELS[lvl][0]), img = await doc.embedJpg(await ctx.encode(c, CP_LEVELS[lvl][1], gray));
    doc.addPage([w, h]).drawImage(img, {x:0, y:0, width:w, height:h}); if(progress) progress((i + 1) / ctx.n);
  }
  return await doc.save();
}
async function cpRun(ctx, target, gray, progress, say){
  const n = ctx.n, k = Math.min(n, 5), idxs = Array.from({length:k}, (_, j) => Math.floor(j * n / k));
  let lo = 0, hi = CP_LEVELS.length - 1, pick = CP_LEVELS.length - 1;
  while(lo <= hi){ const mid = (lo + hi) >> 1; if(say) say("Finding the best quality..."); const est = (await cpSample(ctx, idxs, mid, gray)) * n / k + 2000 + n * 250; if(est <= target * 0.95){ pick = mid; hi = mid - 1; } else lo = mid + 1; }
  let out = null;
  for(let lvl = pick, tries = 0; lvl < CP_LEVELS.length; lvl++, tries++){
    if(say) say("Compressing at " + CP_LEVELS[lvl][0] + " dpi..."); out = await cpBuild(ctx, lvl, gray, progress);
    if(out.length <= target){
      if(out.length < target * 0.7 && lvl > 0 && tries === 0){ if(say) say("Improving the quality..."); const better = await cpBuild(ctx, lvl - 1, gray, progress); if(better.length <= target) return {bytes:better, lvl:lvl - 1, reached:true}; }
      return {bytes:out, lvl, reached:true};
    }
    if(lvl === CP_LEVELS.length - 1 || tries >= 3) return {bytes:out, lvl, reached:false};
  }
  return {bytes:out, lvl:pick, reached:false};
}
/* END CORE */

function mountCompressPdf(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Make it smaller than</label>
    <div class="row"><div><input id="n" type="number" min="10" step="any" value="200" aria-label="Target size"></div><div><select id="u" aria-label="Unit"><option value="1024" selected>KB</option><option value="1048576">MB</option></select></div></div>
    <div class="row" style="margin-top:10px"><div><button type="button" class="alt" data-p="100|1024">100 KB</button></div><div><button type="button" class="alt" data-p="200|1024">200 KB</button></div><div><button type="button" class="alt" data-p="500|1024">500 KB</button></div><div><button type="button" class="alt" data-p="1|1048576">1 MB</button></div><div><button type="button" class="alt" data-p="2|1048576">2 MB</button></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="gr" type="checkbox"> Black and white (makes it even smaller)</label>
    <p class="hint">If the file is already near the size, the tool first tries to shrink it without changing it, so the text stays selectable. If that is not enough, each page is turned into a compressed picture, and the text can no longer be selected.</p>
    <div class="row" style="margin-top:14px"><div><button id="go">Compress PDF</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let bytes = null, doc = null, n = 0, name = "document", sizes = [], origSize = 0;
  try{ const pr = JSON.parse(root.dataset.preset || "null"); if(pr){ $("n").value = pr.size; $("u").value = pr.unit === "MB" ? "1048576" : "1024"; } }catch(e){}
  root.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const [v, u] = b.dataset.p.split("|"); $("n").value = v; $("u").value = u; });
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(doc){ doc.destroy(); doc = null; } if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); origSize = file.size; $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const chk = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(chk.isEncrypted) throw new Error("enc");
      doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; n = doc.numPages; sizes = [];
      for(let i = 1; i <= n; i++){ const v = (await doc.getPage(i)).getViewport({scale:1}); sizes.push({w:v.width, h:v.height}); }
      $("info").textContent = file.name + " (" + n + " pages, " + PL.sz(origSize) + ")"; $("set").hidden = false;
    }catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" || (err && err.name === "PasswordException") ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  const adapter = () => ({
    n, pageSize:i => sizes[i],
    async renderPage(i, dpi){
      const page = await doc.getPage(i + 1), b = page.getViewport({scale:1}); let s = dpi / 72; if(b.width * b.height * s * s > 2.5e7) s = Math.sqrt(2.5e7 / (b.width * b.height));
      const vp = page.getViewport({scale:s}), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
      const g = c.getContext("2d", {willReadFrequently:true}); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); await page.render({canvasContext:g, viewport:vp}).promise; return c;
    },
    async encode(c, q, gray){
      if(gray){ const g = c.getContext("2d"), im = g.getImageData(0, 0, c.width, c.height), d = im.data; for(let i = 0; i < d.length; i += 4){ const y = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; d[i] = d[i + 1] = d[i + 2] = y; } g.putImageData(im, 0, 0); }
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q)); return new Uint8Array(await blob.arrayBuffer());
    },
  });
  $("go").onclick = async () => {
    const target = (+$("n").value || 0) * +$("u").value; if(target < 10240) return fail("Enter a size of at least 10 KB.");
    if(origSize <= target) return fail("This PDF is already smaller than that (" + PL.sz(origSize) + "). Enter a smaller size.");
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; $("bar").value = 0; $("out").hidden = true; await new Promise(r => setTimeout(r, 30));
    try{
      $("status").textContent = "Trying to shrink it without changing it..."; const lite = await (await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true, updateMetadata:false})).save({useObjectStreams:true});
      if(lite.length <= target && !$("gr").checked){ await PL.finish(lite, name + "_compressed.pdf", PL.sz(origSize) + " to " + PL.sz(lite.length) + ". The text is still selectable.", 1); $("status").textContent = ""; }
      else{
        const r = await cpRun(adapter(), target, $("gr").checked, p => { $("bar").value = p; }, m => { $("status").textContent = m; });
        await PL.finish(r.bytes, name + "_compressed.pdf", PL.sz(origSize) + " to " + PL.sz(r.bytes.length) + (r.reached ? "." : ". This is the smallest it can go without making the pages unreadable.") , 1); $("status").textContent = "";
      }
    }catch(err){ fail("Could not compress this PDF. Try a smaller target or a shorter file."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(doc) doc.destroy(); PL.cleanup(); };
}
mountCompressPdf(document.getElementById("tool"));
