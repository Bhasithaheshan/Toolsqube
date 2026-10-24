/* ===================== TOOL: Bass Booster ===================== */
function mountBassBooster(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a song or audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. Set the bass</label>
    <div class="row">
      <div><button type="button" class="alt" data-g="5" data-f="100">Light</button></div>
      <div><button type="button" class="alt" data-g="9" data-f="110">Medium</button></div>
      <div><button type="button" class="alt" data-g="13" data-f="120">Heavy</button></div>
      <div><button type="button" class="alt" data-g="18" data-f="140">Extreme</button></div></div>
    <div style="margin-top:18px"><label for="gain" style="display:flex;justify-content:space-between">Bass boost <span id="gv"></span></label>
      <input id="gain" type="range" min="0" max="20" step="1" value="10" style="width:100%;accent-color:var(--acc)"></div>
    <div style="margin-top:16px"><label for="frq" style="display:flex;justify-content:space-between">Bass range <span id="fv"></span></label>
      <input id="frq" type="range" min="60" max="250" step="5" value="120" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">Lower is deeper sub-bass. Higher is punchier mid-bass.</p></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="on" type="checkbox" checked> Hear the bass boost (untick to compare with the original)</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="lim" type="checkbox" checked> Protect from distortion</label>
    <p class="hint">Press play above to hear it live while you move the sliders. Start with a low volume, because strong bass can damage small speakers.</p>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Save boosted audio</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let buf = null, name = "audio", src = null, url = null, live = null;
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const mkComp = c => { const k = c.createDynamicsCompressor(); k.threshold.value = -3; k.knee.value = 6; k.ratio.value = 12; k.attack.value = .003; k.release.value = .1; return k; };

  function labels(){ $("gv").textContent = "+" + $("gain").value + " dB"; $("fv").textContent = $("frq").value + " Hz"; }
  function applyLive(){
    labels(); if(!live) return;
    const t = live.c.currentTime;
    live.shelf.gain.setTargetAtTime($("on").checked ? +$("gain").value : 0, t, .02);
    live.shelf.frequency.setTargetAtTime(+$("frq").value, t, .02);
    live.shelf.disconnect(); live.shelf.connect($("lim").checked ? live.comp : live.c.destination);
  }
  function initLive(){
    if(live) return;
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const node = c.createMediaElementSource($("a")), shelf = c.createBiquadFilter(), comp = mkComp(c);
    shelf.type = "lowshelf"; node.connect(shelf); comp.connect(c.destination);
    live = {c, node, shelf, comp}; applyLive();
  }
  $("a").onplay = () => { initLive(); live.c.resume(); };
  ["gain", "frq"].forEach(k => $(k).oninput = applyLive); ["on", "lim"].forEach(k => $(k).onchange = applyLive);
  root.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { $("gain").value = b.dataset.g; $("frq").value = b.dataset.f; applyLive(); });
  labels();

  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src);
    src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const c = new (window.AudioContext || window.webkitAudioContext)();
      buf = await c.decodeAudioData(await file.arrayBuffer()); c.close();
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("go").disabled = false;
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };

  function wav(c, rate){
    const ch = c.length, n = c[0].length, bytes = 44 + n * ch * 2, dv = new DataView(new ArrayBuffer(bytes));
    const w = (o, t) => { for(let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0,"RIFF"); dv.setUint32(4, bytes - 8, true); w(8,"WAVE"); w(12,"fmt ");
    dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,rate,true);
    dv.setUint32(28,rate*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,n*ch*2,true);
    let o = 44;
    for(let i = 0; i < n; i++) for(let k = 0; k < ch; k++){ const x = Math.max(-1, Math.min(1, c[k][i])); dv.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return new Blob([dv], {type:"audio/wav"});
  }

  $("go").onclick = async () => {
    if(!buf) return;
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Boosting the bass..."; $("bar").hidden = false; $("out").hidden = true;
    await new Promise(r => setTimeout(r, 30));
    try{
      const g = +$("gain").value, f = +$("frq").value, lim = $("lim").checked;
      const off = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
      const s = off.createBufferSource(), shelf = off.createBiquadFilter();
      s.buffer = buf; shelf.type = "lowshelf"; shelf.gain.value = g; shelf.frequency.value = f; s.connect(shelf);
      if(lim){ const k = mkComp(off); shelf.connect(k); k.connect(off.destination); } else shelf.connect(off.destination);
      s.start();
      const r = await off.startRendering();
      let chs = []; for(let c = 0; c < Math.min(2, r.numberOfChannels); c++) chs.push(r.getChannelData(c));
      let peak = 0; for(const c of chs) for(let i = 0; i < c.length; i++){ const v = Math.abs(c[i]); if(v > peak) peak = v; }
      if(lim && peak > .98){ const k = .98 / peak; chs = chs.map(c => c.map(v => v * k)); }
      const blob = wav(chs, r.sampleRate);
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = name + "_bass.wav";
      $("pl").src = url; $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = "Bass boosted +" + g + " dB at " + f + " Hz (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = ""; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ fail("Could not process this file. Very long files may be too big, try a shorter one."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(url) URL.revokeObjectURL(url); if(src) URL.revokeObjectURL(src); if(live) live.c.close(); };
}

mountBassBooster(document.getElementById("tool"));
