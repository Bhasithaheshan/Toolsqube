/* ===================== TOOL: Sign PDF ===================== */
function mountSignPdf(root){
  root.innerHTML = `<style>
  .sg-tabs{display:flex;gap:6px;margin-bottom:12px}.sg-tabs button{padding:8px 16px}
  .sg-cv{width:100%;border:2px dashed var(--line);border-radius:12px;background:#fff;display:block;touch-action:none;cursor:crosshair}
  .sg-wrap{position:relative;max-width:760px;line-height:0;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#fff}
  .sg-wrap canvas{width:100%;height:auto;display:block}
  .sg-wrap img{position:absolute;height:auto}
  .sg-pend{cursor:move;outline:2px dashed var(--acc);touch-action:none}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  </style>
  <div class="card"><label for="f">1. Choose the PDF to sign</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="mk" hidden><label>2. Create your signature</label>
    <div class="sg-tabs"><button id="tb1" type="button">Draw</button><button id="tb2" type="button" class="alt">Type</button><button id="tb3" type="button" class="alt">Upload image</button></div>
    <div id="p1"><canvas id="dc" class="sg-cv" width="800" height="240"></canvas>
      <div class="row" style="margin-top:10px"><div><select id="col" aria-label="Ink color"><option value="#111111">Black ink</option><option value="#1b3fa0">Blue ink</option></select></div><div><button id="clr" class="alt" type="button">Clear</button></div></div>
      <p class="hint">Draw your signature with your mouse, finger or pen.</p></div>
    <div id="p2" hidden><input id="tt" type="text" placeholder="Type your name" maxlength="40">
      <div style="margin-top:10px"><select id="tf" aria-label="Style"><option value='"Segoe Script","Bradley Hand","Snell Roundhand",cursive'>Handwriting 1</option><option value='"Brush Script MT","Lucida Handwriting","Apple Chancery",cursive'>Handwriting 2</option><option value='italic Georgia,"Times New Roman",serif'>Classic</option></select></div>
      <canvas id="tc" class="sg-cv" width="800" height="200" style="margin-top:10px;cursor:default"></canvas></div>
    <div id="p3" hidden><input id="uf" type="file" accept="image/*"><label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="ub" type="checkbox" checked> Remove the white background</label>
      <p class="hint">Use a photo or scan of your signature on white paper.</p></div>
    <div class="row" style="margin-top:14px"><div><button id="use" type="button">Use this signature</button></div></div><p id="sgmsg" class="hint" aria-live="polite"></p></div>
  <div class="card" id="vw" hidden><label>3. Place it on the page</label>
    <div class="row" style="margin-bottom:10px"><div><button id="pv" class="alt" type="button">← Previous</button></div><div><span id="pgl" style="font-weight:700"></span></div><div><button id="nx" class="alt" type="button">Next →</button></div></div>
    <div id="wrap" class="sg-wrap"><canvas id="cv"></canvas><img id="ov" class="sg-pend" alt="Your signature"></div>
    <div style="margin-top:12px"><label for="sz" style="display:flex;justify-content:space-between">Signature size <span id="szv"></span></label><input id="sz" type="range" min="8" max="60" step="1" value="26" style="width:100%;accent-color:var(--acc)"></div>
    <p class="hint">Drag the signature to the right spot, then click Place signature here. Use Add another to sign more places or pages.</p>
    <div class="row" style="margin-top:8px"><div><button id="pl" type="button">Place signature here</button></div><div><button id="ad" class="alt" type="button" hidden>Add another signature</button></div></div>
    <div id="plist" style="margin-top:10px"></div>
    <div class="row" style="margin-top:12px"><div><button id="go" disabled>Download signed PDF</button></div></div><div id="status" aria-live="polite"></div></div>`;
  let doc = null, bytes = null, n = 0, cur = 1, name = "document", sig = null, placed = [], pending = true, pos = {x:.5 - .13, y:.78}, sw = .26, drag = null, tab = 1;
  const g = $("dc").getContext("2d");
  const st = (m, e) => { $("status").className = e ? "err" : ""; $("status").textContent = m; };
  const sm = (m, e) => { $("sgmsg").className = "hint" + (e ? " err" : ""); $("sgmsg").textContent = m; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---- signature creation ---- */
  const setTab = t => { tab = t; [1, 2, 3].forEach(k => { $("p" + k).hidden = k !== t; $("tb" + k).className = k === t ? "" : "alt"; }); if(t === 2) drawType(); };
  $("tb1").onclick = () => setTab(1); $("tb2").onclick = () => setTab(2); $("tb3").onclick = () => setTab(3);
  function ink(){ g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = $("col").value; }
  const dc = $("dc"), pt = e => { const r = dc.getBoundingClientRect(); return {x:(e.clientX - r.left) * dc.width / r.width, y:(e.clientY - r.top) * dc.height / r.height}; };
  let drawing = false, drew = false;
  dc.onpointerdown = e => { drawing = true; drew = true; dc.setPointerCapture(e.pointerId); ink(); const p = pt(e); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + .1, p.y + .1); g.stroke(); };
  dc.onpointermove = e => { if(!drawing) return; const p = pt(e); g.lineTo(p.x, p.y); g.stroke(); g.beginPath(); g.moveTo(p.x, p.y); };
  dc.onpointerup = dc.onpointercancel = () => { drawing = false; };
  $("clr").onclick = () => { g.clearRect(0, 0, dc.width, dc.height); drew = false; };
  function drawType(){ const c = $("tc"), x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); x.fillStyle = $("col").value; x.textBaseline = "middle"; x.font = "88px " + $("tf").value; x.fillText($("tt").value || "Your name", 30, c.height / 2); }
  ["tt", "tf", "col"].forEach(k => $(k).oninput = () => tab === 2 && drawType());
  function trim(src){
    const w = src.width, h = src.height, d = src.getContext("2d").getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(d[(y * w + x) * 4 + 3] > 20){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    if(x1 < 0) return null; const p = 6, cw = x1 - x0 + 1 + 2 * p, ch = y1 - y0 + 1 + 2 * p, o = document.createElement("canvas"); o.width = cw; o.height = ch; o.getContext("2d").drawImage(src, x0 - p, y0 - p, cw, ch, 0, 0, cw, ch); return o;
  }
  async function fromUpload(file){
    const bmp = await createImageBitmap(file), sc = Math.min(1, 900 / bmp.width), c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    const x = c.getContext("2d", {willReadFrequently:true}); x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    if($("ub").checked){ const im = x.getImageData(0, 0, c.width, c.height), d = im.data; for(let i = 0; i < d.length; i += 4){ const lum = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i + 3] = Math.min(255, Math.max(0, (255 - lum) * 2.2)) * (d[i + 3] / 255); } x.putImageData(im, 0, 0); }
    return c;
  }
  $("use").onclick = async () => {
    try{
      let src;
      if(tab === 1){ if(!drew) return sm("Draw your signature first.", true); src = dc; }
      else if(tab === 2){ if(!$("tt").value.trim()) return sm("Type your name first.", true); drawType(); src = $("tc"); }
      else { const f = $("uf").files[0]; if(!f) return sm("Choose an image of your signature first.", true); src = await fromUpload(f); }
      const t = trim(src); if(!t) return sm("The signature looks empty. Try again.", true);
      const blob = await new Promise(r => t.toBlob(r, "image/png"));
      sig = {bytes:new Uint8Array(await blob.arrayBuffer()), ar:t.height / t.width, url:t.toDataURL("image/png")};
      $("ov").src = sig.url; pending = true; $("pl").hidden = false; $("ad").hidden = true; sm("Signature ready. Now place it on the page below."); $("vw").hidden = false; layout(); $("vw").scrollIntoView({behavior:"smooth"});
    }catch(err){ sm("Could not use this signature. Try again.", true); }
  };

  /* ---- viewer ---- */
  function layout(){
    const ov = $("ov"); ov.hidden = !(sig && pending); ov.style.width = sw * 100 + "%"; ov.style.left = pos.x * 100 + "%"; ov.style.top = pos.y * 100 + "%";
    $("szv").textContent = Math.round(sw * 100) + "%"; $("pgl").textContent = "Page " + cur + " of " + n; $("pv").disabled = cur <= 1; $("nx").disabled = cur >= n;
    $("wrap").querySelectorAll(".sg-fix").forEach(x => x.remove());
    placed.filter(p => p.page === cur).forEach(p => { const im = document.createElement("img"); im.className = "sg-fix"; im.src = p.url; im.alt = ""; im.style.cssText = "width:" + p.w * 100 + "%;left:" + p.x * 100 + "%;top:" + p.y * 100 + "%"; $("wrap").appendChild(im); });
    const L = $("plist"); L.innerHTML = ""; placed.forEach((p, i) => { const d = document.createElement("div"); d.style.cssText = "display:flex;gap:8px;align-items:center;margin-top:6px"; d.innerHTML = '<span></span><button class="danger" type="button" style="padding:4px 10px;font-size:.85rem">Remove</button>'; d.querySelector("span").textContent = "Signature on page " + p.page; d.querySelector("button").onclick = () => { placed.splice(i, 1); layout(); }; L.appendChild(d); });
    $("go").disabled = !placed.length;
  }
  async function show(p){ cur = clamp(p, 1, n); await PL.render(doc, cur, $("cv"), 760); layout(); }
  $("pv").onclick = () => show(cur - 1); $("nx").onclick = () => show(cur + 1);
  $("sz").oninput = () => { sw = $("sz").value / 100; layout(); };
  const ov = $("ov");
  ov.onpointerdown = e => { e.preventDefault(); ov.setPointerCapture(e.pointerId); const r = $("wrap").getBoundingClientRect(); drag = {dx:e.clientX - r.left - pos.x * r.width, dy:e.clientY - r.top - pos.y * r.height}; };
  ov.onpointermove = e => { if(!drag) return; const r = $("wrap").getBoundingClientRect(); pos.x = clamp((e.clientX - r.left - drag.dx) / r.width, 0, 1 - sw); pos.y = clamp((e.clientY - r.top - drag.dy) / r.height, 0, 1 - ov.offsetHeight / r.height); layout(); };
  ov.onpointerup = ov.onpointercancel = () => { drag = null; };
  $("pl").onclick = () => { placed.push({page:cur, x:pos.x, y:pos.y, w:sw, ar:sig.ar, bytes:sig.bytes, url:sig.url}); pending = false; $("pl").hidden = true; $("ad").hidden = false; layout(); st("Placed. Add another, or download the signed PDF."); };
  $("ad").onclick = () => { pending = true; $("pl").hidden = false; $("ad").hidden = true; pos = {x:.5 - sw / 2, y:.78}; layout(); st(""); };

  $("f").onchange = async e => {
    const file = e.target.files[0]; $("mk").hidden = true; $("vw").hidden = true; if(doc){ doc.destroy(); doc = null; } placed = []; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; n = doc.numPages; $("info").textContent = file.name + " (" + n + " pages)"; $("mk").hidden = false; await show(1); if(sig) $("vw").hidden = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err && err.name === "PasswordException" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    if(!placed.length) return st("Click Place signature here first.", true);
    $("go").disabled = true; st("Signing...");
    try{
      const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), cache = new Map();
      for(const p of placed){
        const page = d.getPage(p.page - 1), dm = PL.dims(page); let img = cache.get(p.url); if(!img){ img = await d.embedPng(p.bytes); cache.set(p.url, img); }
        const w = p.w * dm.Wd, h = w * p.ar, [px, py] = PL.toPage(dm, p.x * dm.Wd, dm.Hd - p.y * dm.Hd - h);
        page.drawImage(img, {x:px, y:py, width:w, height:h, rotate:PDFLib.degrees(dm.r)});
      }
      PL.dl(new Blob([await d.save()], {type:"application/pdf"}), name + "_signed.pdf"); st("Done. Your signed PDF is downloading.");
    }catch(err){ st("Could not sign this PDF.", true); }
    $("go").disabled = false;
  };
  setTab(1); $("sz").value = 26; layout();
  return () => { if(doc) doc.destroy(); };
}
mountSignPdf(document.getElementById("tool"));
