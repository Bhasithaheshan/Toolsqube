/* ===================== TOOL: Vocal Remover ===================== */
function karaokeChain(c, keepBass){
  const input = c.createGain(); input.channelCount = 2; input.channelCountMode = "explicit";
  const split = c.createChannelSplitter(2); input.connect(split);
  const diff = c.createGain(), gl = c.createGain(), gr = c.createGain(); gl.gain.value = .5; gr.gain.value = -.5;
  split.connect(gl, 0); split.connect(gr, 1); gl.connect(diff); gr.connect(diff);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = keepBass ? 150 : 20; hp.Q.value = .7;
  const mix = c.createGain(); diff.connect(hp); hp.connect(mix);
  if(keepBass){
    const bl = c.createGain(), br = c.createGain(), bs = c.createGain(); bl.gain.value = .5; br.gain.value = .5;
    split.connect(bl, 0); split.connect(br, 1); bl.connect(bs); br.connect(bs);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150; lp.Q.value = .7; bs.connect(lp); lp.connect(mix);
  }
  const merge = c.createChannelMerger(2); mix.connect(merge, 0, 0); mix.connect(merge, 0, 1);
  const up = c.createGain(); up.gain.value = 1.4; merge.connect(up);
  const lim = c.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .1; up.connect(lim);
  return {input, output: lim};
}

function mountVocalRemover(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a song</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. Remove the vocals</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:0"><input id="on" type="checkbox" checked> Hear the vocals removed (untick to compare with the original)</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="kb" type="checkbox" checked> Keep the bass and kick drum</label>
    <p class="hint">Press play above to hear the karaoke version live. This works best when the singer is in the center of the stereo mix, which is true for most songs. Some of the voice, echo or other center instruments may remain.</p>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Save karaoke version</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let buf = null, name = "song", src = null, url = null, live = null;
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };

  function rewire(){
    if(!live) return;
    if(live.chain){ try{ live.chain.output.disconnect(); }catch(e){} }
    live.chain = karaokeChain(live.c, $("kb").checked); live.chain.output.connect(live.c.destination);
    live.node.disconnect(); live.node.connect($("on").checked ? live.chain.input : live.c.destination);
  }
  function initLive(){
    if(live) return;
    const c = new (window.AudioContext || window.webkitAudioContext)();
    live = {c, node:c.createMediaElementSource($("a")), chain:null}; rewire();
  }
  $("a").onplay = () => { initLive(); live.c.resume(); };
  ["on", "kb"].forEach(k => $(k).onchange = rewire);

  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src);
    src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const c = new (window.AudioContext || window.webkitAudioContext)();
      buf = await c.decodeAudioData(await file.arrayBuffer()); c.close();
      if(buf.numberOfChannels < 2){ $("info").className = "hint err"; $("info").textContent = "This file is mono, so the voice cannot be separated. Use a stereo song."; buf = null; return; }
      const L = buf.getChannelData(0), R = buf.getChannelData(1), m = Math.min(L.length, 441000); let d = 0, s = 0;
      for(let i = 0; i < m; i++){ d += Math.abs(L[i] - R[i]); s += Math.abs(L[i]) + Math.abs(R[i]); }
      if(s > 0 && d / s < 0.01){ $("info").className = "hint err"; $("info").textContent = "Both channels are identical (fake stereo), so the voice cannot be separated."; buf = null; return; }
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
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Removing the vocals..."; $("bar").hidden = false; $("out").hidden = true;
    await new Promise(r => setTimeout(r, 30));
    try{
      const off = new OfflineAudioContext(2, buf.length, buf.sampleRate), s = off.createBufferSource(); s.buffer = buf;
      const ch = karaokeChain(off, $("kb").checked); s.connect(ch.input); ch.output.connect(off.destination); s.start();
      const r = await off.startRendering();
      let chs = [r.getChannelData(0), r.getChannelData(1)], peak = 0;
      for(const c of chs) for(let i = 0; i < c.length; i++){ const v = Math.abs(c[i]); if(v > peak) peak = v; }
      if(peak > .98){ const k = .98 / peak; chs = chs.map(c => c.map(v => v * k)); }
      const blob = wav(chs, r.sampleRate);
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = name + "_karaoke.wav";
      $("pl").src = url; $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = "Karaoke version ready (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = ""; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ fail("Could not process this file. Very long songs may be too big, try a shorter one."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(url) URL.revokeObjectURL(url); if(src) URL.revokeObjectURL(src); if(live) live.c.close(); };
}

mountVocalRemover(document.getElementById("tool"));
