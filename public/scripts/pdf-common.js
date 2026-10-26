/* Shared helpers for the PDF tools. */
if(typeof pdfjsLib !== "undefined") pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.js";
const PL = {
  url: null,
  sz: b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB",
  dl(blob, name){ const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); },
  crcT: (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })(),
  crc32(u8){ let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = PL.crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; },
  async zip(files){
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    for(const f of files){
      const data = new Uint8Array(await f.blob.arrayBuffer()), nm = enc.encode(f.name), crc = PL.crc32(data), len = data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, len, true); lh.setUint32(22, len, true); lh.setUint16(26, nm.length, true);
      parts.push(lh, nm, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, len, true); ch.setUint32(24, len, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      central.push(ch, nm); off += 30 + nm.length + len;
    }
    const cd = central.reduce((t, p) => t + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cd, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, end], {type:"application/zip"});
  },
  /* "1-3, 5, 8-10" -> {groups:[[0,1,2],[4],[7,8,9]]} (0-based). */
  ranges(s, n){
    const groups = [];
    for(const part of s.split(",").map(x => x.trim()).filter(Boolean)){
      const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if(!m) return {err:'"' + part + '" is not valid. Use something like 1-3, 5, 8-10.'};
      let a = +m[1], b = m[2] ? +m[2] : a; if(a > b) [a, b] = [b, a];
      if(a < 1 || b > n) return {err:"Pages must be between 1 and " + n + "."};
      const g = []; for(let p = a; p <= b; p++) g.push(p - 1); groups.push(g);
    }
    return groups.length ? {groups} : {err:"Type the pages you want, for example 1-3."};
  },
  dims(page){ const {width:W, height:H} = page.getSize(), r = ((page.getRotation().angle % 360) + 360) % 360; return {W, H, r, Wd:r % 180 ? H : W, Hd:r % 180 ? W : H}; },
  toPage(d, x, y){ return d.r === 0 ? [x, y] : d.r === 90 ? [d.W - y, x] : d.r === 180 ? [d.W - x, d.H - y] : [y, d.H - x]; },
  async render(doc, no, canvas, width){
    const page = await doc.getPage(no), base = page.getViewport({scale:1}), vp = page.getViewport({scale:width / base.width});
    canvas.width = vp.width; canvas.height = vp.height; await page.render({canvasContext:canvas.getContext("2d"), viewport:vp}).promise;
  },
  async preview(bytes, no, canvas, width){ const doc = await pdfjsLib.getDocument({data:bytes.slice()}).promise; await PL.render(doc, Math.min(no, doc.numPages), canvas, width); doc.destroy(); },
  resultCard: `<div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <canvas id="pv" style="max-width:100%;max-height:420px;border:1px solid var(--line);border-radius:10px;background:#fff;display:block;margin-bottom:12px"></canvas>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`,
  async finish(bytes, fname, text, previewPage){
    const blob = new Blob([bytes], {type:"application/pdf"}); if(PL.url) URL.revokeObjectURL(PL.url); PL.url = URL.createObjectURL(blob);
    $("dl").href = PL.url; $("dl").download = fname; $("dl").textContent = "Download " + fname;
    $("res").textContent = text + " (" + PL.sz(blob.size) + ")"; $("out").hidden = false;
    try{ await PL.preview(bytes, previewPage || 1, $("pv"), 420); }catch(e){ $("pv").hidden = true; }
    $("dl").click(); $("out").scrollIntoView({behavior:"smooth"});
  },
  cleanup(){ if(PL.url) URL.revokeObjectURL(PL.url); PL.url = null; },
};
