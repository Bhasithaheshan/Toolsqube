/* Shared helpers for the audio tools that save WAV or MP3. */
const AL = {
  url: null,
  sz: b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB",
  async decode(file){
    const c = new (window.AudioContext || window.webkitAudioContext)({sampleRate:44100});
    try{ return await c.decodeAudioData(await file.arrayBuffer()); } finally { c.close(); }
  },
  chans: buf => Array.from({length:Math.min(2, buf.numberOfChannels)}, (_, i) => buf.getChannelData(i)),
  wavBlob(c, rate){
    const ch = c.length, n = c[0].length, bytes = 44 + n * ch * 2, dv = new DataView(new ArrayBuffer(bytes));
    const w = (o, t) => { for(let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0,"RIFF"); dv.setUint32(4, bytes - 8, true); w(8,"WAVE"); w(12,"fmt ");
    dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,rate,true);
    dv.setUint32(28,rate*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,n*ch*2,true);
    let o = 44;
    for(let i = 0; i < n; i++) for(let k = 0; k < ch; k++){ const x = Math.max(-1, Math.min(1, c[k][i])); dv.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return new Blob([dv], {type:"audio/wav"});
  },
  async mp3Blob(c, rate, kbps, progress){
    const ch = c.length, n = c[0].length, enc = new lamejs.Mp3Encoder(ch, rate, kbps), out = [], B = 1152 * 10;
    const i16 = (f, s, e) => { const a = new Int16Array(e - s); for(let i = 0; i < a.length; i++){ const x = Math.max(-1, Math.min(1, f[s + i])); a[i] = x < 0 ? x * 0x8000 : x * 0x7fff; } return a; };
    for(let i = 0, k = 0; i < n; i += B, k++){
      const e = Math.min(n, i + B), l = i16(c[0], i, e);
      const d = ch === 2 ? enc.encodeBuffer(l, i16(c[1], i, e)) : enc.encodeBuffer(l);
      if(d.length) out.push(d);
      if(k % 20 === 0){ if(progress) progress(i / n); await new Promise(r => setTimeout(r, 0)); }
    }
    const end = enc.flush(); if(end.length) out.push(end);
    return new Blob(out, {type:"audio/mpeg"});
  },
  outCard: label => `<label>${label}</label>
    <div class="row"><div><select id="ofmt" aria-label="Format"><option value="mp3">MP3</option><option value="wav">WAV (lossless, large)</option></select></div>
    <div id="brw"><select id="obr" aria-label="Quality"><option value="128">128 kbps</option><option value="192" selected>192 kbps (good)</option><option value="256">256 kbps</option><option value="320">320 kbps (best)</option></select></div></div>`,
  resultCard: `<div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <audio id="pl" controls style="margin-bottom:12px"></audio>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`,
  wire(){ const f = () => { $("brw").hidden = $("ofmt").value !== "mp3"; }; $("ofmt").onchange = f; f(); },
  async deliver(chs, rate, base, suffix, note){
    const f = $("ofmt").value, kb = +$("obr").value;
    $("bar").hidden = false; $("bar").max = 1; $("bar").value = 0; $("status").className = "";
    let blob, ext;
    if(f === "mp3"){ $("status").textContent = "Encoding MP3..."; blob = await AL.mp3Blob(chs, rate, kb, p => { $("bar").value = p; }); ext = "mp3"; }
    else { blob = AL.wavBlob(chs, rate); ext = "wav"; }
    if(AL.url) URL.revokeObjectURL(AL.url); AL.url = URL.createObjectURL(blob);
    const fn = base + suffix + "." + ext;
    $("pl").src = AL.url; $("dl").href = AL.url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
    $("res").textContent = (note ? note + " " : "") + "(" + AL.sz(blob.size) + ")";
    $("out").hidden = false; $("status").textContent = ""; $("bar").hidden = true; $("out").scrollIntoView({behavior:"smooth"});
  },
  cleanup(){ if(AL.url) URL.revokeObjectURL(AL.url); AL.url = null; },
};
