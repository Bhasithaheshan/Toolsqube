/* ===================== TOOL: Image Splitter ===================== */
/* pieces of a W x H picture; edges are rounded so every pixel belongs to exactly one piece */
function splitGrid(W, H, rows, cols){ const out = []; for(let r = 0; r < rows; r++) for(let c = 0; c < cols; c++){ const x0 = Math.round(c * W / cols), x1 = Math.round((c + 1) * W / cols), y0 = Math.round(r * H / rows), y1 = Math.round((r + 1) * H / rows); out.push({r, c, x:x0, y:y0, w:x1 - x0, h:y1 - y0}); } return out; }
function splitBySize(W, H, pw, ph){ const out = []; let r = 0; for(let y = 0; y < H; y += ph, r++){ let c = 0; for(let x = 0; x < W; x += pw, c++) out.push({r, c, x, y, w:Math.min(pw, W - x), h:Math.min(ph, H - y)}); } return out; }
/* END CORE */

function mountImageSplitter(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div class="card" id="set" hidden><label>2. How to cut it</label>
    <div class="tabs"><button id="t1" type="button">Rows and columns</button><button id="t2" type="button" class="alt">Size of each piece</button></div>
    <div id="m1"><div class="row"><div><label for="rw" style="font-weight:600">Rows</label><input id="rw" type="number" min="1" max="20" step="1" value="3"></div><div><label for="cl" style="font-weight:600">Columns</label><input id="cl" type="number" min="1" max="20" step="1" value="3"></div></div>
      <div class="row" style="margin-top:10px"><div><button type="button" class="alt" data-g="3x3">3 x 3</button></div><div><button type="button" class="alt" data-g="3x1">3 x 1 (3 wide)</button></div><div><button type="button" class="alt" data-g="1x3">1 x 3 (3 tall)</button></div><div><button type="button" class="alt" data-g="2x2">2 x 2</button></div><div><button type="button" class="alt" data-g="4x1">4 x 1</button></div></div></div>
    <div id="m2" hidden><div class="row"><div><label for="pw" style="font-weight:600">Piece width (px)</label><input id="pw" type="number" min="16" step="1" value="1080"></div><div><label for="ph" style="font-weight:600">Piece height (px)</label><input id="ph" type="number" min="16" step="1" value="1080"></div></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:55vh;display:block;margin:0 auto"></canvas></div>
    <p id="dim" class="hint" style="font-weight:600"></p>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:6px 0 0"><input id="ig" type="checkbox"> Name the files in the order to post on Instagram (the last piece is number 1)</label>
    <div class="row" style="margin-top:12px"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div><div style="align-self:end"><button id="go">Cut the image</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>${IL.gridCard}`;
  let src = null, small = null, name = "image", mode = "grid", results = [];
  const setMode = m => { mode = m; $("m1").hidden = m !== "grid"; $("m2").hidden = m !== "size"; $("t1").className = m === "grid" ? "" : "alt"; $("t2").className = m === "size" ? "" : "alt"; paint(); };
  $("t1").onclick = () => setMode("grid"); $("t2").onclick = () => setMode("size");
  const pieces = (W, H) => mode === "grid" ? splitGrid(W, H, Math.max(1, Math.min(20, +$("rw").value || 1)), Math.max(1, Math.min(20, +$("cl").value || 1))) : splitBySize(W, H, Math.max(16, +$("pw").value || 16), Math.max(16, +$("ph").value || 16));
  function paint(){
    if(!small) return; const p = $("pv"), g = p.getContext("2d"), k = small.width / src.width; p.width = small.width; p.height = small.height; g.drawImage(small, 0, 0);
    const ps = pieces(src.width, src.height); g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.fillStyle = "rgba(0,0,0,.55)"; g.font = "bold " + Math.max(14, Math.round(Math.min(p.width, p.height) / 14)) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    ps.forEach((t, i) => { g.strokeRect(t.x * k, t.y * k, t.w * k, t.h * k); if(ps.length < 60){ g.fillStyle = "rgba(0,0,0,.55)"; g.fillText(i + 1, (t.x + t.w / 2) * k, (t.y + t.h / 2) * k); } });
    $("dim").textContent = ps.length + " pieces. The first piece is " + ps[0].w + " x " + ps[0].h + " px.";
  }
  ["rw", "cl", "pw", "ph"].forEach(k => { $(k).oninput = paint; $(k).onchange = paint; });
  root.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { const [r, c] = b.dataset.g.split("x"); $("rw").value = r; $("cl").value = c; setMode("grid"); });
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("outs").hidden = true; IL.clearResults(); if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 800 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("set").hidden = false; paint(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; const ps = pieces(src.width, src.height); if(ps.length > 400) return; $("go").disabled = true; $("bar").hidden = false; IL.clearResults(); results = []; $("outs").hidden = false; const fmt = $("of").value, t = IL.typeOf(fmt), pad = String(ps.length).length;
    for(let i = 0; i < ps.length; i++){
      $("status").textContent = "Cutting piece " + (i + 1) + " of " + ps.length + "..."; $("bar").value = i / ps.length; if(i % 4 === 0) await new Promise(r => setTimeout(r, 0));
      const p = ps[i], c = document.createElement("canvas"); c.width = p.w; c.height = p.h; c.getContext("2d").drawImage(src, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h); const blob = await IL.blob(fmt === "jpg" ? IL.flatten(c, "#ffffff") : c, t, .93), n = $("ig").checked ? ps.length - i : i + 1, fn = name + "_" + String(n).padStart(pad, "0") + "." + fmt;
      results.push({name:fn, blob}); IL.addResult(blob, fn, "Piece " + (i + 1) + " · " + p.w + " x " + p.h + " px · " + PL.sz(blob.size));
    }
    $("cnt").textContent = ps.length + " pieces ready"; $("zip").hidden = ps.length < 2; $("status").textContent = ""; $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), name + "_pieces.zip"); $("zip").disabled = false; };
  return IL.cleanup;
}
mountImageSplitter(document.getElementById("tool"));
