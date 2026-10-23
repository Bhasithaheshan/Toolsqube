/* ===================== TOOL: Video Cutter ===================== */
function mountVideo(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a video file</label>
    <input id="f" type="file" accept="video/*"><video id="v" controls playsinline hidden style="margin-top:10px"></video>
    <p id="info" class="hint">No file chosen.</p></div>
  <div class="card"><label>2. How to cut</label>
    <div class="tabs"><button id="t1" type="button">Split at points</button><button id="t2" type="button" class="alt">Extract section</button><button id="t3" type="button" class="alt">Remove section</button></div>
    <div id="m1"><label for="pts">Split at (separate with commas)</label>
      <input id="pts" type="text" value="1:00" placeholder="1:00 or 0:30, 2:00">
      <p class="hint">Example: <b>1:00</b> makes 2 videos. <b>0:30, 2:00</b> makes 3. Use seconds (48) or minutes:seconds (1:05).</p></div>
    <div id="m2" hidden><div class="row"><div><label for="s">Start</label><input id="s" type="text" value="0:48"></div>
      <div><label for="e">End</label><input id="e" type="text" value="0:55"></div></div>
      <p class="hint">Example: 0:48 to 0:55 keeps only those 7 seconds.</p></div>
    <div id="m3" hidden><div class="row"><div><label for="rs">Remove from</label><input id="rs" type="text" value="0:48"></div>
      <div><label for="re">Remove until</label><input id="re" type="text" value="0:55"></div></div>
      <p class="hint">Example: 0:48 to 0:55 cuts out those 7 seconds. The parts before and after are joined into one file.</p></div>
    <div class="row" style="margin-top:14px"><button id="go" disabled>Cut video</button></div>
    <progress id="bar" value="0" max="1" hidden></progress><div id="status"></div>
    <p class="hint">The clip is recorded while it plays, so cutting takes as long as the clip itself. Keep this tab open. Works best in Chrome or Edge. Output is MP4 or WebM depending on your browser.</p></div>
  <div class="card" id="out" hidden><div id="parts"></div></div>`;
  const v = $("v"); let mode = 1, ready = false, urls = [], actx, dest, name = "video";
  const setMode = m => { mode = m; [1,2,3].forEach(k => { $("m" + k).hidden = m !== k; $("t" + k).className = m === k ? "" : "alt"; }); };
  $("t1").onclick = () => setMode(1); $("t2").onclick = () => setMode(2); $("t3").onclick = () => setMode(3);
  $("f").onchange = e => {
    const file = e.target.files[0]; ready = false; $("go").disabled = true; $("out").hidden = true;
    if(!file) return;
    name = file.name.replace(/\.[^.]+$/, ""); v.src = URL.createObjectURL(file); v.hidden = false;
    $("info").className = "hint"; $("info").textContent = "Loading...";
  };
  v.onloadedmetadata = () => { ready = true; $("go").disabled = false; $("info").textContent = "Length: " + fmt(v.duration); };
  v.onerror = () => { $("info").className = "hint err"; $("info").textContent = "Could not play this video. Try an MP4 or WebM file."; };
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  function setup(){
    if(actx) return;
    actx = new AudioContext(); const s = actx.createMediaElementSource(v); dest = actx.createMediaStreamDestination(); s.connect(dest);
  }
  function record(ranges){
    return new Promise(async (res, rej) => {
      try{
        const vt = (v.captureStream ? v.captureStream() : v.mozCaptureStream()).getVideoTracks();
        const stream = new MediaStream([...vt, ...dest.stream.getAudioTracks()]);
        const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
        const type = types.find(t => MediaRecorder.isTypeSupported(t)) || "";
        const rec = new MediaRecorder(stream, type ? {mimeType:type} : undefined), chunks = [];
        rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        rec.onstop = () => res({blob:new Blob(chunks, {type:rec.mimeType}), ext:rec.mimeType.includes("mp4") ? "mp4" : "webm"});
        const total = ranges.reduce((t, [s, e]) => t + e - s, 0); let done = 0;
        v.pause();
        for(let i = 0; i < ranges.length; i++){
          const [s, e] = ranges[i];
          v.currentTime = s; await new Promise(r => v.addEventListener("seeked", r, {once:true}));
          if(i === 0){ await actx.resume(); rec.start(250); } else rec.resume();
          await v.play();
          await new Promise(r => {
            const tick = () => {
              $("bar").value = Math.min(1, (done + v.currentTime - s) / total);
              if(v.currentTime >= e || v.ended){ v.pause(); r(); } else requestAnimationFrame(tick);
            };
            tick();
          });
          done += e - s;
          if(i < ranges.length - 1) rec.pause();
        }
        rec.stop();
      }catch(err){ rej(err); }
    });
  }
  $("go").onclick = async () => {
    if(!ready) return;
    const D = v.duration; let jobs = [];
    if(mode === 1){
      const pts = $("pts").value.split(",").map(parseT);
      if(pts.some(p => isNaN(p) || p <= 0 || p >= D)) return fail("Check the times. They must be between 0 and " + fmt(D) + ".");
      const b = [0, ...[...new Set(pts)].sort((a, c) => a - c), D];
      for(let i = 0; i < b.length - 1; i++) jobs.push({label: fmt(b[i]) + " to " + fmt(b[i + 1]), ranges: [[b[i], b[i + 1]]], suffix: "_part" + (i + 1)});
    }else if(mode === 2){
      const s = parseT($("s").value), e = parseT($("e").value);
      if(isNaN(s) || isNaN(e) || s < 0 || e > D || e - s < .5) return fail("Enter a valid start and end (video length is " + fmt(D) + ").");
      jobs = [{label: fmt(s) + " to " + fmt(e), ranges: [[s, e]], suffix: "_part1"}];
    }else{
      const s = parseT($("rs").value), e = parseT($("re").value);
      if(isNaN(s) || isNaN(e) || s < 0 || e > D || e - s < .5) return fail("Enter a valid start and end (length is " + fmt(D) + ").");
      const ranges = []; if(s > .1) ranges.push([0, s]); if(D - e > .1) ranges.push([e, D]);
      if(!ranges.length) return fail("Nothing would be left after removing that section.");
      jobs = [{label: "Without " + fmt(s) + " to " + fmt(e), ranges, suffix: "_removed"}];
    }
    $("go").disabled = true; $("bar").hidden = false; $("out").hidden = false; $("parts").innerHTML = "";
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    try{
      setup();
      for(let i = 0; i < jobs.length; i++){
        const j = jobs[i]; $("status").className = ""; $("status").textContent = "Cutting " + (i + 1) + " of " + jobs.length + "...";
        const {blob, ext} = await record(j.ranges), url = URL.createObjectURL(blob); urls.push(url);
        const fn = name + j.suffix + "." + ext, d = document.createElement("div"); d.className = "part";
        d.innerHTML = `<b>${jobs.length > 1 ? "Part " + (i + 1) : "Result"} <small>${j.label}</small></b><video controls playsinline src="${url}"></video><p style="margin:6px 0 0"><a download="${fn}" href="${url}">Download ${fn}</a></p>`;
        $("parts").appendChild(d);
      }
      $("status").textContent = "Done. " + jobs.length + " video(s) ready.";
    }catch(err){ fail("Cutting failed. Try Chrome or Edge."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { urls.forEach(u => URL.revokeObjectURL(u)); v.pause(); if(actx) actx.close(); };
}

mountVideo(document.getElementById("tool"));
