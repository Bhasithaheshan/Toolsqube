/* ===================== TOOL: EXIF Viewer and Remover ===================== */
function mountExifTool(root){
  root.innerHTML = `<style>
  .xf{border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px;background:var(--surface2)}
  .xf .top{display:flex;gap:12px;align-items:center}.xf img{width:64px;height:64px;object-fit:cover;border-radius:10px;background:#fff;flex:none}
  .xf table{border-collapse:collapse;margin-top:10px;width:100%;font-size:.92rem}.xf td{padding:4px 8px;border-top:1px solid var(--line);vertical-align:top}.xf td:first-child{color:var(--mute);width:36%;white-space:nowrap}
  .warn{background:rgba(214,69,69,.12);border:1px solid #d64545;color:var(--ink);border-radius:10px;padding:8px 12px;margin-top:10px;font-weight:600;font-size:.92rem}.ok{background:rgba(42,157,87,.12);border:1px solid #2a9d57;border-radius:10px;padding:8px 12px;margin-top:10px;font-weight:600;font-size:.92rem}
  </style>
  <div class="card"><label for="f">1. Choose your photos</label><input id="f" type="file" accept="image/*" multiple><p id="info" class="hint">Select one or more photos. They stay on your device.</p><div id="list"></div></div>
  <div class="card" id="set" hidden><label>2. Remove the hidden details</label><p class="hint" style="margin-top:0">This deletes the camera details, the date and the location from the saved copy. The picture itself is not changed. JPG pictures are cleaned without any loss of quality.</p>
    <div class="row"><div><button id="go" type="button">Remove hidden details</button></div></div><progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div><div id="res" style="margin-top:10px"></div>
    <div class="row" id="zr" hidden style="margin-top:10px"><div><button id="zip" type="button" class="alt">Download all as ZIP</button></div></div></div>`;
  let items = [], results = [], urls = [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  async function show(file){
    const info = EX.read(new Uint8Array(await file.arrayBuffer())), rows = EX.describe(info), u = URL.createObjectURL(file); urls.push(u); const d = document.createElement("div"); d.className = "xf";
    let h = '<div class="top"><img alt="" src="' + u + '"><div><b>' + esc(file.name) + '</b><br><small style="color:var(--mute)">' + info.kind.toUpperCase() + " · " + PL.sz(file.size) + "</small></div></div>";
    if(info.gps) h += '<div class="warn">This photo shows where it was taken: ' + info.gps.lat.toFixed(5) + ", " + info.gps.lon.toFixed(5) + '. <a href="https://www.openstreetmap.org/?mlat=' + info.gps.lat + "&mlon=" + info.gps.lon + '#map=16/' + info.gps.lat + "/" + info.gps.lon + '" target="_blank" rel="noopener">See it on a map</a></div>';
    if(rows.length) h += "<table>" + rows.map(r => "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>").join("") + "</table>"; else if(info.hasMeta) h += '<div class="warn">This file has hidden data, but nothing that is easy to read.</div>'; else h += '<div class="ok">No hidden details found in this file.</div>';
    d.innerHTML = h; $("list").appendChild(d); return {file, info};
  }
  $("f").onchange = async e => {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = []; $("list").innerHTML = ""; items = []; results = []; $("res").innerHTML = ""; $("zr").hidden = true; const files = [...e.target.files].filter(f => f.type.startsWith("image/")); $("set").hidden = !files.length;
    for(const f of files){ try{ items.push(await show(f)); }catch(err){} } const gps = items.filter(i => i.info.gps).length; $("info").textContent = items.length + " photo(s) checked." + (gps ? " " + gps + " of them show the location." : "");
  };
  async function clean(it){
    const f = it.file, ext = it.info.kind === "png" ? "png" : it.info.kind === "webp" ? "webp" : "jpg", bytes = new Uint8Array(await f.arrayBuffer());
    if(it.info.kind === "gif") return null;
    if(it.info.kind === "jpeg" && it.info.orientation <= 1) return {blob:new Blob([EX.stripJpeg(bytes)], {type:"image/jpeg"}), ext:"jpg", note:"No quality lost"};
    const c = await IL.load(f), type = IL.typeOf(ext); return {blob:await IL.blob(ext === "jpg" ? IL.flatten(c, "#fff") : c, type, .95), ext, note:it.info.kind === "jpeg" ? "Turned upright, saved again at high quality" : "Saved again as a clean copy"};
  }
  $("go").onclick = async () => {
    $("go").disabled = true; $("bar").hidden = false; $("res").innerHTML = ""; results = []; let skipped = 0;
    for(let i = 0; i < items.length; i++){
      $("status").textContent = "Cleaning " + (i + 1) + " of " + items.length + "..."; $("bar").value = i / items.length; await new Promise(r => setTimeout(r, 10));
      try{ const c = await clean(items[i]); if(!c){ skipped++; continue; } const name = IL.base(items[i].file.name) + "_clean." + c.ext, u = URL.createObjectURL(c.blob); urls.push(u); results.push({name, blob:c.blob});
        let verified = ""; if(c.ext === "jpg"){ const v = EX.read(new Uint8Array(await c.blob.arrayBuffer())); verified = v.hasMeta ? "Some hidden data is still there" : "Checked: no hidden details left"; }
        const d = document.createElement("div"); d.style.cssText = "margin-top:8px"; d.innerHTML = '<a download style="color:var(--acc);font-weight:700"></a> <small style="color:var(--mute)"></small>'; const a = d.querySelector("a"); a.href = u; a.download = name; a.textContent = "Download " + name; d.querySelector("small").textContent = "· " + PL.sz(c.blob.size) + " · " + c.note + (verified ? " · " + verified : ""); $("res").appendChild(d);
      }catch(err){ skipped++; }
    }
    $("status").className = skipped ? "err" : ""; $("status").textContent = skipped ? skipped + " file(s) could not be cleaned (GIF pictures are not supported)." : "Done. " + results.length + " clean file(s) ready."; $("zr").hidden = results.length < 2; $("bar").hidden = true; $("go").disabled = false;
  };
  $("zip").onclick = async () => { $("zip").disabled = true; PL.dl(await PL.zip(results), "clean-photos.zip"); $("zip").disabled = false; };
  return () => urls.forEach(u => URL.revokeObjectURL(u));
}
mountExifTool(document.getElementById("tool"));
