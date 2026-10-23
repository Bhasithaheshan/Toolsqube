/* ===================== TOOL: Merge PDF ===================== */
function mountMergePdf(root){
  root.innerHTML = `<style>
  .mp-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
  .mp-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);cursor:grab}
  .mp-row.drag{opacity:.45}
  .mp-n{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--accink);display:grid;place-items:center;font-weight:700;font-size:.85rem;flex:none}
  .mp-i{flex:1;min-width:0}
  .mp-i b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mp-i small{color:var(--mute)}
  .mp-b{display:flex;gap:4px;flex:none}
  .card .mp-b button{padding:6px 10px;font-size:.9rem}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  </style>
  <div class="card"><label for="f">1. Choose your PDF files</label>
    <input id="f" type="file" accept="application/pdf,.pdf" multiple>
    <p id="info" class="hint">Select two or more PDFs. You can pick several at once and add more later.</p>
    <div id="list" class="mp-list"></div>
    <div class="row" id="tools" hidden style="margin-top:12px">
      <div><button id="az" class="alt" type="button">Sort A to Z</button></div>
      <div><button id="clr" class="danger" type="button">Remove all</button></div></div></div>
  <div class="card"><label for="nm">2. Name your merged file</label>
    <input id="nm" type="text" value="merged" aria-label="File name">
    <div class="row" style="margin-top:14px"><div><button id="go" disabled>Merge PDFs</button></div></div>
    <progress id="bar" hidden max="1" value="0"></progress><div id="status" aria-live="polite"></div>
    <p class="hint">Drag the rows, or use the arrows, to set the order. The files are joined from top to bottom.</p></div>
  <div class="card" id="out" hidden>
    <p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 12px"></p>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`;
  let items = [], uid = 0, url = null, dragI = -1;
  const sz = b => b >= 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const info = (t, err) => { $("info").className = "hint" + (err ? " err" : ""); $("info").textContent = t; };
  const move = (a, b) => { if(b < 0 || b >= items.length) return; const [x] = items.splice(a, 1); items.splice(b, 0, x); render(); };

  function render(){
    const box = $("list"); box.innerHTML = "";
    items.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "mp-row"; d.draggable = true;
      d.innerHTML = `<span class="mp-n">${i + 1}</span><span class="mp-i"><b></b><small>${it.pages} page${it.pages === 1 ? "" : "s"} · ${sz(it.file.size)}</small></span>
        <span class="mp-b"><button class="alt" type="button" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button><button class="alt" type="button" aria-label="Move down" ${i === items.length - 1 ? "disabled" : ""}>↓</button><button class="danger" type="button" aria-label="Remove">✕</button></span>`;
      d.querySelector("b").textContent = it.file.name;
      const [up, dn, rm] = d.querySelectorAll("button");
      up.onclick = () => move(i, i - 1); dn.onclick = () => move(i, i + 1); rm.onclick = () => { items.splice(i, 1); render(); };
      d.ondragstart = e => { dragI = i; d.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; };
      d.ondragend = () => d.classList.remove("drag");
      d.ondragover = e => e.preventDefault();
      d.ondrop = e => { e.preventDefault(); if(dragI >= 0 && dragI !== i) move(dragI, i); dragI = -1; };
      box.appendChild(d);
    });
    const total = items.reduce((t, x) => t + x.pages, 0);
    $("tools").hidden = items.length === 0;
    $("go").disabled = items.length < 2; $("go").textContent = items.length >= 2 ? "Merge " + items.length + " PDFs (" + total + " pages)" : "Merge PDFs";
  }

  $("f").onchange = async e => {
    const files = [...e.target.files]; e.target.value = ""; if(!files.length) return;
    const skipped = []; info("Reading your files...");
    for(const file of files){
      try{
        const doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), {ignoreEncryption:true});
        if(doc.isEncrypted){ skipped.push(file.name + " (password protected)"); continue; }
        items.push({id:++uid, file, pages:doc.getPageCount()});
      }catch(err){ skipped.push(file.name + " (could not be read)"); }
    }
    render();
    if(skipped.length) info("Skipped: " + skipped.join(", ") + ".", true);
    else info(items.length + " file(s) added. Add more, or merge them now.");
  };
  $("az").onclick = () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, {numeric:true})); render(); };
  $("clr").onclick = () => { items = []; $("out").hidden = true; render(); info("Select two or more PDFs."); };

  $("go").onclick = async () => {
    $("go").disabled = true; $("bar").hidden = false; $("bar").value = 0; $("out").hidden = true; $("status").className = "";
    try{
      const out = await PDFLib.PDFDocument.create(); let total = 0;
      for(let i = 0; i < items.length; i++){
        $("status").textContent = "Adding " + (i + 1) + " of " + items.length + ": " + items[i].file.name; $("bar").value = i / items.length;
        await new Promise(r => setTimeout(r, 10));
        const src = await PDFLib.PDFDocument.load(await items[i].file.arrayBuffer(), {ignoreEncryption:true});
        (await out.copyPages(src, src.getPageIndices())).forEach(p => { out.addPage(p); total++; });
      }
      $("status").textContent = "Saving...";
      const blob = new Blob([await out.save()], {type:"application/pdf"});
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const fn = ($("nm").value.replace(/[\\/:*?"<>|]+/g, "").trim() || "merged") + ".pdf";
      $("dl").href = url; $("dl").download = fn; $("dl").textContent = "Download " + fn;
      $("res").textContent = items.length + " files merged into " + total + " pages (" + sz(blob.size) + ")";
      $("out").hidden = false; $("status").textContent = "Done."; $("dl").click(); $("out").scrollIntoView({behavior:"smooth"});
    }catch(err){ $("status").className = "err"; $("status").textContent = "Could not merge these files. One of them may be damaged or protected."; }
    $("bar").hidden = true; render();
  };
  render();
  return () => { if(url) URL.revokeObjectURL(url); };
}

mountMergePdf(document.getElementById("tool"));
