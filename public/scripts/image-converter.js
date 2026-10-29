/* ===================== TOOL: Image Converter ===================== */
function mountImageConverter(root){
  let to = "jpg"; try{ to = (JSON.parse(root.dataset.preset || "null") || {}).to || "jpg"; }catch(e){}
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose your images</label><input id="f" type="file" accept="image/*" multiple><p id="info" class="hint">Select one or more images. JPG, PNG, WebP, GIF, BMP and SVG can be converted.</p></div>
  <div class="card" id="set" hidden><label>2. Convert to</label>
    <div class="row"><div><select id="of" aria-label="Format"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>
      <div id="qw"><label for="q" style="display:flex;justify-content:space-between;font-weight:600">Quality <span id="qv"></span></label><input id="q" type="range" min="40" max="100" step="1" value="92" style="width:100%;accent-color:var(--acc)"></div>
      <div id="bgw"><label for="bg" style="font-weight:600">Background for see-through parts</label><input id="bg" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
    <p class="hint">JPG has no transparency, so see-through parts of a PNG or WebP are filled with the background color.</p>
    <div class="row" style="margin-top:14px"><div><button id="go">Convert</button></div></div><progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>${IL.gridCard}`;
  let files = [], results = []; $("of").value = to;
  const sync = () => { const v = $("of").value; $("qw").hidden = v === "png"; $("bgw").hidden = v !== "jpg"; $("qv").textContent = $("q").value + "%"; }; $("of").onchange = sync; $("q").oninput = sync; sync();
  $("f").onchange = e => { files = [...e.target.files].filter(f => f.type.startsWith("image/")); $("outs").hidden = true; IL.clearResults(); $("set").hidden = !files.length; $("info").className = "hint"; $("info").textContent = files.length ? files.length + " image(s) chosen." : "No image chosen."; };
  $("go").onclick = async () => {
    if(!files.length) return; $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; IL.clearResults(); results = []; $("outs").hidden = false; let ok = 0; const fmt = $("of").value, t = IL.typeOf(fmt);
    for(let i = 0; i < files.length; i++){
      $("status").textContent = "Converting " + (i + 1) + " of " + files.length + "..."; $("bar").value = i / files.length; await new Promise(r => setTimeout(r, 10));
      try{ const f = files[i], c = await IL.load(f), cc = fmt === "jpg" ? IL.flatten(c, $("bg").value) : c, blob = await IL.blob(cc, t, +$("q").value / 100); if(!blob || blob.type !== t) throw new Error("fmt");
        const fn = IL.base(f.name) + "." + fmt; results.push({name:fn, blob}); IL.addResult(blob, fn, c.width + " x " + c.height + " px · " + PL.sz(f.size) + " to " + PL.sz(blob.size)); ok++; }catch(err){ if(err.message === "fmt"){ $("status").className = "err"; $("status").textContent = "Your browser cannot save this format. Choose JPG or PNG."; break; } }
    }
    $("cnt").textContent = ok ? ok + " image(s) converted to " + fmt.toUpperCase() : "Nothing was converted."; $("zip").hidden = ok < 2; if(ok) $("status").textContent = ""; $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), "converted-images.zip"); $("zip").disabled = false; };
  return IL.cleanup;
}
mountImageConverter(document.getElementById("tool"));
