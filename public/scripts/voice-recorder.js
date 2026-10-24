/* ===================== TOOL: Voice Recorder ===================== */
function mountVoiceRecorder(root){
  root.innerHTML = `
  <div class="card"><label>1. Record</label>
    <canvas id="lv" width="600" height="24" style="width:100%;height:24px;border-radius:8px;background:var(--surface2);display:block"></canvas>
    <p id="tm" style="font-size:2rem;font-weight:800;margin:10px 0;font-variant-numeric:tabular-nums">00:00</p>
    <div class="row"><div><button id="rec">Start recording</button></div><div><button id="pa" class="alt" hidden>Pause</button></div><div><button id="st" class="alt" hidden>Stop</button></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="ns" type="checkbox" checked> Reduce background noise</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:8px 0 0"><input id="ec" type="checkbox" checked> Reduce echo</label>
    <p id="msg" class="hint" aria-live="polite">Your browser will ask to use the microphone. The recording stays on your device.</p></div>
  <div class="card" id="rv" hidden><label>2. Your recording</label>
    <audio id="rp" controls style="margin-bottom:14px"></audio>
    ${AL.outCard("Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go">Save recording</button></div><div><button id="again" class="alt">Record again</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${AL.resultCard}`;
  let stream = null, mr = null, chunks = [], raw = null, rawUrl = null, ac = null, raf = 0, t0 = 0, acc = 0, tick = 0, paused = false;
  AL.wire();
  const mmss = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const elapsed = () => acc + (paused ? 0 : (Date.now() - t0) / 1000);
  function meter(an){
    const cv = $("lv"), g = cv.getContext("2d"), d = new Uint8Array(an.fftSize), col = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#0b8a93";
    const draw = () => { an.getByteTimeDomainData(d); let s = 0; for(const v of d){ const x = (v - 128) / 128; s += x * x; } const lvl = Math.min(1, Math.sqrt(s / d.length) * 3.5);
      g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = col; g.fillRect(0, 0, cv.width * lvl, cv.height); raf = requestAnimationFrame(draw); };
    draw();
  }
  function stopAll(){ cancelAnimationFrame(raf); clearInterval(tick); if(stream) stream.getTracks().forEach(t => t.stop()); if(ac) ac.close(); stream = null; ac = null; $("lv").getContext("2d").clearRect(0, 0, 600, 24); }
  $("rec").onclick = async () => {
    try{ stream = await navigator.mediaDevices.getUserMedia({audio:{noiseSuppression:$("ns").checked, echoCancellation:$("ec").checked}}); }
    catch(err){ $("msg").className = "hint err"; $("msg").textContent = "The microphone is blocked or not found. Allow microphone access in your browser and try again."; return; }
    $("msg").className = "hint"; $("msg").textContent = "Recording..."; $("rv").hidden = true; $("out").hidden = true;
    chunks = []; mr = new MediaRecorder(stream); mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = () => { raw = new Blob(chunks, {type:mr.mimeType}); if(rawUrl) URL.revokeObjectURL(rawUrl); rawUrl = URL.createObjectURL(raw); $("rp").src = rawUrl; $("rv").hidden = false; $("msg").textContent = "Recorded " + mmss(acc) + ". Listen to it below, then save it."; };
    ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an); meter(an);
    acc = 0; t0 = Date.now(); paused = false; mr.start(250);
    tick = setInterval(() => { $("tm").textContent = mmss(elapsed()); }, 250);
    $("rec").hidden = true; $("pa").hidden = false; $("st").hidden = false; $("pa").textContent = "Pause";
  };
  $("pa").onclick = () => {
    if(!paused){ mr.pause(); acc = elapsed(); paused = true; $("pa").textContent = "Resume"; $("msg").textContent = "Paused."; }
    else { mr.resume(); t0 = Date.now(); paused = false; $("pa").textContent = "Pause"; $("msg").textContent = "Recording..."; }
  };
  $("st").onclick = () => { acc = elapsed(); mr.stop(); stopAll(); $("pa").hidden = true; $("st").hidden = true; $("rec").hidden = false; $("rec").textContent = "Start a new recording"; };
  $("again").onclick = () => { $("rv").hidden = true; $("out").hidden = true; $("tm").textContent = "00:00"; $("rec").click(); };
  $("go").onclick = async () => {
    if(!raw) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Preparing..."; await new Promise(r => setTimeout(r, 30));
    try{ const buf = await AL.decode(raw); await AL.deliver(AL.chans(buf), buf.sampleRate, "recording", "", "Saved: " + fmt(buf.duration) + "."); }
    catch(err){ $("status").className = "err"; $("status").textContent = "Could not save this recording."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return () => { stopAll(); if(rawUrl) URL.revokeObjectURL(rawUrl); AL.cleanup(); };
}
mountVoiceRecorder(document.getElementById("tool"));
