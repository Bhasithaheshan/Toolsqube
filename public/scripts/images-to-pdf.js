/* ===================== TOOL: Images to PDF ===================== */
function mountImagesToPdf(root){
  root.innerHTML = `<style>
  .mp-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
  .mp-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);cursor:grab}
  .mp-row.drag{opacity:.45}
  .mp-n{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--accink);display:grid;place-items:center;font-weight:700;font-size:.85rem;flex:none}
  .mp-th{width:48px;height:48px;object-fit:cover;border-radius:8px;flex:none;background:#fff}
  .mp-i{flex:1;min-width:0}
  .mp-i b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mp-i small{color:var(--mute)}
  .mp-b{display:flex;gap:4px;flex:none}
  .card .mp-b button{padding:6px 10px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  </style>
  <div class="card"><label for="f">1. Choose your images</label>
    <input id="f" type="file" accept="image/*" multiple>
    <p id="info" class="hint">Select one or more images (JPG, PNG, WebP and more). You can pick several at once and add more later.</p>
    <div id="list" class="mp-list"></div>
    <div class="row" id="tools" hidden style="margin-top:12px"><div><button id="az" class="alt" type="button">Sort A to Z</button></div><div><button id="clr" class="danger" type="button">Remove all</button></div></div></div>
  <div class="card"><label>2. Page settings</label>
    <div class="row"><div><label for="ps" style="font-weight:600">Page size</label><select id="ps"><option value="a4">A4</option><option value="letter">Letter</option><option value="fit">Same size as the image</option></select></div>
      <div><label for="or" style="font-weight:600">Orientation</label><select id="or"><option value="auto">Automatic</option><option value="p">Portrait</option><option value="l">Landscape</option></select></div>
      <div><label for="mg" style="font-weight:600">Margin</label><select id="mg"><option value="0">None</option><option value="28" selected>Small</option><option value="57">Big</option></select></div></div>
    <div style="margin-top:14px"><label for="ql" style="font-weight:600">Image quality</label><select id="ql"><option value="hi">High (best quality)</option><option value="md">Good (smaller file)</option><option value="lo">Small file (for upload limits)</option></select></div>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Make PDF</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div>
    <p class="hint">Drag the rows, or use the arrows, to set the page order.</p></div>${PL.resultCard}`;
  let items = [], uid = 0, dragI = -1;
  const info = (t, err) => { $("info").className = "hint" + (err ? " err" : ""); $("info").textContent = t; };
  const move = (a, b) => { if(b < 0 || b >= items.length) return; const [x] = items.splice(a, 1); items.splice(b, 0, x); render(); };
  function render(){
    const box = $("list"); box.innerHTML = "";
    items.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "mp-row"; d.draggable = true;
      d.innerHTML = '<span class="mp-n">' + (i + 1) + '</span><img class="mp-th" alt=""><span class="mp-i"><b></b><small></small></span><span class="mp-b"><button class="alt" type="button" aria-label="Move up"' + (i === 0 ? " disabled" : "") + '>↑</button><button class="alt" type="button" aria-label="Move down"' + (i === items.length - 1 ? " disabled" : "") + '>↓</button><button class="danger" type="button" aria-label="Remove">✕</button></span>';
      d.querySelector("img").src = it.url; d.querySelector("b").textContent = it.file.name; d.querySelector("small").textContent = PL.sz(it.file.size);
      const [up, dn, rm] = d.querySelectorAll("button");
      up.onclick = () => move(i, i - 1); dn.onclick = () => move(i, i + 1); rm.onclick = () => { URL.revokeObjectURL(it.url); items.splice(i, 1); render(); };
      d.ondragstart = e => { dragI = i; d.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; };
      d.ondragend = () => d.classList.remove("drag"); d.ondragover = e => e.preventDefault();
      d.ondrop = e => { e.preventDefault(); if(dragI >= 0 && dragI !== i) move(dragI, i); dragI = -1; };
      box.appendChild(d);
    });
    $("tools").hidden = !items.length; $("go").disabled = !items.length; $("go").textContent = items.length ? "Make PDF (" + items.length + " image" + (items.length > 1 ? "s" : "") + ")" : "Make PDF";
  }
  $("f").onchange = e => {
    for(const file of e.target.files) if(file.type.startsWith("image/")) items.push({id:++uid, file, url:URL.createObjectURL(file)});
    e.target.value = ""; render(); info(items.length + " image(s) added. Add more, or make the PDF now.");
  };
  $("az").onclick = () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, {numeric:true})); render(); };
  $("clr").onclick = () => { items.forEach(i => URL.revokeObjectURL(i.url)); items = []; $("out").hidden = true; render(); info("Select one or more images."); };

  async function prepare(file, q){
    const bmp = await createImageBitmap(file), isPng = file.type === "image/png";
    if(q === "hi" && isPng){ const b = new Uint8Array(await file.arrayBuffer()), w0 = bmp.width, h0 = bmp.height; bmp.close(); return {png:b, w:w0, h:h0}; }
    const maxd = q === "lo" ? 1600 : q === "md" ? 2400 : 100000, sc = Math.min(1, maxd / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * sc)), h = Math.max(1, Math.round(bmp.height * sc)), c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h); bmp.close();
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q === "hi" ? .95 : q === "md" ? .8 : .6));
    return {jpg:new Uint8Array(await blob.arrayBuffer()), w, h};
  }
  $("go").onclick = async () => {
    $("go").disabled = true; $("bar").hidden = false; $("out").hidden = true; $("status").className = "";
    try{
      const doc = await PDFLib.PDFDocument.create(), q = $("ql").value, mg = +$("mg").value, ps = $("ps").value;
      for(let i = 0; i < items.length; i++){
        $("status").textContent = "Adding image " + (i + 1) + " of " + items.length + "..."; $("bar").value = i / items.length; await new Promise(r => setTimeout(r, 10));
        const p = await prepare(items[i].file, q), img = p.png ? await doc.embedPng(p.png) : await doc.embedJpg(p.jpg);
        let pw, ph;
        if(ps === "fit"){ pw = p.w * 0.75; ph = p.h * 0.75; }
        else { [pw, ph] = ps === "a4" ? [595.28, 841.89] : [612, 792]; const o = $("or").value, land = o === "l" || (o === "auto" && p.w > p.h); if(land) [pw, ph] = [ph, pw]; }
        const page = doc.addPage([pw, ph]), m = ps === "fit" ? 0 : mg, s = Math.min((pw - 2 * m) / p.w, (ph - 2 * m) / p.h), w = p.w * s, h = p.h * s;
        page.drawImage(img, {x:(pw - w) / 2, y:(ph - h) / 2, width:w, height:h});
      }
      $("status").textContent = "Saving..."; const bytes = await doc.save();
      await PL.finish(bytes, "images.pdf", items.length + " image(s) in one PDF.", 1); $("status").textContent = "Done.";
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not make the PDF. One of the images may be damaged or too large."; }
    $("bar").hidden = true; render();
  };
  render();
  return () => { items.forEach(i => URL.revokeObjectURL(i.url)); PL.cleanup(); };
}
mountImagesToPdf(document.getElementById("tool"));
