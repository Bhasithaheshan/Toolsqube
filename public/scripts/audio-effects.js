/* ===================== TOOL: Audio effects (speed, volume, fade) ===================== */
async function stretchAudio(chs, rate, progress){
  const N = 2048, Hs = 1024, D = 384, len = chs[0].length, outLen = Math.max(1, Math.floor(len / rate)), pad = N * 2;
  const inp = chs.map(c => { const a = new Float32Array(len + pad); a.set(c); return a; });
  const mono = new Float32Array(len + pad);
  for(const a of inp) for(let i = 0; i < len; i++) mono[i] += a[i] / inp.length;
  const out = chs.map(() => new Float32Array(outLen + pad)), win = new Float32Array(N);
  for(let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const frames = Math.ceil(outLen / Hs); let prev = 0;
  for(let k = 0; k < frames; k++){
    const target = Math.round(k * Hs * rate); let pos = target;
    if(k > 0){
      const ref = prev + Hs; let best = -Infinity;
      for(let d = -D; d <= D; d += 2){
        const c = target + d; if(c < 0 || c > len) continue;
        let sum = 0; for(let i = 0; i < N; i += 8) sum += mono[ref + i] * mono[c + i];
        if(sum > best){ best = sum; pos = c; }
      }
    }
    const o0 = k * Hs;
    for(let ch = 0; ch < out.length; ch++){
      const o = out[ch], a = inp[ch];
      for(let i = 0; i < N; i++) o[o0 + i] += a[pos + i] * ((k === 0 && i < Hs) ? 1 : win[i]);
    }
    prev = pos;
    if(k % 200 === 0){ if(progress) progress(k / frames); await new Promise(r => setTimeout(r, 0)); }
  }
  return out.map(o => o.subarray(0, outLen));
}
function resampleAudio(chs, rate){
  const outLen = Math.max(1, Math.floor(chs[0].length / rate));
  return chs.map(c => { const o = new Float32Array(outLen); for(let i = 0; i < outLen; i++){ const p = i * rate, j = Math.floor(p), f = p - j; o[i] = c[j] * (1 - f) + (j + 1 < c.length ? c[j + 1] : c[j]) * f; } return o; });
}
/* END STRETCH */

function mountAudioEffects(root){
  let mode = "speed"; try{ mode = (JSON.parse(root.dataset.preset || "null") || {}).mode || "speed"; }catch(e){}
  const quick = (t, vals, fmtv) => '<div class="row" style="margin-top:10px">' + vals.map(v => `<div><button type="button" class="alt" data-t="${t}" data-v="${v}">${fmtv(v)}</button></div>`).join("") + "</div>";
  const CTRL = {
    speed: `<label for="sp">Speed (1 = original)</label>
      <input id="sp" type="number" min="0.25" max="4" step="0.05" value="1.5">` + quick("sp", [0.5, 0.75, 1.25, 1.5, 2], v => v + "x") + `
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:16px 0 0"><input id="kp" type="checkbox" checked> Keep the original pitch (best for speech)</label>`,
    volume: `<label for="vol">Volume in % (100 = original)</label>
      <input id="vol" type="number" min="10" max="1000" step="10" value="200">` + quick("vol", [50, 150, 200, 300, 500], v => v + "%") + `
      <div class="row" style="margin-top:12px"><div><button id="auto" type="button" class="alt">Loudest without distortion</button></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:16px 0 0"><input id="lim" type="checkbox" checked> Soft limiter (reduces harsh distortion)</label>
      <p id="peak" class="hint"></p>`,
    fade: `<div class="row"><div><label for="fin">Fade in (seconds)</label><input id="fin" type="number" min="0" step="0.5" value="3"></div>
      <div><label for="fout">Fade out (seconds)</label><input id="fout" type="number" min="0" step="0.5" value="3"></div>
      <div><label for="crv">Curve</label><select id="crv"><option value="lin">Linear</option><option value="smooth">Smooth</option></select></div></div>`,
  };
  const TITLE = {speed:"Choose the speed", volume:"Choose the volume", fade:"Choose the fades"};
  const ACT = {speed:"Change speed", volume:"Change volume", fade:"Apply fades"};
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. ${TITLE[mode]}</label>${CTRL[mode]}
    <div class="row" style="margin-top:16px"><div><button id="go" disabled>${ACT[mode]}</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let buf = null, chs = null, sr = 44100, name = "audio", src = null, url = null, ctx = null, peak = 0;
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  root.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { $(b.dataset.t).value = b.dataset.v; });

  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); if(src) URL.revokeObjectURL(src);
    src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({sampleRate:44100});
      buf = await ctx.decodeAudioData(await file.arrayBuffer()); sr = buf.sampleRate;
      chs = []; for(let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
      peak = 0; for(const c of chs) for(let i = 0; i < c.length; i++){ const v = Math.abs(c[i]); if(v > peak) peak = v; }
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("go").disabled = false;
      if(mode === "volume") $("peak").textContent = "Loudest point in this file: " + Math.round(peak * 100) + "% of the maximum.";
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  if(mode === "volume") $("auto").onclick = () => { if(peak > 0) $("vol").value = Math.max(10, Math.floor(0.98 / peak * 100)); };

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
  const soft = x => { const a = Math.abs(x); if(a <= 0.9) return x; const y = 0.9 + 0.1 * Math.tanh((a - 0.9) / 0.1); return x < 0 ? -y : y; };

  $("go").onclick = async () => {
    if(!chs) return;
    $("go").disabled = true; $("status").className = ""; $("out").hidden = true; $("bar").hidden = false; $("bar").value = 0; $("status").textContent = "Working...";
    await new Promise(r => setTimeout(r, 30));
    try{
      let out, suffix;
      if(mode === "speed"){
        const rate = parseFloat($("sp").value);
        if(!(rate >= 0.25 && rate <= 4)) throw new Error("Enter a speed between 0.25 and 4.");
        if(rate === 1) throw new Error("Speed 1 is the original. Enter a different speed.");
        out = $("kp").checked ? await stretchAudio(chs, rate, p => { $("bar").value = p; }) : resampleAudio(chs, rate);
        suffix = "_" + rate + "x";
      }else if(mode === "volume"){
        const pct = parseFloat($("vol").value);
        if(!(pct >= 10 && pct <= 1000)) throw new Error("Enter a volume between 10 and 1000 percent.");
        const g = pct / 100, lim = $("lim").checked;
        out = chs.map(c => { const o = new Float32Array(c.length); for(let i = 0; i < c.length; i++){ const x = c[i] * g; o[i] = lim ? soft(x) : x; } return o; });
        suffix = "_vol" + pct;
      }else{
        const fi = Math.max(0, parseFloat($("fin").value) || 0), fo = Math.max(0, parseFloat($("fout").value) || 0), smooth = $("crv").value === "smooth";
        if(fi === 0 && fo === 0) throw new Error("Enter a fade in or a fade out time.");
        const n = chs[0].length, a = Math.min(n, Math.round(fi * sr)), b = Math.min(n, Math.round(fo * sr));
        const cv = t => smooth ? 0.5 - 0.5 * Math.cos(Math.PI * t) : t;
        out = chs.map(c => { const o = Float32Array.from(c); for(let i = 0; i < a; i++) o[i] *= cv(i / a); for(let i = 0; i < b; i++) o[n - 1 - i] *= cv(i / b); return o; });
        suffix = "_fade";
      }
      const blob = wav(out, sr);
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = name + suffix + ".wav";
      $("pl").src = url; $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = "Done: " + fmt(out[0].length / sr) + " (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = ""; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ fail(err.message && err.message.length < 90 ? err.message : "Something went wrong. Try a shorter file."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(url) URL.revokeObjectURL(url); if(src) URL.revokeObjectURL(src); if(ctx) ctx.close(); };
}

mountAudioEffects(document.getElementById("tool"));
