/* ===================== TOOL: Text to PDF ===================== */
function wrapLines(text, maxW, measure){
  const out = [];
  for(const para of text.replace(/\r/g, "").replace(/\t/g, "    ").split("\n")){
    if(!para.trim()){ out.push(""); continue; }
    let line = "";
    for(const tok of para.match(/\s+|\S+/g)){
      if(measure(line + tok) <= maxW){ line += tok; continue; }
      if(/^\s/.test(tok)){ if(line.trim()) out.push(line.trimEnd()); line = ""; continue; }
      if(line.trim()){ out.push(line.trimEnd()); line = ""; }
      if(measure(tok) <= maxW){ line = tok; continue; }
      let chunk = ""; for(const ch of tok){ if(chunk && measure(chunk + ch) > maxW){ out.push(chunk); chunk = ch; } else chunk += ch; } line = chunk;
    }
    out.push(line.trimEnd());
  }
  return out;
}
function paginate(lines, perPage){ const pages = []; for(let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage)); return pages.length ? pages : [[]]; }
/* END CORE */

function mountTextToPdf(root){
  root.innerHTML = `${PL.PVCSS}
  <div id="set" class="pv-grid">
    <div class="card"><label for="tx">1. Type or paste your text</label>
      <textarea id="tx" rows="12" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:inherit;font:inherit;line-height:1.5" placeholder="Type here..."></textarea>
      <div class="row" style="margin-top:8px;align-items:center"><div><label for="tf" style="font-weight:600;font-size:.9rem">Or open a .txt file</label><input id="tf" type="file" accept=".txt,text/plain"></div></div>
      <label style="margin-top:16px">2. Page settings</label>
      <div class="row"><div><label for="sz" style="font-weight:600">Page size</label><select id="sz"><option value="a4">A4</option><option value="letter">Letter</option></select></div>
        <div><label for="ft" style="font-weight:600">Font</label><select id="ft"><option value="sans">Sans (Helvetica)</option><option value="serif">Serif (Times)</option><option value="mono">Monospace (Courier)</option></select></div></div>
      <div class="row" style="margin-top:12px"><div><label for="fs" style="font-weight:600">Text size</label><select id="fs"><option>9</option><option>10</option><option selected>12</option><option>14</option><option>16</option><option>20</option></select></div>
        <div><label for="ls" style="font-weight:600">Line spacing</label><select id="ls"><option value="1.15">Normal</option><option value="1.4" selected>Relaxed</option><option value="1.8">Wide</option></select></div>
        <div><label for="mg" style="font-weight:600">Margin (mm)</label><input id="mg" type="number" min="10" max="40" step="1" value="20"></div></div>
      <p class="hint" id="mode"></p>
      <div class="row" style="margin-top:12px"><div><button id="go">Make PDF</button></div></div><progress id="bar" hidden></progress><div id="status" aria-live="polite"></div></div>
    <div class="card pv-card"><label>Preview of page 1</label><canvas id="pvc" width="10" height="10"></canvas><p id="pvnote" class="hint" style="margin:8px 0 0"></p></div></div>${PL.resultCard}`;
  const MM = 72 / 25.4, FAM = {sans:'Helvetica, Arial, sans-serif', serif:'"Times New Roman", Times, serif', mono:'"Courier New", Courier, monospace'}, DEV = ',"Nirmala UI","Iskoola Pota","Noto Sans Sinhala","Noto Sans",sans-serif';
  const STD = {sans:PDFLib.StandardFonts.Helvetica, serif:PDFLib.StandardFonts.TimesRoman, mono:PDFLib.StandardFonts.Courier};
  let fonts = null, tmp = null, raf = 0;
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  async function loadFonts(){ if(fonts) return; tmp = await PDFLib.PDFDocument.create(); fonts = {}; for(const k of Object.keys(STD)) fonts[k] = await tmp.embedFont(STD[k]); }
  const opts = () => { const [W, H] = PL.SIZES[$("sz").value], mg = (+$("mg").value || 20) * MM, size = +$("fs").value, lh = size * +$("ls").value; return {W, H, mg, size, lh, key:$("ft").value, per:Math.max(1, Math.floor((H - 2 * mg) / lh)), maxW:W - 2 * mg}; };
  const needsDevice = t => { try{ fonts.sans.encodeText(t.replace(/\n/g, " ")); return false; }catch(e){ return true; } };
  const mc = document.createElement("canvas").getContext("2d");
  function layout(o, dev){ const text = $("tx").value; if(dev){ mc.font = o.size + "px " + FAM[o.key] + DEV; return wrapLines(text, o.maxW, s => mc.measureText(s).width); } const f = fonts[o.key]; return wrapLines(text, o.maxW, s => f.widthOfTextAtSize(s, o.size)); }
  function drawPage(g, o, lines, sc, dev){ g.fillStyle = "#fff"; g.fillRect(0, 0, o.W * sc, o.H * sc); g.fillStyle = "#111"; g.textBaseline = "alphabetic"; g.font = (o.size * sc) + "px " + FAM[o.key] + (dev ? DEV : ""); lines.forEach((l, i) => g.fillText(l, o.mg * sc, (o.mg + o.size + i * o.lh) * sc)); }
  async function preview(){
    await loadFonts(); const o = opts(), dev = needsDevice($("tx").value), lines = paginate(layout(o, dev), o.per), c = $("pvc"), sc = 340 / o.W; c.width = Math.round(o.W * sc); c.height = Math.round(o.H * sc);
    drawPage(c.getContext("2d"), o, lines[0], sc, dev); $("pvnote").textContent = lines.length + " page(s)"; $("mode").textContent = dev ? "Your text has letters that the standard PDF fonts cannot show (like Sinhala). The pages will be made as pictures using your device's fonts, so the text cannot be selected." : "";
  }
  const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(preview); };
  ["tx", "sz", "ft", "fs", "ls", "mg"].forEach(k => { $(k).oninput = sched; $(k).onchange = sched; });
  $("tf").onchange = async e => { const f = e.target.files[0]; if(f){ $("tx").value = await f.text(); sched(); } };
  $("go").onclick = async () => {
    if(!$("tx").value.trim()) return fail("Type or paste some text first.");
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Making your PDF..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      await loadFonts(); const o = opts(), dev = needsDevice($("tx").value), pages = paginate(layout(o, dev), o.per), doc = await PDFLib.PDFDocument.create();
      if(dev){
        for(const lines of pages){ const sc = 2.5, c = document.createElement("canvas"); c.width = Math.round(o.W * sc); c.height = Math.round(o.H * sc); drawPage(c.getContext("2d"), o, lines, sc, true);
          const b = await new Promise(r => c.toBlob(r, "image/png")), img = await doc.embedPng(new Uint8Array(await b.arrayBuffer())); doc.addPage([o.W, o.H]).drawImage(img, {x:0, y:0, width:o.W, height:o.H}); }
      }else{
        const font = await doc.embedFont(STD[o.key]);
        for(const lines of pages){ const p = doc.addPage([o.W, o.H]); lines.forEach((l, i) => { if(l) p.drawText(l, {x:o.mg, y:o.H - o.mg - o.size - i * o.lh, size:o.size, font, color:PDFLib.rgb(.07, .07, .07)}); }); }
      }
      await PL.finish(await doc.save(), "text.pdf", pages.length + " page(s) made.", 1); $("status").textContent = "";
    }catch(err){ fail("Could not make the PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  preview();
  return PL.cleanup;
}
mountTextToPdf(document.getElementById("tool"));
