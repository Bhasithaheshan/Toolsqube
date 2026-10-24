/* ===================== TOOL: Vocal Remover ===================== */
function fft(re, im, inv){
  const n = re.length;
  for(let i = 1, j = 0; i < n; i++){
    let bit = n >> 1; for(; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if(i < j){ let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for(let len = 2; len <= n; len <<= 1){
    const ang = 2 * Math.PI / len * (inv ? -1 : 1), wr = Math.cos(ang), wi = Math.sin(ang);
    for(let i = 0; i < n; i += len){
      let cr = 1, ci = 0;
      for(let k = 0; k < len / 2; k++){
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if(inv) for(let i = 0; i < n; i++){ re[i] /= n; im[i] /= n; }
}
async function spectralRemove(L, R, sr, strength, progress){
  const N = 4096, H = 1024, len = L.length, win = new Float64Array(N);
  for(let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const oL = new Float32Array(len), oR = new Float32Array(len);
  const lr = new Float64Array(N), li = new Float64Array(N), rr = new Float64Array(N), ri = new Float64Array(N);
  const lo = 220, hi = 6500, ramp = 70, bw = new Float64Array(N / 2 + 1);
  for(let k = 0; k <= N / 2; k++){ const f = k * sr / N; bw[k] = (f < lo - ramp || f > hi + ramp) ? 0 : f < lo ? (f - (lo - ramp)) / ramp : f > hi ? (hi + ramp - f) / ramp : 1; }
  const frames = Math.ceil(len / H) + 4;
  for(let f = 0; f < frames; f++){
    const p = f * H - (N - H);
    for(let i = 0; i < N; i++){ const x = p + i, w = win[i]; if(x >= 0 && x < len){ lr[i] = L[x] * w; rr[i] = R[x] * w; } else { lr[i] = 0; rr[i] = 0; } li[i] = 0; ri[i] = 0; }
    fft(lr, li, false); fft(rr, ri, false);
    for(let k = 0; k <= N / 2; k++){
      const a = Math.hypot(lr[k], li[k]), b = Math.hypot(rr[k], ri[k]), mx = Math.max(a, b), c = mx > 1e-9 ? Math.min(a, b) / mx : 0;
      const m = 1 - strength * bw[k] * c * c;
      lr[k] *= m; li[k] *= m; rr[k] *= m; ri[k] *= m;
      if(k > 0 && k < N / 2){ const q = N - k; lr[q] *= m; li[q] *= m; rr[q] *= m; ri[q] *= m; }
    }
    fft(lr, li, true); fft(rr, ri, true);
    for(let i = 0; i < N; i++){ const x = p + i; if(x >= 0 && x < len){ const w = win[i] / 1.5; oL[x] += lr[i] * w; oR[x] += rr[i] * w; } }
    if(f % 100 === 0){ if(progress) progress(f / frames); await new Promise(r => setTimeout(r, 0)); }
  }
  return [oL, oR];
}
/* END SPECTRAL */
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
    <label for="mt" style="font-weight:600">Method</label>
    <select id="mt"><option value="quick">Quick (hear it live while you play)</option><option value="better">Better for modern songs (processes the song first)</option></select>
    <div id="qo">
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="on" type="checkbox" checked> Hear the vocals removed (untick to compare with the original)</label>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="kb" type="checkbox" checked> Keep the bass and kick drum</label>
      <p class="hint">Press play above to hear it live. Quick works when the singer is in the exact center of the mix. If the voice is still there, use the Better method.</p></div>
    <div id="bo" hidden style="margin-top:14px">
      <label for="st" style="display:flex;justify-content:space-between">Strength <span id="stv"></span></label>
      <input id="st" type="range" min="50" max="100" step="5" value="90" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">Higher removes more of the voice, but can also remove music in the middle of the mix. The song is processed when you click the button, which takes a few seconds, then you can listen to the result below.</p></div>
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
    live.node.disconnect(); live.node.connect(($("mt").value === "quick" && $("on").checked) ? live.chain.input : live.c.destination);
  }
  function initLive(){
    if(live) return;
    const c = new (window.AudioContext || window.webkitAudioContext)();
    live = {c, node:c.createMediaElementSource($("a")), chain:null}; rewire();
  }
  $("a").onplay = () => { initLive(); live.c.resume(); };
  ["on", "kb"].forEach(k => $(k).onchange = rewire);
  const showM = () => { const q = $("mt").value === "quick"; $("qo").hidden = !q; $("bo").hidden = q; $("stv").textContent = $("st").value + "%"; $("go").textContent = q ? "Save karaoke version" : "Remove vocals and save"; rewire(); };
  $("mt").onchange = showM; $("st").oninput = showM; showM();

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
      let chs, rate;
      if($("mt").value === "better"){
        const o = await spectralRemove(buf.getChannelData(0), buf.getChannelData(1), buf.sampleRate, +$("st").value / 100, p => { $("status").textContent = "Removing the vocals... " + Math.round(p * 100) + "%"; });
        chs = o; rate = buf.sampleRate;
      }else{
        const off = new OfflineAudioContext(2, buf.length, buf.sampleRate), s = off.createBufferSource(); s.buffer = buf;
        const ch = karaokeChain(off, $("kb").checked); s.connect(ch.input); ch.output.connect(off.destination); s.start();
        const r = await off.startRendering(); chs = [r.getChannelData(0), r.getChannelData(1)]; rate = r.sampleRate;
      }
      let peak = 0;
      for(const c of chs) for(let i = 0; i < c.length; i++){ const v = Math.abs(c[i]); if(v > peak) peak = v; }
      if(peak > .98){ const k = .98 / peak; chs = chs.map(c => c.map(v => v * k)); }
      const blob = wav(chs, rate);
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
