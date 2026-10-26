/* ===================== TOOL: Slowed + Reverb Maker ===================== */
function reverbIR(sr, seconds){
  const n = Math.floor(sr * seconds), pre = Math.floor(sr * 0.02), out = [new Float32Array(n), new Float32Array(n)];
  for(const o of out){
    let lp = 0;
    for(let i = pre; i < n; i++){ const t = (i - pre) / (n - pre); lp += 0.35 * ((Math.random() * 2 - 1) - lp); o[i] = lp * Math.pow(1 - t, 3); }
  }
  return out;
}
function resampleSlow(chs, rate){
  const outLen = Math.max(1, Math.floor(chs[0].length / rate));
  return chs.map(c => { const o = new Float32Array(outLen); for(let i = 0; i < outLen; i++){ const p = i * rate, j = Math.floor(p), f = p - j; o[i] = c[j] * (1 - f) + (j + 1 < c.length ? c[j + 1] : c[j]) * f; } return o; });
}
/* END CORE */

function mountSlowedReverb(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a song</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. Slow it down and add reverb</label>
    <div class="row"><div><button type="button" class="alt" data-s="90">90%</button></div><div><button type="button" class="alt" data-s="85">85%</button></div><div><button type="button" class="alt" data-s="80">80%</button></div><div><button type="button" class="alt" data-s="75">75%</button></div></div>
    <div style="margin-top:16px"><label for="sp" style="display:flex;justify-content:space-between">Speed <span id="spv"></span></label>
      <input id="sp" type="range" min="50" max="100" step="1" value="85" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">Slower also makes the voice deeper, which is the classic slowed sound.</p></div>
    <div style="margin-top:14px"><label for="rv" style="display:flex;justify-content:space-between">Reverb <span id="rvv"></span></label>
      <input id="rv" type="range" min="0" max="100" step="1" value="40" style="width:100%;accent-color:var(--acc)"></div>
    <div style="margin-top:14px"><label for="rm">Room size</label>
      <select id="rm"><option value="1.5">Small room</option><option value="2.5" selected>Medium room</option><option value="4">Big hall</option><option value="6">Cathedral</option></select></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="xb" type="checkbox"> Add extra bass</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:8px 0 0"><input id="on" type="checkbox" checked> Hear the effect (untick to compare with the original)</label>
    <p class="hint">Press play above to hear it live while you move the sliders.</p>
    ${AL.outCard("3. Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Make slowed + reverb</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${AL.resultCard}`;
  let buf = null, name = "song", src = null, live = null;
  AL.wire();
  const mkComp = c => { const k = c.createDynamicsCompressor(); k.threshold.value = -3; k.knee.value = 6; k.ratio.value = 12; k.attack.value = .003; k.release.value = .1; return k; };
  const setIR = (c, conv, sec) => { const [l, r] = reverbIR(c.sampleRate, sec), b = c.createBuffer(2, l.length, c.sampleRate); b.copyToChannel(l, 0); b.copyToChannel(r, 1); conv.buffer = b; };
  const gains = (on, a) => ({dry: on ? 1 - 0.35 * a : 1, wet: on ? 1.2 * a : 0});

  function applyLive(){
    $("spv").textContent = $("sp").value + "%"; $("rvv").textContent = $("rv").value + "%";
    const a = $("a"), on = $("on").checked, amt = +$("rv").value / 100;
    a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; a.playbackRate = on ? +$("sp").value / 100 : 1;
    if(!live) return;
    const g = gains(on, amt), t = live.c.currentTime;
    live.dry.gain.setTargetAtTime(g.dry, t, .03); live.wet.gain.setTargetAtTime(g.wet, t, .03);
    live.shelf.gain.setTargetAtTime(on && $("xb").checked ? 6 : 0, t, .03);
    const sec = +$("rm").value; if(live.sec !== sec){ setIR(live.c, live.conv, sec); live.sec = sec; }
  }
  function initLive(){
    if(live) return;
    const c = new (window.AudioContext || window.webkitAudioContext)(), node = c.createMediaElementSource($("a"));
    const shelf = c.createBiquadFilter(), dry = c.createGain(), wet = c.createGain(), conv = c.createConvolver(), comp = mkComp(c);
    shelf.type = "lowshelf"; shelf.frequency.value = 120;
    node.connect(shelf); shelf.connect(dry); shelf.connect(conv); conv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(c.destination);
    live = {c, shelf, dry, wet, conv, sec:null}; applyLive();
  }
  $("a").onplay = () => { initLive(); live.c.resume(); };
  ["sp", "rv"].forEach(k => $(k).oninput = applyLive); ["rm", "xb", "on"].forEach(k => $(k).onchange = applyLive);
  root.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { $("sp").value = b.dataset.s; applyLive(); });
  applyLive();

  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src);
    src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false; applyLive();
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ buf = await AL.decode(file); $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("go").disabled = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };

  $("go").onclick = async () => {
    if(!buf) return;
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Making your version..."; $("bar").hidden = false; $("bar").removeAttribute("value");
    await new Promise(r => setTimeout(r, 30));
    try{
      const sr = buf.sampleRate, speed = +$("sp").value, slowed = resampleSlow(AL.chans(buf), speed / 100), n = slowed[0].length, sec = +$("rm").value, tail = Math.floor(sr * sec);
      const off = new OfflineAudioContext(2, n + tail, sr), ab = off.createBuffer(2, n, sr);
      ab.copyToChannel(slowed[0], 0); ab.copyToChannel(slowed[Math.min(1, slowed.length - 1)], 1);
      const s = off.createBufferSource(), shelf = off.createBiquadFilter(), dry = off.createGain(), wet = off.createGain(), conv = off.createConvolver(), comp = mkComp(off), g = gains(true, +$("rv").value / 100);
      s.buffer = ab; shelf.type = "lowshelf"; shelf.frequency.value = 120; shelf.gain.value = $("xb").checked ? 6 : 0; dry.gain.value = g.dry; wet.gain.value = g.wet; setIR(off, conv, sec);
      s.connect(shelf); shelf.connect(dry); shelf.connect(conv); conv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(off.destination); s.start();
      const r = await off.startRendering();
      let out = [r.getChannelData(0), r.getChannelData(1)], peak = 0;
      for(const c of out) for(let i = 0; i < c.length; i += 1){ const v = Math.abs(c[i]); if(v > peak) peak = v; }
      if(peak > .98){ const k = .98 / peak; out = out.map(c => c.map(v => v * k)); }
      await AL.deliver(out, sr, name, "_slowed-reverb", "Slowed to " + speed + "% with reverb: " + fmt(out[0].length / sr) + ".");
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not process this file. Very long songs may be too big, try a shorter one."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return () => { if(src) URL.revokeObjectURL(src); if(live) live.c.close(); AL.cleanup(); };
}
mountSlowedReverb(document.getElementById("tool"));
