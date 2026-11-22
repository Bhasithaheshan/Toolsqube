/* ===================== TOOL: Photo Editor ===================== */
/* d = RGBA pixels (changed in place). p holds every setting; most are -100..100, the others 0..100 */
function adjustPixels(d, w, h, p){
  const ex = Math.pow(2, (p.exposure || 0) / 50), br = (p.brightness || 0) * 1.5, c = (p.contrast || 0) * 1.2, cf = (259 * (c + 255)) / (255 * (259 - c)), sat = 1 + (p.saturation || 0) / 100, warm = (p.warmth || 0) * .5;
  const hue = (p.hue || 0) * Math.PI / 180, ch = Math.cos(hue), sh = Math.sin(hue), sep = (p.sepia || 0) / 100, gr = (p.gray || 0) / 100, fade = (p.fade || 0) / 100 * .22, vig = (p.vignette || 0) / 100, inv = !!p.invert, doHue = !!p.hue;
  const m = [.213 + ch * .787 - sh * .213, .715 - ch * .715 - sh * .715, .072 - ch * .072 + sh * .928, .213 - ch * .213 + sh * .143, .715 + ch * .285 + sh * .140, .072 - ch * .072 - sh * .283, .213 - ch * .213 - sh * .787, .715 - ch * .715 + sh * .715, .072 + ch * .928 + sh * .072];
  const cx = w / 2, cy = h / 2, md = Math.hypot(cx, cy);
  for(let i = 0, px = 0; i < d.length; i += 4, px++){
    let r = d[i] * ex + br, g = d[i + 1] * ex + br, b = d[i + 2] * ex + br;
    r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; b = (b - 128) * cf + 128; r += warm; b -= warm;
    let l = r * .299 + g * .587 + b * .114; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
    if(doHue){ const r2 = m[0] * r + m[1] * g + m[2] * b, g2 = m[3] * r + m[4] * g + m[5] * b, b2 = m[6] * r + m[7] * g + m[8] * b; r = r2; g = g2; b = b2; }
    if(sep){ const tr = .393 * r + .769 * g + .189 * b, tg = .349 * r + .686 * g + .168 * b, tb = .272 * r + .534 * g + .131 * b; r += (tr - r) * sep; g += (tg - g) * sep; b += (tb - b) * sep; }
    if(gr){ l = r * .299 + g * .587 + b * .114; r += (l - r) * gr; g += (l - g) * gr; b += (l - b) * gr; }
    if(fade){ r = r * (1 - fade) + 255 * fade; g = g * (1 - fade) + 255 * fade; b = b * (1 - fade) + 255 * fade; }
    if(inv){ r = 255 - r; g = 255 - g; b = 255 - b; }
    if(vig){ const x = px % w, y = (px / w) | 0, t = Math.hypot(x - cx, y - cy) / md, f = 1 - vig * Math.max(0, t - .35) * 1.25; r *= f; g *= f; b *= f; }
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}
/* box blur with radius rad (pixels), done in two passes */
function boxBlur(d, w, h, rad){
  rad = Math.round(rad); if(rad < 1) return; const t = new Float32Array(d.length), n = 2 * rad + 1;
  for(let y = 0; y < h; y++) for(let c = 0; c < 3; c++){ let s = 0; for(let x = -rad; x <= rad; x++) s += d[(y * w + Math.min(w - 1, Math.max(0, x))) * 4 + c]; for(let x = 0; x < w; x++){ t[(y * w + x) * 4 + c] = s / n; s += d[(y * w + Math.min(w - 1, x + rad + 1)) * 4 + c] - d[(y * w + Math.max(0, x - rad)) * 4 + c]; } }
  for(let x = 0; x < w; x++) for(let c = 0; c < 3; c++){ let s = 0; for(let y = -rad; y <= rad; y++) s += t[(Math.min(h - 1, Math.max(0, y)) * w + x) * 4 + c]; for(let y = 0; y < h; y++){ d[(y * w + x) * 4 + c] = s / n; s += t[(Math.min(h - 1, y + rad + 1) * w + x) * 4 + c] - t[(Math.max(0, y - rad) * w + x) * 4 + c]; } }
}
function unsharp(d, w, h, amount, rad){ const o = new Uint8ClampedArray(d), bl = new Uint8ClampedArray(d); boxBlur(bl, w, h, rad); const k = amount / 100 * 1.6; for(let i = 0; i < d.length; i += 4) for(let c = 0; c < 3; c++) d[i + c] = o[i + c] + (o[i + c] - bl[i + c]) * k; }
function applyAll(d, w, h, p){ if(p.blur) boxBlur(d, w, h, p.blur / 100 * w * .02 * 5); adjustPixels(d, w, h, p); if(p.sharpen) unsharp(d, w, h, p.sharpen, Math.max(1, w / 900 * 1.3)); }
const PE_PRESETS = {original:{}, bw:{gray:100, contrast:12}, sepia:{sepia:100}, vintage:{sepia:35, contrast:-10, fade:35, vignette:35, warmth:15, saturation:-10}, warm:{warmth:35, saturation:10}, cool:{warmth:-35, saturation:5}, fade:{fade:50, contrast:-15, saturation:-15}, dramatic:{contrast:40, saturation:-20, vignette:30, exposure:-10}, vivid:{saturation:45, contrast:15}, invert:{invert:1}, bright:{brightness:25, exposure:10}};
const PE_NAMES = {original:"Original", bw:"Black and white", sepia:"Sepia", vintage:"Vintage", warm:"Warm", cool:"Cool", fade:"Faded", dramatic:"Dramatic", vivid:"Vivid", invert:"Invert", bright:"Brighter"};
const PE_SLIDERS = [["exposure", "Exposure", -100, 100], ["brightness", "Brightness", -100, 100], ["contrast", "Contrast", -100, 100], ["saturation", "Color strength", -100, 100], ["warmth", "Warm / cool", -100, 100], ["hue", "Shift colors", -180, 180], ["sharpen", "Sharpen", 0, 100], ["blur", "Blur", 0, 100], ["vignette", "Dark corners", 0, 100], ["fade", "Faded look", 0, 100], ["sepia", "Sepia", 0, 100], ["gray", "Black and white", 0, 100]];
/* END CORE */

function mountPhotoEditor(root){
  let start = ""; try{ start = (JSON.parse(root.dataset.preset || "null") || {}).filter || ""; }catch(e){}
  root.innerHTML = `<style>.pe-t{display:flex;gap:8px;flex-wrap:wrap}.pe-t div{width:84px;cursor:pointer;border:2px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface2);text-align:center}.pe-t div.on{border-color:var(--acc)}.pe-t canvas{display:block;width:100%;height:auto}.pe-t span{display:block;font-size:.72rem;font-weight:700;padding:3px 2px 4px;line-height:1.15}
  .pe-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 18px}.pe-g label{display:flex;justify-content:space-between;font-weight:600;font-size:.88rem;margin-bottom:2px}.card button.pe-hold{user-select:none;touch-action:none}</style>
  <div class="card"><label for="f">1. Choose a photo</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No photo chosen.</p></div>
  <div id="ed" hidden><div class="card"><label>2. Pick a look</label><div id="tp" class="pe-t"></div></div>
    <div class="card"><label>3. Fine tune it</label><div id="sl" class="pe-g"></div><div class="row" style="margin-top:14px"><div><button id="rs" type="button" class="alt">Reset everything</button></div><div><button id="hold" type="button" class="alt pe-hold">Hold to see the original</button></div></div>
      <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:65vh;display:block;margin:0 auto"></canvas></div></div>
    <div class="card"><div class="row"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div><div style="align-self:end"><button id="go" type="button">Save the photo</button></div></div></div></div>${IL.resultCard}`;
  let src = null, small = null, name = "photo", p = {}, raf = 0, showOrig = false;
  const pv = $("pv");
  function render(){ const g = pv.getContext("2d", {willReadFrequently:true}); pv.width = small.width; pv.height = small.height; g.drawImage(small, 0, 0); if(showOrig) return; const im = g.getImageData(0, 0, pv.width, pv.height); applyAll(im.data, im.width, im.height, p); g.putImageData(im, 0, 0); }
  const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
  const labels = () => PE_SLIDERS.forEach(([k]) => { $("v_" + k).textContent = Math.round(p[k] || 0); $("s_" + k).value = p[k] || 0; });
  PE_SLIDERS.forEach(([k, label, mn, mx]) => { const d = document.createElement("div"); d.innerHTML = '<label for="s_' + k + '">' + label + ' <span id="v_' + k + '">0</span></label><input id="s_' + k + '" type="range" min="' + mn + '" max="' + mx + '" step="1" value="0" style="width:100%;accent-color:var(--acc)">'; $("sl").appendChild(d); d.querySelector("input").oninput = e => { p[k] = +e.target.value; labels(); markTile(null); sched(); }; });
  let tiles = {}; const markTile = k => Object.entries(tiles).forEach(([n, el]) => el.classList.toggle("on", n === k));
  function setPreset(k){ p = {...PE_PRESETS[k]}; labels(); markTile(k); sched(); }
  function buildTiles(){ $("tp").innerHTML = ""; tiles = {}; const t = document.createElement("canvas"), r = 78 / Math.max(small.width, small.height); t.width = Math.round(small.width * r); t.height = Math.round(small.height * r); t.getContext("2d").drawImage(small, 0, 0, t.width, t.height);
    for(const k of Object.keys(PE_PRESETS)){ const c = document.createElement("canvas"); c.width = t.width; c.height = t.height; const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(t, 0, 0); const im = g.getImageData(0, 0, c.width, c.height); applyAll(im.data, im.width, im.height, PE_PRESETS[k]); g.putImageData(im, 0, 0);
      const d = document.createElement("div"); d.appendChild(c); d.insertAdjacentHTML("beforeend", "<span>" + PE_NAMES[k] + "</span>"); d.onclick = () => setPreset(k); $("tp").appendChild(d); tiles[k] = d; } }
  $("rs").onclick = () => setPreset("original");
  const on = v => () => { showOrig = v; render(); }; $("hold").onmousedown = on(true); $("hold").onmouseup = $("hold").onmouseleave = on(false); $("hold").ontouchstart = e => { e.preventDefault(); on(true)(); }; $("hold").ontouchend = on(false);
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 900 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("ed").hidden = false; buildTiles(); setPreset(PE_PRESETS[start] ? start : "original"); render(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; $("go").disabled = true; await new Promise(r => setTimeout(r, 20)); try{
      const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(src, 0, 0); const im = g.getImageData(0, 0, c.width, c.height); applyAll(im.data, im.width, im.height, p); g.putImageData(im, 0, 0);
      const fmt = $("of").value, blob = await IL.blob(fmt === "jpg" ? IL.flatten(c, "#ffffff") : c, IL.typeOf(fmt), .93); IL.show(blob, name + "_edited." + fmt, "Saved: " + c.width + " x " + c.height + " px (" + PL.sz(blob.size) + ")", "");
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not save this photo. Try a smaller one."; } $("go").disabled = false;
  };
  return IL.cleanup;
}
mountPhotoEditor(document.getElementById("tool"));
