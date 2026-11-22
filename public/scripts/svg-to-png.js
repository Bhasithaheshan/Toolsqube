/* ===================== TOOL: SVG to PNG ===================== */
const UNIT = {px:1, pt:4 / 3, pc:16, in:96, cm:96 / 2.54, mm:96 / 25.4};
/* the size of an SVG in pixels, from width and height, or else from the viewBox */
function svgSize(text){
  const tag = (String(text).match(/<svg\b[^>]*>/i) || [""])[0], num = n => { const m = tag.match(new RegExp("\\s" + n + "\\s*=\\s*[\"']\\s*([\\d.]+)\\s*([a-z%]*)\\s*[\"']", "i")); return m && m[2] !== "%" ? parseFloat(m[1]) * (UNIT[m[2].toLowerCase()] || 1) : null; };
  let w = num("width"), h = num("height"); const vb = tag.match(/viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["']/i), vw = vb ? parseFloat(vb[3]) : 0, vh = vb ? parseFloat(vb[4]) : 0;
  if(!w && !h && vw && vh){ w = vw; h = vh; } else if(w && !h && vw && vh) h = w * vh / vw; else if(h && !w && vw && vh) w = h * vw / vh;
  return w && h ? {w, h} : {w:512, h:512, guessed:true};
}
/* make sure the SVG has an xmlns and a width and height, so a browser can draw it */
function fixSvg(text){ const s = svgSize(text); let t = String(text).trim(); t = t.replace(/^<\?xml[^>]*\?>\s*/i, "").replace(/<!DOCTYPE[^>]*>\s*/i, ""); return t.replace(/<svg\b([^>]*)>/i, (m, a) => { let at = a; if(!/xmlns\s*=/.test(at)) at += ' xmlns="http://www.w3.org/2000/svg"'; at = at.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, "") + ' width="' + s.w + '" height="' + s.h + '"'; return "<svg" + at + ">"; }); }
/* END CORE */

function mountSvgToPng(root){
  let to = "png"; try{ to = (JSON.parse(root.dataset.preset || "null") || {}).to || "png"; }catch(e){}
  root.innerHTML = `<div class="card"><label for="f">1. Choose an SVG file</label><input id="f" type="file" accept=".svg,image/svg+xml"><p class="hint">Or paste the SVG code:</p><textarea id="code" rows="5" placeholder="<svg ...> ... </svg>" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:inherit;font:.8rem/1.4 ui-monospace,Consolas,monospace"></textarea><p id="info" class="hint" aria-live="polite"></p></div>
  <div class="card" id="set" hidden><label>2. Size and format</label>
    <div class="row"><div><label for="sc" style="font-weight:600">Size</label><select id="sc"><option value="1">Original size</option><option value="2" selected>2x bigger</option><option value="3">3x bigger</option><option value="4">4x bigger</option><option value="w">Set the width...</option></select></div><div id="ww" hidden><label for="wd" style="font-weight:600">Width (px)</label><input id="wd" type="number" min="16" max="8000" step="1" value="1024"></div>
      <div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></div></div>
    <div class="row" style="margin-top:12px"><div><label style="display:flex;gap:8px;align-items:center;font-weight:600"><input id="tr" type="checkbox" checked> See-through background</label></div><div id="bgw" hidden><input id="bg" type="color" value="#ffffff" style="height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:50vh;display:block;margin:0 auto;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div><p id="dim" class="hint" style="font-weight:600"></p>
    <div class="row" style="margin-top:8px"><div><button id="go" type="button">Convert</button></div></div></div>${IL.resultCard}`;
  let svg = "", name = "image", img = null, url = null; $("of").value = to;
  const target = () => { const s = svgSize(svg), k = $("sc").value === "w" ? (+$("wd").value || 1024) / s.w : +$("sc").value, w = Math.min(8000, Math.max(1, Math.round(s.w * k))), h = Math.min(8000, Math.max(1, Math.round(s.h * w / s.w))); return {w, h}; };
  function draw(c, t){ c.width = t.w; c.height = t.h; const g = c.getContext("2d"); const jpg = $("of").value === "jpg", solid = !$("tr").checked || jpg; if(solid){ g.fillStyle = $("bg").value; g.fillRect(0, 0, t.w, t.h); } g.drawImage(img, 0, 0, t.w, t.h); }
  async function load(text, nm){
    svg = fixSvg(text); name = nm || "image"; if(!/<svg\b/i.test(svg)){ $("info").className = "hint err"; $("info").textContent = "This does not look like SVG code."; $("set").hidden = true; return; }
    if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob([svg], {type:"image/svg+xml;charset=utf-8"})); const im = new Image();
    try{ await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url; }); }catch(e){ $("info").className = "hint err"; $("info").textContent = "Your browser could not draw this SVG. Check that the code is complete."; $("set").hidden = true; return; }
    img = im; const s = svgSize(svg); $("info").className = "hint"; $("info").textContent = "SVG loaded: " + Math.round(s.w) + " x " + Math.round(s.h) + " px" + (s.guessed ? " (no size found, so 512 x 512 is used)" : ""); $("set").hidden = false; preview();
  }
  function preview(){ if(!img) return; $("ww").hidden = $("sc").value !== "w"; $("bgw").hidden = $("tr").checked && $("of").value !== "jpg"; const t = target(), k = Math.min(1, 700 / Math.max(t.w, t.h)); draw($("pv"), {w:Math.round(t.w * k), h:Math.round(t.h * k)}); $("dim").textContent = "The picture will be " + t.w + " x " + t.h + " px."; }
  ["sc", "wd", "of", "tr", "bg"].forEach(k => { $(k).oninput = preview; $(k).onchange = preview; });
  $("f").onchange = async e => { const f = e.target.files[0]; if(f){ $("code").value = ""; await load(await f.text(), IL.base(f.name)); } };
  let t0 = 0; $("code").oninput = () => { clearTimeout(t0); t0 = setTimeout(() => $("code").value.trim() && load($("code").value, "image"), 400); };
  $("go").onclick = async () => { if(!img) return; const t = target(), c = document.createElement("canvas"); draw(c, t); const fmt = $("of").value, blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, name + "." + fmt, "Converted: " + t.w + " x " + t.h + " px (" + PL.sz(blob.size) + ")", ""); };
  return () => { if(url) URL.revokeObjectURL(url); IL.cleanup(); };
}
mountSvgToPng(document.getElementById("tool"));
