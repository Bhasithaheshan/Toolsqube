/* ===================== TOOL: Merge Images ===================== */
/* sizes = [{w,h}] ; returns the size of the combined picture and the place of every image */
function mergeLayout(sizes, o){
  const n = sizes.length, items = [], gap = o.gap, pad = o.pad; let W = 0, H = 0;
  if(o.dir === "grid"){
    const cols = Math.max(1, Math.min(n, o.cols)), rows = Math.ceil(n / cols), cw = o.match === "min" ? Math.min(...sizes.map(s => s.w)) : Math.max(...sizes.map(s => s.w)), ch = o.match === "min" ? Math.min(...sizes.map(s => s.h)) : Math.max(...sizes.map(s => s.h));
    sizes.forEach((s, i) => { const k = Math.min(cw / s.w, ch / s.h), w = s.w * k, h = s.h * k, c = i % cols, r = Math.floor(i / cols); items.push({i, x:pad + c * (cw + gap) + (cw - w) / 2, y:pad + r * (ch + gap) + (ch - h) / 2, w, h}); });
    W = 2 * pad + cols * cw + (cols - 1) * gap; H = 2 * pad + rows * ch + (rows - 1) * gap; return {W, H, items};
  }
  const horiz = o.dir === "h", key = horiz ? "h" : "w", other = horiz ? "w" : "h", target = o.match === "min" ? Math.min(...sizes.map(s => s[key])) : o.match === "max" ? Math.max(...sizes.map(s => s[key])) : null;
  const sc = sizes.map(s => { const k = target ? target / s[key] : 1; return {w:s.w * k, h:s.h * k}; }), span = Math.max(...sc.map(s => s[key])); let pos = pad;
  sc.forEach((s, i) => { const off = o.align === "start" ? 0 : o.align === "end" ? span - s[key] : (span - s[key]) / 2; items.push(horiz ? {i, x:pos, y:pad + off, w:s.w, h:s.h} : {i, x:pad + off, y:pos, w:s.w, h:s.h}); pos += s[other] + gap; });
  const total = pos - gap + pad; W = horiz ? total : 2 * pad + span; H = horiz ? 2 * pad + span : total; return {W, H, items};
}
/* END CORE */

function mountMergeImages(root){
  root.innerHTML = `<style>
  .mp-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}.mp-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);cursor:grab}.mp-row.drag{opacity:.45}
  .mp-n{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--accink);display:grid;place-items:center;font-weight:700;font-size:.85rem;flex:none}.mp-th{width:48px;height:48px;object-fit:cover;border-radius:8px;flex:none;background:#fff}
  .mp-i{flex:1;min-width:0}.mp-i b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mp-i small{color:var(--mute)}.mp-b{display:flex;gap:4px;flex:none}.card .mp-b button{padding:6px 10px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  </style>
  <div class="card"><label for="f">1. Choose your images</label><input id="f" type="file" accept="image/*" multiple><p id="info" class="hint">Select two or more images. You can pick several at once and add more later.</p><div id="list" class="mp-list"></div>
    <div class="row" id="tools" hidden style="margin-top:12px"><div><button id="az" class="alt" type="button">Sort A to Z</button></div><div><button id="clr" class="danger" type="button">Remove all</button></div></div></div>
  <div class="card" id="set" hidden><label>2. How to join them</label>
    <div class="row"><div><label for="dr" style="font-weight:600">Direction</label><select id="dr"><option value="h">Side by side</option><option value="v">One below the other</option><option value="grid">Grid</option></select></div>
      <div id="cw"><label for="cl" style="font-weight:600">Columns</label><input id="cl" type="number" min="1" max="10" step="1" value="2"></div>
      <div><label for="mt" style="font-weight:600">Make them the same size</label><select id="mt"><option value="min">To the smallest</option><option value="max">To the largest</option><option value="none">Keep their own sizes</option></select></div>
      <div><label for="al" style="font-weight:600">Line up</label><select id="al"><option value="center">Center</option><option value="start">Start</option><option value="end">End</option></select></div></div>
    <div class="row" style="margin-top:12px"><div><label for="gp" style="font-weight:600">Gap (px)</label><input id="gp" type="number" min="0" max="200" step="1" value="0"></div><div><label for="pd" style="font-weight:600">Border around (px)</label><input id="pd" type="number" min="0" max="300" step="1" value="0"></div>
      <div><label for="bg" style="font-weight:600">Background</label><input id="bg" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div>
      <div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="tr" type="checkbox"> See-through background (PNG or WebP)</label>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div><p id="dim" class="hint" style="font-weight:600"></p>
    <div class="row" style="margin-top:8px"><div><button id="go" type="button">Join the images</button></div></div></div>${IL.resultCard}`;
  let items = [], uid = 0, dragI = -1;
  const move = (a, b) => { if(b < 0 || b >= items.length) return; const [x] = items.splice(a, 1); items.splice(b, 0, x); render(); };
  const opts = () => ({dir:$("dr").value, cols:Math.max(1, +$("cl").value || 2), match:$("mt").value, align:$("al").value, gap:Math.max(0, +$("gp").value || 0), pad:Math.max(0, +$("pd").value || 0)});
  function draw(c, f){
    const lay = mergeLayout(items.map(i => ({w:i.c.width, h:i.c.height})), opts()); c.width = Math.max(1, Math.round(lay.W * f)); c.height = Math.max(1, Math.round(lay.H * f)); const g = c.getContext("2d");
    if(!($("tr").checked && $("of").value !== "jpg")){ g.fillStyle = $("bg").value; g.fillRect(0, 0, c.width, c.height); } g.imageSmoothingQuality = "high";
    lay.items.forEach(p => g.drawImage(items[p.i].c, p.x * f, p.y * f, p.w * f, p.h * f)); return lay;
  }
  function preview(){ if(items.length < 2){ return; } $("cw").hidden = $("dr").value !== "grid"; const lay = mergeLayout(items.map(i => ({w:i.c.width, h:i.c.height})), opts()), f = Math.min(1, 900 / Math.max(lay.W, lay.H)); draw($("pv"), f); $("dim").textContent = "The joined picture will be " + Math.round(lay.W) + " x " + Math.round(lay.H) + " px."; }
  function render(){
    const box = $("list"); box.innerHTML = "";
    items.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "mp-row"; d.draggable = true;
      d.innerHTML = '<span class="mp-n">' + (i + 1) + '</span><img class="mp-th" alt=""><span class="mp-i"><b></b><small></small></span><span class="mp-b"><button class="alt" type="button" aria-label="Move up"' + (i === 0 ? " disabled" : "") + '>↑</button><button class="alt" type="button" aria-label="Move down"' + (i === items.length - 1 ? " disabled" : "") + '>↓</button><button class="danger" type="button" aria-label="Remove">✕</button></span>';
      d.querySelector("img").src = it.url; d.querySelector("b").textContent = it.name; d.querySelector("small").textContent = it.c.width + " x " + it.c.height + " px";
      const [up, dn, rm] = d.querySelectorAll("button"); up.onclick = () => move(i, i - 1); dn.onclick = () => move(i, i + 1); rm.onclick = () => { URL.revokeObjectURL(it.url); items.splice(i, 1); render(); };
      d.ondragstart = e => { dragI = i; d.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; }; d.ondragend = () => d.classList.remove("drag"); d.ondragover = e => e.preventDefault(); d.ondrop = e => { e.preventDefault(); if(dragI >= 0 && dragI !== i) move(dragI, i); dragI = -1; };
      box.appendChild(d);
    });
    $("tools").hidden = !items.length; $("set").hidden = items.length < 2; $("out").hidden = true; preview();
  }
  $("f").onchange = async e => {
    $("info").className = "hint"; $("info").textContent = "Loading..."; for(const f of e.target.files){ if(!f.type.startsWith("image/")) continue; try{ const c = await IL.load(f); items.push({id:++uid, name:f.name, c, url:URL.createObjectURL(f)}); }catch(err){} }
    e.target.value = ""; $("info").textContent = items.length + " image(s) added. " + (items.length < 2 ? "Add at least one more." : ""); render();
  };
  $("az").onclick = () => { items.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric:true})); render(); };
  $("clr").onclick = () => { items.forEach(i => URL.revokeObjectURL(i.url)); items = []; render(); $("info").textContent = "Select two or more images."; };
  ["dr", "cl", "mt", "al", "gp", "pd", "bg", "tr", "of"].forEach(k => { $(k).oninput = preview; $(k).onchange = preview; });
  $("go").onclick = async () => {
    if(items.length < 2) return; const lay = mergeLayout(items.map(i => ({w:i.c.width, h:i.c.height})), opts()), f = Math.min(1, 9000 / Math.max(lay.W, lay.H)), c = document.createElement("canvas"); draw(c, f);
    const fmt = $("of").value, blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, "merged." + fmt, "Done: " + c.width + " x " + c.height + " px (" + PL.sz(blob.size) + ")", f < 1 ? "The picture was made a little smaller to stay under 9000 px." : "");
  };
  return () => { items.forEach(i => URL.revokeObjectURL(i.url)); IL.cleanup(); };
}
mountMergeImages(document.getElementById("tool"));
