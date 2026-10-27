/* ===================== TOOL: Scan to PDF ===================== */
/* d = photo pixels, e = blurred copy of the same photo (the paper colour at each spot) */
function docPixels(d, e, mode){
  for(let i = 0; i < d.length; i += 4){
    const lum = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114;
    if(mode === "gray"){ d[i] = d[i + 1] = d[i + 2] = lum; continue; }
    const bg = Math.max(40, e[i] * .299 + e[i + 1] * .587 + e[i + 2] * .114); let v = (lum / bg - .55) / .40; v = v < 0 ? 0 : v > 1 ? 1 : v; if(mode === "bw") v = v > .62 ? 1 : 0; d[i] = d[i + 1] = d[i + 2] = v * 255;
  }
}
/* END CORE */

function mountScanToPdf(root){
  root.innerHTML = `<style>
  .sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-top:14px}
  .sc-t{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface2);position:relative}
  .sc-t canvas{display:block;width:100%;height:auto;background:#fff}.sc-t .num{position:absolute;left:6px;top:6px;background:var(--acc);color:var(--accink);font-weight:800;font-size:.8rem;padding:0 9px;border-radius:999px}
  .sc-t .acts{display:flex;gap:3px;padding:5px;justify-content:center}.sc-t .acts button{padding:4px 8px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  #vid{width:100%;max-height:60vh;border-radius:12px;background:#000;display:block}
  </style>
  <div class="card"><label>1. Add your pages</label>
    <div class="row"><div><button id="oc" type="button">Open camera</button></div><div><button id="tp" type="button" class="alt">Take a photo (phone)</button></div><div><button id="ag" type="button" class="alt">Add from gallery</button></div></div>
    <input id="cam" type="file" accept="image/*" capture="environment" hidden><input id="gal" type="file" accept="image/*" multiple hidden>
    <div id="camp" hidden style="margin-top:12px"><video id="vid" playsinline muted></video><div class="row" style="margin-top:10px"><div><button id="shot" type="button">Capture page</button></div><div><button id="cc" type="button" class="alt">Close camera</button></div></div>
      <p class="hint">Put the page on a flat, well lit surface and fill the frame with it.</p></div>
    <p id="msg" class="hint" aria-live="polite">Add one photo for each page of the document.</p><div id="grid" class="sc-grid"></div></div>
  <div class="card" id="set" hidden><label>2. Make it look like a scan</label>
    <div class="row"><div><label for="fl" style="font-weight:600">Look</label><select id="fl"><option value="doc">Clean document (best for paper)</option><option value="bw">Black and white</option><option value="gray">Grayscale</option><option value="orig">Original photo</option></select></div>
      <div><label for="ps" style="font-weight:600">Page size</label><select id="ps"><option value="a4">A4</option><option value="letter">Letter</option><option value="fit">Same as the photo</option></select></div>
      <div><label for="ql" style="font-weight:600">Quality</label><select id="ql"><option value="hi">High</option><option value="md" selected>Good (smaller file)</option><option value="lo">Small file (for upload limits)</option></select></div></div>
    <div class="row" style="margin-top:14px"><div><button id="go" type="button">Make PDF</button></div></div><progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>${PL.resultCard}`;
  let items = [], uid = 0, stream = null;
  const msg = (t, e) => { $("msg").className = "hint" + (e ? " err" : ""); $("msg").textContent = t; }, fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const cv2 = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function produce(it, maxDim, mode){
    const rot = it.rot, sw = it.orig.width, sh = it.orig.height, swap = rot % 180 !== 0, s = Math.min(1, maxDim / Math.max(sw, sh)), c = cv2((swap ? sh : sw) * s, (swap ? sw : sh) * s), g = c.getContext("2d", {willReadFrequently:true});
    g.translate(c.width / 2, c.height / 2); g.rotate(rot * Math.PI / 180); g.drawImage(it.orig, -sw * s / 2, -sh * s / 2, sw * s, sh * s); g.setTransform(1, 0, 0, 1, 0, 0);
    if(mode !== "orig"){
      const im = g.getImageData(0, 0, c.width, c.height); let e = im.data;
      if(mode !== "gray"){ const sm = cv2(Math.max(8, c.width / 24), Math.max(8, c.height / 24)); sm.getContext("2d").drawImage(c, 0, 0, sm.width, sm.height); const bg = cv2(c.width, c.height), bgx = bg.getContext("2d", {willReadFrequently:true}); bgx.drawImage(sm, 0, 0, c.width, c.height); e = bgx.getImageData(0, 0, c.width, c.height).data; }
      docPixels(im.data, e, mode); g.putImageData(im, 0, 0);
    }
    return c;
  }
  function render(){
    const grid = $("grid"); grid.innerHTML = ""; $("set").hidden = !items.length;
    items.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "sc-t"; d.appendChild(produce(it, 260, $("fl").value)); d.insertAdjacentHTML("beforeend", '<span class="num">' + (i + 1) + '</span><div class="acts"><button class="alt" type="button" aria-label="Move earlier">◀</button><button class="alt" type="button" aria-label="Move later">▶</button><button class="alt" type="button" aria-label="Rotate left">↺</button><button class="alt" type="button" aria-label="Rotate right">↻</button><button class="danger" type="button" aria-label="Remove">✕</button></div>');
      const [l, r, rl, rr, x] = d.querySelectorAll("button");
      l.onclick = () => { if(i){ [items[i - 1], items[i]] = [items[i], items[i - 1]]; render(); } }; r.onclick = () => { if(i < items.length - 1){ [items[i + 1], items[i]] = [items[i], items[i + 1]]; render(); } };
      rl.onclick = () => { it.rot = (it.rot + 270) % 360; render(); }; rr.onclick = () => { it.rot = (it.rot + 90) % 360; render(); }; x.onclick = () => { items.splice(i, 1); render(); };
      grid.appendChild(d);
    });
    $("go").textContent = items.length ? "Make PDF (" + items.length + " page" + (items.length > 1 ? "s" : "") + ")" : "Make PDF";
  }
  function addCanvas(src){ const s = Math.min(1, 2400 / Math.max(src.width, src.height)), c = cv2(src.width * s, src.height * s); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); items.push({id:++uid, orig:c, rot:0}); }
  async function addFiles(files){ let k = 0; for(const f of files){ if(!f.type.startsWith("image/")) continue; try{ const b = await createImageBitmap(f); addCanvas(b); b.close(); k++; }catch(e){} } render(); msg(k ? items.length + " page(s) ready. Add more, or make the PDF below." : "Could not read that photo.", !k); }
  $("tp").onclick = () => $("cam").click(); $("ag").onclick = () => $("gal").click();
  $("cam").onchange = e => { addFiles(e.target.files); e.target.value = ""; }; $("gal").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
  const closeCam = () => { if(stream) stream.getTracks().forEach(t => t.stop()); stream = null; $("camp").hidden = true; };
  $("oc").onclick = async () => {
    try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:2560}, height:{ideal:1440}}, audio:false}); $("vid").srcObject = stream; await $("vid").play(); $("camp").hidden = false; }
    catch(e){ msg("The camera is blocked or not found. Allow camera access, or use Take a photo or Add from gallery.", true); }
  };
  $("shot").onclick = () => { const v = $("vid"); if(!v.videoWidth) return; const c = cv2(v.videoWidth, v.videoHeight); c.getContext("2d").drawImage(v, 0, 0); addCanvas(c); render(); msg(items.length + " page(s) captured. Keep going, or close the camera."); };
  $("cc").onclick = closeCam; $("fl").onchange = render;
  $("go").onclick = async () => {
    if(!items.length) return; $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; $("out").hidden = true;
    try{
      const doc = await PDFLib.PDFDocument.create(), q = $("ql").value, maxd = q === "hi" ? 2400 : q === "md" ? 1800 : 1300, jq = q === "hi" ? .92 : q === "md" ? .8 : .6, ps = $("ps").value;
      for(let i = 0; i < items.length; i++){
        $("status").textContent = "Making page " + (i + 1) + " of " + items.length + "..."; $("bar").value = i / items.length; await new Promise(r => setTimeout(r, 10));
        const c = produce(items[i], maxd, $("fl").value), b = await new Promise(r => c.toBlob(r, "image/jpeg", jq)), img = await doc.embedJpg(new Uint8Array(await b.arrayBuffer()));
        let pw, ph; if(ps === "fit"){ pw = c.width * .4; ph = c.height * .4; } else{ [pw, ph] = PL.SIZES[ps].slice(); if(c.width > c.height) [pw, ph] = [ph, pw]; }
        const m = ps === "fit" ? 0 : 18, s = Math.min((pw - 2 * m) / c.width, (ph - 2 * m) / c.height), w = c.width * s, h = c.height * s; doc.addPage([pw, ph]).drawImage(img, {x:(pw - w) / 2, y:(ph - h) / 2, width:w, height:h});
      }
      await PL.finish(await doc.save(), "scan.pdf", items.length + " page(s) scanned.", 1); $("status").textContent = "";
    }catch(err){ fail("Could not make the PDF. Try Small file quality or fewer pages."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  render();
  return () => { closeCam(); PL.cleanup(); };
}
mountScanToPdf(document.getElementById("tool"));
