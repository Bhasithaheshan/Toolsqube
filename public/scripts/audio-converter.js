/* ===================== TOOL: Audio Converter ===================== */
function mountAudioConverter(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio or video file</label>
    <input id="f" type="file" accept="audio/*,video/*">
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card">${AL.outCard("2. Convert to")}
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Convert</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div>
    <p class="hint">Works with MP3, WAV, M4A, AAC, OGG, FLAC and many more, depending on your browser. Video files are converted to audio only.</p></div>${AL.resultCard}`;
  let buf = null, name = "audio", size = 0;
  AL.wire();
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); size = file.size; $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ buf = await AL.decode(file); $("info").textContent = file.name + " (" + fmt(buf.duration) + ", " + AL.sz(size) + ")"; $("go").disabled = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. If it is a video, try an MP4 (H.264) or WebM file."; }
  };
  $("go").onclick = async () => {
    if(!buf) return; $("go").disabled = true; $("status").textContent = "Working..."; await new Promise(r => setTimeout(r, 30));
    try{ await AL.deliver(AL.chans(buf), buf.sampleRate, name, "", "Converted: " + fmt(buf.duration) + ".") }
    catch(err){ $("status").className = "err"; $("status").textContent = "Could not convert this file. Try a shorter one."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return AL.cleanup;
}
mountAudioConverter(document.getElementById("tool"));
