/* ===================== TOOL: Color Palette Extractor ===================== */
function mountPalette(root){
  root.innerHTML = `<style>
  .cp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  .cp-sw{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card);cursor:pointer}
  .cp-sw:hover{border-color:var(--acc)}
  .cp-sw .c{height:86px;display:flex;align-items:flex-end;padding:8px 10px;font-weight:700;font-size:.8rem}
  .cp-sw .t{padding:9px 10px}
  .cp-sw b{display:block;font-family:ui-monospace,Consolas,monospace;font-size:.95rem}
  .cp-sw small{color:var(--mute)}
  .cp-cv{width:100%;display:block;border-radius:12px;cursor:crosshair;border:1px solid var(--line)}
  .cp-hover{display:inline-flex;align-items:center;gap:8px;font-family:ui-monospace,Consolas,monospace;font-weight:700}
  .cp-dot{width:22px;height:22px;border-radius:6px;border:1px solid var(--line);display:inline-block}
  </style>
  <div class="card"><label for="f">1. Upload a screenshot</label>
    <input id="f" type="file" accept="image/*">
    <p id="info" class="hint">Choose an image, drop one here, or paste a screenshot with Ctrl+V.</p></div>
  <div class="card" id="pal" hidden>
    <label for="cnt">2. Main colors found</label>
    <div class="row"><div><select id="cnt" aria-label="Number of colors"><option>4</option><option>6</option><option selected>8</option><option>10</option><option>12</option></select></div>
      <div><button id="cph" class="alt" type="button">Copy all HEX</button></div>
      <div><button id="ccss" class="alt" type="button">Copy as CSS variables</button></div></div>
    <p id="msg" class="hint" aria-live="polite">Click a color to copy its HEX code.</p>
    <div id="sw" class="cp-grid" style="margin-top:12px"></div></div>
  <div class="card" id="pick" hidden>
    <label>3. Pick an exact color</label>
    <p class="hint" style="margin:0 0 10px">Move over the image to see a color, click to add it to your list.</p>
    <canvas id="cv" class="cp-cv"></canvas>
    <p style="margin:10px 0 0"><span class="cp-hover"><span id="hdot" class="cp-dot"></span><span id="htxt">#------</span></span></p>
    <div id="picked" class="cp-grid" style="margin-top:12px"></div></div>`;
  let img = null, urls = [], picked = [], lastCols = [];
  const hex = (r, g, b) => "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  const ink = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#111" : "#fff";
  async function copy(t){
    try{ await navigator.clipboard.writeText(t); }
    catch(e){ const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    $("msg").textContent = "Copied " + (t.includes("\n") ? "all colors" : t);
  }
  function swatch(c, pct){
    const d = document.createElement("div"); d.className = "cp-sw"; d.tabIndex = 0; d.setAttribute("role", "button");
    d.setAttribute("aria-label", "Copy " + c.hex);
    d.innerHTML = `<div class="c" style="background:${c.hex};color:${ink(c.r, c.g, c.b)}">${pct == null ? "" : pct + "%"}</div><div class="t"><b>${c.hex}</b><small>rgb(${c.r}, ${c.g}, ${c.b})</small></div>`;
    d.onclick = () => copy(c.hex);
    d.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); copy(c.hex); } };
    return d;
  }
  function extract(n){
    const sc = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", {willReadFrequently:true}); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, map = new Map(); let total = 0;
    for(let i = 0; i < d.length; i += 4){
      if(d[i + 3] < 200) continue;
      const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; map.set(k, (map.get(k) || 0) + 1); total++;
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6000), cl = [], T2 = 32 * 32;
    for(const [k, cnt] of entries){
      const r = k >> 16, gg = (k >> 8) & 255, b = k & 255; let hit = null, best = 1e9;
      for(const q of cl){ const dd = (q.r - r) ** 2 + (q.g - gg) ** 2 + (q.b - b) ** 2; if(dd < best){ best = dd; hit = q; } }
      if(hit && best <= T2) hit.n += cnt;
      else if(cl.length < n) cl.push({r, g:gg, b, n:cnt});
      else if(hit) hit.n += cnt;
    }
    cl.sort((a, b) => b.n - a.n);
    lastCols = cl.map(q => ({r:q.r, g:q.g, b:q.b, hex:hex(q.r, q.g, q.b), pct:Math.max(1, Math.round(q.n / total * 100))}));
    $("sw").innerHTML = ""; lastCols.forEach(q => $("sw").appendChild(swatch(q, q.pct)));
  }
  function setupPicker(){
    const cv = $("cv"), sc = Math.min(1, 3000 / Math.max(img.naturalWidth, img.naturalHeight));
    cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
    const cx = cv.getContext("2d", {willReadFrequently:true}); cx.drawImage(img, 0, 0, cv.width, cv.height);
    const at = e => {
      const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) * cv.width / r.width), y = Math.floor((e.clientY - r.top) * cv.height / r.height);
      if(x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
      const p = cx.getImageData(x, y, 1, 1).data; return {r:p[0], g:p[1], b:p[2], hex:hex(p[0], p[1], p[2])};
    };
    cv.onmousemove = e => { const c = at(e); if(c){ $("hdot").style.background = c.hex; $("htxt").textContent = c.hex; } };
    cv.onclick = e => {
      const c = at(e); if(!c || picked.some(p => p.hex === c.hex)) return;
      picked.push(c); $("picked").appendChild(swatch(c, null)); copy(c.hex);
    };
  }
  function load(file){
    if(!file || !file.type.startsWith("image/")) return;
    img = null; picked = []; $("picked").innerHTML = ""; $("pal").hidden = true; $("pick").hidden = true;
    const url = URL.createObjectURL(file); urls.push(url);
    const im = new Image();
    im.onload = () => { img = im; $("info").className = "hint"; $("info").textContent = (file.name || "Pasted image") + " (" + im.naturalWidth + " x " + im.naturalHeight + " px)";
      extract(+$("cnt").value); setupPicker(); $("pal").hidden = false; $("pick").hidden = false; };
    im.onerror = () => { $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try PNG, JPG or WebP."; };
    $("info").className = "hint"; $("info").textContent = "Loading..."; im.src = url;
  }
  $("f").onchange = e => load(e.target.files[0]);
  $("cnt").onchange = () => img && extract(+$("cnt").value);
  $("cph").onclick = () => lastCols.length && copy(lastCols.map(c => c.hex).join("\n"));
  $("ccss").onclick = () => lastCols.length && copy(":root {\n" + lastCols.map((c, i) => "  --color-" + (i + 1) + ": " + c.hex + ";").join("\n") + "\n}");
  const onPaste = e => { const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/")); if(it) load(it.getAsFile()); };
  document.addEventListener("paste", onPaste);
  return () => { document.removeEventListener("paste", onPaste); urls.forEach(u => URL.revokeObjectURL(u)); };
}

mountPalette(document.getElementById("tool"));
