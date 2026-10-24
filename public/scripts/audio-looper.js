/* ===================== TOOL: Audio Looper ===================== */
function mountAudioLooper(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. Set the loop</label>
    <div class="row"><div><label for="ls" style="font-weight:600">Loop from (optional)</label><input id="ls" type="text" value="0:00"></div>
      <div><label for="le" style="font-weight:600">Loop until (empty = end)</label><input id="le" type="text" placeholder="e.g. 0:10"></div>
      <div><label for="rp" style="font-weight:600">Repeat how many times</label><input id="rp" type="number" min="2" max="500" step="1" value="5"></div></div>
    <div class="row" style="margin-top:10px"><div><button type="button" class="alt" data-r="2">2x</button></div><div><button type="button" class="alt" data-r="5">5x</button></div><div><button type="button" class="alt" data-r="10">10x</button></div><div><button type="button" class="alt" data-r="30">30x</button></div></div>
    <p id="len" class="hint" style="font-weight:600"></p>
    ${AL.outCard("Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Loop audio</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${AL.resultCard}`;
  let buf = null, name = "audio", src = null; const MAX = 20 * 60;
  AL.wire();
  const range = () => { const s = Math.max(0, parseT($("ls").value) || 0), e = $("le").value.trim() ? parseT($("le").value) : buf.duration; return [s, Math.min(e, buf.duration)]; };
  function upd(){
    if(!buf) return; const [s, e] = range(), r = +$("rp").value || 0;
    if(!(e - s >= 0.1) || r < 2){ $("len").textContent = ""; $("go").disabled = true; return; }
    const t = (e - s) * r; $("len").className = "hint" + (t > MAX ? " err" : ""); $("len").textContent = "Result: " + fmt(t) + (t > MAX ? " (too long, the limit is 20 minutes)" : ""); $("go").disabled = t > MAX;
  }
  ["ls", "le", "rp"].forEach(k => $(k).oninput = upd);
  root.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { $("rp").value = b.dataset.r; upd(); });
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src); src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ buf = await AL.decode(file); $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; upd(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  $("go").onclick = async () => {
    if(!buf) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Looping..."; await new Promise(r => setTimeout(r, 30));
    try{
      const sr = buf.sampleRate, [s, e] = range(), r = +$("rp").value, a = Math.floor(s * sr), b = Math.floor(e * sr), n = b - a;
      const out = AL.chans(buf).map(c => { const o = new Float32Array(n * r), part = c.subarray(a, b); for(let i = 0; i < r; i++) o.set(part, i * n); return o; });
      await AL.deliver(out, sr, name, "_loop" + r + "x", "Looped " + r + " times: " + fmt(n * r / sr) + ".");
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not loop this file. Try fewer repeats."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return () => { if(src) URL.revokeObjectURL(src); AL.cleanup(); };
}
mountAudioLooper(document.getElementById("tool"));
