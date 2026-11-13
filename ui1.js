"use strict";
/* Haut-Cockpit Oberfläche, Teil 1: Zustand, Cockpit, Abend-Check, Essen, Scanner */

const ui = {
  date: dkey(), slot: null, draft: null, draftText: "", scanning: false, scanBusy: false, scanErr: "", scanProduct: null, scanManual: false,
  recipeFilter: "alle", rezTab: "rezepte", dbq: "", dbf: "alle", verlaufTab: "auswertung", period: 30, corrLag: 1, abend: null, eanText: "", flash: null, mealTime: null, mealTimeAuto: true, epItch: null, epTime: null, lastCode: null, lastAdd: null, medPart: null, pick: null
};
const LIGHT = { g: "Passt", y: "In Maßen", r: "Meiden", u: "Unklar" };
const SLOTS = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
const dot = r => `<span class="lamp r-${r}" aria-label="${LIGHT[r] || ""}"></span>`;
const pill = r => `<span class="pill r-${r}">${LIGHT[r] || ""}</span>`;
function autoSlot() { const h = new Date().getHours(); return h < 10 ? "Frühstück" : h < 15 ? "Mittagessen" : h < 21 ? "Abendessen" : "Snack"; }
const isToday = () => ui.date === dkey();

function dateNav() {
  return `<div class="datenav"><button class="ic" data-act="date" data-d="-1" aria-label="Vortag">‹</button>
  <div class="dn-mid"><strong>${isToday() ? "Heute" : esc(fmtDate(ui.date))}</strong><span class="muted">${esc(fmtDateLong(ui.date))}</span></div>
  <button class="ic" data-act="date" data-d="1" aria-label="Folgetag" ${isToday() ? "disabled" : ""}>›</button></div>`;
}

function bar(val, max, cls) {
  const p = Math.max(0, Math.min(100, max ? (val / max) * 100 : 0));
  return `<div class="bar ${cls || ""}"><i style="width:${p}%"></i></div>`;
}

/* Medikamente und Pflege je Tageszeit: Reiter Morgens/Mittags/Abends, Zähler starten je Tageszeit bei 0, Summe läuft im Hintergrund */
const PARTS3 = [["m", "Morgens"], ["n", "Mittags"], ["e", "Abends"]];
const PNAME = { m: "Morgens", n: "Mittags", e: "Abends" };
const SKKEY = { m: "skM", n: "skN", e: "skE" };
const shortName = s => String(s).split(/[ (]/)[0];
function curPart() {
  if (ui.medPart) return ui.medPart;
  if (ui.date !== dkey()) return "m";
  const h = new Date().getHours();
  return h < 11 ? "m" : h < 17 ? "n" : "e";
}
function medPanel(m) {
  const p = curPart(), pl = PNAME[p], idx = PARTS3.findIndex(x => x[0] === p);
  const P = id => (m[id + "P"] || {})[p] || 0;
  const had = id => !!(m[SKKEY[id]] || (m.allegraP || {})[id] || (m.cremeP || {})[id]);
  const tabs = PARTS3.map(([id, l]) => `<button class="${p === id ? "on" : ""}" data-act="medpart" data-p="${id}">${l}${had(id) ? " ✓" : ""}</button>`).join("");
  const cnt = (id, label) => `<div class="stepper"><span>${esc(label)}<br><span class="muted small">${pl}</span></span><div><button class="ic" data-act="medp" data-m="${id}" data-p="${p}" data-d="-1" aria-label="${esc(label)} ${pl} weniger">−</button><b>${P(id)}</b><button class="ic" data-act="medp" data-m="${id}" data-p="${p}" data-d="1" aria-label="${esc(label)} ${pl} mehr">+</button></div></div>`;
  const taken = !!m[SKKEY[p]], dose = (medCfg().skD || [])[idx];
  const ov = PARTS3.map(([id, l]) => {
    const parts = [];
    if (m[SKKEY[id]]) parts.push("Tablette ✓");
    const a = (m.allegraP || {})[id], c = (m.cremeP || {})[id];
    if (a) parts.push(shortName(mname("ah")) + " " + a);
    if (c) parts.push(shortName(mname("cr")) + " " + c);
    return `<div class="ov ${id === p ? "cur" : ""}"><b>${l}</b><span>${esc(parts.join(" · ") || "–")}</span></div>`;
  }).join("");
  const o = (m.allegraP && m.allegraP.o) || 0, oc = (m.cremeP && m.cremeP.o) || 0;
  return `<div class="seg parts">${tabs}</div>
  <button class="tog wide ${taken ? "on" : ""}" data-act="med" data-m="${SKKEY[p]}"><span>${esc(mname("sk"))}${dose ? " (" + esc(dose) + ")" : ""} ${pl.toLowerCase()}: ${taken ? "genommen ✓" : "noch nicht genommen"}</span></button>
  ${cnt("allegra", mname("ah") + " (bei Bedarf)")}
  ${cnt("creme", mname("cr"))}
  <div class="ovbox"><div class="label">Heute im Überblick</div>${ov}<div class="muted small">Gesamt: ${esc(shortName(mname("ah")))} ${m.allegra || 0} · ${esc(shortName(mname("cr")))} ${m.creme || 0}${o || oc ? ` (davon früher ohne Tageszeit: ${o} und ${oc})` : ""}</div></div>`;
}

/* ---------- Cockpit ---------- */
function viewHeute() {
  const k = ui.date, d = day(k), s = daySummary(k), m = d.meds, c = d.check;
  const kmax = S.profile.kcalMax, pt = protTarget();
  const lightTxt = { g: "Der Tag sieht gut aus", y: "In Maßen, achte auf den Rest des Tages", r: "Mehrere rote Einträge" };
  const reds = s.items.filter(i => i.r === "r"), dups = dupIds(k);
  const late = isToday() && !c && new Date().getHours() >= parseInt((S.profile.reminder || "21:00").split(":")[0], 10);
  return `${dateNav()}
  ${late ? `<div class="banner" role="alert"><strong>Abend-Check offen</strong><span>Wie war dein Tag mit der Schuppenflechte?</span><button class="btn small" data-act="abend">Jetzt eintragen</button></div>` : ""}
  <section class="card">
    <div class="row between"><h2>Essens-Ampel</h2><span class="muted">${s.items.length} Einträge</span></div>
    ${s.light ? `<div class="bigl r-${s.light}"><span class="lamp big r-${s.light}"></span><div><strong>${lightTxt[s.light]}</strong><div class="muted">${s.c.g || 0} grün · ${s.c.y || 0} gelb · ${s.c.r || 0} rot${s.unknown ? " · " + s.unknown + " ungeprüft" : ""}</div></div></div>`
      : `<p class="muted">Noch nichts eingetragen. Scanne ein Lebensmittel oder tippe, was du gegessen hast.</p>`}
    ${reds.length ? `<div class="redlist"><strong>Das könnte den Juckreiz fördern:</strong><ul>${[...new Set(reds.map(i => i.name))].map(nm => { const n = reds.filter(i => i.name === nm).length, i = reds.find(x => x.name === nm); return `<li>${esc(nm)}${n > 1 ? " (" + n + "x)" : ""}: ${esc(i.why)}${i.why.endsWith(".") ? "" : "."}${ALT[i.food || nm] ? " Besser: " + esc(ALT[i.food || nm]) + "." : ""}</li>`; }).join("")}</ul></div>` : ""}
    ${d.meals.length ? `<div class="todaylist"><div class="label">Heute eingetragen (× löscht den Eintrag)</div>${d.meals.slice().sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(ml => `<div class="meal"><div class="muted small">${esc(ml.slot)}${ml.time ? " · " + esc(ml.time) + " Uhr" : ""}</div>${ml.items.map(i => itemRow(i, { del: "itemDel", compact: true, dup: dups.has(i.id) })).join("")}</div>`).join("")}${dups.size ? `<button class="btn small ghost" data-act="dupClean">Doppelte entfernen (${dups.size})</button>` : ""}</div>` : ""}
    <div class="meter"><div class="row between"><span>Protein</span><b>${Math.round(s.prot)} / ${pt} g</b></div>${bar(s.prot, pt, "prot")}</div>
    <div class="meter"><div class="row between"><span>Kalorien (Richtwert)</span><b class="${s.kcal > kmax ? "over" : ""}">${s.kcal} / ${kmax} kcal</b></div>${bar(s.kcal, kmax, s.kcal > kmax ? "over" : "")}</div>
    <div class="actions"><button class="btn" data-act="go" data-r="scan">Scannen</button><button class="btn ghost" data-act="go" data-r="essen">Essen eintragen</button></div>
  </section>
  <section class="card">
    <h2>Juckreiz zwischendurch</h2>
    <p class="muted small">Stärke antippen, wenn es gerade juckt. Die Uhrzeit wird mitgespeichert und später mit dem Essen verglichen.</p>
    <div class="scale">${[...Array(11).keys()].map(n => `<button class="sc s${n} ${ui.epItch === n ? "on" : ""}" data-act="epSet" data-v="${n}">${n}</button>`).join("")}</div>
    <div class="label">Uhrzeit</div>${timeField("epTime", ui.epTime || nowTime())}
    <button class="btn wide" data-act="epAdd">Eintragen</button>
    ${(d.episodes || []).length ? `<div class="eps">${d.episodes.slice().sort((a, b) => a.time.localeCompare(b.time)).map(e => `<div class="item"><span class="lamp r-${e.itch >= 7 ? "r" : e.itch >= 4 ? "y" : "g"}"></span><div class="im"><strong>${esc(e.time)} Uhr: ${e.itch}/10</strong></div><button class="ic" data-act="epDel" data-id="${e.id}" aria-label="Entfernen">×</button></div>`).join("")}</div>` : ""}
  </section>
  <section class="card">
    <h2>Medikamente und Pflege</h2>
    ${medPanel(m)}
    ${ahLimit() && (m.allegra || 0) > ahLimit() ? `<p class="warn">Mehr als die eingestellte Höchstmenge von ${ahLimit()} pro Tag.</p>` : ""}
    <div class="togs one"><button class="tog ${m.enstilar ? "on" : ""}" data-act="med" data-m="enstilar"><span>${esc(mname("fo"))} angewendet</span></button></div>
    <p class="note">${esc(NOTE_BILASTIN)}</p>
  </section>
  <section class="card">
    <div class="row between"><h2>Abend-Check</h2>${c ? `<span class="pill r-g">erledigt</span>` : `<span class="pill r-u">offen</span>`}</div>
    ${c ? `<p>Juckreiz <b>${c.itch}/10</b>${c.scratchBlood ? ", blutig gekratzt" : ""}${c.regions ? ", Regionen: " + esc(Object.entries(c.regions).filter(([, v]) => v > 0).map(([id]) => REGION_LABEL[id]).slice(0, 4).join(", ") || "keine") : ""}.</p>`
      : `<p class="muted">Juckreiz, Hautzustand und Körperstellen. Dauert eine Minute.</p>`}
    <button class="btn ${c ? "ghost" : ""}" data-act="abend">${c ? "Bearbeiten" : "Abend-Check starten"}</button>
  </section>`;
}

/* ---------- Abend-Check ---------- */
function bodyMap(view, regions) {
  const f = view === "f";
  const cls = id => "z l" + (regions[id] || 0);
  const z = (id, x, y, w, h, rx = 10) => `<rect class="${cls(id)}" data-act="reg" data-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"><title>${esc(REGION_LABEL[id])}</title></rect>`;
  // Person links liegt von vorn rechts im Bild, von hinten links im Bild
  const X = (xl, w) => f ? 200 - xl - w : xl;
  const arm = (side, xl) => { // side L oder R; xl = Position für Person-links
    const sx = side === "L" ? X(xl, 20) : X(200 - xl - 20, 20);
    return [z("armO" + side, sx, 70, 20, 52, 9), z("armU" + side, sx + 2, 124, 17, 52, 8), z("hand" + side, sx, 178, 20, 26, 8)];
  };
  const leg = side => {
    const sx = side === "L" ? X(98, 30) : X(72, 30);
    return [z("beinO" + side, sx, 196, 30, 68, 13), z("kni" + side, sx + 2, 266, 26, 22, 9), z("beinU" + side, sx + 1, 290, 28, 46, 11), z("fuss" + side, sx - 1, 338, 30, 22, 9)];
  };
  const body = f
    ? [z("gesicht", 77, 8, 46, 46, 23), z("brust", 72, 70, 56, 46, 12), z("bauch", 74, 118, 52, 48, 12), z("leiste", 80, 168, 40, 26, 10)]
    : [z("kopfhaut", 77, 8, 46, 36, 18), z("nacken", 86, 46, 28, 20, 8), z("rueckenO", 72, 70, 56, 48, 12), z("rueckenU", 74, 120, 52, 44, 12), z("gesaess", 74, 166, 52, 30, 12)];
  const ell = !f ? [z("ellL", X(46, 20) + 0, 112, 20, 16, 6), z("ellR", X(134, 20), 112, 20, 16, 6)] : [];
  return `<svg viewBox="0 0 200 372" class="body" role="group" aria-label="Körper ${f ? "Vorderseite" : "Rückseite"}">${body.join("")}${arm("L", 46).join("")}${arm("R", 46).join("")}${leg("L").join("")}${leg("R").join("")}${ell.join("")}</svg>`;
}

function viewAbend() {
  const a = ui.abend; const k = ui.date;
  const scale = (key, label, lo, hi) => `<div class="field"><div class="label">${label}</div><div class="scale">${[...Array(11).keys()].map(n => `<button class="sc s${n} ${a[key] === n ? "on" : ""}" data-act="set" data-k="${key}" data-v="${n}">${n}</button>`).join("")}</div><div class="row between muted small"><span>${lo}</span><span>${hi}</span></div></div>`;
  const yn = (key, label) => `<div class="field"><div class="label">${label}</div><div class="togs two"><button class="tog ${a[key] === false ? "on" : ""}" data-act="set" data-k="${key}" data-v="false"><span>Nein</span></button><button class="tog ${a[key] === true ? "on" : ""}" data-act="set" data-k="${key}" data-v="true"><span>Ja</span></button></div></div>`;
  const gi = ["Flush (Hitzewallung)", "Durchfall", "Bauchkrämpfe/Übelkeit"];
  const sel = Object.entries(a.regions).filter(([, v]) => v > 0);
  const m = day(k).meds;
  return `<div class="topbar"><button class="ic" data-act="back" aria-label="Zurück">‹</button><h1>Abend-Check</h1><span class="muted">${esc(fmtDate(k))}</span></div>
  <section class="card">
    ${scale("itch", "Wie stark war der Juckreiz heute insgesamt?", "0 keiner", "10 unerträglich")}
    ${scale("skin", "Wie war die Haut heute (Rötung, Schuppung)?", "0 ruhig", "10 sehr aktiv")}
    ${yn("scratchBlood", "Hast du dich blutig gekratzt?")}
    ${yn("sleepBad", "Juckreiz hat den Schlaf gestört?")}
    <div class="field"><div class="label">Geraucht heute?</div><div class="togs">${[["none", "Nein"], ["cigar", "Zigarre"], ["cigarette", "Zigarette"]].map(([v, l]) => `<button class="tog ${a.smoke === v ? "on" : ""}" data-act="set" data-k="smoke" data-v="${v}"><span>${l}</span></button>`).join("")}</div></div>
    <div class="field"><div class="label">Stress heute: <b>${a.stress}</b> von 10</div><input type="range" min="0" max="10" step="1" value="${a.stress}" id="stress" data-bind="stress" aria-label="Stress"></div>
  </section>
  <section class="card">
    <h2>Wo war der Juckreiz am stärksten?</h2>
    <p class="muted small">Stelle antippen: 1 leicht, 2 mittel, 3 stark, 4x aus.</p>
    <div class="maps"><div><div class="mapl">Vorne</div>${bodyMap("f", a.regions)}</div><div><div class="mapl">Hinten</div>${bodyMap("b", a.regions)}</div></div>
    <div class="chips">${sel.length ? sel.map(([id, v]) => `<span class="chip l${v}">${esc(REGION_LABEL[id])} ${v}</span>`).join("") : `<span class="muted">Noch keine Stelle gewählt.</span>`}</div>
    <p class="muted small">Links und rechts beziehen sich auf deinen Körper.</p>
  </section>
  <section class="card">
    <h2>Wann war der Juckreiz am stärksten?</h2>
    <p class="muted small">Mehrere Tageszeiten möglich.</p>
    <div class="togs">${DAYPARTS.map(([id, l]) => `<button class="tog ${(a.peak || []).includes(id) ? "on" : ""}" data-act="peak" data-p="${id}"><span>${l}</span></button>`).join("")}</div>
  </section>
  <section class="card">
    <h2>Medikamente heute</h2>
    ${medPanel(m)}
    <div class="togs one"><button class="tog ${m.enstilar ? "on" : ""}" data-act="med" data-m="enstilar" data-keep="1"><span>${esc(mname("fo"))}</span></button></div>
    <div class="label">Nebenwirkungen der Tabletten</div>
    <div class="togs">${gi.map(g => `<button class="tog ${a.gi.includes(g) ? "on" : ""}" data-act="gi" data-g="${esc(g)}"><span>${esc(g)}</span></button>`).join("")}</div>
  </section>
  <section class="card">
    <label class="label" for="note">Notiz (Auffälligkeiten, besondere Auslöser)</label>
    <textarea id="note" rows="3" data-bind="note" placeholder="z. B. Geschäftsessen, wenig geschlafen, neue Creme">${esc(a.note)}</textarea>
  </section>
  <div class="stickybar"><button class="btn" data-act="abendSave">Speichern</button></div>`;
}
function openAbend() {
  const c = day(ui.date).check;
  ui.abend = c ? { itch: c.itch, skin: c.skin ?? 0, scratchBlood: !!c.scratchBlood, sleepBad: !!c.sleepBad, stress: c.stress ?? 0, regions: { ...(c.regions || {}) }, gi: [...(c.gi || [])], note: c.note || "", smoke: c.smoke || "none", peak: [...(c.peak || [])] }
    : { itch: null, skin: null, scratchBlood: null, sleepBad: null, stress: 0, regions: {}, gi: [], note: "", smoke: "none", peak: [] };
  location.hash = "abend";
}

/* ---------- Essen ---------- */
function itemRow(i, opts = {}) {
  return `<div class="item"><span class="lamp r-${i.r}"></span><div class="im"><strong>${esc(i.name)}</strong>${opts.dup ? " <span class=\"pill r-y\">doppelt?</span>" : ""}
  <span class="muted small">${i.g ? i.g + " " + itemUnit(i) : "Menge ?"}${i.kcal != null ? " · " + i.kcal + " kcal" : ""}${i.p ? " · " + fmtNum(i.p) + " g Protein" : ""}</span>
  ${i.why && !opts.compact ? `<span class="why">${esc(i.why)}</span>` : ""}${i.r === "r" && !opts.compact && typeof ALT !== "undefined" && ALT[i.food || i.name] ? `<span class="alt">Besser: ${esc(ALT[i.food || i.name])}</span>` : ""}</div>
  ${opts.gramField ? `<input class="gin" inputmode="numeric" aria-label="Gramm" value="${i.g ?? ""}" data-act-input="draftG" data-id="${i.id}" placeholder="g">` : ""}
  ${opts.del ? `<button class="ic" data-act="${opts.del}" data-id="${i.id}" aria-label="Entfernen">×</button>` : ""}</div>`;
}

/* Eigene Uhrzeit-Auswahl: Plus/Minus für Stunde (1) und Minute (5), "Jetzt" setzt die aktuelle Zeit */
function timeField(bind, value) {
  const [h, m] = value.split(":");
  const col = (unit, step, val, name) => `<div class="tcol"><button class="ic" data-act="tstep" data-b="${bind}" data-u="${unit}" data-d="${step}" aria-label="${name} plus">+</button><span class="tval">${val}</span><button class="ic" data-act="tstep" data-b="${bind}" data-u="${unit}" data-d="${-step}" aria-label="${name} minus">−</button></div>`;
  return `<div class="timef">${col("h", 1, h, "Stunde")}<span class="tsep">:</span>${col("m", 5, m, "Minute")}<button class="btn small ghost" data-act="tnow" data-b="${bind}">Jetzt</button></div>`;
}
function ensureMealTime() { if (!ui.slot) ui.slot = autoSlot(); if (!ui.mealTime) { ui.mealTime = defaultMealTime(ui.slot, ui.date); ui.mealTimeAuto = true; } }

/* Zeile in der Auswertung vor dem Speichern: Menge und Einheit änderbar, Lebensmittel änderbar */
function draftRow(i) {
  const food = i.food ? FOODS.find(f => f.name === i.food) : null;
  const unitSel = food ? `<select class="usel" aria-label="Einheit" data-act-change="draftU" data-id="${i.id}"><option value="p" ${i.mode !== "g" ? "selected" : ""}>${esc(food.unit)} (${food.portion} ${unitOfFood(food)})</option><option value="g" ${i.mode === "g" ? "selected" : ""}>${unitOfFood(food)}</option></select>` : `<span class="muted small">g</span>`;
  const qty = food ? (i.qty ?? 1) : (i.mode === "g" ? i.qty : (i.g ?? ""));
  const alt = i.r === "r" && typeof ALT !== "undefined" && ALT[i.food || i.name] ? `<span class="alt">Besser: ${esc(ALT[i.food || i.name])}</span>` : "";
  return `<div class="item draft"><span class="lamp r-${i.r}"></span><div class="im"><div><strong>${esc(i.name)}</strong> <button class="link" data-act="pick" data-id="${i.id}">${food ? "ändern" : "zuordnen"}</button></div>
    <span class="muted small">${i.g ? i.g + " " + itemUnit(i) : "Menge ?"}${i.kcal != null ? " · " + i.kcal + " kcal" : ""}${i.p ? " · " + fmtNum(i.p) + " g Protein" : ""}</span>
    <span class="why">${esc(i.why)}</span>${alt}
    <div class="qrow"><input class="gin" inputmode="decimal" aria-label="Menge" value="${qty ?? ""}" data-act-input="draftQ" data-id="${i.id}">${unitSel}</div></div>
    <button class="ic" data-act="draftDel" data-id="${i.id}" aria-label="Entfernen">×</button></div>`;
}
function pickList() {
  let q = normTxt(ui.pick.q || "");
  const find = x => FOODS.filter(f => !x || f.nsyn.some(s => s.includes(x)) || normTxt(f.name).includes(x));
  let rows = find(q);
  while (!rows.length && q.length > 4) { q = q.slice(0, -1); rows = find(q); }   // z. B. "kartoffelgratin" findet "kartoffel"
  rows = rows.slice(0, 15);
  if (!rows.length) return `<p class="muted">Kein Treffer. Mit "Neues Lebensmittel anlegen" kannst du es selbst erfassen.</p>`;
  return rows.map(f => `<button class="hist" data-act="pickSet" data-n="${esc(f.name)}">${dot(f.r)}<span class="im"><strong>${esc(f.name)}</strong><span class="muted small">${f.kcal} kcal pro 100 ${unitOfFood(f)}, ${esc(f.unit)} = ${f.portion} ${unitOfFood(f)}</span></span></button>`).join("");
}
function pickBox() {
  const it = ui.draft && ui.draft.find(i => i.id === ui.pick.id);
  if (!it) return "";
  if (ui.pick.creating) {
    return `<section class="card" id="pickbox"><h2>Neues Lebensmittel</h2>
    <label class="label" for="nfName">Name</label><input id="nfName" value="${esc(ui.pick.name || "")}">
    <label class="label" for="nfR">Bewertung</label><select id="nfR"><option value="g">Passt (grün)</option><option value="y" selected>In Maßen (gelb)</option><option value="r">Meiden (rot)</option></select>
    <div class="grid2"><div><label class="label" for="nfUnit">Einheit</label><select id="nfUnit">${["Portion", "Teller", "Stück", "Scheibe", "Glas", "Tasse", "Schüssel"].map(x => `<option>${x}</option>`).join("")}</select></div>
    <div><label class="label" for="nfPortion">Gewicht einer Einheit (g)</label><input id="nfPortion" inputmode="decimal" value="300"></div>
    <div><label class="label" for="nfKcal">kcal pro Einheit</label><input id="nfKcal" inputmode="decimal"></div>
    <div><label class="label" for="nfProt">Protein pro Einheit (g)</label><input id="nfProt" inputmode="decimal"></div></div>
    <p class="muted small">Schätzwerte reichen. Das Lebensmittel wird gemerkt und beim nächsten Mal automatisch erkannt.</p>
    <div class="actions"><button class="btn" data-act="nfSave">Speichern</button><button class="btn ghost" data-act="pickClose">Abbrechen</button></div></section>`;
  }
  return `<section class="card" id="pickbox"><h2>Lebensmittel wählen</h2><p class="muted small">Für "${esc(it.text)}". Die Auswahl wird gemerkt.</p>
    <input id="pickq" type="search" placeholder="Suchen, z. B. Gulaschsuppe" value="${esc(ui.pick.q)}" data-bind="pickq" autocomplete="off">
    <div id="picklist">${pickList()}</div>
    <div class="actions"><button class="btn small ghost" data-act="newFood">Neues Lebensmittel anlegen</button><button class="btn small ghost" data-act="pickClose">Abbrechen</button></div></section>`;
}

function viewEssen() {
  const k = ui.date, d = day(k), s = daySummary(k);
  ensureMealTime();
  const draft = ui.draft;
  return `${dateNav()}
  <section class="card">
    <h2>Was hast du gegessen oder getrunken?</h2>
    <div class="togs four">${SLOTS.map(sl => `<button class="tog ${ui.slot === sl ? "on" : ""}" data-act="slot" data-s="${sl}"><span>${sl}</span></button>`).join("")}</div>
    <div class="label">Uhrzeit</div>${timeField("mealTime", ui.mealTime)}
    <label class="label" for="mealText">Was und wie viel? Mit Komma getrennt</label>
    <textarea id="mealText" rows="3" data-bind="mealText" placeholder="z. B. 3 Roggenbrötchen, 2 Teller Gulaschsuppe, 200 g Skyr">${esc(ui.draftText)}</textarea>
    <p class="muted small">Die Menge schreibst du einfach davor: "3 Roggenbrötchen", "2 Teller Gulaschsuppe", "200 g Skyr", "1 Glas Milch", "halber Teller Chili", "große Portion Reis". Nach "Auswerten" kannst du Menge und Einheit in jeder Zeile noch ändern.</p>
    <div class="actions"><button class="btn" data-act="parse">Auswerten</button>${draft ? `<button class="btn ghost" data-act="draftClear">Verwerfen</button>` : ""}</div>
  </section>
  ${ui.pick ? pickBox() : ""}
  ${draft ? `<section class="card"><h2>Auswertung</h2>
    ${draft.map(draftRow).join("")}
    ${draft.some(i => i.src === "unknown") ? `<div class="note"><strong>Nicht erkannt:</strong> ${esc(draft.filter(i => i.src === "unknown").map(i => i.name).join(", "))}. Tippe bei dem Eintrag auf "zuordnen", sonst wird er als unklar gespeichert. <button class="link" data-act="askClaude">Für Claude kopieren</button></div>` : ""}
    <p class="muted small">Mengen sind Schätzwerte. Menge und Einheit (z. B. Teller, Stück) lassen sich ändern, über "ändern" wählst du ein anderes Lebensmittel. Bewertung: ${draft.filter(i => i.r === "r").length} rot, ${draft.filter(i => i.r === "y").length} gelb, ${draft.filter(i => i.r === "g").length} grün.</p>
    ${draft.some(i => (i.tags || []).includes("juice")) ? `<p class="warn">${esc(NOTE_BILASTIN)}</p>` : ""}
    <button class="btn" data-act="draftSave">Zum Tagebuch hinzufügen</button></section>` : ""}
  <section class="card">
    <div class="row between"><h2>Tagebuch</h2><span class="muted">${s.kcal} kcal · ${Math.round(s.prot)} g Protein</span></div>
    ${d.meals.length ? d.meals.slice().sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(ml => `<div class="meal"><div class="row between"><strong>${esc(ml.slot)}${ml.time ? ` <span class="muted">${esc(ml.time)} Uhr</span>` : ""}</strong><button class="link" data-act="mealDel" data-id="${ml.id}">Löschen</button></div>${ml.items.map(i => itemRow(i, { del: "itemDel", dup: dupIds(k).has(i.id) })).join("")}</div>`).join("")
      : `<p class="muted">Für diesen Tag ist noch nichts eingetragen.</p>`}
    ${dupIds(k).size ? `<button class="btn small ghost" data-act="dupClean">Doppelte entfernen (${dupIds(k).size})</button>` : ""}
  </section>`;
}

function parseDraft() {
  const t = ui.draftText.trim();
  if (!t) { toast("Bitte erst etwas eintragen"); return; }
  ui.draft = parseMeal(t);
  render();
}
function saveDraft() {
  if (!ui.draft || !ui.draft.length) return;
  addToMeal(ui.date, ui.slot || autoSlot(), ui.mealTime || defaultMealTime(ui.slot, ui.date), ui.draft);
  ui.draft = null; ui.draftText = ""; ui.mealTime = null; save(); toast("Gespeichert"); render();
}

/* ---------- Scanner ---------- */
let camStream = null, scanTimer = null, detector = null;
function stopScan() { ui.scanning = false; clearTimeout(scanTimer); if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; } }

async function startScan() {
  ui.scanErr = ""; ui.scanProduct = null; ui.scanManual = false;
  if (!("BarcodeDetector" in window)) { ui.scanErr = "Dieser Browser hat keinen Barcode-Scanner. In Chrome auf Android funktioniert er. Alternativ die Zahl unter dem Strichcode eintippen."; render(); return; }
  try {
    const fm = await BarcodeDetector.getSupportedFormats();
    detector = new BarcodeDetector({ formats: fm.filter(f => ["ean_13", "ean_8", "upc_a", "upc_e"].includes(f)) });
  } catch (e) { detector = new BarcodeDetector(); }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) { ui.scanErr = "Kein Kamerazugriff. In den Browser-Einstellungen die Kamera für diese Seite erlauben oder die Nummer eintippen."; render(); return; }
  ui.scanning = true; render();
  const v = $("#cam"); v.srcObject = camStream; try { await v.play(); } catch (e) { /* weiter */ }
  const tick = async () => {
    if (!ui.scanning) return;
    try { const codes = await detector.detect(v); for (const c of codes) if (validEAN(c.rawValue)) { if (navigator.vibrate) navigator.vibrate(60); onCode(c.rawValue); return; } } catch (e) { /* Frame noch nicht bereit */ }
    scanTimer = setTimeout(tick, 160);
  };
  tick();
}


function qtyInfo(sp) {
  const g = spGrams(sp), it = productToItem(sp.p, sp.ev, g);
  return Math.round(g) + (sp.p.cats.includes("en:beverages") || sp.p.cats.includes("en:waters") ? " ml" : " g") + " insgesamt" + (it.kcal != null ? ", " + it.kcal + " kcal, " + fmtNum(it.p) + " g Protein" : ", keine kcal-Angabe vorhanden");
}
function altInner(sp) {
  const a = sp.alt, ideas = localIdeas(sp.p, sp.ev);
  const head = "<h2>Besser wählen</h2>" + (ideas ? `<p class="note"><strong>Ideen:</strong> ${esc(ideas)}</p>` : "");
  if (!a) return head + `<p class="muted small">Ähnliche Produkte aus derselben Kategorie, die besser abschneiden, lassen sich bei Open Food Facts suchen. Das dauert bis zu 30 Sekunden.</p><button class="btn small" data-act="altLoad">Passende Produkte suchen</button>`;
  if (a.loading) return head + `<div class="busy"><span class="spin"></span> Suche in der Kategorie…</div>`;
  if (a.err) return head + `<p class="muted">Die Produktsuche hat gerade nicht geklappt, Open Food Facts begrenzt Anfragen. Die Ideen oben gelten trotzdem.</p><button class="btn small" data-act="altLoad">In einer Minute erneut versuchen</button>`;
  if (a.note) return head + `<p class="muted">${esc(a.note)}</p>`;
  if (!a.items.length) return head + `<p class="muted">In der Kategorie "${esc(a.tag)}" habe ich kein besseres Produkt gefunden.</p>`;
  return head + `<p class="muted small">Kategorie: ${esc(a.tag)}, nach Beliebtheit sortiert. Antippen öffnet das Produkt.</p>` + a.items.map(x => `<button class="hist" data-act="hist" data-c="${esc(x.code)}">${dot(x.r)}<span class="im"><strong>${esc((x.brand ? x.brand + " " : "") + x.name)}</strong><span class="muted small">${[x.sugar != null ? "Zucker " + fmtNum(x.sugar) + " g" : "", x.sat != null ? "ges. Fett " + fmtNum(x.sat) + " g" : "", x.prot != null ? "Protein " + fmtNum(x.prot) + " g" : ""].filter(Boolean).join(" · ")} pro 100 g</span></span></button>`).join("");
}
function refreshAlt() { const sp = ui.scanProduct, el = $("#altbox"); if (sp && el) el.innerHTML = altInner(sp); }
async function loadAlt() {
  const sp = ui.scanProduct; if (!sp || !sp.ev) return;
  sp.alt = { loading: true }; refreshAlt();
  try { const r = await findAlternatives(sp.p, sp.ev, () => ui.scanProduct !== sp); if (ui.scanProduct === sp) sp.alt = r; }
  catch (e) { if (ui.scanProduct === sp) sp.alt = { err: true }; }
  refreshAlt();
}

async function onCode(code) {
  stopScan(); ui.scanBusy = true; ui.scanErr = ""; ui.lastCode = code; ui.scanProduct = null; render();
  try {
    const p = await lookupOFF(code);
    if (p.notFound) { ui.scanProduct = { p, ev: null }; ui.scanErr = ""; }
    else { ui.scanProduct = { p, ev: evalProduct(p), ...initScanQty(p) }; S.scanHistory = [{ code, name: p.name, brand: p.brand, r: ui.scanProduct.ev.r }, ...S.scanHistory.filter(h => h.code !== code)].slice(0, 12); save(); }
  } catch (e) { ui.scanErr = "Open Food Facts hat nicht geantwortet (" + (e.message || "Fehler") + "). Der Dienst begrenzt Anfragen, bitte erneut versuchen."; }
  ui.scanBusy = false; render();
}

function manualProduct(form) {
  const num = id => { const v = parseFloat(($(id, form).value || "").replace(",", ".")); return isNaN(v) ? null : v; };
  const bev = $("#mBev", form).checked, alc = $("#mAlc", form).checked;
  const p = { code: ui.scanProduct?.p?.code || "manuell", name: $("#mName", form).value.trim() || "Eigenes Produkt", brand: "", qty: "", serving: null, kcal: num("#mKcal"), sugar: num("#mSugar"), sat: num("#mSat"), prot: num("#mProt"), fiber: num("#mFiber"), fat: null, salt: null, nova: parseInt($("#mNova", form).value, 10) || null, cats: bev ? ["en:beverages"] : [], allergens: [], ing: "", alcohol: alc ? 5 : 0, img: "", manual: true };
  ui.scanProduct = { p, ev: evalProduct(p), ...initScanQty(p) }; ui.scanManual = false; render();
}

function viewScan() {
  ensureMealTime();
  const sp = ui.scanProduct;
  let main = "";
  if (ui.scanning) {
    main = `<div class="camwrap"><video id="cam" playsinline muted></video><div class="frame"></div></div><p class="muted center">Strichcode ins Rechteck halten. Es erkennt automatisch.</p><button class="btn ghost" data-act="scanStop">Abbrechen</button>`;
  } else if (ui.scanBusy) {
    main = `<div class="busy"><span class="spin"></span> Produkt wird gesucht…</div>`;
  } else if (sp && sp.p.notFound && !ui.scanManual) {
    main = `<section class="card"><h2>Nicht in Open Food Facts</h2><p>Zum Code ${esc(sp.p.code)} gibt es keinen Eintrag. Du kannst die Werte vom Etikett abtippen und trotzdem bewerten.</p><div class="actions"><button class="btn" data-act="manualOpen">Werte eintragen</button><button class="btn ghost" data-act="scanReset">Anderes Produkt</button></div></section>`;
  } else if (ui.scanManual) {
    main = `<form class="card" id="mform"><h2>Werte pro 100 g oder 100 ml</h2>
      <label class="label" for="mName">Name</label><input id="mName" type="text" placeholder="Produktname">
      <div class="grid2">
      <div><label class="label" for="mKcal">kcal</label><input id="mKcal" inputmode="decimal"></div>
      <div><label class="label" for="mSugar">Zucker g</label><input id="mSugar" inputmode="decimal"></div>
      <div><label class="label" for="mSat">Ges. Fett g</label><input id="mSat" inputmode="decimal"></div>
      <div><label class="label" for="mProt">Protein g</label><input id="mProt" inputmode="decimal"></div>
      <div><label class="label" for="mFiber">Ballaststoffe g</label><input id="mFiber" inputmode="decimal"></div>
      <div><label class="label" for="mNova">Verarbeitung</label><select id="mNova"><option value="">weiß ich nicht</option><option value="1">kaum (NOVA 1)</option><option value="3">verarbeitet (3)</option><option value="4">ultra-verarbeitet (4)</option></select></div></div>
      <label class="check"><input type="checkbox" id="mBev"> Ist ein Getränk</label>
      <label class="check"><input type="checkbox" id="mAlc"> Enthält Alkohol</label>
      <div class="actions"><button class="btn" type="submit">Bewerten</button><button class="btn ghost" type="button" data-act="scanReset">Abbrechen</button></div></form>`;
  } else if (sp && sp.ev) {
    const { p, ev } = sp;
        const chip = (l, v, u) => v == null ? "" : `<span class="chip">${l} ${fmtNum(v)}${u || ""}</span>`;
    main = `<section class="card result r-${ev.r}">
      <div class="prodhead">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ""}<div><h2>${esc(p.name)}</h2><span class="muted">${esc(p.brand)} ${esc(p.qty)}</span></div></div>
      <div class="bigl r-${ev.r}"><span class="lamp big r-${ev.r}"></span><div><strong>${ev.r === "g" ? "Grün: passt" : ev.r === "y" ? "Gelb: in Maßen" : ev.r === "r" ? "Rot: besser meiden" : "Unklar: Daten fehlen"}</strong><div class="muted">pro 100 g bzw. 100 ml</div></div></div>
      <ul class="reasons">${ev.reasons.map(x => `<li class="${x.k}">${esc(x.t)}</li>`).join("")}</ul>
      <div class="chips">${chip("kcal", p.kcal)}${chip("Zucker", p.sugar, " g")}${chip("ges. Fett", p.sat, " g")}${chip("Protein", p.prot, " g")}${chip("Ballast.", p.fiber, " g")}${p.nova ? `<span class="chip">NOVA ${p.nova}</span>` : ""}</div>
      ${ev.notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}
    </section>
    ${(ev.r === "r" || ev.r === "y") && !p.manual && p.cats.length ? `<section class="card" id="altbox">${altInner(sp)}</section>` : ""}
    <section class="card"><h2>Zum Tagebuch</h2>
      <div class="qtyrow"><div><label class="label" for="sq">Menge</label><input id="sq" inputmode="decimal" value="${sp.amount}" data-bind="scanAmt"></div>
      <div><label class="label" for="su">Einheit</label><select id="su" data-bind="scanUnit">${unitOptions(p).map(o => `<option value="${o.id}" ${sp.unit === o.id ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></div></div>
      ${sp.unit === "custom" ? `<label class="label" for="se">Gewicht pro Stück in g</label><input id="se" inputmode="decimal" value="${sp.each}" data-bind="scanEach">` : ""}
      <label class="label" for="ss">Mahlzeit</label><select id="ss" data-bind="slot">${SLOTS.map(sl => `<option ${(ui.slot || autoSlot()) === sl ? "selected" : ""}>${sl}</option>`).join("")}</select>
      <div class="label">Uhrzeit</div>${timeField("mealTime", ui.mealTime)}
      <p class="muted small" id="scanKcal">${qtyInfo(sp)}</p>
      <div class="actions"><button class="btn" data-act="scanAdd">Zum Tagebuch hinzufügen</button><button class="btn ghost" data-act="scanReset">Schließen ohne Speichern</button></div>
      <button class="link danger" data-act="histDel" data-c="${esc(p.code)}">Aus "Zuletzt geprüft" entfernen</button>
    </section>`;
  } else {
    main = `<section class="card center"><h2>Lebensmittel prüfen</h2><p class="muted">Strichcode scannen und sofort sehen, ob es grün, gelb oder rot ist.</p><button class="btn big" data-act="scanStart">Kamera starten</button>
      ${ui.scanErr ? `<p class="warn">${esc(ui.scanErr)}</p>${ui.lastCode ? `<button class="btn small" data-act="hist" data-c="${esc(ui.lastCode)}">Erneut versuchen</button>` : ""}` : ""}</section>`;
  }
  const la = ui.lastAdd && !ui.scanning && !sp && !ui.scanBusy ? (S.days[ui.lastAdd.k] || { meals: [] }).meals.find(m => m.id === ui.lastAdd.mealId) : null;
  const done = la ? `<section class="card done"><h2>Zur Mahlzeit hinzugefügt</h2><p class="muted small">${esc(la.slot)}${la.time ? ", " + esc(la.time) + " Uhr" : ""}. Weitere Lebensmittel scannen oder die Nummer eintippen: Sie kommen zur selben Mahlzeit, solange Mahlzeit und Uhrzeit passen.</p>${la.items.map(i => itemRow(i, { del: "itemDel" })).join("")}</section>` : "";
  const manual = !ui.scanning ? `<section class="card"><label class="label" for="ean">Nummer unter dem Strichcode</label><div class="inl"><input id="ean" inputmode="numeric" maxlength="14" placeholder="z. B. 4056489012345" value="${esc(ui.eanText)}" data-bind="ean"><button class="btn small" data-act="eanGo">Suchen</button></div></section>` : "";
  const hist = (!ui.scanning && !sp && S.scanHistory.length) ? `<section class="card"><h2>Zuletzt geprüft</h2>${S.scanHistory.map(h => `<div class="histrow"><button class="hist" data-act="hist" data-c="${esc(h.code)}">${dot(h.r)}<span>${esc((h.brand ? h.brand + " " : "") + h.name)}</span></button><button class="ic" data-act="histDel" data-c="${esc(h.code)}" aria-label="Entfernen">×</button></div>`).join("")}<button class="link danger" data-act="histClear">Liste leeren</button></section>` : "";
  return `<div class="topbar"><h1>Scanner</h1></div>${ui.scanErr && sp ? `<p class="warn">${esc(ui.scanErr)}</p>` : ""}${done}${main}${manual}${hist}`;
}
