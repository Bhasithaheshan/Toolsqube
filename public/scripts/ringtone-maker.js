/* ===================== TOOL: Ringtone Maker ===================== */
function mountRingtoneMaker(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a song</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Pick the part you want</label>
    <canvas id="wf" width="800" height="90" style="width:100%;height:90px;border-radius:10px;background:var(--surface2);display:block;cursor:pointer"></canvas>
    <p class="hint" style="margin-top:6px">Click the waveform to move the start point.</p>
    <div class="row" style="margin-top:8px"><div><label for="s" style="font-weight:600">Start (like 0:45)</label><input id="s" type="text" value="0:00"></div>
      <div><label for="n" style="font-weight:600">Length (seconds)</label><input id="n" type="number" min="1" max="120" step="1" value="30"></div></div>
    <div class="row" style="margin-top:10px"><div><button type="button" class="alt" data-l="15">15 s</button></div><div><button type="button" class="alt" data-l="20">20 s</button></div><div><button type="button" class="alt" data-l="30">30 s</button></div><div><button type="button" class="alt" data-l="40">40 s</button></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="fd" type="checkbox" checked> Fade in and out (1.5 seconds)</label>
    <div class="row" style="margin-top:12px"><div><button id="pv" class="alt" type="button">Play the selected part</button></div></div>
    <audio id="a" hidden></audio></div>
  <div class="card" id="fm" hidden>${AL.outCard("3. Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go">Make ringtone</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div>
    <p class="hint">MP3 works as a ringtone on Android. iPhone ringtones use the M4R format, so on iPhone import the file with GarageBand or iTunes.</p></div>${AL.resultCard}`;
  let buf = null, chs = null, src = null, name = "song", peaks = null;
  AL.wire();
  const sel = () => { const s = Math.max(0, parseT($("s").value) || 0), len = Math.max(1, +$("n").value || 30); return [Math.min(s, buf.duration - 1), Math.min(buf.duration, s + len)]; };
  function draw(){
    const cv = $("wf"), g = cv.getContext("2d"), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#0b8a93";
    for(let x = 0; x < W; x++){ const h = Math.max(1, peaks[x] * (H - 6)); g.fillRect(x, (H - h) / 2, 1, h); }
    const [a, b] = sel(); g.fillStyle = "rgba(255,176,32,.35)"; g.fillRect(a / buf.duration * W, 0, (b - a) / buf.duration * W, H);
  }
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("set").hidden = true; $("fm").hidden = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      buf = await AL.decode(file); chs = AL.chans(buf); if(src) URL.revokeObjectURL(src); src = URL.createObjectURL(file); $("a").src = src;
      const d = chs[0], per = Math.max(1, Math.floor(d.length / 800)); peaks = new Float32Array(800);
      for(let x = 0; x < 800; x++){ let m = 0; for(let i = x * per; i < (x + 1) * per && i < d.length; i += 8) m = Math.max(m, Math.abs(d[i])); peaks[x] = Math.min(1, m); }
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("set").hidden = false; $("fm").hidden = false; draw();
    }catch(err){ buf = null; $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  $("wf").onclick = e => { const r = $("wf").getBoundingClientRect(), t = (e.clientX - r.left) / r.width * buf.duration; $("s").value = Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0"); draw(); };
  $("s").oninput = () => buf && draw(); $("n").oninput = () => buf && draw();
  root.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { $("n").value = b.dataset.l; draw(); });
  $("pv").onclick = () => {
    const a = $("a"), [s, e] = sel(); a.currentTime = s; a.play();
    a.ontimeupdate = () => { if(a.currentTime >= e){ a.pause(); a.ontimeupdate = null; } };
  };
  $("go").onclick = async () => {
    if(!buf) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Working..."; await new Promise(r => setTimeout(r, 30));
    try{
      const sr = buf.sampleRate, [s, e] = sel(), a = Math.floor(s * sr), b = Math.floor(e * sr), fn = Math.min(Math.round(1.5 * sr), Math.floor((b - a) / 2));
      const out = chs.map(c => { const o = c.slice(a, b); if($("fd").checked){ for(let i = 0; i < fn; i++){ o[i] *= i / fn; o[o.length - 1 - i] *= i / fn; } } return o; });
      await AL.deliver(out, sr, name, "_ringtone", "Ringtone ready: " + fmt((b - a) / sr) + ".");
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not make the ringtone."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return () => { if(src) URL.revokeObjectURL(src); AL.cleanup(); };
}
mountRingtoneMaker(document.getElementById("tool"));
