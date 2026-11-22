/* ===================== TOOL: Image Info ===================== */
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function ratioName(w, h){ const g = gcd(w, h), a = w / g, b = h / g; return a <= 40 && b <= 40 ? a + ":" + b : (w / h).toFixed(3) + " : 1"; }
/* END CORE */
function mountImageInfo(root){
  root.innerHTML = `<style>.ii{border-collapse:collapse;width:100%}.ii td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}.ii td:first-child{color:var(--mute);width:38%;white-space:nowrap}</style>
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen. It is checked on your device.</p></div>
  <div class="card" id="out" hidden><label>Details of your image</label><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><img id="th" alt="Your image" style="max-width:180px;max-height:180px;border-radius:10px;border:1px solid var(--line);background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/14px 14px"><table class="ii" id="tb" style="flex:1 1 280px"></table></div>
    <div class="row" style="margin-top:12px"><div><button id="cp" type="button" class="alt">Copy the details</button></div></div><p id="cm" class="hint" aria-live="polite"></p></div>`;
  let url = null, text = "";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("out").hidden = true; if(!file) return; $("info").className = "hint"; $("info").textContent = "Reading...";
    try{
      const bytes = new Uint8Array(await file.arrayBuffer()), info = EX.read(bytes); let bmp; try{ bmp = await createImageBitmap(file); }catch(err){ bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
      const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, sc = Math.min(1, 160 / Math.max(w, h)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc)); const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(bmp, 0, 0, c.width, c.height); if(bmp.close) bmp.close();
      const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, b = 0, n = 0, alpha = false; for(let i = 0; i < d.length; i += 4){ if(d[i + 3] < 250) alpha = true; if(d[i + 3] > 20){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } }
      const avg = n ? [r / n, gg / n, b / n].map(Math.round) : [0, 0, 0], hex = "#" + avg.map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase(), mp = w * h / 1e6, rows = [], add = (k, v, raw) => rows.push([k, v, raw]);
      add("File name", file.name); add("Format", (info.kind === "other" ? (file.type.replace("image/", "") || "unknown") : info.kind).toUpperCase()); add("File size", PL.sz(file.size) + " (" + file.size.toLocaleString() + " bytes)"); add("Size in pixels", w + " x " + h + " px"); add("Megapixels", (mp >= 1 ? mp.toFixed(1) : mp.toFixed(2)) + " MP");
      add("Shape (aspect ratio)", ratioName(w, h)); add("Resolution", info.dpi ? info.dpi + " dpi" : "Not saved in the file (screens use 72 or 96)");
      add("Print size at 300 dpi", (w / 300 * 2.54).toFixed(1) + " x " + (h / 300 * 2.54).toFixed(1) + " cm"); add("Print size at 72 dpi", (w / 72 * 2.54).toFixed(1) + " x " + (h / 72 * 2.54).toFixed(1) + " cm");
      add("See-through parts", alpha ? "Yes" : "No"); add("Average color", '<span style="display:inline-block;width:16px;height:16px;border-radius:4px;border:1px solid var(--line);vertical-align:-3px;background:' + hex + '"></span> ' + hex, true);
      EX.describe(info).forEach(x => add(x[0], x[1])); if(info.hasMeta && !info.gps) add("Hidden data", "This file has hidden data. The EXIF tool can show and remove it."); if(info.gps) add("Location saved", "Yes. Use the EXIF tool to remove it before you share the photo.");
      $("tb").innerHTML = rows.map(x => "<tr><td>" + esc(x[0]) + "</td><td>" + (x[2] ? x[1] : esc(x[1])) + "</td></tr>").join(""); text = rows.map(x => x[0] + ": " + String(x[1]).replace(/<[^>]+>/g, "").trim()).join("\n");
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(file); $("th").src = url; $("out").hidden = false; $("info").textContent = file.name; $("cm").textContent = "";
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG, WebP or GIF."; }
  };
  $("cp").onclick = async () => { try{ await navigator.clipboard.writeText(text); }catch(e){ const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); } $("cm").textContent = "Copied."; };
  return () => { if(url) URL.revokeObjectURL(url); };
}
mountImageInfo(document.getElementById("tool"));
