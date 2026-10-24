/* ===================== TOOL: Audio Joiner ===================== */
function mountAudioJoiner(root){
  root.innerHTML = `<style>
  .mp-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
  .mp-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);cursor:grab}
  .mp-row.drag{opacity:.45}
  .mp-n{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--accink);display:grid;place-items:center;font-weight:700;font-size:.85rem;flex:none}
  .mp-i{flex:1;min-width:0}
  .mp-i b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mp-i small{color:var(--mute)}
  .mp-b{display:flex;gap:4px;flex:none}
  .card .mp-b button{padding:6px 10px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  </style>
  <div class="card"><label for="f">1. Choose your audio files</label>
    <input id="f" type="file" accept="audio/*" multiple>
    <p id="info" class="hint">Select two or more audio files (MP3, WAV, M4A and more). You can pick several at once and add more later.</p>
    <div id="list" class="mp-list"></div>
    <div class="row" id="tools" hidden style="margin-top:12px">
      <div><button id="az" class="alt" type="button">Sort A to Z</button></div>
      <div><button id="clr" class="danger" type="button">Remove all</button></div></div></div>
  <div class="card"><label>2. Settings</label>
    <div class="row"><div><label for="nm" style="font-weight:600">File name</label><input id="nm" type="text" value="joined"></div>
      <div><label for="gap" style="font-weight:600">Silence between files (seconds)</label><input id="gap" type="number" min="0" max="30" step="0.5" value="0"></div></div>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Join audio</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div>
    <p class="hint">Drag the rows, or use the arrows, to set the order. The files play from top to bottom. The result is saved as WAV.</p></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let items = [], uid = 0, url = null, dragI = -1, ctx = null;
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const info = (t, err) => { $("info").className = "hint" + (err ? " err" : ""); $("info").textContent = t; };
  const getCtx = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)({sampleRate:44100}));
  const move = (a, b) => { if(b < 0 || b >= items.length) return; const [x] = items.splice(a, 1); items.splice(b, 0, x); render(); };

  function render(){
    const box = $("list"); box.innerHTML = "";
    items.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "mp-row"; d.draggable = true;
      d.innerHTML = `<span class="mp-n">${i + 1}</span><span class="mp-i"><b></b><small>${fmt(it.buf.duration)} · ${sz(it.file.size)}</small></span>
        <span class="mp-b"><button class="alt" type="button" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button><button class="alt" type="button" aria-label="Move down" ${i === items.length - 1 ? "disabled" : ""}>↓</button><button class="danger" type="button" aria-label="Remove">✕</button></span>`;
      d.querySelector("b").textContent = it.file.name;
      const [up, dn, rm] = d.querySelectorAll("button");
      up.onclick = () => move(i, i - 1); dn.onclick = () => move(i, i + 1); rm.onclick = () => { items.splice(i, 1); render(); };
      d.ondragstart = e => { dragI = i; d.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; };
      d.ondragend = () => d.classList.remove("drag");
      d.ondragover = e => e.preventDefault();
      d.ondrop = e => { e.preventDefault(); if(dragI >= 0 && dragI !== i) move(dragI, i); dragI = -1; };
      box.appendChild(d);
    });
    const total = items.reduce((t, x) => t + x.buf.duration, 0);
    $("tools").hidden = items.length === 0;
    $("go").disabled = items.length < 2; $("go").textContent = items.length >= 2 ? "Join " + items.length + " files (" + fmt(total) + ")" : "Join audio";
  }

  $("f").onchange = async e => {
    const files = [...e.target.files]; e.target.value = ""; if(!files.length) return;
    const skipped = []; info("Reading your files...");
    for(const file of files){
      try{ items.push({id:++uid, file, buf:await getCtx().decodeAudioData(await file.arrayBuffer())}); }
      catch(err){ skipped.push(file.name); }
    }
    render();
    if(skipped.length) info("Could not read: " + skipped.join(", ") + ".", true);
    else info(items.length + " file(s) added. Add more, or join them now.");
  };
  $("az").onclick = () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, {numeric:true})); render(); };
  $("clr").onclick = () => { items = []; $("out").hidden = true; render(); info("Select two or more audio files."); };

  $("go").onclick = async () => {
    $("go").disabled = true; $("bar").hidden = false; $("bar").value = 0; $("out").hidden = true; $("status").className = "";
    try{
      const SR = getCtx().sampleRate, gapN = Math.round(Math.max(0, parseFloat($("gap").value) || 0) * SR);
      const ch = Math.min(2, Math.max(...items.map(i => i.buf.numberOfChannels)));
      const total = items.reduce((t, i) => t + i.buf.length, 0) + gapN * (items.length - 1), dataBytes = total * ch * 2;
      if(dataBytes > 1.9e9) throw new Error("big");
      const dv = new DataView(new ArrayBuffer(44 + dataBytes));
      const w = (o, t) => { for(let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
      w(0,"RIFF"); dv.setUint32(4, 36 + dataBytes, true); w(8,"WAVE"); w(12,"fmt ");
      dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,SR,true);
      dv.setUint32(28,SR*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,dataBytes,true);
      let o = 44;
      for(let k = 0; k < items.length; k++){
        $("status").textContent = "Joining " + (k + 1) + " of " + items.length + ": " + items[k].file.name; $("bar").value = k / items.length;
        await new Promise(r => setTimeout(r, 10));
        if(k > 0) o += gapN * ch * 2;
        const b = items[k].buf, d = [];
        for(let c = 0; c < ch; c++) d.push(b.getChannelData(Math.min(c, b.numberOfChannels - 1)));
        for(let i = 0; i < b.length; i++) for(let c = 0; c < ch; c++){ const x = Math.max(-1, Math.min(1, d[c][i])); dv.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
      }
      const blob = new Blob([dv], {type:"audio/wav"});
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = ($("nm").value.replace(/[\\/:*?"<>|]+/g, "").trim() || "joined") + ".wav";
      $("pl").src = url; $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = items.length + " files joined: " + fmt(total / SR) + " (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = "Done."; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){
      $("status").className = "err";
      $("status").textContent = err.message === "big" ? "These files are too long to join in one go. Join them in smaller groups." : "Could not join these files.";
    }
    $("bar").hidden = true; render();
  };
  render();
  return () => { if(url) URL.revokeObjectURL(url); if(ctx) ctx.close(); };
}

mountAudioJoiner(document.getElementById("tool"));
