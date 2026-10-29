/* ===================== TOOL: Add Border to Image ===================== */
function mountImageBorder(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Style the border</label>
    <div class="row"><div><label for="st" style="font-weight:600">Style</label><select id="st"><option value="solid">Plain frame</option><option value="polaroid">Polaroid (wider at the bottom)</option><option value="double">Double line</option></select></div>
      <div><label for="cl" style="font-weight:600">Color</label><input id="cl" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div>
      <div id="icw" hidden><label for="ic" style="font-weight:600">Inner line color</label><input id="ic" type="color" value="#222222" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
    <label for="bw" style="display:flex;justify-content:space-between;margin-top:14px">Border size <span id="bwv"></span></label><input id="bw" type="range" min="1" max="30" step="0.5" value="6" style="width:100%;accent-color:var(--acc)">
    <div id="cpw" hidden style="margin-top:10px"><label for="cp" style="font-weight:600">Caption (optional)</label><input id="cp" type="text" maxlength="60" placeholder="Write something under the photo"></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="rc" type="checkbox"> Rounded outer corners</label>
    <div class="row" style="margin-top:12px"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div>
    <div class="row" style="margin-top:12px"><div><button id="go">Save the image</button></div></div></div>${IL.resultCard}`;
  let src = null, small = null, name = "image";
  function compose(img){
    const m = Math.min(img.width, img.height), b = Math.max(1, Math.round(m * $("bw").value / 100)), pol = $("st").value === "polaroid", bot = pol ? Math.round(b * 3.4) : b, W = img.width + 2 * b, H = img.height + b + bot, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    if($("rc").checked){ const r = Math.min(W, H) * .06 + b * .8; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, r) : g.rect(0, 0, W, H); g.clip(); }
    g.fillStyle = $("cl").value; g.fillRect(0, 0, W, H); g.drawImage(img, b, b);
    if($("st").value === "double"){ g.strokeStyle = $("ic").value; g.lineWidth = Math.max(1, b * .12); g.strokeRect(b * .5, b * .5, W - b, H - b); g.strokeRect(b - g.lineWidth, b - g.lineWidth, img.width + 2 * g.lineWidth, img.height + 2 * g.lineWidth); }
    if(pol && $("cp").value.trim()){ g.fillStyle = "#333"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = Math.round(bot * .38) + 'px "Segoe Script","Brush Script MT","Bradley Hand",cursive'; g.fillText($("cp").value.trim(), W / 2, img.height + b + bot * .55, W - 2 * b); }
    return c;
  }
  function paint(){ $("bwv").textContent = $("bw").value + "%"; $("icw").hidden = $("st").value !== "double"; $("cpw").hidden = $("st").value !== "polaroid"; const c = compose(small), p = $("pv"); p.width = c.width; p.height = c.height; p.getContext("2d").drawImage(c, 0, 0); }
  ["st", "cl", "ic", "bw", "cp", "rc"].forEach(k => { $(k).oninput = paint; $(k).onchange = paint; });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 800 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("set").hidden = false; paint(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => { if(!src) return; const fmt = $("of").value; let c = compose(src); if(fmt === "jpg") c = IL.flatten(c, "#ffffff"); const blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, name + "_border." + fmt, "Saved: " + c.width + " x " + c.height + " px (" + PL.sz(blob.size) + ")", ""); };
  return IL.cleanup;
}
mountImageBorder(document.getElementById("tool"));
