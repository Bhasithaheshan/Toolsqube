/* ===================== TOOL: Audio Splitter ===================== */
function mountAudio(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label for="n">2. Length of each part</label>
    <div class="row"><input id="n" type="number" min="1" step="any" value="1" aria-label="Length">
    <select id="u" aria-label="Unit"><option value="60">Minutes</option><option value="1">Seconds</option></select></div>
    <p id="preview" class="hint"></p>
    <div class="row" style="margin-top:12px"><button id="go" disabled>Split audio</button></div></div>
  <div class="card" id="out" hidden><p id="summary" style="font-weight:600;margin:0 0 10px"></p>
    <div class="row" style="margin-bottom:8px"><button id="all" class="alt">Download all</button></div><div id="parts"></div></div>`;
  let buf = null, name = "audio", links = [];
  const segLen = () => (parseFloat($("n").value) || 0) * parseFloat($("u").value);
  function preview(){
    if(!buf) return;
    const L = segLen();
    if(L <= 0){ $("preview").textContent = ""; $("go").disabled = true; return; }
    const full = Math.floor(buf.duration / L), rest = buf.duration - full * L;
    $("preview").textContent = (full + (rest > .05 ? 1 : 0)) + " parts" + (rest > .05 && full > 0 ? " (" + full + " x " + fmt(L) + " + remaining " + fmt(rest) + ")" : "");
    $("go").disabled = false;
  }
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      buf = await ctx.decodeAudioData(await file.arrayBuffer()); ctx.close();
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; preview();
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  $("n").oninput = preview; $("u").onchange = preview;
  function toWav(b, start, end){
    const sr = b.sampleRate, ch = b.numberOfChannels, s0 = Math.floor(start * sr), s1 = Math.min(b.length, Math.floor(end * sr)), n = s1 - s0;
    const bytes = 44 + n * ch * 2, dv = new DataView(new ArrayBuffer(bytes));
    const w = (o, t) => { for(let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0,"RIFF"); dv.setUint32(4, bytes - 8, true); w(8,"WAVE"); w(12,"fmt ");
    dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,sr,true);
    dv.setUint32(28,sr*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,n*ch*2,true);
    const d = []; for(let c = 0; c < ch; c++) d.push(b.getChannelData(c));
    let o = 44;
    for(let i = 0; i < n; i++) for(let c = 0; c < ch; c++){ const x = Math.max(-1, Math.min(1, d[c][s0 + i])); dv.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return new Blob([dv], {type:"audio/wav"});
  }
  $("go").onclick = () => {
    links.forEach(u => URL.revokeObjectURL(u)); links = [];
    const L = segLen(), total = buf.duration; $("parts").innerHTML = ""; let i = 0;
    for(let t = 0; t < total - .05; t += L){
      i++; const end = Math.min(t + L, total), url = URL.createObjectURL(toWav(buf, t, end)); links.push(url);
      const fn = name + "_part" + String(i).padStart(2, "0") + ".wav", d = document.createElement("div"); d.className = "part";
      d.innerHTML = `<b>Part ${i} <small>${fmt(t)} to ${fmt(end)} (${fmt(end - t)})</small></b><audio controls preload="none" src="${url}"></audio><p style="margin:6px 0 0"><a download="${fn}" href="${url}">Download ${fn}</a></p>`;
      $("parts").appendChild(d);
    }
    $("summary").textContent = i + " parts created."; $("out").hidden = false; $("out").scrollIntoView({behavior:"smooth"});
  };
  $("all").onclick = () => document.querySelectorAll("#parts a").forEach((a, k) => setTimeout(() => a.click(), k * 400));
  return () => links.forEach(u => URL.revokeObjectURL(u));
}

mountAudio(document.getElementById("tool"));
