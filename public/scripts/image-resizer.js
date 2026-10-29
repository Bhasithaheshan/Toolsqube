/* ===================== TOOL: Image Resizer ===================== */
const RS_PRESETS = {"":"Choose a preset...", "1080x1080":"Instagram post (1080 x 1080)", "1080x1920":"Instagram or WhatsApp story (1080 x 1920)", "1200x630":"Facebook or link share (1200 x 630)", "820x312":"Facebook cover (820 x 312)", "1280x720":"YouTube thumbnail (1280 x 720)", "500x500":"Profile picture (500 x 500)", "413x531":"Passport photo 35 x 45 mm (413 x 531)", "1920x1080":"Full HD (1920 x 1080)"};
function mountImageResizer(root){
  let mode = "px"; try{ mode = (JSON.parse(root.dataset.preset || "null") || {}).mode || "px"; }catch(e){}
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose your images</label><input id="f" type="file" accept="image/*" multiple><p id="info" class="hint">Select one or more images (JPG, PNG, WebP and more). They are all resized the same way.</p></div>
  <div class="card" id="set" hidden><label>2. How to resize</label>
    <div class="tabs"><button id="t1" type="button">By pixels</button><button id="t2" type="button" class="alt">By percent</button><button id="t3" type="button" class="alt">To a file size</button></div>
    <div id="m1"><div class="row"><div><label for="w" style="font-weight:600">Width (px)</label><input id="w" type="number" min="1" step="1"></div><div><label for="h" style="font-weight:600">Height (px)</label><input id="h" type="number" min="1" step="1"></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="lk" type="checkbox" checked> Keep the proportions</label>
      <div class="row" style="margin-top:10px"><div><label for="ft" style="font-weight:600">If the shape is different</label><select id="ft"><option value="fit">Fit inside the size</option><option value="fill">Fill the size and crop the edges</option><option value="stretch">Stretch to the exact size</option></select></div><div><label for="ps" style="font-weight:600">Size presets</label><select id="ps">${Object.entries(RS_PRESETS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="ne" type="checkbox"> Do not make small images bigger</label></div>
    <div id="m2" hidden><label for="pc" style="display:flex;justify-content:space-between">Percent of the original size <span id="pcv"></span></label><input id="pc" type="range" min="5" max="300" step="1" value="50" style="width:100%;accent-color:var(--acc)"></div>
    <div id="m3" hidden><label for="kb" style="font-weight:600">Make the file smaller than</label><div class="row"><div><input id="kb" type="number" min="5" step="any" value="100"></div><div><select id="ku"><option value="1024">KB</option><option value="1048576">MB</option></select></div></div>
      <div class="row" style="margin-top:10px"><div><button type="button" class="alt" data-k="20">20 KB</button></div><div><button type="button" class="alt" data-k="50">50 KB</button></div><div><button type="button" class="alt" data-k="100">100 KB</button></div><div><button type="button" class="alt" data-k="200">200 KB</button></div><div><button type="button" class="alt" data-k="500">500 KB</button></div></div>
      <p class="hint">The quality is lowered as little as possible, then the size in pixels if needed. Files are saved as JPG or WebP.</p></div>
    <div class="row" style="margin-top:16px"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="same">Same as the original</option><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div><div id="qw"><label for="q" style="display:flex;justify-content:space-between;font-weight:600">Quality <span id="qv"></span></label><input id="q" type="range" min="40" max="100" step="1" value="90" style="width:100%;accent-color:var(--acc)"></div></div>
    <div class="row" style="margin-top:14px"><div><button id="go">Resize</button></div></div><progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>${IL.gridCard}`;
  let files = [], first = null, results = [];
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const setMode = m => { mode = m; [1, 2, 3].forEach(k => { $("m" + k).hidden = (m === "px" ? 1 : m === "pc" ? 2 : 3) !== k; $("t" + k).className = (m === "px" ? 1 : m === "pc" ? 2 : 3) === k ? "" : "alt"; }); $("qw").hidden = m === "kb"; };
  $("t1").onclick = () => setMode("px"); $("t2").onclick = () => setMode("pc"); $("t3").onclick = () => setMode("kb"); setMode(mode);
  const labs = () => { $("pcv").textContent = $("pc").value + "%"; $("qv").textContent = $("q").value + "%"; }; ["pc", "q"].forEach(k => $(k).oninput = labs); labs();
  root.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { $("kb").value = b.dataset.k; $("ku").value = 1024; });
  $("w").oninput = () => { if($("lk").checked && first && $("w").value) $("h").value = Math.round($("w").value * first.height / first.width); };
  $("h").oninput = () => { if($("lk").checked && first && $("h").value) $("w").value = Math.round($("h").value * first.width / first.height); };
  $("ps").onchange = () => { const v = $("ps").value; if(!v) return; const [a, b] = v.split("x"); $("w").value = a; $("h").value = b; $("lk").checked = false; $("ft").value = "fill"; };
  $("f").onchange = async e => {
    files = [...e.target.files].filter(f => f.type.startsWith("image/")); $("set").hidden = true; $("outs").hidden = true; IL.clearResults(); if(!files.length) return;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ first = await IL.load(files[0]); $("w").value = first.width; $("h").value = first.height; $("info").textContent = files.length + " image(s) chosen. The first one is " + first.width + " x " + first.height + " px."; $("set").hidden = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read the first image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!files.length) return; const W = +$("w").value, Hh = +$("h").value, pct = +$("pc").value / 100, target = (+$("kb").value || 0) * +$("ku").value;
    if(mode === "px" && !(W > 0 || Hh > 0)) return fail("Enter a width or a height."); if(mode === "kb" && target < 5120) return fail("Enter a size of at least 5 KB.");
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; IL.clearResults(); results = []; $("outs").hidden = false; let ok = 0;
    for(let i = 0; i < files.length; i++){
      $("status").textContent = "Resizing " + (i + 1) + " of " + files.length + "..."; $("bar").value = i / files.length; await new Promise(r => setTimeout(r, 10));
      try{
        const f = files[i], src = await IL.load(f); let c = src, fmt = $("of").value === "same" ? (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg") : $("of").value, blob, detail;
        if(mode === "pc"){ c = IL.resize(src, src.width * pct, src.height * pct); }
        else if(mode === "px"){
          let tw = W || Math.round(Hh * src.width / src.height), th = Hh || Math.round(W * src.height / src.width), ft = $("ft").value;
          if($("lk").checked && W && Hh && ft === "stretch") ft = "fit"; if(ft === "fit"){ const s = Math.min(tw / src.width, th / src.height); if($("ne").checked && s > 1) c = src; else c = IL.resize(src, src.width * s, src.height * s); }
          else if(ft === "fill"){ const s = Math.max(tw / src.width, th / src.height); if($("ne").checked && s > 1){ c = src; } else { const big = IL.resize(src, src.width * s, src.height * s), o = document.createElement("canvas"); o.width = tw; o.height = th; o.getContext("2d").drawImage(big, (tw - big.width) / 2, (th - big.height) / 2); c = o; } }
          else c = IL.resize(src, tw, th);
        }
        if(mode === "kb"){ const r = await IL.fitToSize(c, IL.typeOf(fmt), target); if(!r){ continue; } blob = r.blob; fmt = IL.extOf(r.type); c = {width:r.w, height:r.h}; }
        else{ const t = IL.typeOf(fmt), cc = t === "image/jpeg" ? IL.flatten(c, "#ffffff") : c; blob = await IL.blob(cc, t, +$("q").value / 100); }
        const fn = IL.base(f.name) + "_" + c.width + "x" + c.height + "." + fmt; detail = c.width + " x " + c.height + " px · " + PL.sz(f.size) + " to " + PL.sz(blob.size); results.push({name:fn, blob}); IL.addResult(blob, fn, detail); ok++;
      }catch(err){}
    }
    $("cnt").textContent = ok ? ok + " image(s) resized" : "Could not resize these images."; $("zip").hidden = ok < 2; $("status").textContent = ""; $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), "resized-images.zip"); $("zip").disabled = false; };
  return IL.cleanup;
}
mountImageResizer(document.getElementById("tool"));
