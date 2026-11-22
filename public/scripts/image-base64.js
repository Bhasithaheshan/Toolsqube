/* ===================== TOOL: Image to Base64 and Base64 to Image ===================== */
/* turn pasted text (a data URI or plain base64) into bytes and find out what kind of picture it is */
function decodeB64(text){
  let t = String(text).trim(), mime = ""; const m = t.match(/^data:([^;,]*)(;[^,]*)?,/i);
  if(m){ mime = m[1].toLowerCase(); t = t.slice(m[0].length); if(m[2] && !/base64/i.test(m[2])) return {error:"This data URI is not base64 encoded."}; }
  t = t.replace(/[\s"']/g, "").replace(/-/g, "+").replace(/_/g, "/"); if(!t) return {error:"Paste the Base64 text first."}; if(!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) return {error:"This is not valid Base64 text. It has characters that Base64 does not use."};
  while(t.length % 4) t += "=";
  let bin; try{ bin = atob(t); }catch(e){ return {error:"This is not valid Base64 text."}; } const b = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  const head = String.fromCharCode(...b.subarray(0, 12));
  const kind = b[0] === 0x89 && head.slice(1, 4) === "PNG" ? "image/png" : b[0] === 0xFF && b[1] === 0xD8 ? "image/jpeg" : head.startsWith("GIF8") ? "image/gif" : head.startsWith("RIFF") && head.slice(8, 12) === "WEBP" ? "image/webp" : head.startsWith("BM") ? "image/bmp" : /^\s*(<\?xml|<svg)/i.test(String.fromCharCode(...b.subarray(0, 60))) ? "image/svg+xml" : "";
  const type = kind || mime; if(!type.startsWith("image/")) return {error:"This does not look like a picture. Check that you pasted all of the text."};
  return {bytes:b, mime:type, ext:{"image/png":"png", "image/jpeg":"jpg", "image/gif":"gif", "image/webp":"webp", "image/bmp":"bmp", "image/svg+xml":"svg"}[type] || "img"};
}
/* END CORE */

function mountImageBase64(root){
  let mode = "enc"; try{ mode = (JSON.parse(root.dataset.preset || "null") || {}).mode === "decode" ? "dec" : "enc"; }catch(e){}
  root.innerHTML = `<div class="tabs"><button id="t1" type="button">Image to Base64</button><button id="t2" type="button" class="alt">Base64 to Image</button></div>
  <div id="m1"><div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
    <div class="card" id="eo" hidden><label>2. Copy the code you need</label><div class="row" style="align-items:center"><div><select id="fm" aria-label="Format"><option value="uri">Data URI (for src and url())</option><option value="raw">Base64 text only</option><option value="img">HTML img tag</option><option value="css">CSS background</option><option value="md">Markdown image</option></select></div><div><button id="cp" type="button">Copy</button></div></div>
      <textarea id="ta" rows="8" readonly style="width:100%;margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:inherit;font:.8rem/1.4 ui-monospace,Consolas,monospace"></textarea><p id="sz" class="hint"></p></div></div>
  <div id="m2" hidden><div class="card"><label for="in">1. Paste the Base64 text</label><textarea id="in" rows="8" placeholder="data:image/png;base64,iVBORw0KGgo... or just the Base64 text" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:inherit;font:.8rem/1.4 ui-monospace,Consolas,monospace"></textarea>
      <div class="row" style="margin-top:10px"><div><button id="dc" type="button">Show the image</button></div></div><div id="st" aria-live="polite"></div></div>
    <div class="card" id="do" hidden><p id="dd" style="font-weight:700;margin:0 0 10px"></p><div style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:10px;display:inline-block;max-width:100%;margin-bottom:12px"><img id="di" alt="Decoded image" style="max-width:100%;max-height:420px;display:block"></div><br>
      <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div></div>`;
  let uri = "", url = null, size = 0;
  const setMode = m => { mode = m; $("m1").hidden = m !== "enc"; $("m2").hidden = m !== "dec"; $("t1").className = m === "enc" ? "" : "alt"; $("t2").className = m === "dec" ? "" : "alt"; }; $("t1").onclick = () => setMode("enc"); $("t2").onclick = () => setMode("dec"); setMode(mode);
  function out(){ const raw = uri.replace(/^data:[^,]*,/, ""), v = $("fm").value; $("ta").value = v === "raw" ? raw : v === "img" ? '<img src="' + uri + '" alt="">' : v === "css" ? "background-image: url('" + uri + "');" : v === "md" ? "![image](" + uri + ")" : uri; $("sz").textContent = "Original " + PL.sz(size) + ". The Base64 text is " + PL.sz(raw.length) + ", about a third bigger." + (raw.length > 100 * 1024 ? " It is large. For websites, make the picture smaller first." : ""); }
  $("fm").onchange = out;
  $("f").onchange = e => { const f = e.target.files[0]; $("eo").hidden = true; if(!f) return; size = f.size; const r = new FileReader(); r.onload = () => { uri = r.result; $("info").className = "hint"; $("info").textContent = f.name + " (" + PL.sz(f.size) + ")"; $("eo").hidden = false; out(); }; r.onerror = () => { $("info").className = "hint err"; $("info").textContent = "Could not read this file."; }; r.readAsDataURL(f); };
  $("cp").onclick = async () => { try{ await navigator.clipboard.writeText($("ta").value); }catch(e){ $("ta").select(); document.execCommand("copy"); } $("cp").textContent = "Copied"; setTimeout(() => $("cp").textContent = "Copy", 1500); };
  $("dc").onclick = () => {
    $("do").hidden = true; $("st").className = ""; const r = decodeB64($("in").value); if(r.error){ $("st").className = "err"; $("st").textContent = r.error; return; }
    if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob([r.bytes], {type:r.mime})); $("di").src = url; $("dl").href = url; $("dl").download = "image." + r.ext; $("dl").textContent = "Download image." + r.ext; $("dd").textContent = r.ext.toUpperCase() + " image · " + PL.sz(r.bytes.length); $("do").hidden = false; $("st").textContent = "";
  };
  return () => { if(url) URL.revokeObjectURL(url); };
}
mountImageBase64(document.getElementById("tool"));
