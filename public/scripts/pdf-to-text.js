/* ===================== TOOL: PDF to Text ===================== */
function joinItems(items){
  let out = "", last = null;
  for(const it of items){
    if(!it.str && !it.hasEOL) continue; const y = it.transform[5], x = it.transform[4], h = Math.abs(it.height) || Math.abs(it.transform[3]) || 10;
    if(last){
      const dy = Math.abs(y - last.y);
      if(dy > last.h * 1.7) out += "\n\n"; else if(dy > last.h * 0.5) out += "\n";
      else if(x - (last.x + last.w) > last.h * 0.15 && !out.endsWith(" ") && !it.str.startsWith(" ")) out += " ";
    }
    out += it.str; last = {y, h, x, w:it.width};
  }
  return out;
}
/* END CORE */

function mountPdfToText(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Options</label>
    <div class="row"><div><label for="rg" style="font-weight:600">Pages (empty = all)</label><input id="rg" type="text" placeholder="e.g. 1-5, 8"></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:14px 0 0"><input id="sp" type="checkbox"> Add a line like "Page 2" before each page</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:8px 0 0"><input id="jn" type="checkbox"> Join the lines of a paragraph together</label>
    <div class="row" style="margin-top:14px"><div><button id="go">Extract text</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div></div>
  <div class="card" id="out" hidden><p id="stat" style="font-weight:700;margin:0 0 10px"></p>
    <textarea id="ta" rows="14" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:inherit;font:inherit;line-height:1.5" aria-label="Extracted text"></textarea>
    <div class="row" style="margin-top:12px"><div><button id="cp" type="button">Copy text</button></div><div><button id="dl" type="button" class="alt">Download .txt</button></div></div><p id="cmsg" class="hint" aria-live="polite"></p></div>`;
  let doc = null, n = 0, name = "document", raw = [];
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(doc){ doc.destroy(); doc = null; } if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ doc = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; n = doc.numPages; $("info").textContent = file.name + " (" + n + " pages)"; $("set").hidden = false; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err && err.name === "PasswordException" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  function compose(){
    let t = raw.map(p => (($("sp").checked ? "Page " + p.no + "\n\n" : "")) + (($("jn").checked) ? p.text.replace(/([^\n])\n(?=[^\n])/g, "$1 ") : p.text)).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    $("ta").value = t; const words = (t.match(/\S+/g) || []).length; $("stat").textContent = raw.length + " page(s) · " + words + " words · " + t.length + " characters";
  }
  $("sp").onchange = $("jn").onchange = compose;
  $("go").onclick = async () => {
    if(!doc) return; let pages;
    if($("rg").value.trim()){ const r = PL.ranges($("rg").value, n); if(r.err) return fail(r.err); pages = [...new Set(r.groups.flat())].sort((a, b) => a - b); } else pages = Array.from({length:n}, (_, i) => i);
    $("go").disabled = true; $("status").className = ""; $("bar").hidden = false; raw = [];
    try{
      for(let k = 0; k < pages.length; k++){ $("status").textContent = "Reading page " + (pages[k] + 1) + "..."; $("bar").value = k / pages.length; const tc = await (await doc.getPage(pages[k] + 1)).getTextContent(); raw.push({no:pages[k] + 1, text:joinItems(tc.items)}); }
      $("status").textContent = ""; $("out").hidden = false; compose();
      if(!raw.some(p => p.text.trim())){ $("stat").textContent = ""; $("ta").value = ""; fail("No text found. This PDF is probably scanned pictures of pages, so there is no text to extract. It needs OCR, which this tool does not do yet."); $("out").hidden = true; }
    }catch(err){ fail("Could not read the text of this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  $("cp").onclick = async () => { const t = $("ta").value; try{ await navigator.clipboard.writeText(t); }catch(e){ $("ta").select(); document.execCommand("copy"); } $("cmsg").textContent = "Copied."; };
  $("dl").onclick = () => PL.dl(new Blob([$("ta").value], {type:"text/plain;charset=utf-8"}), name + ".txt");
  return () => { if(doc) doc.destroy(); };
}
mountPdfToText(document.getElementById("tool"));
