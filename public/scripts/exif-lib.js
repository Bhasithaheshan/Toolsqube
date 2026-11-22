/* Reads the hidden details (EXIF, GPS, DPI) of JPEG and PNG files, and removes them from JPEG files without touching the picture. */
const EX = {
  TYPE: {1:1, 2:1, 3:2, 4:4, 5:8, 7:1, 9:4, 10:8},
  NAMES: {0x010F:"Make", 0x0110:"Model", 0x0112:"Orientation", 0x011A:"XResolution", 0x011B:"YResolution", 0x0128:"ResolutionUnit", 0x0131:"Software", 0x0132:"DateTime", 0x013B:"Artist", 0x8298:"Copyright", 0x829A:"ExposureTime", 0x829D:"FNumber", 0x8822:"ExposureProgram", 0x8827:"ISO", 0x9003:"DateTimeOriginal", 0x9204:"ExposureBias", 0x9209:"Flash", 0x920A:"FocalLength", 0xA002:"Width", 0xA003:"Height", 0xA403:"WhiteBalance", 0xA434:"LensModel", 0xA433:"LensMake"},
  read(buf){
    const out = {kind:"other", tags:{}, gps:null, orientation:1, dpi:null, segs:[], hasMeta:false};
    if(buf[0] === 0xFF && buf[1] === 0xD8){
      out.kind = "jpeg"; let p = 2;
      while(p + 4 <= buf.length){
        if(buf[p] !== 0xFF){ p++; continue; } const m = buf[p + 1]; if(m === 0xFF){ p++; continue; } if(m === 0xD9 || m === 0xDA) break; if(m >= 0xD0 && m <= 0xD7 || m === 0x01){ p += 2; continue; }
        const len = (buf[p + 2] << 8) | buf[p + 3], seg = {m, start:p, end:p + 2 + len}; out.segs.push(seg); const s = p + 4, tag = String.fromCharCode(...buf.subarray(s, s + 5));
        if(m === 0xE1 && tag.startsWith("Exif")) EX.tiff(buf, s + 6, out); else if(m === 0xE0 && tag.startsWith("JFIF")){ const u = buf[s + 7], x = (buf[s + 8] << 8) | buf[s + 9]; if(x > 0 && u === 1) out.dpi = x; else if(x > 0 && u === 2) out.dpi = Math.round(x * 2.54); }
        p = seg.end;
      }
      out.hasMeta = out.segs.some(s => s.m === 0xE1 || s.m === 0xED || s.m === 0xFE) || Object.keys(out.tags).length > 0;
    }else if(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47){
      out.kind = "png"; let p = 8; const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      while(p + 8 <= buf.length){ const len = dv.getUint32(p), type = String.fromCharCode(...buf.subarray(p + 4, p + 8)); if(type === "pHYs" && buf[p + 16] === 1) out.dpi = Math.round(dv.getUint32(p + 8) * .0254); if(["tEXt", "iTXt", "zTXt", "eXIf"].includes(type)){ out.hasMeta = true; out.segs.push({m:type}); } if(type === "IDAT" || type === "IEND") break; p += 12 + len; }
    }else if(buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) out.kind = "gif";
    else if(buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57) out.kind = "webp";
    return out;
  },
  tiff(buf, t, out){
    if(t + 8 > buf.length) return; const le = buf[t] === 0x49, dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), r16 = o => dv.getUint16(o, le), r32 = o => dv.getUint32(o, le);
    const val = (e) => { const type = r16(e + 2), n = r32(e + 4), sz = (EX.TYPE[type] || 1) * n, o = sz <= 4 ? e + 8 : t + r32(e + 8); if(o + sz > buf.length) return null;
      if(type === 2) return String.fromCharCode(...buf.subarray(o, o + n)).replace(/\0.*$/s, "").trim();
      const get = i => type === 3 ? r16(o + i * 2) : type === 4 ? r32(o + i * 4) : type === 5 ? r32(o + i * 8) / (r32(o + i * 8 + 4) || 1) : type === 10 ? dv.getInt32(o + i * 8, le) / (dv.getInt32(o + i * 8 + 4, le) || 1) : type === 9 ? dv.getInt32(o + i * 4, le) : buf[o + i];
      return n === 1 ? get(0) : Array.from({length:Math.min(n, 8)}, (_, i) => get(i)); };
    const ifd = (off, fn) => { if(off + 2 > buf.length - t) return; const o = t + off, n = r16(o); for(let i = 0; i < n && o + 2 + i * 12 + 12 <= buf.length; i++){ const e = o + 2 + i * 12; fn(r16(e), e); } };
    let exifOff = 0, gpsOff = 0; const g = {};
    ifd(r32(t + 4), (tag, e) => { if(tag === 0x8769) exifOff = r32(e + 8); else if(tag === 0x8825) gpsOff = r32(e + 8); else if(EX.NAMES[tag]) out.tags[EX.NAMES[tag]] = val(e); });
    if(exifOff) ifd(exifOff, (tag, e) => { if(EX.NAMES[tag]) out.tags[EX.NAMES[tag]] = val(e); });
    if(gpsOff) ifd(gpsOff, (tag, e) => { g[tag] = val(e); });
    out.orientation = +out.tags.Orientation || 1;
    const dms = v => Array.isArray(v) && v.length >= 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null;
    if(g[2] && g[4]){ const la = dms(g[2]), lo = dms(g[4]); if(la !== null && lo !== null) out.gps = {lat:(g[1] === "S" ? -1 : 1) * la, lon:(g[3] === "W" ? -1 : 1) * lo, alt:typeof g[6] === "number" ? (g[5] === 1 ? -1 : 1) * g[6] : null}; }
    const xr = out.tags.XResolution; if(!out.dpi && typeof xr === "number" && xr > 0) out.dpi = Math.round(out.tags.ResolutionUnit === 3 ? xr * 2.54 : xr);
  },
  describe(info){
    const t = info.tags, rows = [], add = (k, v) => { if(v !== undefined && v !== null && v !== "") rows.push([k, v]); };
    add("Camera", [t.Make, t.Model].filter(Boolean).join(" ")); add("Lens", t.LensModel); add("Date taken", (t.DateTimeOriginal || t.DateTime || "").replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    if(typeof t.ExposureTime === "number") add("Shutter speed", t.ExposureTime >= 1 ? t.ExposureTime + " s" : "1/" + Math.round(1 / t.ExposureTime) + " s"); if(typeof t.FNumber === "number") add("Aperture", "f/" + (Math.round(t.FNumber * 10) / 10));
    add("ISO", t.ISO); if(typeof t.FocalLength === "number") add("Focal length", Math.round(t.FocalLength * 10) / 10 + " mm"); add("Software", t.Software); add("Artist", t.Artist); add("Copyright", t.Copyright);
    if(info.gps) add("Location", info.gps.lat.toFixed(6) + ", " + info.gps.lon.toFixed(6) + (info.gps.alt !== null ? " (" + Math.round(info.gps.alt) + " m high)" : ""));
    return rows;
  },
  stripJpeg(buf){
    const info = EX.read(buf), drop = info.segs.filter(s => s.m === 0xE1 || s.m === 0xED || s.m === 0xFE), parts = []; let p = 0;
    for(const s of drop){ parts.push(buf.subarray(p, s.start)); p = s.end; } parts.push(buf.subarray(p)); const out = new Uint8Array(parts.reduce((t, a) => t + a.length, 0)); let o = 0; for(const a of parts){ out.set(a, o); o += a.length; } return out;
  },
};
