/* ===================== TOOL: Audio Cutter ===================== */
function mountAudioCutter(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an audio file</label>
    <input id="f" type="file" accept="audio/*,video/mp4">
    <audio id="a" controls hidden style="margin-top:12px"></audio>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. How to cut</label>
    <div class="tabs"><button id="t1" type="button">Split at points</button><button id="t2" type="button" class="alt">Extract section</button><button id="t3" type="button" class="alt">Remove section</button></div>
    <div id="m1"><label for="pts">Split at (separate with commas)</label>
      <input id="pts" type="text" value="1:00" placeholder="1:00 or 0:30, 2:00">
      <p class="hint">Example: <b>1:00</b> makes 2 files. <b>0:30, 2:00</b> makes 3. Use seconds (48) or minutes:seconds (1:05).</p></div>
    <div id="m2" hidden><div class="row"><div><label for="s">Start</label><input id="s" type="text" value="0:48"></div>
      <div><label for="e">End</label><input id="e" type="text" value="0:55"></div></div>
      <p class="hint">Example: 0:48 to 0:55 keeps only those 7 seconds.</p></div>
    <div id="m3" hidden><div class="row"><div><label for="rs">Remove from</label><input id="rs" type="text" value="0:48"></div>
      <div><label for="re">Remove until</label><input id="re" type="text" value="0:55"></div></div>
      <p class="hint">Example: 0:48 to 0:55 cuts out those 7 seconds. The parts before and after are joined into one file.</p></div>
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Cut audio</button></div></div>
    <div id="status"></div>
    <p class="hint">Tip: play the audio above to find the exact times. Files are saved as WAV.</p></div>
  <div class="card" id="out" hidden>
    <div class="row" style="margin-bottom:8px"><div><button id="all" class="alt">Download all</button></div></div>
    <div id="parts"></div></div>`;
  let buf = null, mode = 1, name = "audio", urls = [], src = null;
  const setMode = m => { mode = m; [1,2,3].forEach(k => { $("m" + k).hidden = m !== k; $("t" + k).className = m === k ? "" : "alt"; }); };
  $("t1").onclick = () => setMode(1); $("t2").onclick = () => setMode(2); $("t3").onclick = () => setMode(3);
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; buf = null; $("go").disabled = true; $("out").hidden = true; $("status").textContent = "";
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, "");
    if(src) URL.revokeObjectURL(src);
    src = URL.createObjectURL(file); $("a").src = src; $("a").hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      buf = await ctx.decodeAudioData(await file.arrayBuffer()); ctx.close();
      $("info").textContent = file.name + " (" + fmt(buf.duration) + ")"; $("go").disabled = false;
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this file. Try MP3, WAV or M4A."; }
  };
  function toWav(b, ranges){
    const sr = b.sampleRate, ch = b.numberOfChannels;
    const cut = ranges.map(([s, e]) => [Math.floor(s * sr), Math.min(b.length, Math.floor(e * sr))]);
    const n = cut.reduce((t, [x, y]) => t + (y - x), 0);
    const bytes = 44 + n * ch * 2, dv = new DataView(new ArrayBuffer(bytes));
    const w = (o, t) => { for(let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0,"RIFF"); dv.setUint32(4, bytes - 8, true); w(8,"WAVE"); w(12,"fmt ");
    dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,sr,true);
    dv.setUint32(28,sr*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,n*ch*2,true);
    const d = []; for(let c = 0; c < ch; c++) d.push(b.getChannelData(c));
    let o = 44;
    for(const [s0, s1] of cut) for(let i = s0; i < s1; i++) for(let c = 0; c < ch; c++){ const x = Math.max(-1, Math.min(1, d[c][i])); dv.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return new Blob([dv], {type:"audio/wav"});
  }
  $("go").onclick = () => {
    if(!buf) return;
    const D = buf.duration; let jobs = [];
    if(mode === 1){
      const pts = $("pts").value.split(",").map(parseT);
      if(pts.some(p => isNaN(p) || p <= 0 || p >= D)) return fail("Check the times. They must be between 0 and " + fmt(D) + ".");
      const b = [0, ...[...new Set(pts)].sort((a, c) => a - c), D];
      for(let i = 0; i < b.length - 1; i++) jobs.push({label: fmt(b[i]) + " to " + fmt(b[i + 1]), ranges: [[b[i], b[i + 1]]], suffix: "_part" + (i + 1)});
    }else if(mode === 2){
      const s = parseT($("s").value), e = parseT($("e").value);
      if(isNaN(s) || isNaN(e) || s < 0 || e > D || e - s < .1) return fail("Enter a valid start and end (audio length is " + fmt(D) + ").");
      jobs = [{label: fmt(s) + " to " + fmt(e), ranges: [[s, e]], suffix: "_part1"}];
    }else{
      const s = parseT($("rs").value), e = parseT($("re").value);
      if(isNaN(s) || isNaN(e) || s < 0 || e > D || e - s < .1) return fail("Enter a valid start and end (length is " + fmt(D) + ").");
      const ranges = []; if(s > .1) ranges.push([0, s]); if(D - e > .1) ranges.push([e, D]);
      if(!ranges.length) return fail("Nothing would be left after removing that section.");
      jobs = [{label: "Without " + fmt(s) + " to " + fmt(e), ranges, suffix: "_removed"}];
    }
    urls.forEach(u => URL.revokeObjectURL(u)); urls = []; $("parts").innerHTML = "";
    jobs.forEach((j, i) => {
      const url = URL.createObjectURL(toWav(buf, j.ranges)); urls.push(url);
      const fn = name + j.suffix + ".wav", d = document.createElement("div"); d.className = "part";
      d.innerHTML = `<b>${jobs.length > 1 ? "Part " + (i + 1) : "Result"} <small>${j.label}</small></b><audio controls preload="none" src="${url}"></audio><p style="margin:6px 0 0"><a download="${fn}" href="${url}">Download ${fn}</a></p>`;
      $("parts").appendChild(d);
    });
    $("status").className = ""; $("status").textContent = "Done. " + jobs.length + " file(s) ready.";
    $("out").hidden = false; $("out").scrollIntoView({behavior:"smooth"});
  };
  $("all").onclick = () => document.querySelectorAll("#parts a").forEach((a, k) => setTimeout(() => a.click(), k * 400));
  return () => { urls.forEach(u => URL.revokeObjectURL(u)); if(src) URL.revokeObjectURL(src); };
}

mountAudioCutter(document.getElementById("tool"));
