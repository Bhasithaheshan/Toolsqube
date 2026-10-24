/* ===================== TOOL: Audio Mixer ===================== */
function mountAudioMixer(root){
  const rng = (id, mn, mx, v) => `<input id="${id}" type="range" min="${mn}" max="${mx}" step="5" value="${v}" style="width:100%;accent-color:var(--acc)">`;
  root.innerHTML = `
  <div class="card"><label for="f1">1. Track 1 (for example your voice)</label>
    <input id="f1" type="file" accept="audio/*,video/mp4"><p id="i1" class="hint">No file chosen.</p>
    <label for="f2" style="margin-top:14px">Track 2 (for example background music)</label>
    <input id="f2" type="file" accept="audio/*,video/mp4"><p id="i2" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. Mix them</label>
    <label for="v1" style="display:flex;justify-content:space-between;font-weight:600">Track 1 volume <span id="v1v"></span></label>${rng("v1", 0, 200, 100)}
    <label for="v2" style="display:flex;justify-content:space-between;font-weight:600;margin-top:14px">Track 2 volume <span id="v2v"></span></label>${rng("v2", 0, 200, 40)}
    <div class="row" style="margin-top:14px"><div><label for="dl2" style="font-weight:600">Start track 2 after (seconds)</label><input id="dl2" type="number" min="0" step="0.5" value="0"></div>
      <div><label for="fo" style="font-weight:600">Fade out at the end (seconds)</label><input id="fo" type="number" min="0" step="0.5" value="2"></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="lp" type="checkbox" checked> Repeat track 2 until track 1 ends</label>
    <p class="hint">With this ticked, the mix is as long as track 1. Untick it to play track 2 once, and the mix lasts until the longer track ends.</p>
    ${AL.outCard("Save as")}
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Mix tracks</button></div></div>
    <progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>${AL.resultCard}`;
  let b1 = null, b2 = null, n1 = "mix"; AL.wire();
  const lab = () => { $("v1v").textContent = $("v1").value + "%"; $("v2v").textContent = $("v2").value + "%"; }; ["v1", "v2"].forEach(k => $(k).oninput = lab); lab();
  const load = (fid, iid, set) => $(fid).onchange = async e => {
    const file = e.target.files[0]; set(null); $("go").disabled = true; $("out").hidden = true; if(!file) return;
    $(iid).className = "hint"; $(iid).textContent = "Loading...";
    try{ const b = await AL.decode(file); set(b, file); $(iid).textContent = file.name + " (" + fmt(b.duration) + ")"; $("go").disabled = !(b1 && b2); }
    catch(err){ $(iid).className = "hint err"; $(iid).textContent = "Could not read this file."; }
  };
  load("f1", "i1", (b, f) => { b1 = b; if(f) n1 = f.name.replace(/\.[^.]+$/, ""); }); load("f2", "i2", b => { b2 = b; });
  $("go").onclick = async () => {
    if(!b1 || !b2) return; $("go").disabled = true; $("status").className = ""; $("status").textContent = "Mixing..."; await new Promise(r => setTimeout(r, 30));
    try{
      const sr = b1.sampleRate, A = AL.chans(b1), B = AL.chans(b2), g1 = $("v1").value / 100, g2 = $("v2").value / 100, off = Math.round(Math.max(0, +$("dl2").value || 0) * sr), loop = $("lp").checked;
      const n = loop ? A[0].length : Math.max(A[0].length, off + B[0].length);
      if(n / sr > 30 * 60) throw new Error("long");
      const out = [new Float32Array(n), new Float32Array(n)];
      for(let c = 0; c < 2; c++){
        const a = A[Math.min(c, A.length - 1)], b = B[Math.min(c, B.length - 1)], o = out[c];
        for(let i = 0; i < a.length; i++) o[i] += a[i] * g1;
        for(let i = off; i < n; i++){ let j = i - off; if(loop) j %= b.length; else if(j >= b.length) break; o[i] += b[j] * g2; }
      }
      const fo = Math.min(n, Math.round(Math.max(0, +$("fo").value || 0) * sr));
      let peak = 0; for(const o of out){ for(let i = 0; i < fo; i++) o[n - 1 - i] *= i / fo; for(let i = 0; i < n; i++){ const v = Math.abs(o[i]); if(v > peak) peak = v; } }
      if(peak > .98){ const k = .98 / peak; for(const o of out) for(let i = 0; i < n; i++) o[i] *= k; }
      await AL.deliver(out, sr, n1, "_mix", "Mixed: " + fmt(n / sr) + ".");
    }catch(err){ $("status").className = "err"; $("status").textContent = err.message === "long" ? "The mix would be longer than 30 minutes. Use a shorter track 1." : "Could not mix these files."; $("bar").hidden = true; }
    $("go").disabled = false;
  };
  return AL.cleanup;
}
mountAudioMixer(document.getElementById("tool"));
