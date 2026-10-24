/* ===================== TOOL: Audio Reverser ===================== */
function mountAudioReverser(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card">${AL.outCard("2. Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Reverse audio</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${AL.resultCard}`;
  let buf = null, name = "audio", src = null;
  AL.wire();
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src); src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ buf = await AL.decode(file); $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("go").disabled = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  $("go").onclick = async () => {
    if(!buf) return; $("go").disabled = true; $("status").textContent = "Reversing..."; await new Promise(r => setTimeout(r, 30));
    try{ const out = AL.chans(buf).map(c => Float32Array.from(c).reverse()); await AL.deliver(out, buf.sampleRate, name, "_reversed", "Reversed: " + fmt(buf.duration) + "."); }
    catch(err){ $("status").className = "err"; $("status").textContent = "Could not reverse this file. Try a shorter one."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return () => { if(src) URL.revokeObjectURL(src); AL.cleanup(); };
}
mountAudioReverser(document.getElementById("tool"));
