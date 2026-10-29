/* ===================== TOOL: Round Corners of an Image ===================== */
function mountRoundCorners(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Round the corners</label>
    <label for="rd" style="display:flex;justify-content:space-between">How round <span id="rdv"></span></label><input id="rd" type="range" min="0" max="50" step="0.5" value="12" style="width:100%;accent-color:var(--acc)">
    <p class="hint" style="margin-top:4px">50% makes a circle (or a pill shape for a wide image).</p>
    <div class="row" style="margin-top:10px"><div><label for="bw" style="font-weight:600">Border (px)</label><input id="bw" type="number" min="0" max="80" step="1" value="0"></div><div><label for="bc" style="font-weight:600">Border color</label><input id="bc" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div>
      <div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG (see-through corners)</option><option value="webp">WebP (see-through, smaller)</option><option value="jpg">JPG (white corners)</option></select></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div>
    <div class="row" style="margin-top:12px"><div><button id="go">Save the image</button></div></div></div>${IL.resultCard}`;
  let src = null, small = null, name = "image";
  function compose(img, k){
    const w = img.width, h = img.height, r = Math.min(w, h) * $("rd").value / 100, bw = Math.round((+$("bw").value || 0) * k), c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    const p = () => { g.beginPath(); if(g.roundRect) g.roundRect(0, 0, w, h, r); else g.rect(0, 0, w, h); };
    g.save(); p(); g.clip(); g.drawImage(img, 0, 0); g.restore(); if(bw > 0){ g.save(); p(); g.clip(); p(); g.lineWidth = bw * 2; g.strokeStyle = $("bc").value; g.stroke(); g.restore(); } return c;
  }
  function paint(){ $("rdv").textContent = $("rd").value + "%"; const c = compose(small, small.width / src.width), p = $("pv"); p.width = c.width; p.height = c.height; p.getContext("2d").drawImage(c, 0, 0); }
  ["rd", "bw", "bc"].forEach(k => { $(k).oninput = paint; $(k).onchange = paint; });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 800 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("set").hidden = false; paint(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => { if(!src) return; const fmt = $("of").value; let c = compose(src, 1); if(fmt === "jpg") c = IL.flatten(c, "#ffffff"); const blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, name + "_rounded." + fmt, "Saved: " + c.width + " x " + c.height + " px (" + PL.sz(blob.size) + ")", ""); };
  return IL.cleanup;
}
mountRoundCorners(document.getElementById("tool"));
