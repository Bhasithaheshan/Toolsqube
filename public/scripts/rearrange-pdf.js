/* ===================== TOOL: Rearrange PDF Pages ===================== */
function mountRearrangePdf(root){
  root.innerHTML = `<style>
  .ra-bar{position:sticky;top:65px;z-index:6;padding:12px 14px}
  .ra-bar::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:24px;background:var(--bg)}
  .ra-bar .row{gap:6px;margin-top:8px;align-items:center}.ra-bar .row>*{flex:0 1 auto}.ra-bar button{padding:7px 12px;font-size:.9rem}
  .ra-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
  .ra-pg{position:relative;border:2px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card);cursor:grab}
  .ra-pg.drag{opacity:.4}.ra-pg.over{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 30%,transparent)}
  .ra-pg .th{aspect-ratio:3/4;display:grid;place-items:center;background:var(--surface2)}
  .ra-pg canvas{width:100%;height:100%;object-fit:contain;display:block;background:#fff}
  .ra-pg .num{position:absolute;left:6px;top:6px;background:var(--acc);color:var(--accink);font-size:.8rem;font-weight:800;padding:1px 9px;border-radius:999px}
  .ra-pg .was{position:absolute;right:6px;top:6px;background:rgba(12,26,41,.82);color:#fff;font-size:.7rem;padding:1px 7px;border-radius:999px}
  .ra-pg .acts{display:flex;gap:3px;padding:5px;justify-content:center}.ra-pg .acts button{padding:4px 9px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="work" hidden>
    <div class="card ra-bar"><p id="count" style="font-weight:700;margin:0"></p>
      <div class="row"><button id="rv" class="alt" type="button">Reverse order</button><button id="rs" class="alt" type="button">Reset</button><button id="go" type="button">Download rearranged PDF</button></div>
      <p id="msg" class="hint" style="margin-top:8px" aria-live="polite">Drag a page to a new place. On a phone, use the arrow buttons under each page.</p></div>
    <div id="grid" class="ra-grid"></div></div>`;
  let doc = null, bytes = null, n = 0, name = "document", items = [], key = 0, obs = null, dragK = null, busy = false, queue = [];
  const cards = new Map(); // key -> element
  const fixTop = () => { const h = document.querySelector("header.site"), b = root.querySelector(".ra-bar"); if(h && b) b.style.top = (h.offsetHeight - 2) + "px"; };
  window.addEventListener("resize", fixTop);
  const msg = (t, e) => { $("msg").className = "hint" + (e ? " err" : ""); $("msg").textContent = t; };
  async function renderThumb(it){ const el = cards.get(it.k); if(!el || el.dataset.done) return; const page = await doc.getPage(it.src + 1), b = page.getViewport({scale:1}), vp = page.getViewport({scale:240 / b.width}), cv = el.querySelector("canvas"); cv.width = vp.width; cv.height = vp.height; await page.render({canvasContext:cv.getContext("2d"), viewport:vp}).promise; el.dataset.done = 1; }
  async function pump(){ if(busy) return; busy = true; while(queue.length){ const it = queue.shift(); try{ await renderThumb(it); }catch(e){} } busy = false; }
  function makeCard(it){
    const d = document.createElement("div"); d.className = "ra-pg"; d.draggable = true; d.dataset.k = it.k;
    d.innerHTML = '<div class="th"><canvas></canvas></div><span class="num"></span><span class="was"></span><div class="acts"><button class="alt" type="button" aria-label="Move earlier">◀</button><button class="alt" type="button" aria-label="Move later">▶</button><button class="alt" type="button" aria-label="Duplicate page">⧉</button><button class="danger" type="button" aria-label="Remove page">✕</button></div>';
    const [l, r, dup, del] = d.querySelectorAll("button");
    l.onclick = () => move(it.k, -1); r.onclick = () => move(it.k, 1);
    dup.onclick = () => { const i = items.findIndex(x => x.k === it.k), c = {src:it.src, k:++key}; items.splice(i + 1, 0, c); cards.set(c.k, makeCard(c)); layout(); queue.push(c); pump(); };
    del.onclick = () => { if(items.length <= 1) return msg("A PDF needs at least one page.", true); items = items.filter(x => x.k !== it.k); cards.get(it.k).remove(); cards.delete(it.k); layout(); };
    d.ondragstart = e => { dragK = it.k; d.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); };
    d.ondragend = () => { d.classList.remove("drag"); document.querySelectorAll(".ra-pg.over").forEach(x => x.classList.remove("over")); };
    d.ondragover = e => { e.preventDefault(); d.classList.add("over"); }; d.ondragleave = () => d.classList.remove("over");
    d.ondrop = e => { e.preventDefault(); d.classList.remove("over"); if(dragK === null || dragK === it.k) return; const a = items.findIndex(x => x.k === dragK), b = items.findIndex(x => x.k === it.k), [m] = items.splice(a, 1); items.splice(b, 0, m); dragK = null; layout(); };
    if(obs) obs.observe(d); return d;
  }
  function layout(){
    const g = $("grid"); items.forEach((it, i) => { const el = cards.get(it.k); el.querySelector(".num").textContent = i + 1; el.querySelector(".was").textContent = "was " + (it.src + 1); g.appendChild(el); });
    const moved = items.some((it, i) => it.src !== i) || items.length !== n; $("count").textContent = items.length + " pages" + (moved ? " · order changed" : ""); fixTop();
  }
  function move(k, d){ const i = items.findIndex(x => x.k === k), j = i + d; if(j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; layout(); cards.get(k).scrollIntoView({block:"nearest", behavior:"smooth"}); }
  function build(){
    $("grid").innerHTML = ""; cards.clear(); items = Array.from({length:n}, (_, i) => ({src:i, k:++key}));
    if(obs) obs.disconnect(); obs = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ const it = items.find(x => x.k === +en.target.dataset.k); if(it && !en.target.dataset.done && !queue.includes(it)){ queue.push(it); pump(); } } }), {rootMargin:"500px"});
    items.forEach(it => cards.set(it.k, makeCard(it))); layout();
  }
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("work").hidden = true; if(obs) obs.disconnect(); if(doc){ doc.destroy(); doc = null; } queue = []; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const chk = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(chk.isEncrypted) throw new Error("enc"); doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" || (err && err.name === "PasswordException") ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; return; }
    n = doc.numPages; $("info").textContent = file.name + " (" + n + " pages)"; $("work").hidden = false; build(); msg("Drag a page to a new place. On a phone, use the arrow buttons under each page.");
  };
  $("rv").onclick = () => { items.reverse(); layout(); msg("Order reversed."); };
  $("rs").onclick = () => { build(); msg("Back to the original order."); };
  $("go").onclick = async () => {
    msg("Building your PDF...");
    try{
      const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), out = await PDFLib.PDFDocument.create(), pages = await out.copyPages(src, items.map(i => i.src)); pages.forEach(p => out.addPage(p));
      PL.dl(new Blob([await out.save()], {type:"application/pdf"}), name + "_rearranged.pdf"); msg("Done. Your PDF is downloading.");
    }catch(err){ msg("Could not build the PDF. The file may be damaged or protected.", true); }
  };
  return () => { window.removeEventListener("resize", fixTop); if(obs) obs.disconnect(); if(doc) doc.destroy(); };
}
mountRearrangePdf(document.getElementById("tool"));
