/* ===================== TOOL: Rotate and Flip Image ===================== */
function rotatedSize(w, h, deg){ const r = deg * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [w * c + h * s, w * s + h * c]; }
/* END CORE */
function mountRotateFlip(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Rotate or flip it</label>
    <div class="row"><div><button id="l90" type="button" class="alt">↺ Left 90°</button></div><div><button id="r90" type="button" class="alt">↻ Right 90°</button></div><div><button id="r180" type="button" class="alt">Turn 180°</button></div><div><button id="fh" type="button" class="alt">⇋ Flip left-right</button></div><div><button id="fv" type="button" class="alt">⇅ Flip up-down</button></div><div><button id="rs" type="button" class="alt">Reset</button></div></div>
    <label for="an" style="display:flex;justify-content:space-between;margin-top:14px">Any angle <span id="anv"></span></label><input id="an" type="range" min="-180" max="180" step="0.5" value="0" style="width:100%;accent-color:var(--acc)">
    <div class="row" style="margin-top:10px"><div><label for="ex" style="font-weight:600">Corners after a tilt</label><select id="ex"><option value="1">Make the picture bigger to fit</option><option value="0">Keep the original size</option></select></div>
      <div><label for="bgm" style="font-weight:600">Empty areas</label><select id="bgm"><option value="t">See-through (PNG)</option><option value="c">Fill with a color</option></select></div><div id="bcw" hidden><label for="bc" style="font-weight:600">Color</label><input id="bc" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div>
      <div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="same">Same as the original</option><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div>
    <div class="row" style="margin-top:12px"><div><button id="go">Save the image</button></div></div></div>${IL.resultCard}`;
  let src = null, small = null, name = "image", type = "image/png", st = {a:0, fh:false, fv:false};
  const bg = () => $("bgm").value === "c" ? $("bc").value : null;
  function compose(img){
    const [w, h] = $("ex").value === "1" ? rotatedSize(img.width, img.height, st.a) : [img.width, img.height], c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); const g = c.getContext("2d");
    if(bg()){ g.fillStyle = bg(); g.fillRect(0, 0, c.width, c.height); } g.translate(c.width / 2, c.height / 2); g.rotate(st.a * Math.PI / 180); g.scale(st.fh ? -1 : 1, st.fv ? -1 : 1); g.drawImage(img, -img.width / 2, -img.height / 2); return c;
  }
  function paint(){ $("anv").textContent = (Math.round(st.a * 10) / 10) + "°"; $("an").value = st.a; const c = compose(small), p = $("pv"); p.width = c.width; p.height = c.height; p.getContext("2d").drawImage(c, 0, 0); $("bcw").hidden = $("bgm").value !== "c"; }
  const spin = d => { st.a = (((st.a + d + 180) % 360) + 360) % 360 - 180; paint(); };
  $("l90").onclick = () => spin(-90); $("r90").onclick = () => spin(90); $("r180").onclick = () => spin(180); $("fh").onclick = () => { st.fh = !st.fh; paint(); }; $("fv").onclick = () => { st.fv = !st.fv; paint(); };
  $("rs").onclick = () => { st = {a:0, fh:false, fv:false}; paint(); }; $("an").oninput = () => { st.a = +$("an").value; paint(); }; ["ex", "bgm", "bc"].forEach(k => { $(k).onchange = paint; $(k).oninput = paint; });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); type = file.type; $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 900 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; st = {a:0, fh:false, fv:false}; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("set").hidden = false; paint(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; let fmt = $("of").value === "same" ? (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg") : $("of").value, c = compose(src); if(fmt === "jpg") c = IL.flatten(c, bg() || "#ffffff");
    const blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, name + "_rotated." + fmt, "Saved: " + c.width + " x " + c.height + " px (" + PL.sz(blob.size) + ")", "");
  };
  return IL.cleanup;
}
mountRotateFlip(document.getElementById("tool"));
