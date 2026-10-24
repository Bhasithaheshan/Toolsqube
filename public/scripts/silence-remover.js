/* ===================== TOOL: Silence Remover ===================== */
function computeRemovals(rms, win, sr, thrDb, minLen, keep, len){
  const thr = Math.pow(10, thrDb / 20), minW = Math.max(1, Math.round(minLen * sr / win)), keepN = Math.round(keep * sr), out = [];
  let i = 0;
  while(i < rms.length){
    if(rms[i] >= thr){ i++; continue; }
    let j = i; while(j < rms.length && rms[j] < thr) j++;
    if(j - i >= minW){
      const a = i * win + keepN, b = Math.min(len, j * win);
      if(b > a) out.push([a, b]);
    }
    i = j;
  }
  return out;
}
/* END CORE */

function mountSilenceRemover(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Set what counts as silence</label>
    <canvas id="wf" width="800" height="90" style="width:100%;height:90px;border-radius:10px;background:var(--surface2);display:block"></canvas>
    <p class="hint" style="margin-top:6px">The red parts will be removed.</p>
    <div class="row" style="margin-top:6px">
      <div><button type="button" class="alt" data-p="-50|1|0.3">Gentle</button></div>
      <div><button type="button" class="alt" data-p="-40|0.5|0.2">Normal</button></div>
      <div><button type="button" class="alt" data-p="-32|0.3|0.1">Aggressive</button></div></div>
    <div style="margin-top:16px"><label for="th" style="display:flex;justify-content:space-between">Silence level <span id="thv"></span></label>
      <input id="th" type="range" min="-60" max="-20" step="1" value="-40" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">Sounds quieter than this count as silence. If there is background noise, move it to the right.</p></div>
    <div style="margin-top:14px"><label for="ml" style="display:flex;justify-content:space-between">Shortest silence to remove <span id="mlv"></span></label>
      <input id="ml" type="range" min="0.1" max="3" step="0.1" value="0.5" style="width:100%;accent-color:var(--acc)"></div>
    <div style="margin-top:14px"><label for="kp" style="display:flex;justify-content:space-between">Pause to keep <span id="kpv"></span></label>
      <input id="kp" type="range" min="0" max="1" step="0.05" value="0.2" style="width:100%;accent-color:var(--acc)">
      <p class="hint" style="margin-top:4px">A short pause is kept so the speech does not sound rushed.</p></div>
    <p id="stat" style="font-weight:700;margin:14px 0 0"></p>
    <div class="row" style="margin-top:14px"><div><button id="go">Remove silence</button></div></div>
    <div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let buf = null, chs = null, rms = null, name = "audio", url = null, rem = [];
  const WIN_S = 0.01, sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const vals = () => ({th: +$("th").value, ml: +$("ml").value, kp: +$("kp").value});

  function update(){
    const v = vals(); $("thv").textContent = v.th + " dB"; $("mlv").textContent = v.ml + " s"; $("kpv").textContent = v.kp + " s";
    if(!rms) return;
    const sr = buf.sampleRate, win = Math.round(sr * WIN_S);
    rem = computeRemovals(rms, win, sr, v.th, v.ml, v.kp, chs[0].length);
    const removed = rem.reduce((t, [a, b]) => t + (b - a), 0) / sr;
    $("stat").textContent = rem.length ? rem.length + " silent parts found. " + fmt(buf.duration) + " becomes " + fmt(buf.duration - removed) + " (" + fmt(removed) + " removed)." : "No silence found with these settings.";
    $("go").disabled = rem.length === 0; draw(win);
  }
  function draw(win){
    const cv = $("wf"), g = cv.getContext("2d"), W = cv.width, H = cv.height, n = rms.length;
    g.clearRect(0, 0, W, H); const css = getComputedStyle(document.documentElement);
    g.fillStyle = css.getPropertyValue("--acc").trim() || "#0b8a93";
    for(let x = 0; x < W; x++){
      const a = Math.floor(x / W * n), b = Math.max(a + 1, Math.floor((x + 1) / W * n)); let m = 0;
      for(let i = a; i < b && i < n; i++) if(rms[i] > m) m = rms[i];
      const h = Math.max(1, Math.min(1, (20 * Math.log10(m + 1e-9) + 60) / 60) * (H - 6));
      g.fillRect(x, (H - h) / 2, 1, h);
    }
    g.fillStyle = "rgba(214,69,69,.45)";
    for(const [s, e] of rem){ const x0 = s / win / n * W, x1 = e / win / n * W; g.fillRect(x0, 0, Math.max(1, x1 - x0), H); }
  }
  ["th", "ml", "kp"].forEach(k => $(k).oninput = update);
  root.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const [t, m, k] = b.dataset.p.split("|"); $("th").value = t; $("ml").value = m; $("kp").value = k; update(); });

  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; rms = null; $("set").hidden = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const c = new (window.AudioContext || window.webkitAudioContext)();
      buf = await c.decodeAudioData(await file.arrayBuffer()); c.close();
      chs = []; for(let k = 0; k < Math.min(2, buf.numberOfChannels); k++) chs.push(buf.getChannelData(k));
      const win = Math.round(buf.sampleRate * WIN_S), n = Math.floor(chs[0].length / win); rms = new Float32Array(n);
      for(let w = 0; w < n; w++){ let s = 0; for(const c2 of chs) for(let i = w * win; i < (w + 1) * win; i++) s += c2[i] * c2[i]; rms[w] = Math.sqrt(s / (win * chs.length)); }
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("set").hidden = false; update();
    }catch(err){ buf = null; $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
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
    if(!rem.length) return;
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Removing silence..."; await new Promise(r => setTimeout(r, 30));
    try{
      const len = chs[0].length, removed = rem.reduce((t, [a, b]) => t + (b - a), 0), outN = len - removed;
      const out = chs.map(c => { const o = new Float32Array(outN); let p = 0, pos = 0; for(const [a, b] of rem){ o.set(c.subarray(pos, a), p); p += a - pos; pos = b; } o.set(c.subarray(pos, len), p); return o; });
      const blob = wav(out, buf.sampleRate);
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = name + "_no-silence.wav";
      $("pl").src = url; $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = fmt(buf.duration) + " shortened to " + fmt(outN / buf.sampleRate) + " (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = ""; $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not process this file. Try a shorter one."; }
    $("go").disabled = false;
  };
  return () => { if(url) URL.revokeObjectURL(url); };
}

mountSilenceRemover(document.getElementById("tool"));
