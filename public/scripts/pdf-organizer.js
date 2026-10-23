/* ===================== TOOL: PDF Organizer ===================== */
function mountPdfOrganizer(root){
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.js";
  root.innerHTML = `<style>
  .pdf-bar{position:sticky;top:65px;z-index:6;padding:12px 14px}
  .pdf-bar::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:24px;background:var(--bg)}
  .pdf-bar .row{gap:6px;margin-top:8px;align-items:center}
  .pdf-bar .row>*{flex:0 1 auto}
  .pdf-bar input[type=text]{width:220px;max-width:100%;padding:8px 12px}
  .pdf-bar button{padding:7px 12px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  .pdf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
  .pg{position:relative;border:2px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card);cursor:pointer;user-select:none}
  .pg:hover{border-color:var(--acc)}
  .pg.on{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 30%,transparent)}
  .pg .th{aspect-ratio:3/4;display:grid;place-items:center;background:var(--surface2)}
  .pg canvas{width:100%;height:100%;object-fit:contain;display:block;background:#fff}
  .pg .num{position:absolute;left:6px;bottom:6px;background:rgba(12,26,41,.82);color:#fff;font-size:.8rem;font-weight:700;padding:1px 8px;border-radius:999px}
  .pg .tick{position:absolute;right:6px;top:6px;width:24px;height:24px;border-radius:50%;background:var(--acc);color:var(--accink);display:none;place-items:center;font-weight:800;font-size:.9rem}
  .pg.on .tick{display:grid}
  .pdf-count{font-weight:700;margin:0}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label>
    <input id="f" type="file" accept="application/pdf,.pdf">
    <p id="info" class="hint">No file chosen.</p></div>
  <div id="work" hidden>
    <div class="card pdf-bar">
      <p id="count" class="pdf-count"></p>
      <div class="row">
        <button id="all" class="alt" type="button">Select all</button>
        <button id="none" class="alt" type="button">Clear</button>
        <button id="inv" class="alt" type="button">Invert</button>
        <button id="rot" class="alt" type="button">Rotate selected</button>
        <button id="del" class="danger" type="button">Delete selected</button>
        <button id="res" class="alt" type="button" hidden>Restore deleted</button>
      </div>
      <div class="row">
        <input id="rng" type="text" placeholder="Pages, e.g. 1-10, 15, 20-25" aria-label="Page range">
        <button id="rsel" class="alt" type="button">Select these</button>
        <button id="rdl" type="button">Download these pages</button>
      </div>
      <div class="row">
        <button id="dsel" class="alt" type="button">Download selected</button>
        <button id="drem" type="button">Download remaining pages</button>
      </div>
      <p id="msg" class="hint" style="margin-top:8px" aria-live="polite">Click pages to select them. Shift+click selects a range.</p>
    </div>
    <div id="grid" class="pdf-grid"></div>
  </div>`;
  const fixTop = () => { const h = document.querySelector("header.site"), b = root.querySelector(".pdf-bar"); if(h && b) b.style.top = (h.offsetHeight - 2) + "px"; };
  fixTop(); window.addEventListener("resize", fixTop);
  let doc = null, bytes = null, srcDoc = null, n = 0, name = "document", last = -1, busy = false, obs = null;
  let deleted = new Set(), sel = new Set(), rot = [], cards = [], done = [], queue = [];
  const msg = (t, err) => { $("msg").className = "hint" + (err ? " err" : ""); $("msg").textContent = t; };

  async function renderPage(i){
    const page = await doc.getPage(i + 1), r = (page.rotate + rot[i]) % 360;
    const base = page.getViewport({scale:1, rotation:r}), vp = page.getViewport({scale:240 / base.width, rotation:r});
    const cv = cards[i].querySelector("canvas"); cv.width = vp.width; cv.height = vp.height;
    await page.render({canvasContext:cv.getContext("2d"), viewport:vp}).promise;
    done[i] = true;
  }
  async function pump(){
    if(busy) return; busy = true;
    while(queue.length){ const i = queue.shift(); try{ await renderPage(i); }catch(e){} }
    busy = false;
  }
  function refresh(){
    cards.forEach((c, i) => { c.hidden = deleted.has(i); const on = sel.has(i); c.classList.toggle("on", on); c.setAttribute("aria-checked", on); });
    const keep = n - deleted.size;
    $("count").textContent = n + " pages · " + keep + " kept · " + sel.size + " selected" + (deleted.size ? " · " + deleted.size + " deleted" : "");
    ["del", "rot", "dsel"].forEach(k => $(k).disabled = sel.size === 0);
    $("drem").disabled = keep === 0; $("res").hidden = deleted.size === 0;
  }
  function toggle(i, shift){
    if(shift && last >= 0){
      const [a, b] = [Math.min(last, i), Math.max(last, i)];
      for(let k = a; k <= b; k++) if(!deleted.has(k)) sel.add(k);
    }else{ sel.has(i) ? sel.delete(i) : sel.add(i); }
    last = i; refresh();
  }
  function parseRange(s){
    const out = [], seen = new Set();
    for(const part of s.split(",").map(x => x.trim()).filter(Boolean)){
      const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if(!m) return {err:'"' + part + '" is not valid. Use something like 1-10, 15, 20-25.'};
      let a = +m[1], b = m[2] ? +m[2] : a; if(a > b) [a, b] = [b, a];
      if(a < 1 || b > n) return {err:"Pages must be between 1 and " + n + "."};
      for(let p = a; p <= b; p++){ const i = p - 1; if(!seen.has(i) && !deleted.has(i)){ seen.add(i); out.push(i); } }
    }
    return out.length ? {pages:out} : {err:"Type the pages you want, for example 1-10."};
  }
  async function build(idx, suffix){
    if(!idx.length) return msg("There are no pages to download.", true);
    msg("Building your PDF...");
    try{
      if(!srcDoc) srcDoc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true});
      const out = await PDFLib.PDFDocument.create(), pages = await out.copyPages(srcDoc, idx);
      pages.forEach((p, k) => { const x = rot[idx[k]]; if(x) p.setRotation(PDFLib.degrees((p.getRotation().angle + x) % 360)); out.addPage(p); });
      const blob = new Blob([await out.save()], {type:"application/pdf"}), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name + suffix + ".pdf"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      msg("Done. " + idx.length + " page(s) saved as " + name + suffix + ".pdf");
    }catch(e){ msg("Could not build the PDF. The file may be damaged or protected.", true); }
  }
  const kept = () => cards.map((_, i) => i).filter(i => !deleted.has(i));

  async function load(file){
    if(!file) return;
    $("work").hidden = true; $("grid").innerHTML = ""; if(obs) obs.disconnect(); if(doc) doc.destroy();
    doc = null; srcDoc = null; deleted = new Set(); sel = new Set(); cards = []; done = []; queue = []; last = -1;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer();
      doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;
    }catch(e){
      $("info").className = "hint err";
      $("info").textContent = e && e.name === "PasswordException" ? "This PDF is password protected. Remove the password first, then try again." : "Could not read this PDF.";
      return;
    }
    n = doc.numPages; rot = new Array(n).fill(0);
    $("info").textContent = file.name + " (" + n + " pages)";
    obs = new IntersectionObserver(es => es.forEach(en => {
      if(en.isIntersecting){ const i = +en.target.dataset.i; if(!done[i] && !queue.includes(i)){ queue.push(i); pump(); } }
    }), {rootMargin:"500px"});
    for(let i = 0; i < n; i++){
      const d = document.createElement("div"); d.className = "pg"; d.dataset.i = i; d.tabIndex = 0; d.setAttribute("role", "checkbox"); d.setAttribute("aria-label", "Page " + (i + 1));
      d.innerHTML = '<div class="th"><canvas></canvas></div><span class="num">' + (i + 1) + '</span><span class="tick" aria-hidden="true">✓</span>';
      d.onclick = e => toggle(i, e.shiftKey);
      d.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(i, e.shiftKey); } };
      $("grid").appendChild(d); cards.push(d); obs.observe(d);
    }
    $("work").hidden = false; fixTop(); msg("Click pages to select them. Shift+click selects a range."); refresh();
  }
  $("f").onchange = e => load(e.target.files[0]);
  $("all").onclick = () => { kept().forEach(i => sel.add(i)); refresh(); };
  $("none").onclick = () => { sel.clear(); refresh(); };
  $("inv").onclick = () => { const s = new Set(); kept().forEach(i => { if(!sel.has(i)) s.add(i); }); sel = s; refresh(); };
  $("del").onclick = () => { sel.forEach(i => deleted.add(i)); const c = sel.size; sel.clear(); refresh(); msg(c + " page(s) deleted. They will not be in your download. Use Restore deleted to bring them back."); };
  $("res").onclick = () => { deleted.clear(); refresh(); msg("All pages restored."); };
  $("rot").onclick = () => { sel.forEach(i => { rot[i] = (rot[i] + 90) % 360; done[i] = false; if(!queue.includes(i)) queue.push(i); }); pump(); msg("Rotated selected pages 90°."); };
  $("rsel").onclick = () => {
    const r = parseRange($("rng").value); if(r.err) return msg(r.err, true);
    sel = new Set(r.pages); refresh(); cards[r.pages[0]].scrollIntoView({behavior:"smooth", block:"center"}); msg(r.pages.length + " page(s) selected.");
  };
  $("rdl").onclick = () => { const r = parseRange($("rng").value); if(r.err) return msg(r.err, true); build(r.pages, "_pages"); };
  $("dsel").onclick = () => build([...sel].sort((a, b) => a - b), "_selected");
  $("drem").onclick = () => build(kept(), "_edited");
  $("rng").onkeydown = e => { if(e.key === "Enter") $("rsel").click(); };
  return () => { window.removeEventListener("resize", fixTop); if(obs) obs.disconnect(); if(doc) doc.destroy(); };
}

mountPdfOrganizer(document.getElementById("tool"));
