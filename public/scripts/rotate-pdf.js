/* ===================== TOOL: Rotate PDF ===================== */
function mountRotatePdf(root){
  root.innerHTML = `<style>
  .rt-bar{position:sticky;top:65px;z-index:6;padding:12px 14px}
  .rt-bar::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:24px;background:var(--bg)}
  .rt-bar .row{gap:6px;margin-top:8px;align-items:center}.rt-bar .row>*{flex:0 1 auto}.rt-bar button{padding:7px 12px;font-size:.9rem}
  .rt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
  .rt-pg{position:relative;border:2px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card)}
  .rt-pg.ch{border-color:var(--acc)}
  .rt-pg .th{aspect-ratio:3/4;display:grid;place-items:center;background:var(--surface2)}
  .rt-pg canvas{width:100%;height:100%;object-fit:contain;display:block;background:#fff}
  .rt-pg .num{position:absolute;left:6px;top:6px;background:rgba(12,26,41,.82);color:#fff;font-size:.8rem;font-weight:700;padding:1px 8px;border-radius:999px}
  .rt-pg .acts{display:flex;gap:4px;padding:6px;justify-content:center}.rt-pg .acts button{padding:5px 12px;font-size:1rem}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="work" hidden>
    <div class="card rt-bar"><p id="count" style="font-weight:700;margin:0"></p>
      <div class="row"><button id="ar" class="alt" type="button">Rotate all right ↻</button><button id="al" class="alt" type="button">Rotate all left ↺</button><button id="rs" class="alt" type="button">Reset</button><button id="go" type="button">Download rotated PDF</button></div>
      <p id="msg" class="hint" style="margin-top:8px" aria-live="polite">Use the buttons under a page to rotate just that page.</p></div>
    <div id="grid" class="rt-grid"></div></div>`;
  let doc = null, bytes = null, n = 0, name = "document", rot = [], cards = [], done = [], queue = [], busy = false, obs = null;
  const fixTop = () => { const h = document.querySelector("header.site"), b = root.querySelector(".rt-bar"); if(h && b) b.style.top = (h.offsetHeight - 2) + "px"; };
  window.addEventListener("resize", fixTop);
  const msg = (t, e) => { $("msg").className = "hint" + (e ? " err" : ""); $("msg").textContent = t; };
  async function renderPage(i){
    const page = await doc.getPage(i + 1), r = (((page.rotate + rot[i]) % 360) + 360) % 360, base = page.getViewport({scale:1, rotation:r}), vp = page.getViewport({scale:240 / base.width, rotation:r});
    const cv = cards[i].querySelector("canvas"); cv.width = vp.width; cv.height = vp.height; await page.render({canvasContext:cv.getContext("2d"), viewport:vp}).promise; done[i] = true;
  }
  async function pump(){ if(busy) return; busy = true; while(queue.length){ const i = queue.shift(); try{ await renderPage(i); }catch(e){} } busy = false; }
  const queueRender = i => { done[i] = false; if(!queue.includes(i)) queue.push(i); pump(); };
  function refresh(){ const ch = rot.filter(x => x).length; $("count").textContent = n + " pages · " + ch + " rotated"; cards.forEach((c, i) => c.classList.toggle("ch", rot[i] !== 0)); }
  const spin = (i, d) => { rot[i] = (rot[i] + d + 360) % 360; queueRender(i); refresh(); };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("work").hidden = true; $("grid").innerHTML = ""; if(obs) obs.disconnect(); if(doc){ doc.destroy(); doc = null; } cards = []; done = []; queue = []; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err && err.name === "PasswordException" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; return; }
    n = doc.numPages; rot = new Array(n).fill(0); $("info").textContent = file.name + " (" + n + " pages)";
    obs = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ const i = +en.target.dataset.i; if(!done[i] && !queue.includes(i)){ queue.push(i); pump(); } } }), {rootMargin:"500px"});
    for(let i = 0; i < n; i++){
      const d = document.createElement("div"); d.className = "rt-pg"; d.dataset.i = i;
      d.innerHTML = '<div class="th"><canvas></canvas></div><span class="num">' + (i + 1) + '</span><div class="acts"><button class="alt" type="button" aria-label="Rotate page ' + (i + 1) + ' left">↺</button><button class="alt" type="button" aria-label="Rotate page ' + (i + 1) + ' right">↻</button></div>';
      const [l, r] = d.querySelectorAll("button"); l.onclick = () => spin(i, -90); r.onclick = () => spin(i, 90);
      $("grid").appendChild(d); cards.push(d); obs.observe(d);
    }
    $("work").hidden = false; fixTop(); refresh();
  };
  $("ar").onclick = () => { for(let i = 0; i < n; i++){ rot[i] = (rot[i] + 90) % 360; queueRender(i); } refresh(); };
  $("al").onclick = () => { for(let i = 0; i < n; i++){ rot[i] = (rot[i] + 270) % 360; queueRender(i); } refresh(); };
  $("rs").onclick = () => { for(let i = 0; i < n; i++) if(rot[i]){ rot[i] = 0; queueRender(i); } refresh(); msg("All pages are back to the original angle."); };
  $("go").onclick = async () => {
    if(!rot.some(x => x)) return msg("Rotate at least one page first.", true);
    msg("Building your PDF...");
    try{
      const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true});
      d.getPages().forEach((p, i) => { if(rot[i]) p.setRotation(PDFLib.degrees((((p.getRotation().angle + rot[i]) % 360) + 360) % 360)); });
      PL.dl(new Blob([await d.save()], {type:"application/pdf"}), name + "_rotated.pdf"); msg("Done. Your rotated PDF is downloading.");
    }catch(err){ msg("Could not build the PDF. The file may be damaged or protected.", true); }
  };
  return () => { window.removeEventListener("resize", fixTop); if(obs) obs.disconnect(); if(doc) doc.destroy(); };
}
mountRotatePdf(document.getElementById("tool"));
