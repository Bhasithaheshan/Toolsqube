/* ===================== TOOL: Favicon Generator ===================== */
/* build a .ico file from PNG images: [{size, bytes}] */
function buildIco(list){
  const n = list.length, head = new DataView(new ArrayBuffer(6 + 16 * n)); head.setUint16(2, 1, true); head.setUint16(4, n, true); let off = 6 + 16 * n;
  list.forEach((it, i) => { const o = 6 + 16 * i; head.setUint8(o, it.size >= 256 ? 0 : it.size); head.setUint8(o + 1, it.size >= 256 ? 0 : it.size); head.setUint16(o + 4, 1, true); head.setUint16(o + 6, 32, true); head.setUint32(o + 8, it.bytes.length, true); head.setUint32(o + 12, off, true); off += it.bytes.length; });
  return new Blob([head, ...list.map(i => i.bytes)], {type:"image/x-icon"});
}
/* END CORE */

function mountFavicon(root){
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose your logo or picture</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">A square picture works best. You can move and zoom it to fit.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. Settings</label>
      <div class="row"><div><label for="sh" style="font-weight:600">Shape</label><select id="sh"><option value="rect">Square</option><option value="round">Rounded square</option><option value="circle">Circle</option></select></div>
        <div><label for="bg" style="font-weight:600">Background (for the Apple icon)</label><input id="bg" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
      <label for="zm" style="display:flex;justify-content:space-between;margin-top:12px">Zoom <span id="zv"></span></label><input id="zm" type="range" min="100" max="500" step="1" value="100" style="width:100%;accent-color:var(--acc)">
      <div class="row" style="margin-top:12px"><div><label for="nm" style="font-weight:600">Site name</label><input id="nm" type="text" maxlength="40" value="My Website"></div><div><label for="tc" style="font-weight:600">Theme color</label><input id="tc" type="color" value="#0b8a93" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
      <div class="row" style="margin-top:14px"><div><button id="go" type="button">Make the favicon files</button></div></div><div id="status" aria-live="polite"></div></div>
    <div class="card pv-card"><label>Preview</label><canvas id="vp" width="420" height="420" style="touch-action:none;cursor:grab"></canvas></div></div>
  <div class="card" id="out" hidden><p id="res" style="font-weight:700;margin:0 0 10px"></p><div id="pre" class="row" style="align-items:end;gap:14px;margin-bottom:12px"></div>
    <div class="row" style="margin-bottom:12px"><div><button id="zip" type="button">Download all as ZIP</button></div></div>
    <label style="font-weight:600;font-size:.9rem">Paste this into the &lt;head&gt; of your website</label><textarea id="code" rows="7" readonly style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:inherit;font:.85rem/1.5 ui-monospace,Consolas,monospace"></textarea>
    <div class="row" style="margin-top:8px"><div><button id="cp" type="button" class="alt">Copy the code</button></div></div></div>`;
  let src = null, pz = null, files = [], urls = [];
  const SIZES = [16, 32, 48, 180, 192, 512];
  $("zm").oninput = () => { if(pz){ pz.setZoom($("zm").value / 100); $("zv").textContent = $("zm").value + "%"; } }; $("sh").onchange = () => pz && pz.setShape($("sh").value === "circle" ? "circle" : $("sh").value === "round" ? "round" : "rect");
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); $("set").hidden = false; pz = IL.panZoom($("vp"), src, {aspect:1, shape:"rect", onZoom:z => { $("zm").value = Math.round(z * 100); $("zv").textContent = Math.round(z * 100) + "%"; }}); $("zv").textContent = "100%"; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try PNG, JPG or SVG."; }
  };
  const shaped = (sq, n, shape) => { const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); g.beginPath(); if(shape === "circle") g.ellipse(n / 2, n / 2, n / 2, n / 2, 0, 0, 7); else if(shape === "round" && g.roundRect) g.roundRect(0, 0, n, n, n * .22); else g.rect(0, 0, n, n); g.clip(); g.drawImage(sq, 0, 0, n, n); return c; };
  $("go").onclick = async () => {
    if(!pz) return; $("status").textContent = "Making the files..."; await new Promise(r => setTimeout(r, 20));
    try{
      urls.forEach(u => URL.revokeObjectURL(u)); urls = []; files = []; const big = pz.out(512, 512), shape = $("sh").value, png = {};
      for(const n of SIZES){ const c = n === 180 ? IL.flatten(shaped(big, 512, "rect"), $("bg").value) : shaped(IL.resize(big, n, n), n, shape); const b = await IL.blob(n === 180 ? IL.resize(c, 180, 180) : c, "image/png"); png[n] = new Uint8Array(await b.arrayBuffer()); }
      const name = {16:"favicon-16x16.png", 32:"favicon-32x32.png", 48:"favicon-48x48.png", 180:"apple-touch-icon.png", 192:"android-chrome-192x192.png", 512:"android-chrome-512x512.png"};
      for(const n of SIZES) files.push({name:name[n], blob:new Blob([png[n]], {type:"image/png"})});
      files.push({name:"favicon.ico", blob:buildIco([16, 32, 48].map(n => ({size:n, bytes:png[n]})))});
      const man = {name:$("nm").value.trim() || "My Website", short_name:($("nm").value.trim() || "My Website").slice(0, 12), icons:[{src:"/android-chrome-192x192.png", sizes:"192x192", type:"image/png"}, {src:"/android-chrome-512x512.png", sizes:"512x512", type:"image/png"}], theme_color:$("tc").value, background_color:"#ffffff", display:"standalone"};
      files.push({name:"site.webmanifest", blob:new Blob([JSON.stringify(man, null, 2)], {type:"application/manifest+json"})});
      $("pre").innerHTML = ""; for(const f of files.filter(f => f.name.endsWith(".png"))){ const u = URL.createObjectURL(f.blob); urls.push(u); const d = document.createElement("div"); d.style.textAlign = "center"; const sz = parseInt(f.name.match(/(\d+)x\d+|apple/) ? (f.name.match(/(\d+)x\d+/) || [0, 180])[1] : 180); d.innerHTML = '<img alt="" style="width:' + Math.min(96, Math.max(16, sz)) + 'px;height:' + Math.min(96, Math.max(16, sz)) + 'px;display:block;margin:0 auto 4px;border:1px solid var(--line);background:#fff"><small style="color:var(--mute)">' + sz + 'px</small>'; d.querySelector("img").src = u; $("pre").appendChild(d); }
      $("code").value = '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="' + $("tc").value + '">';
      $("res").textContent = files.length + " files ready. Put them in the main folder of your website."; $("out").hidden = false; $("status").textContent = ""; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not make the files."; }
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(files), "favicon-files.zip"); $("zip").disabled = false; };
  $("cp").onclick = async () => { try{ await navigator.clipboard.writeText($("code").value); }catch(e){ $("code").select(); document.execCommand("copy"); } $("cp").textContent = "Copied"; setTimeout(() => $("cp").textContent = "Copy the code", 1500); };
  return () => urls.forEach(u => URL.revokeObjectURL(u));
}
mountFavicon(document.getElementById("tool"));
