"use strict";
/* Haut-Cockpit Fotos: Verlauf der Hautstellen.
   Die Bilder liegen nur im Browser-Speicher dieses Geräts (IndexedDB) und werden nirgends hochgeladen. */

const PH = { db: null, items: null, urls: {}, busy: false, loading: false, err: "" };

function phOpen() {
  return new Promise((res, rej) => {
    if (PH.db) return res(PH.db);
    if (!window.indexedDB) return rej(new Error("kein Speicher"));
    const rq = indexedDB.open("haut-cockpit-fotos", 1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore("fotos", { keyPath: "id" }); };
    rq.onsuccess = () => { PH.db = rq.result; res(PH.db); };
    rq.onerror = () => rej(rq.error || new Error("Speicher nicht verfügbar"));
  });
}
/* Eine Transaktion auf dem Foto-Speicher; fn bekommt den Store und kann eine Anfrage zurückgeben, deren Ergebnis geliefert wird */
function phTx(mode, fn) {
  return phOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction("fotos", mode), rq = fn(tx.objectStore("fotos"));
    tx.oncomplete = () => res(rq ? rq.result : undefined);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error("Speicherfehler"));
  }));
}
async function phLoad() {
  if (PH.items) return PH.items;
  const all = (await phTx("readonly", st => st.getAll())) || [];
  PH.items = all.sort((a, b) => b.t - a.t);   // neueste zuerst
  return PH.items;
}
/* Für Ansichten: liefert true, wenn die Fotos geladen sind; sonst wird geladen und danach neu gezeichnet */
function phEnsure() {
  if (PH.items) return true;
  if (PH.loading) return false;
  PH.loading = true;
  phLoad().catch(() => { PH.err = "Der Foto-Speicher ist auf diesem Gerät nicht verfügbar."; PH.items = []; }).then(() => { PH.loading = false; render(); });
  return false;
}
const phUrl = p => PH.urls[p.id] || (PH.urls[p.id] = URL.createObjectURL(p.blob));
const phLabel = p => p.region ? (REGION_LABEL[p.region] || p.region) : "Ohne Stelle";
const phFig = (p, cap) => `<figure class="phfig"><img src="${phUrl(p)}" alt="Foto ${esc(phLabel(p))} vom ${deDate(p.k)}"><figcaption>${cap ? esc(cap) + ": " : ""}${deDate(p.k)}</figcaption></figure>`;

/* Bild auf höchstens 1280 Pixel Kantenlänge verkleinern und als JPEG speichern (spart Speicher, reicht für den Verlauf) */
function phShrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.naturalWidth * sc)); cv.height = Math.max(1, Math.round(img.naturalHeight * sc));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(b => b ? res({ blob: b, w: cv.width, h: cv.height }) : rej(new Error("Das Bild konnte nicht verarbeitet werden")), "image/jpeg", 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Die Datei ist kein lesbares Bild")); };
    img.src = url;
  });
}
async function phAdd(file) {
  const im = await phShrink(file);
  const p = { id: Date.now().toString(36) + uid(), k: dkey(), t: Date.now(), region: ui.phRegion || "", note: (ui.phNote || "").trim(), blob: im.blob, w: im.w, h: im.h };
  await phTx("readwrite", st => st.put(p));
  await phLoad();
  if (!PH.items.some(x => x.id === p.id)) PH.items.unshift(p);
  return p;
}
async function phRemove(id) {
  await phTx("readwrite", st => st.delete(id));
  if (PH.urls[id]) { URL.revokeObjectURL(PH.urls[id]); delete PH.urls[id]; }
  if (PH.items) PH.items = PH.items.filter(p => p.id !== id);
}
async function phClear() { await phTx("readwrite", st => st.clear()); PH.items = []; }
function phDownload(p) {
  const a = document.createElement("a");
  a.href = phUrl(p); a.download = "hautfoto-" + p.k + (p.region ? "-" + p.region : "") + ".jpg";
  document.body.appendChild(a); a.click(); a.remove();
}
async function phFileChosen(e) {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  PH.busy = true; render();
  try { await phAdd(f); ui.phNote = ""; toast("Foto gespeichert"); }
  catch (x) { toast(x && x.message ? x.message : "Das Foto konnte nicht gespeichert werden"); }
  PH.busy = false; render();
}

/* ---------- Ansicht ---------- */
/* Körperstelle wählen und Foto hinzufügen. Zwei Knöpfe, weil Android bei einem einzigen Dateifeld oft nur die Galerie anbietet:
   capture="environment" öffnet direkt die Kamera, das Feld ohne capture die Bildauswahl */
function photoAddBox(withNote) {
  const opts = ["f", "b"].map(v => `<optgroup label="${v === "f" ? "Vorderseite" : "Rückseite"}">${REGIONS.filter(r => r.v === v).map(r => `<option value="${r.id}" ${ui.phRegion === r.id ? "selected" : ""}>${esc(r.label)}</option>`).join("")}</optgroup>`).join("");
  return `<label class="label" for="phReg">Körperstelle</label><select id="phReg" data-bind="phRegion"><option value="">Keine Angabe</option>${opts}</select>
    ${withNote ? `<label class="label" for="phNote">Notiz (optional)</label><input id="phNote" value="${esc(ui.phNote)}" data-bind="phNote" placeholder="z. B. nach 2 Wochen Schaum">` : ""}
    ${PH.busy ? `<div class="busy"><span class="spin"></span>Foto wird gespeichert</div>`
      : `<div class="actions"><label class="btn filebtn">Foto aufnehmen<input type="file" accept="image/*" capture="environment" class="phFile" hidden></label><label class="btn ghost filebtn">Aus Galerie wählen<input type="file" accept="image/*" class="phFile" hidden></label></div>`}`;
}
/* Karte im Cockpit: Foto ohne Umweg über den Verlauf aufnehmen */
function photoCard() {
  const n = PH.items ? PH.items.filter(p => p.k === dkey()).length : 0;
  return `<section class="card"><div class="row between"><h2>Hautfoto</h2><button class="link" data-act="toFotos">Alle Fotos ansehen</button></div>
    ${photoAddBox(false)}
    ${n ? `<p class="muted small">Heute gespeichert: ${n} ${n === 1 ? "Foto" : "Fotos"}.</p>` : ""}</section>`;
}
function viewFotos() {
  if (!phEnsure()) return `<section class="card"><div class="busy"><span class="spin"></span>Fotos werden geladen</div></section>`;
  const all = PH.items, regs = [...new Set(all.map(p => p.region || ""))];
  const flt = (ui.phFilter === "alle" || regs.includes(ui.phFilter)) ? ui.phFilter : "alle";
  const list = all.filter(p => flt === "alle" || (p.region || "") === flt);
  const open =ui.phOpen ? all.find(p => p.id === ui.phOpen) : null;
  const cmp = flt !== "alle" && list.length >= 2 ? [list[list.length - 1], list[0]] : null;
  return `${PH.err ? `<p class="warn">${esc(PH.err)}</p>` : ""}
  ${open ? `<section class="card" id="phview"><div class="row between"><h2>${esc(phLabel(open))}</h2><button class="ic" data-act="phClose" aria-label="Schließen">×</button></div>
    <img class="phbig" src="${phUrl(open)}" alt="Foto ${esc(phLabel(open))} vom ${deDate(open.k)}">
    <p class="small">${esc(fmtDateLong(open.k))}${open.note ? " · " + esc(open.note) : ""}</p>
    <div class="actions"><button class="btn small" data-act="phSave" data-id="${open.id}">Als Datei speichern</button><button class="btn small ghost" data-act="phDel" data-id="${open.id}">${ui.phDel === open.id ? "Wirklich löschen? Nochmal tippen" : "Löschen"}</button></div></section>` : ""}
  <section class="card"><h2>Neues Foto</h2>
    ${photoAddBox(true)}
    <p class="muted small">Gleicher Abstand und gleiches Licht machen die Bilder vergleichbar. Die Fotos bleiben nur auf diesem Handy und werden nirgends hochgeladen. Die Datensicherung in den Einstellungen nimmt sie mit.</p></section>
  <section class="card"><div class="row between"><h2>Verlauf</h2><span class="muted">${all.length} ${all.length === 1 ? "Foto" : "Fotos"}</span></div>
    ${all.length ? `<select data-bind="phFilter" aria-label="Nach Körperstelle filtern"><option value="alle">Alle Stellen</option>${regs.map(r => `<option value="${r}" ${flt === r ? "selected" : ""}>${esc(r ? (REGION_LABEL[r] || r) : "Ohne Stelle")} (${all.filter(p => (p.region || "") === r).length})</option>`).join("")}</select>` : `<p class="muted">Noch keine Fotos.</p>`}
    ${cmp ? `<div class="label">Vergleich</div><div class="phcmp">${phFig(cmp[0], "Erstes")}${phFig(cmp[1], "Neuestes")}</div>` : (flt === "alle" && all.length >= 2 ? `<p class="muted small">Wähle oben eine Körperstelle, dann stehen das erste und das neueste Foto nebeneinander.</p>` : "")}
    <div class="phgrid">${list.map(p => `<button class="ph" data-act="phOpen" data-id="${p.id}"><img loading="lazy" src="${phUrl(p)}" alt="Foto ${esc(phLabel(p))} vom ${deDate(p.k)}"><span>${deDate(p.k)}<br>${esc(phLabel(p))}</span></button>`).join("")}</div></section>`;
}

/* Für den Arztbericht: je Körperstelle das älteste und das neueste Foto im Zeitraum (höchstens 6 Stellen) */
function reportPhotos(from, to) {
  if (!phEnsure()) return "";
  const inP = PH.items.filter(p => p.k >= from && p.k <= to);
  if (!inP.length) return "";
  const byReg = {};
  inP.forEach(p => { const r = p.region || ""; (byReg[r] = byReg[r] || []).push(p); });
  return `<h3>Fotos (ältestes und neuestes je Stelle im Zeitraum)</h3>` + Object.keys(byReg).slice(0, 6).map(r => {
    const l = byReg[r], first = l[l.length - 1], last = l[0];
    return `<div class="phrep"><strong class="small">${esc(r ? (REGION_LABEL[r] || r) : "Ohne Stelle")}</strong><div class="phcmp">${phFig(first)}${l.length > 1 ? phFig(last) : ""}</div></div>`;
  }).join("");
}

/* ---------- Sicherung mit Fotos ---------- */
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function dataURLToBlob(u) {
  const i = u.indexOf(","), mime = (u.slice(0, i).match(/:(.*?);/) || [])[1] || "image/jpeg", bin = atob(u.slice(i + 1)), arr = new Uint8Array(bin.length);
  for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
  return new Blob([arr], { type: mime });
}
async function backupAll() {
  const photos = [];
  try { for (const p of await phLoad()) photos.push({ id: p.id, k: p.k, t: p.t, region: p.region, note: p.note, w: p.w, h: p.h, data: await blobToDataURL(p.blob) }); }
  catch (e) { /* Foto-Speicher nicht verfügbar: Sicherung ohne Fotos */ }
  S.lastBackup = Date.now(); save();
  downloadFile("haut-cockpit-sicherung-" + dkey() + ".json", JSON.stringify(Object.assign({}, S, { photos })), "application/json");
  toast(photos.length ? "Sicherung mit " + photos.length + " Fotos gespeichert" : "Sicherung gespeichert");
}
async function phRestore(list) {
  let n = 0;
  for (const p of list) {
    try { const blob = dataURLToBlob(p.data); await phTx("readwrite", st => st.put({ id: p.id, k: p.k, t: p.t, region: p.region || "", note: p.note || "", w: p.w, h: p.h, blob })); n++; }
    catch (e) { /* einzelnes Foto überspringen */ }
  }
  PH.items = null;
  return n;
}
