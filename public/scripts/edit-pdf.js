/* ===================== TOOL: Fill and Edit PDF ===================== */
function mountEditPdf(root){
  root.innerHTML = `<style>
  .ed-tools{display:flex;gap:6px;flex-wrap:wrap}.ed-tools button{padding:8px 14px}
  .ed-vp{border:1px solid var(--line);border-radius:12px;background:var(--surface2);overflow:auto;max-height:78vh;padding:10px}
  .ed-vp canvas{display:block;margin:0 auto;box-shadow:0 2px 14px rgba(0,0,0,.35);background:#fff;touch-action:none;outline:none}
  .ed-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:12px}.ed-g label{font-weight:600;font-size:.9rem;margin-bottom:4px;display:flex;justify-content:space-between}
  .ed-g input[type=color]{width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)}
  .ed-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="ed" hidden>
    <div class="card" id="fmc" hidden><label>Form fields found in this PDF</label><p class="hint" style="margin-top:0">Fill the fields here. They are written into the PDF when you save.</p><div id="ff" class="ed-f"></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="fl" type="checkbox" checked> Make the filled fields part of the page (so every PDF viewer shows them)</label></div>
    <div class="card"><label>2. Pick a tool, then click or drag on the page</label>
      <div class="ed-tools" id="tools"><button data-t="sel" type="button">Select / move</button><button data-t="text" type="button" class="alt">Text</button><button data-t="tick" type="button" class="alt">✓ Tick</button><button data-t="cross" type="button" class="alt">✗ Cross</button><button data-t="hl" type="button" class="alt">Highlight</button><button data-t="wo" type="button" class="alt">White box</button><button data-t="draw" type="button" class="alt">Draw</button><button id="undo" type="button" class="alt">↶ Undo</button></div>
      <div id="pr" class="ed-g" hidden>
        <div id="pt" style="grid-column:1/-1"><label for="tx">Text</label><div class="row" style="gap:8px"><input id="tx" type="text" maxlength="200" style="flex:1 1 200px"><button id="dt" type="button" class="alt">Today's date</button></div></div>
        <div><label for="sz">Size <span id="szv"></span></label><input id="sz" type="range" min="6" max="72" step="1" style="width:100%;accent-color:var(--acc)"></div>
        <div><label for="cl">Color</label><input id="cl" type="color"></div>
        <div id="pb"><label>Style</label><span style="display:flex;gap:8px;align-items:center;font-weight:600"><input id="bd" type="checkbox"> Bold</span></div>
        <div><label>&nbsp;</label><button id="del" type="button" class="danger">Delete this</button></div></div>
      <div class="row" style="margin-top:12px;align-items:center"><div><button id="pp" class="alt" type="button">← Prev</button></div><div style="text-align:center"><b id="pgl"></b></div><div><button id="pn" class="alt" type="button">Next →</button></div>
        <div style="text-align:right"><button id="zo" class="alt" type="button">−</button> <b id="zv">100%</b> <button id="zi" class="alt" type="button">+</button> <button id="zf" class="alt" type="button">Fit</button></div></div></div>
    <div id="vp" class="ed-vp"><canvas id="cv" tabindex="0" aria-label="PDF page"></canvas></div>
    <div class="card" style="margin-top:12px"><div class="row"><div><button id="go" type="button">Save PDF</button></div></div><progress id="bar" hidden></progress><div id="status" aria-live="polite"></div>
      <p class="hint">Tip: Delete removes the selected item. Arrow keys nudge it. Ctrl+Z undoes. The white box covers old text, then add new text on top.</p></div></div>${PL.resultCard}`;
  const FONT = 'Helvetica, Arial, sans-serif', DEF = {text:"#111111", tick:"#111111", cross:"#111111", hl:"#ffe600", wo:"#ffffff", draw:"#1b3fa0"}, TOOLS = ["sel", "text", "tick", "cross", "hl", "wo", "draw"];
  let bytes = null, pd = null, n = 0, name = "document", cur = 1, W = 600, H = 800, sc = 1, base = null, zoom = 100, tok = 0, tool = "sel", objs = [], sel = null, uid = 0, hist = ["[]"], mode = null, formDoc = null, fields = [];
  const cv = $("cv"), g = cv.getContext("2d"), mc = document.createElement("canvas").getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const say = (m, e) => { $("status").className = e ? "err" : ""; $("status").textContent = m; };
  const get = () => objs.find(o => o.id === sel) || null, snap = () => { hist.push(JSON.stringify(objs)); if(hist.length > 80) hist.shift(); };
  const tw = o => { mc.font = (o.bold ? "bold " : "") + o.size + "px " + FONT; return mc.measureText(o.text || " ").width; };
  function bbox(o){
    if(o.type === "text") return {x:o.x, y:o.y, w:tw(o), h:o.size * 1.25};
    if(o.type === "tick" || o.type === "cross") return {x:o.x - o.s / 2, y:o.y - o.s / 2, w:o.s, h:o.s};
    if(o.type === "draw"){ const xs = o.pts.map(p => p[0]), ys = o.pts.map(p => p[1]), m = o.w; return {x:Math.min(...xs) - m, y:Math.min(...ys) - m, w:Math.max(...xs) - Math.min(...xs) + 2 * m, h:Math.max(...ys) - Math.min(...ys) + 2 * m}; }
    return {x:Math.min(o.x, o.x + o.w), y:Math.min(o.y, o.y + o.h), w:Math.abs(o.w), h:Math.abs(o.h)};
  }
  const markLines = o => { const s = o.s, x = o.x, y = o.y; return o.type === "tick" ? [[[x - .4 * s, y + .05 * s], [x - .1 * s, y + .38 * s]], [[x - .1 * s, y + .38 * s], [x + .45 * s, y - .4 * s]]] : [[[x - .38 * s, y - .38 * s], [x + .38 * s, y + .38 * s]], [[x - .38 * s, y + .38 * s], [x + .38 * s, y - .38 * s]]]; };

  /* ---------- drawing ---------- */
  function drawObj(o){
    g.save(); g.scale(sc, sc); g.lineCap = "round"; g.lineJoin = "round";
    if(o.type === "text"){ g.fillStyle = o.color; g.font = (o.bold ? "bold " : "") + o.size + "px " + FONT; g.textBaseline = "alphabetic"; g.fillText(o.text, o.x, o.y + o.size * .85); }
    else if(o.type === "hl"){ g.globalCompositeOperation = "multiply"; g.fillStyle = o.color; g.fillRect(o.x, o.y, o.w, o.h); }
    else if(o.type === "wo"){ g.fillStyle = "#fff"; g.fillRect(o.x, o.y, o.w, o.h); }
    else if(o.type === "draw"){ g.strokeStyle = o.color; g.lineWidth = o.w; g.beginPath(); o.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if(o.pts.length === 1) g.lineTo(o.pts[0][0] + .1, o.pts[0][1]); g.stroke(); }
    else{ g.strokeStyle = o.color; g.lineWidth = o.s * .13; for(const [a, b] of markLines(o)){ g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    g.restore();
  }
  function drawSel(o){ const b = bbox(o), acc = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#0b8a93"; g.save(); g.scale(sc, sc); g.strokeStyle = acc; g.lineWidth = 1.5 / sc * 1.4; g.setLineDash([5 / sc, 3 / sc]); g.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); g.setLineDash([]); if(o.type !== "draw"){ g.fillStyle = "#fff"; g.fillRect(b.x + b.w - 4, b.y + b.h - 4, 10 / sc * 1.2, 10 / sc * 1.2); g.strokeRect(b.x + b.w - 4, b.y + b.h - 4, 10 / sc * 1.2, 10 / sc * 1.2); } g.restore(); }
  function draw(){
    if(!base) return; cv.width = base.width; cv.height = base.height; g.drawImage(base, 0, 0); objs.filter(o => o.page === cur).forEach(drawObj); const s = get(); if(s && s.page === cur) drawSel(s);
    $("pgl").textContent = "Page " + cur + " of " + n; $("pp").disabled = cur <= 1; $("pn").disabled = cur >= n;
  }
  async function show(p){ cur = clamp(p, 1, n); const my = ++tok, pg = await pd.getPage(cur), v1 = pg.getViewport({scale:1}), s = 1000 / v1.width, vp = pg.getViewport({scale:s}), c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; await pg.render({canvasContext:c.getContext("2d"), viewport:vp}).promise; if(my !== tok) return; base = c; W = v1.width; H = v1.height; sc = s; fit(); draw(); }
  const fit = () => { cv.style.width = Math.round(($("vp").clientWidth - 20) * zoom / 100) + "px"; $("zv").textContent = zoom + "%"; };

  /* ---------- panel ---------- */
  function panel(){
    const o = get(); $("pr").hidden = !o; if(!o) return; const t = o.type === "text", sizeKey = t ? o.size : o.type === "draw" ? o.w : o.type === "tick" || o.type === "cross" ? o.s : null;
    $("pt").hidden = !t; $("pb").hidden = !t; $("sz").parentElement.hidden = sizeKey === null; $("cl").parentElement.hidden = o.type === "wo";
    if(t){ $("tx").value = o.text; $("bd").checked = !!o.bold; } if(sizeKey !== null){ $("sz").min = o.type === "draw" ? 1 : t ? 6 : 8; $("sz").max = o.type === "draw" ? 20 : t ? 96 : 80; $("sz").value = sizeKey; $("szv").textContent = Math.round(sizeKey); } if(o.type !== "wo") $("cl").value = o.color;
  }
  const edit = (fn, done) => { const o = get(); if(!o) return; fn(o); draw(); panel(); if(done) snap(); };
  $("tx").oninput = () => edit(o => { o.text = $("tx").value; }); $("tx").onchange = snap;
  $("sz").oninput = () => edit(o => { const v = +$("sz").value; if(o.type === "text") o.size = v; else if(o.type === "draw") o.w = v; else o.s = v; }); $("sz").onchange = snap;
  $("cl").oninput = () => edit(o => { o.color = $("cl").value; }); $("cl").onchange = snap;
  $("bd").onchange = () => edit(o => { o.bold = $("bd").checked; }, true);
  $("dt").onclick = () => edit(o => { o.text = new Date().toLocaleDateString(undefined, {year:"numeric", month:"long", day:"numeric"}); }, true);
  $("del").onclick = () => { objs = objs.filter(o => o.id !== sel); sel = null; snap(); panel(); draw(); };
  function setTool(t){ tool = t; document.querySelectorAll("#tools [data-t]").forEach(b => b.className = b.dataset.t === t ? "" : "alt"); cv.style.cursor = t === "sel" ? "default" : "crosshair"; }
  document.querySelectorAll("#tools [data-t]").forEach(b => b.onclick = () => setTool(b.dataset.t)); setTool("sel");
  $("undo").onclick = () => { if(hist.length < 2) return; hist.pop(); objs = JSON.parse(hist[hist.length - 1]); if(!get()) sel = null; panel(); draw(); };

  /* ---------- pointer ---------- */
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * cv.width / r.width / sc, y:(e.clientY - r.top) * cv.height / r.height / sc}; };
  const inside = (b, p, m = 0) => p.x >= b.x - m && p.x <= b.x + b.w + m && p.y >= b.y - m && p.y <= b.y + b.h + m;
  cv.onpointerdown = e => {
    cv.focus(); const p = pt(e); cv.setPointerCapture(e.pointerId);
    if(tool === "sel"){
      const s = get(); if(s && s.page === cur && s.type !== "draw"){ const b = bbox(s); if(Math.abs(p.x - (b.x + b.w)) < 9 && Math.abs(p.y - (b.y + b.h)) < 9){ mode = {t:"size", b, s0:s.size, w0:s.w, h0:s.h, ss:s.s}; return; } }
      let hit = null; for(let i = objs.length - 1; i >= 0; i--){ const o = objs[i]; if(o.page === cur && inside(bbox(o), p, 3)){ hit = o; break; } }
      sel = hit ? hit.id : null; panel(); draw(); if(hit) mode = {t:"move", p0:p, snapObj:JSON.stringify(hit)}; return;
    }
    const base0 = {id:++uid, page:cur};
    if(tool === "text"){ objs.push({...base0, type:"text", x:p.x, y:p.y - 8, text:"Text", size:14, color:DEF.text, bold:false}); sel = uid; snap(); setTool("sel"); panel(); draw(); $("tx").focus(); $("tx").select(); return; }
    if(tool === "tick" || tool === "cross"){ objs.push({...base0, type:tool, x:p.x, y:p.y, s:18, color:DEF[tool]}); sel = uid; snap(); panel(); draw(); return; }
    if(tool === "hl" || tool === "wo"){ objs.push({...base0, type:tool, x:p.x, y:p.y, w:0, h:0, color:DEF[tool]}); sel = uid; mode = {t:"rect", p0:p}; return; }
    if(tool === "draw"){ objs.push({...base0, type:"draw", pts:[[p.x, p.y]], w:3, color:DEF.draw}); sel = uid; mode = {t:"pen"}; draw(); }
  };
  cv.onpointermove = e => {
    if(!mode) return; const p = pt(e), o = get(); if(!o) return;
    if(mode.t === "move"){ const q = JSON.parse(mode.snapObj), dx = p.x - mode.p0.x, dy = p.y - mode.p0.y; if(o.type === "draw") o.pts = q.pts.map(a => [a[0] + dx, a[1] + dy]); else{ o.x = q.x + dx; o.y = q.y + dy; } }
    else if(mode.t === "size"){ const b = mode.b; if(o.type === "text") o.size = clamp(Math.round(mode.s0 * Math.max(.2, (p.x - b.x) / b.w)), 6, 120); else if(o.type === "tick" || o.type === "cross") o.s = clamp(Math.round(Math.max(p.x - b.x, p.y - b.y) * 1), 8, 120); else{ o.w = Math.max(4, p.x - (o.w < 0 ? o.x + o.w : o.x)) * Math.sign(mode.w0 || 1); o.h = Math.max(4, p.y - (o.h < 0 ? o.y + o.h : o.y)) * Math.sign(mode.h0 || 1); } }
    else if(mode.t === "rect"){ o.w = p.x - mode.p0.x; o.h = p.y - mode.p0.y; }
    else if(mode.t === "pen"){ const l = o.pts[o.pts.length - 1]; if(Math.hypot(p.x - l[0], p.y - l[1]) > 1.5) o.pts.push([p.x, p.y]); }
    draw(); panel();
  };
  cv.onpointerup = cv.onpointercancel = () => {
    if(!mode) return; const o = get();
    if(mode.t === "rect" && o){ if(Math.abs(o.w) < 3 || Math.abs(o.h) < 3){ objs = objs.filter(x => x.id !== o.id); sel = null; } else { if(o.w < 0){ o.x += o.w; o.w = -o.w; } if(o.h < 0){ o.y += o.h; o.h = -o.h; } } }
    mode = null; snap(); panel(); draw();
  };
  cv.onkeydown = e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); $("undo").click(); return; } const o = get(); if(!o) return;
    const d = e.shiftKey ? 5 : 1; if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); $("del").click(); return; }
    const mv = (dx, dy) => { e.preventDefault(); if(o.type === "draw") o.pts = o.pts.map(a => [a[0] + dx, a[1] + dy]); else{ o.x += dx; o.y += dy; } draw(); };
    if(e.key === "ArrowLeft") mv(-d, 0); else if(e.key === "ArrowRight") mv(d, 0); else if(e.key === "ArrowUp") mv(0, -d); else if(e.key === "ArrowDown") mv(0, d);
  };
  $("pp").onclick = () => show(cur - 1); $("pn").onclick = () => show(cur + 1);
  $("zi").onclick = () => { zoom = Math.min(300, zoom + 25); fit(); }; $("zo").onclick = () => { zoom = Math.max(50, zoom - 25); fit(); }; $("zf").onclick = () => { zoom = 100; fit(); };
  const onResize = () => fit(); window.addEventListener("resize", onResize);

  /* ---------- form fields ---------- */
  function loadFields(d){
    fields = []; $("ff").innerHTML = "";
    try{
      const P = PDFLib; d.getForm().getFields().slice(0, 120).forEach(f => {
        const nm = f.getName(), row = document.createElement("div");
        if(f instanceof P.PDFTextField){ row.innerHTML = '<label style="font-weight:600;font-size:.85rem"></label><input type="text">'; row.querySelector("label").textContent = nm; const i = row.querySelector("input"); i.value = f.getText() || ""; fields.push({nm, kind:"text", el:i}); }
        else if(f instanceof P.PDFCheckBox){ row.innerHTML = '<label style="display:flex;gap:8px;align-items:center;font-weight:600;font-size:.85rem"><input type="checkbox"><span></span></label>'; row.querySelector("span").textContent = nm; const i = row.querySelector("input"); i.checked = f.isChecked(); fields.push({nm, kind:"check", el:i}); }
        else if(f instanceof P.PDFDropdown || f instanceof P.PDFRadioGroup || f instanceof P.PDFOptionList){ const kind = f instanceof P.PDFDropdown ? "drop" : f instanceof P.PDFRadioGroup ? "radio" : "list"; row.innerHTML = '<label style="font-weight:600;font-size:.85rem"></label><select></select>'; row.querySelector("label").textContent = nm; const s = row.querySelector("select"), cur0 = (f.getSelected ? f.getSelected() : []); const sel0 = Array.isArray(cur0) ? cur0[0] : cur0;
          s.innerHTML = '<option value="">(none)</option>'; f.getOptions().forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; if(o === sel0) op.selected = true; s.appendChild(op); }); fields.push({nm, kind, el:s}); }
        else return; $("ff").appendChild(row);
      });
    }catch(e){ fields = []; } $("fmc").hidden = !fields.length;
  }

  /* ---------- open and save ---------- */
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(pd){ pd.destroy(); pd = null; } objs = []; sel = null; hist = ["[]"]; if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); pd = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; n = pd.numPages; loadFields(d);
      $("info").textContent = file.name + " (" + n + " pages)"; $("ed").hidden = false; zoom = 100; panel(); await show(1);
    }catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" || (err && err.name === "PasswordException") ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  const hex = c => { const v = parseInt(c.slice(1), 16); return PDFLib.rgb((v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255); };
  $("go").onclick = async () => {
    $("go").disabled = true; $("bar").hidden = false; say("Saving..."); await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), fR = await doc.embedFont(PDFLib.StandardFonts.Helvetica), fB = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold); let skipped = 0;
      if(fields.length){ const form = doc.getForm();
        for(const f of fields){ try{ const fl = form.getField(f.nm); if(f.kind === "text") fl.setText(f.el.value); else if(f.kind === "check"){ f.el.checked ? fl.check() : fl.uncheck(); } else if(f.el.value) fl.select(f.el.value); }catch(e){ skipped++; } }
        try{ form.updateFieldAppearances(fR); }catch(e){ skipped++; } if($("fl").checked){ try{ form.flatten(); }catch(e){} } }
      const pages = doc.getPages(), P = (d, x, y) => PL.toPage(d, x, d.Hd - y);
      for(const o of objs){
        const page = pages[o.page - 1], d = PL.dims(page), rot = PDFLib.degrees(d.r);
        if(o.type === "text"){
          if(!o.text) continue; const f = o.bold ? fB : fR; let ok = true; try{ f.encodeText(o.text); }catch(e){ ok = false; }
          if(ok){ const [x, y] = P(d, o.x, o.y + o.size * .85); page.drawText(o.text, {x, y, size:o.size, font:f, color:hex(o.color), rotate:rot}); }
          else{ const k = 4, w = tw(o), h = o.size * 1.25, c = document.createElement("canvas"); c.width = Math.ceil(w * k) + 4; c.height = Math.ceil(h * k); const x = c.getContext("2d"); x.fillStyle = o.color; x.font = (o.bold ? "bold " : "") + (o.size * k) + 'px ' + FONT + ',"Nirmala UI","Iskoola Pota","Noto Sans Sinhala",sans-serif'; x.textBaseline = "alphabetic"; x.fillText(o.text, 0, o.size * .85 * k);
            const b = await new Promise(r => c.toBlob(r, "image/png")), im = await doc.embedPng(new Uint8Array(await b.arrayBuffer())), [px, py] = P(d, o.x, o.y + h); page.drawImage(im, {x:px, y:py, width:c.width / k, height:h, rotate:rot}); }
        }else if(o.type === "hl" || o.type === "wo"){
          const [px, py] = P(d, o.x, o.y + o.h); page.drawRectangle({x:px, y:py, width:o.w, height:o.h, rotate:rot, color:o.type === "wo" ? PDFLib.rgb(1, 1, 1) : hex(o.color), blendMode:o.type === "hl" ? PDFLib.BlendMode.Multiply : undefined, borderWidth:0});
        }else if(o.type === "draw"){
          for(let i = 1; i < o.pts.length; i++){ const a = P(d, ...o.pts[i - 1]), b = P(d, ...o.pts[i]); page.drawLine({start:{x:a[0], y:a[1]}, end:{x:b[0], y:b[1]}, thickness:o.w, color:hex(o.color), lineCap:PDFLib.LineCapStyle.Round}); }
          if(o.pts.length === 1){ const a = P(d, ...o.pts[0]); page.drawCircle({x:a[0], y:a[1], size:o.w / 2, color:hex(o.color)}); }
        }else for(const [s, e] of markLines(o)){ const a = P(d, ...s), b = P(d, ...e); page.drawLine({start:{x:a[0], y:a[1]}, end:{x:b[0], y:b[1]}, thickness:o.s * .13, color:hex(o.color), lineCap:PDFLib.LineCapStyle.Round}); }
      }
      await PL.finish(await doc.save(), name + "_edited.pdf", "Your edited PDF is ready.", 1); say(skipped ? "Some form fields could not be filled." : "");
    }catch(err){ say("Could not save this PDF.", true); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { window.removeEventListener("resize", onResize); if(pd) pd.destroy(); PL.cleanup(); };
}
mountEditPdf(document.getElementById("tool"));
