const $ = id => document.getElementById(id);
const fmt = s => Math.floor(s / 60) + "m " + (Math.round((s % 60) * 10) / 10) + "s";
function parseT(t){
  t = (t || "").trim(); if(!t) return NaN;
  const p = t.split(":").map(Number);
  if(p.some(isNaN) || p.length > 3) return NaN;
  return p.reduce((a, x) => a * 60 + x, 0);
}
