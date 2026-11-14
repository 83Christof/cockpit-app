"use strict";
/* Haut-Cockpit Oberfläche, Teil 2: Rezepte, Verlauf, Arztbericht, Einstellungen, Router, Ereignisse */

/* ---------- Rezepte ---------- */
function viewRezeptList() {
  const f = ui.recipeFilter;
  const filters = [["alle", "Alle"], ["unterwegs", "Supermarkt"], ["vorbereiten", "Vorbereiten"], ["warm", "Zuhause"], ["restaurant", "Restaurant und Hotel"], ["besteck", "Ohne Besteck"], ["biz", "Geschäftlich"]];
  const list = RECIPES.filter(r => f === "alle" || (f === "besteck" ? r.tags.includes("ohne Besteck") : f === "biz" ? (r.kind === "unterwegs" || r.kind === "restaurant" || r.tags.includes("Geschäftlich")) : r.kind === f));
  return `<div class="chips scrollx">${filters.map(([id, l]) => `<button class="chip btnchip ${f === id ? "on" : ""}" data-act="rf" data-f="${id}">${l}</button>`).join("")}</div>
  <p class="muted small">Alle Angaben sind Näherungswerte pro Portion. Tabletten, die zur Mahlzeit gehören, nicht auf nüchternen Magen nehmen.</p>
  ${list.map(r => `<details class="card recipe"><summary><span class="lamp r-${r.r}"></span><div class="rs"><strong>${esc(r.title)}</strong><span class="muted small">${esc(r.when)} · ca. ${r.k} kcal · ${r.p} g Protein</span></div></summary>
    <div class="chips">${r.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    <h3>Zutaten</h3><ul>${r.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
    <h3>So geht es</h3><ol>${r.steps.map(i => `<li>${esc(i)}</li>`).join("")}</ol>
    <p class="note">${esc(r.note)}</p>
    <button class="btn small" data-act="recAdd" data-id="${r.id}">Heute gegessen</button></details>`).join("")}`;
}
function addRecipe(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return;
  const tags = []; if (/lachs|thunfisch/i.test(r.title + r.items.join(" "))) tags.push("fish"); tags.push("veg");
  day(ui.date).meals.push({ id: uid(), slot: ui.slot || autoSlot(), time: defaultMealTime(ui.slot || autoSlot(), ui.date), t: Date.now(), items: [{ id: uid(), name: r.title, text: "Rezept", g: null, kcal: r.k, p: r.p, r: r.r, tags, why: "Rezept aus der App", src: "recipe" }] });
  save(); toast("Zum Tagebuch hinzugefügt");
}

/* ---------- Verlauf ---------- */
function viewVerlauf() {
  const tabs = [["auswertung", "Auswertung"], ["bericht", "Arztbericht"], ["einstellungen", "Einstellungen"]];
  const t = ui.verlaufTab;
  return `<div class="topbar"><h1>Verlauf</h1></div>
  <div class="seg">${tabs.map(([id, l]) => `<button class="${t === id ? "on" : ""}" data-act="vt" data-t="${id}">${l}</button>`).join("")}</div>
  ${t === "auswertung" ? viewAuswertung() : t === "bericht" ? viewBericht() : viewEinstellungen()}`;
}

function statTiles(st) {
  const tile = (l, v, sub) => `<div class="tile"><span class="muted small">${l}</span><b>${v}</b>${sub ? `<span class="muted small">${sub}</span>` : ""}</div>`;
  return `<div class="tiles">
    ${tile("Juckreiz Ø", st.itchAvg != null ? fmtNum(st.itchAvg) + "/10" : "–", st.checkedN + " von " + st.n + " Tagen")}
    ${tile("Tage ≥ 7", st.itchHigh, "starker Juckreiz")}
    ${tile("Blutig gekratzt", st.bloody, "Tage")}
    ${tile("Alkohol", st.alcDays, "Tage")}
    ${tile("Rote Tage", st.redDays, "mind. 1 roter Eintrag")}
    ${tile("Protein Ø", st.protAvg != null ? Math.round(st.protAvg) + " g" : "–", "Ziel " + protTarget() + " g")}
  </div>`;
}

function corrTable(lag, limit) {
  const rows = (lag === "h" ? episodeCorrelations() : correlations().filter(c => c.lag === lag)).slice(0, limit);
  if (!rows.length) return `<p class="muted">Noch zu wenige Daten. Pro Merkmal braucht es mindestens 3 Tage mit und 3 Tage ohne Eintrag.</p>`;
  return `<div class="tablewrap"><table class="tbl"><thead><tr><th>Merkmal</th><th>Mit</th><th>Ohne</th><th>Diff.</th><th>Tage</th></tr></thead><tbody>${rows.map(c => `<tr class="${c.verdict.includes("höher") ? "bad" : c.verdict.includes("niedriger") ? "good" : ""}"><td>${esc(c.label)}${c.ev ? ` <span class="ev">${c.ev}</span>` : ""}<div class="muted small">${esc(c.verdict)}</div></td><td>${fmtNum(c.mExp)}</td><td>${fmtNum(c.mUn)}</td><td>${c.diff > 0 ? "+" : ""}${fmtNum(c.diff)}</td><td>${c.nExp}/${c.nUn}</td></tr>`).join("")}</tbody></table></div>`;
}

function daypartTable(st) {
  const rows = daypartStats(st.from, st.to);
  if (!rows.some(r => r.peak || r.n)) return `<p class="muted">Noch keine Uhrzeiten erfasst. Trag Juckreiz zwischendurch im Cockpit ein und wähle im Abend-Check die Tageszeit der Spitze.</p>`;
  return `<div class="tablewrap"><table class="tbl"><thead><tr><th>Tageszeit</th><th>Als Spitze genannt</th><th>Einträge zwischendurch</th><th>Ø Stärke</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.peak}</td><td>${r.n}</td><td>${r.avg != null ? fmtNum(r.avg) : "–"}</td></tr>`).join("")}</tbody></table></div>`;
}

function epRegTable(st) {
  const rows = episodeRegionStats(st.from, st.to).slice(0, 10);
  if (!rows.length) return `<p class="muted">Noch keine Körperstellen bei "Juckreiz zwischendurch" gewählt.</p>`;
  return `<div class="tablewrap"><table class="tbl"><thead><tr><th>Stelle</th><th>Einträge</th><th>Ø Stärke</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.n}</td><td>${fmtNum(r.avg)}</td></tr>`).join("")}</tbody></table></div>`;
}

function viewAuswertung() {
  const p = ui.period, st = periodStats(p), recs = recommendations();
  const regs = regionStats(st.from, st.to).slice(0, 8);
  return `<div class="seg small">${[14, 30, 90].map(n => `<button class="${p === n ? "on" : ""}" data-act="period" data-n="${n}">${n} Tage</button>`).join("")}</div>
  <section class="card"><h2>Juckreiz-Verlauf</h2>${itchChart(st.keys.length ? (() => { const a = []; for (let i = p - 1; i >= 0; i--) a.push(addDays(dkey(), -i)); return a; })() : [])}</section>
  <section class="card">${statTiles(st)}</section>
  <section class="card"><h2>Empfehlungen</h2>${recs.map(r => `<div class="rec ${r.k}">${esc(r.t)}</div>`).join("")}
    <p class="muted small">Automatische Auswertung deiner Eintragungen, keine ärztliche Beratung. Korrelation ist nicht Ursache. Therapie nie ohne Hautarzt ändern.</p></section>
  <section class="card"><div class="row between"><h2>Zusammenhänge</h2><div class="seg small"><button class="${ui.corrLag === 1 ? "on" : ""}" data-act="lag" data-l="1">Folgetag</button><button class="${ui.corrLag === 0 ? "on" : ""}" data-act="lag" data-l="0">Gleicher Abend</button><button class="${ui.corrLag === "h" ? "on" : ""}" data-act="lag" data-l="h">1-4 h nach Essen</button></div></div>
    <p class="muted small">Mittlerer Juckreiz an Tagen mit dem Merkmal (Mit) gegenüber Tagen ohne (Ohne). Buchstaben zeigen die Studienlage (A stark, D nur Umfragen).</p>
    ${corrTable(ui.corrLag, 10)}</section>
  <section class="card"><h2>Tageszeit</h2>${daypartTable(st)}</section>
  <section class="card"><h2>Betroffene Stellen</h2>${regs.length ? `<div class="tablewrap"><table class="tbl"><thead><tr><th>Stelle</th><th>Tage</th><th>Ø Stufe</th></tr></thead><tbody>${regs.map(r => `<tr><td>${esc(r.label)}</td><td>${r.days}</td><td>${fmtNum(r.avg)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Noch keine Stellen erfasst.</p>`}</section>
  <section class="card"><h2>Juckreiz zwischendurch nach Körperstelle</h2>${epRegTable(st)}</section>
  <section class="card"><h2>Für Claude</h2><p class="muted small">Kopiert deine Daten der letzten 30 Tage als Text. Im Chat einfügen, dann erstelle ich eine ausführliche Auswertung.</p><button class="btn" data-act="copyClaude">Daten für Claude kopieren</button></section>`;
}

function viewBericht() {
  const p = ui.period, st = periodStats(p), regs = regionStats(st.from, st.to).slice(0, 10), recs = recommendations();
  const keys = []; for (let i = p - 1; i >= 0; i--) keys.push(addDays(dkey(), -i));
  const rowsD = keys.filter(k => S.days[k] && (S.days[k].check || S.days[k].meals.length)).reverse();
  const pr = S.profile;
  return `<div class="seg small noprint">${[14, 30, 90].map(n => `<button class="${p === n ? "on" : ""}" data-act="period" data-n="${n}">${n} Tage</button>`).join("")}</div>
  <section class="card report">
    <h2>Verlaufsbericht Psoriasis</h2>
    <p class="muted">Zeitraum ${esc(fmtDate(st.from))} bis ${esc(fmtDate(st.to))} (${p} Tage), erstellt am ${new Date().toLocaleDateString("de-DE")}</p>
    <p class="small">${pr.therapy ? "Therapie: " + esc(pr.therapy) + "." : ""}${pr.weight ? " Gewicht " + pr.weight + " kg" : ""}${pr.height ? ", Größe " + pr.height + " cm" : ""}.</p>
    <h3>Kennzahlen</h3>${statTiles(st)}
    <table class="tbl"><tbody>
      <tr><td>${esc(mname("sk"))} vollständig (3 Dosen)</td><td>${st.skFull} von ${st.skDays} dokumentierten Tagen</td></tr>
      <tr><td>${esc(mname("ah"))}</td><td>${st.allegraDays} Tage, ${st.allegraTotal} Tabletten</td></tr>
      <tr><td>Eincremen Ø pro Tag</td><td>${st.cremeAvg != null ? fmtNum(st.cremeAvg) : "–"}</td></tr>
      <tr><td>${esc(mname("fo"))}</td><td>${st.enstilarDays} Tage</td></tr>
      <tr><td>Kalorien Ø (Ziel max. ${pr.kcalMax})</td><td>${st.kcalAvg != null ? Math.round(st.kcalAvg) : "–"} kcal, Überschreitung an ${st.kcalOver} Tagen</td></tr>
    </tbody></table>
    <h3>Verlauf Juckreiz</h3>${itchChart(keys)}
    <h3>Betroffene Stellen</h3>${regs.length ? `<table class="tbl"><thead><tr><th>Stelle</th><th>Tage</th><th>Ø Stufe (1-3)</th></tr></thead><tbody>${regs.map(r => `<tr><td>${esc(r.label)}</td><td>${r.days}</td><td>${fmtNum(r.avg)}</td></tr>`).join("")}</tbody></table>` : `<p>Keine Angaben.</p>`}
    <h3>Juckreiz zwischendurch nach Körperstelle</h3>${epRegTable(st)}
    <h3>Tageszeit des Juckreizes</h3>${daypartTable(st)}
    <h3>Auffälligkeiten (Hinweise, keine Beweise)</h3>${recs.map(r => `<p class="small">• ${esc(r.t)}</p>`).join("")}
    <h3>Tagesliste</h3>
    <div class="tablewrap"><table class="tbl tiny"><thead><tr><th>Tag</th><th>Juck</th><th>Blut</th><th>Stress</th><th>Stellen</th><th>Med</th><th>Rot/Gelb</th></tr></thead><tbody>${rowsD.map(k => { const d = S.days[k], c = d.check || {}, m = d.meds || {}, s = daySummary(k); const reg = c.regions ? Object.entries(c.regions).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => REGION_LABEL[id]).join(", ") : ""; return `<tr><td>${esc(fmtDate(k))}</td><td>${c.itch ?? "–"}</td><td>${c.scratchBlood ? "ja" : ""}</td><td>${c.stress ?? ""}</td><td>${esc(reg)}</td><td>${m.skM ? "M" : "-"}${m.skN ? "N" : "-"}${m.skE ? "A" : "-"} ${m.allegra ? "Al" + m.allegra : ""}</td><td>${s.c.r || 0}/${s.c.y || 0}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="muted small">Selbst dokumentiert mit Haut-Cockpit. Essensbewertung beruht auf Näherungswerten und Studienlage, keine Diagnose.</p>
  </section>
  <div class="actions noprint"><button class="btn" data-act="print">Drucken oder als PDF</button><button class="btn ghost" data-act="csv">CSV (Excel)</button></div>`;
}

/* ---------- Einstellungen ---------- */
function viewEinstellungen() {
  const pr = S.profile;
  const inst = window.deferredInstall ? `<button class="btn" data-act="install">App installieren</button>` : `<p class="muted small">Installieren: Chrome-Menü (drei Punkte) und "App installieren" oder "Zum Startbildschirm hinzufügen".</p>`;
  return `<section class="card"><h2>Profil und Ziele</h2>
    <div class="grid2">
      <div><label class="label" for="pw">Gewicht (kg)</label><input id="pw" inputmode="decimal" value="${pr.weight ?? ""}" data-bind="pweight"></div>
      <div><label class="label" for="ph">Größe (cm)</label><input id="ph" inputmode="numeric" value="${pr.height ?? ""}" data-bind="pheight"></div>
      <div><label class="label" for="pk">Kalorien max./Tag</label><input id="pk" inputmode="numeric" value="${pr.kcalMax}" data-bind="pkcal"></div>
      <div><label class="label" for="pp">Protein Ziel (g)</label><input id="pp" inputmode="numeric" value="${pr.protMin ?? ""}" placeholder="${protTarget()}" data-bind="pprot"></div>
    </div>
    <p class="muted small">Leer lassen: Protein-Ziel = Gewicht × ${pr.protPerKg} g. Bei Gewichtsabnahme sind 1,2 bis 1,6 g pro kg üblich. Bitte mit Arzt oder Ernährungsberatung abstimmen.</p></section>
  <section class="card"><h2>Meine Medikamente</h2>
    <p class="muted small">Trag hier deine Bezeichnungen ein. Sie bleiben nur auf diesem Handy und erscheinen im Cockpit und im Arztbericht.</p>
    <label class="label" for="pm_sk">Tabletten zur Mahlzeit (Name und Dosis)</label><input id="pm_sk" value="${esc(medCfg().sk)}" data-bind="pm_sk">
    <div class="grid3"><div><label class="label" for="pm_d0">Morgens</label><input id="pm_d0" value="${esc(medCfg().skD[0])}" data-bind="pm_d0" placeholder="Anzahl"></div><div><label class="label" for="pm_d1">Mittags</label><input id="pm_d1" value="${esc(medCfg().skD[1])}" data-bind="pm_d1" placeholder="Anzahl"></div><div><label class="label" for="pm_d2">Abends</label><input id="pm_d2" value="${esc(medCfg().skD[2])}" data-bind="pm_d2" placeholder="Anzahl"></div></div>
    <label class="label" for="pm_ah">Antihistaminikum bei Bedarf (Name und Dosis)</label><input id="pm_ah" value="${esc(medCfg().ah)}" data-bind="pm_ah" placeholder="z. B. Allegra 20 mg">
    <label class="label" for="pm_ahmax">Höchstmenge pro Tag (Warnung, optional)</label><input id="pm_ahmax" inputmode="numeric" value="${medCfg().ahMax ?? ""}" data-bind="pm_ahmax">
    <label class="label" for="pm_cr">Pflegecreme</label><input id="pm_cr" value="${esc(medCfg().cr)}" data-bind="pm_cr">
    <label class="label" for="pm_fo">Schaum oder Lösung (zusätzlich)</label><input id="pm_fo" value="${esc(medCfg().fo)}" data-bind="pm_fo"></section>
  <section class="card"><h2>Meine Therapie (für Bericht und Export)</h2>
    <label class="label" for="pth">Freitext, bleibt nur auf diesem Handy</label>
    <textarea id="pth" rows="3" data-bind="ptherapy" placeholder="z. B. Medikamente mit Dosis, Besonderheiten beim Essen">${esc(pr.therapy || "")}</textarea></section>
  <section class="card"><h2>Beobachtungsliste (persönliche Trigger)</h2>
    <div class="chips"><button class="chip btnchip ${pr.hideFruit ? "on" : ""}" data-act="hidefruit">Obst in der Datenbank ausblenden</button></div>
    <p class="muted small">Diese Lebensmittel werden in der Ampel mindestens gelb markiert. Streiche nichts pauschal, sondern teste gezielt 2 Wochen.</p>
    <div class="chips">${WATCH_SUGGESTIONS.map(w => `<button class="chip btnchip ${pr.watch.includes(w) ? "on" : ""}" data-act="watch" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div></section>
  <section class="card"><h2>Erinnerung um 21 Uhr</h2>
    <div class="label">Uhrzeit</div>${timeField("reminder", pr.reminder || "21:00")}
    <label class="label" for="pu">Adresse dieser App</label><input id="pu" type="url" value="${esc(pr.appUrl || location.href.replace(/#.*$/, ""))}" data-bind="pappurl">
    <p class="muted small">Zuverlässig auf Android ist ein täglicher Kalender-Alarm. Die Datei öffnest du in der Kalender-App, der Eintrag wiederholt sich täglich und führt direkt zum Abend-Check.</p>
    <button class="btn" data-act="ics">Täglichen Kalender-Alarm laden</button></section>
  <section class="card"><h2>Eigene Lebensmittel und Zuordnungen</h2>
    <p class="muted small">Beim Eintragen über "ändern" oder "zuordnen" angelegt. Die App erkennt sie beim nächsten Mal von selbst.</p>
    ${(S.profile.custom || []).length ? S.profile.custom.map(x => `<div class="item"><span class="lamp r-${x.r}"></span><div class="im"><strong>${esc(x.name)}</strong><span class="muted small">${x.kcal} kcal pro 100 ${LIQ_UNITS.includes(x.unit) ? "ml" : "g"}, ${esc(x.unit)} = ${x.portion} ${LIQ_UNITS.includes(x.unit) ? "ml" : "g"}</span></div><button class="ic" data-act="custDel" data-n="${esc(x.name)}" aria-label="Löschen">×</button></div>`).join("") : `<p class="muted">Noch keine eigenen Lebensmittel.</p>`}
    <p class="muted small">${Object.keys(S.profile.alias || {}).length} gemerkte Zuordnungen. <button class="link" data-act="aliasClear">Alle löschen</button></p></section>
  <section class="card"><h2>Daten sichern</h2>
    <p class="muted small">Alle Daten liegen nur auf diesem Handy. Mache regelmäßig eine Sicherung.</p>
    <div class="actions"><button class="btn" data-act="backup">Sicherung speichern</button><label class="btn ghost filebtn">Sicherung laden<input type="file" accept="application/json,.json" id="restore" hidden></label></div>
    <button class="link danger" data-act="wipe">${ui.wipe ? "Wirklich alles löschen? Nochmal tippen" : "Alle Daten löschen"}</button></section>
  <section class="card"><h2>Wie bewertet die App?</h2>
    <p class="small">Die Ampel warnt vor Lebensmitteln, die Schuppenflechte begünstigen können (Stand der Studien). Sie bewertet nicht in erster Linie Kalorien.</p>
    <p class="small"><span class="lamp r-r"></span> <b>Rot</b> Alkohol, Zuckergetränke, Süßes, Kuchen, Frittiertes, Fast Food, Wurst, stark verarbeitete Produkte.</p>
    <p class="small"><span class="lamp r-y"></span> <b>Gelb</b> Käse, Butter, helles Brot, Fruchtsaft, rotes Fleisch, Aufschnitt, Dinge auf deiner Beobachtungsliste.</p>
    <p class="small"><span class="lamp r-g"></span> <b>Grün</b> Gemüse, Obst, Hülsenfrüchte, Fisch, Eier, Magerquark, Skyr, Vollkorn, Nüsse, Olivenöl, Wasser.</p>
    <p class="muted small">Grundlage: Gewichtsreduktion (Evidenz A), Alkohol, Zucker, ultra-verarbeitete Produkte, gesättigte Fette (B), Mediterrane Kost und Gluten nur bei Sensitivität (C), Einzeltrigger wie Nachtschatten oder Milch nur aus Umfragen (D). Die Datenbank ist eine Näherung und ersetzt keine Beratung.</p></section>
  <section class="card"><h2>Installation</h2>${inst}</section>
  <p class="muted small center">Haut-Cockpit Version 1.0 · Produktdaten von Open Food Facts (ODbL)</p>`;
}

/* ---------- Router und Rendering ---------- */
const ROUTES = { heute: viewHeute, scan: viewScan, essen: viewEssen, rezepte: viewRezepte, verlauf: viewVerlauf, abend: viewAbend };
const NAV = [["heute", "Cockpit", "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"], ["scan", "Scan", "M4 6V4h4M20 6V4h-4M4 18v2h4m12-2v2h-4M7 8v8m3-8v8m3-8v8m3-8v8"], ["essen", "Essen", "M7 3v8a2 2 0 0 0 2 2v8m0-18v6m-4-6v6m14-6c-2 0-3 3-3 6s1 4 3 4v6"], ["rezepte", "Wissen", "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"], ["verlauf", "Verlauf", "M3 20h18M5 16l4-5 4 3 6-8"]];
function route() { const r = (location.hash || "#heute").slice(1); return ROUTES[r] ? r : "heute"; }
let lastRoute = null;
function render() {
  const r = route();
  if (lastRoute === "scan" && r !== "scan") stopScan();
  if (r === "abend" && !ui.abend) openAbendData();
  if (r !== "scan") ui.lastAdd = null;
  const v = $("#view");
  const scrollY = lastRoute === r ? window.scrollY : 0;
  const act = document.activeElement && document.activeElement.id;
  v.innerHTML = ROUTES[r]();
  lastRoute = r;
  $("#nav").innerHTML = NAV.map(([id, l, d]) => `<a href="#${id}" class="${(r === id || (r === "abend" && id === "heute")) ? "on" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${l}</span></a>`).join("");
  $("#nav").hidden = r === "abend";
  window.scrollTo(0, scrollY);
  if (act && !["mealText"].includes(act)) { const el = document.getElementById(act); if (el && el.focus) { try { el.focus({ preventScroll: true }); } catch (e) { /* egal */ } } }
  const fr = $("#mform"); if (fr) fr.addEventListener("submit", e => { e.preventDefault(); manualProduct(fr); });
  const rs = $("#restore"); if (rs) rs.addEventListener("change", restoreBackup);
}
function openAbendData() { const c = day(ui.date).check; ui.abend = c ? { itch: c.itch, skin: c.skin ?? 0, scratchBlood: !!c.scratchBlood, sleepBad: !!c.sleepBad, stress: c.stress ?? 0, regions: { ...(c.regions || {}) }, gi: [...(c.gi || [])], note: c.note || "", smoke: c.smoke || "none", alc: c.alc || (hasAlcDiary(ui.date) ? "low" : "none"), peak: [...(c.peak || [])] } : { itch: null, skin: null, scratchBlood: null, sleepBad: null, stress: 0, regions: {}, gi: [], note: "", smoke: "none", alc: hasAlcDiary(ui.date) ? "low" : "none", peak: [] }; }

/* ---------- Ereignisse ---------- */
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, k = ui.date;
  switch (a) {
    case "go": location.hash = el.dataset.r; break;
    case "back": ui.abend = null; location.hash = "heute"; break;
    case "date": { const n = addDays(ui.date, +el.dataset.d); if (n <= dkey()) { ui.date = n; ui.draft = null; ui.mealTime = null; ui.medPart = null; render(); } break; }
    case "med": { const m = day(k).meds; m[el.dataset.m] = !m[el.dataset.m]; save(); render(); break; }
    case "medpart": ui.medPart = el.dataset.p; render(); break;
    case "medp": {
      const m = day(k).meds, id = el.dataset.m, p = el.dataset.p;
      const P = m[id + "P"] || (m[id + "P"] = { m: 0, n: 0, e: 0, o: m[id] || 0 });
      P[p] = Math.max(0, (P[p] || 0) + +el.dataset.d);
      m[id] = (P.m || 0) + (P.n || 0) + (P.e || 0) + (P.o || 0);
      save(); render(); break;
    }
    case "medn": { const m = day(k).meds; m[el.dataset.m] = Math.max(0, (m[el.dataset.m] || 0) + +el.dataset.d); save(); render(); break; }
    case "abend": openAbendData(); location.hash = "abend"; break;
    case "set": { const v = el.dataset.v; ui.abend[el.dataset.k] = v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? +v : v; render(); break; }
    case "reg": { const id = el.dataset.id, r = ui.abend.regions; r[id] = ((r[id] || 0) + 1) % 4; if (!r[id]) delete r[id]; render(); break; }
    case "gi": { const g = el.dataset.g, arr = ui.abend.gi; const i = arr.indexOf(g); if (i >= 0) arr.splice(i, 1); else arr.push(g); render(); break; }
    case "abendSave": {
      const a2 = ui.abend;
      if (a2.itch == null) { toast("Bitte den Juckreiz von 0 bis 10 wählen"); break; }
      day(k).check = { itch: a2.itch, skin: a2.skin, scratchBlood: !!a2.scratchBlood, sleepBad: !!a2.sleepBad, stress: a2.stress, regions: a2.regions, gi: a2.gi, note: a2.note.trim(), smoke: a2.smoke || "none", alc: a2.alc || "none", peak: a2.peak || [], ts: Date.now() };
      save(); ui.abend = null; toast("Abend-Check gespeichert"); location.hash = "heute"; break;
    }
    case "slot": ui.slot = el.dataset.s; if (ui.mealTimeAuto) ui.mealTime = defaultMealTime(ui.slot, ui.date); render(); break;
    case "parse": parseDraft(); break;
    case "draftClear": ui.draft = null; render(); break;
    case "draftDel": ui.draft = ui.draft.filter(i => i.id !== el.dataset.id); if (!ui.draft.length) ui.draft = null; render(); break;
    case "draftSave": saveDraft(); break;
    case "pick": { const it = ui.draft.find(x => x.id === el.dataset.id); if (it) { ui.pick = { id: it.id, q: it.key ? it.key.split(" ").pop() : "", creating: false, name: it.name }; render(); } break; }
    case "pickClose": ui.pick = null; render(); break;
    case "pickSet": { const it = ui.draft.find(x => x.id === ui.pick.id), food = FOODS.find(f => f.name === el.dataset.n); if (it && food) { applyFood(it, food); toast("Zugeordnet: " + food.name); } ui.pick = null; render(); break; }
    case "newFood": ui.pick.creating = true; render(); break;
    case "nfSave": {
      const it = ui.draft.find(x => x.id === ui.pick.id), num = id => parseFloat(($(id).value || "").replace(",", "."));
      const name = $("#nfName").value.trim(), portion = num("#nfPortion"), kcalU = num("#nfKcal"), protU = num("#nfProt") || 0;
      if (!it || !name || !(portion > 0) || !(kcalU >= 0)) { toast("Bitte Name, Gewicht und kcal eintragen"); break; }
      if (FOODS.some(f => f.name.toLowerCase() === name.toLowerCase())) { toast("Den Namen gibt es schon, bitte aus der Liste wählen"); break; }
      const nf = { name, r: $("#nfR").value, unit: $("#nfUnit").value, portion, kcal: Math.round(kcalU * 100 / portion * 10) / 10, p: Math.round(protU * 100 / portion * 10) / 10, why: "Eigener Eintrag" };
      S.profile.custom.push(nf); const food = foodFromCustom(nf); FOODS.push(food);
      applyFood(it, food); ui.pick = null; save(); toast("Gespeichert: " + name); render(); break;
    }
    case "custDel": { const n = el.dataset.n; S.profile.custom = S.profile.custom.filter(x => x.name !== n); const ix = FOODS.findIndex(f => f.custom && f.name === n); if (ix >= 0) FOODS.splice(ix, 1); Object.keys(S.profile.alias).forEach(k => { if (S.profile.alias[k] === n) delete S.profile.alias[k]; }); save(); render(); break; }
    case "aliasClear": S.profile.alias = {}; save(); toast("Gemerkte Zuordnungen gelöscht"); render(); break;
    case "mealDel": day(k).meals = day(k).meals.filter(m => m.id !== el.dataset.id); save(); render(); break;
    case "askClaude": copyText("Bitte bewerte diese Lebensmittel für mich (Psoriasis" + (S.profile.therapy ? ", " + S.profile.therapy : "") + ", Ziel: Gewicht senken, viel Protein). Gib pro Lebensmittel kcal und Protein pro Portion sowie Ampel grün/gelb/rot mit kurzer Begründung:\n" + ui.draft.filter(i => i.src === "unknown").map(i => "- " + i.text).join("\n")); break;
    case "histDel": { const c = el.dataset.c; S.scanHistory = S.scanHistory.filter(h => h.code !== c); delete S.offCache[c]; if (ui.scanProduct && ui.scanProduct.p.code === c) ui.scanProduct = null; save(); toast("Entfernt"); render(); break; }
    case "histClear": S.scanHistory = []; S.offCache = {}; save(); render(); break;
    case "dupClean": { const d = day(k), ids = dupIds(k), n = ids.size; d.meals.forEach(m => { m.items = m.items.filter(i => !ids.has(i.id)); }); d.meals = d.meals.filter(m => m.items.length); save(); toast(n + " Doppelte entfernt"); render(); break; }
    case "itemDel": { const d = day(k); d.meals.forEach(m => { m.items = m.items.filter(i => i.id !== el.dataset.id); }); d.meals = d.meals.filter(m => m.items.length); save(); render(); break; }
    case "altLoad": loadAlt(); break;
    case "peak": { const p = el.dataset.p, arr = ui.abend.peak || (ui.abend.peak = []); const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1); else arr.push(p); render(); break; }
    case "epMap": ui.epMapOpen = !ui.epMapOpen; render(); break;
    case "epreg": { const id = el.dataset.id; if (ui.epRegions[id]) delete ui.epRegions[id]; else ui.epRegions[id] = 1; render(); break; }
    case "epSet": ui.epItch = +el.dataset.v; render(); break;
    case "epAdd": { if (ui.epItch == null) { toast("Bitte die Stärke von 0 bis 10 wählen"); break; } day(k).episodes.push({ id: uid(), time: ui.epTime || nowTime(), itch: ui.epItch, regions: Object.keys(ui.epRegions) }); ui.epItch = null; ui.epTime = null; ui.epRegions = {}; ui.epMapOpen = false; save(); toast("Eingetragen"); render(); break; }
    case "epDel": { const d = day(k); d.episodes = d.episodes.filter(e => e.id !== el.dataset.id); save(); render(); break; }
    case "tstep": case "tnow": {
      const b = el.dataset.b;
      const acc = { mealTime: [() => ui.mealTime || nowTime(), v => { ui.mealTime = v; ui.mealTimeAuto = false; }], epTime: [() => ui.epTime || nowTime(), v => { ui.epTime = v; }], reminder: [() => S.profile.reminder || "21:00", v => { S.profile.reminder = v; save(); }] }[b];
      if (!acc) break;
      let v;
      if (a === "tnow") v = nowTime();
      else { const mins = (toMin(acc[0]()) + (el.dataset.u === "h" ? 60 : 1) * +el.dataset.d + 1440) % 1440; v = pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }
      acc[1](v); render(); break;
    }
    case "scanStart": startScan(); break;
    case "scanStop": stopScan(); render(); break;
    case "scanReset": stopScan(); ui.scanProduct = null; ui.scanManual = false; ui.scanErr = ""; ui.eanText = ""; render(); break;
    case "manualOpen": ui.scanManual = true; render(); break;
    case "eanGo": { const c = ui.eanText.replace(/\D/g, ""); if (!validEAN(c)) { toast("Die Nummer ist ungültig (8 oder 13 Ziffern)"); break; } onCode(c); break; }
    case "hist": onCode(el.dataset.c); break;
    case "scanAdd": {
      const sp = ui.scanProduct; if (!(spGrams(sp) > 0)) { toast("Bitte eine Menge eintragen"); break; } const item = productToItem(sp.p, sp.ev, spGrams(sp));
      const slot = ui.slot || autoSlot(), meal = addToMeal(k, slot, ui.mealTime || defaultMealTime(slot, k), [item]); ui.lastAdd = { k, mealId: meal.id }; ui.scanProduct = null; ui.mealTime = null; save(); toast("Hinzugefügt: " + item.name); render(); break;
    }
    case "rf": ui.recipeFilter = el.dataset.f; render(); break;
    case "recAdd": addRecipe(el.dataset.id); break;
    case "vt": ui.verlaufTab = el.dataset.t; render(); break;
    case "period": ui.period = +el.dataset.n; render(); break;
    case "lag": ui.corrLag = el.dataset.l === "h" ? "h" : +el.dataset.l; render(); break;
    case "copyClaude": copyText(claudeExport(30)); break;
    case "print": window.print(); break;
    case "csv": downloadFile("haut-cockpit-" + dkey() + ".csv", csvExport(), "text/csv;charset=utf-8"); break;
    case "watch": { const w = el.dataset.w, arr = S.profile.watch, i = arr.indexOf(w); if (i >= 0) arr.splice(i, 1); else arr.push(w); save(); render(); break; }
    case "ics": downloadFile("haut-cockpit-abend-check.ics", buildICS(S.profile.reminder || "21:00", S.profile.appUrl || location.href), "text/calendar"); toast("Datei öffnen und in den Kalender übernehmen"); break;
    case "backup": downloadFile("haut-cockpit-sicherung-" + dkey() + ".json", JSON.stringify(S), "application/json"); break;
    case "wipe": if (ui.wipe) { localStorage.removeItem(KEY); S = loadState(); ui.wipe = false; toast("Alle Daten gelöscht"); } else { ui.wipe = true; setTimeout(() => { ui.wipe = false; }, 5000); } render(); break;
    case "rt": ui.rezTab = el.dataset.t; render(); break;
    case "dbf": ui.dbf = el.dataset.f; render(); break;
    case "hidefruit": S.profile.hideFruit = !S.profile.hideFruit; save(); render(); break;
    case "install": if (window.deferredInstall) { window.deferredInstall.prompt(); window.deferredInstall = null; } break;
  }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.actInput === "draftQ") {
    const it = ui.draft && ui.draft.find(x => x.id === t.dataset.id), v = parseFloat(t.value.replace(",", "."));
    if (it && v > 0) { if (it.food) { it.qty = v; recalcItem(it); } else { it.qty = v; it.g = Math.round(v); } }
    return;
  }
  switch (t.dataset.bind) {
    case "mealText": ui.draftText = t.value; break;
    case "pickq": ui.pick.q = t.value; { const el = $("#picklist"); if (el) el.innerHTML = pickList(); } break;
    case "mealTime": ui.mealTime = t.value; ui.mealTimeAuto = false; break;
    case "epTime": ui.epTime = t.value; break;
    case "dbq": ui.dbq = t.value; { const el = $("#dblist"); if (el) el.innerHTML = dbList(); } break;
    case "stress": ui.abend.stress = +t.value; { const lab = t.closest(".field").querySelector(".label b"); if (lab) lab.textContent = t.value; } break;
    case "note": ui.abend.note = t.value; break;
    case "ean": ui.eanText = t.value; break;
    case "scanAmt": case "scanEach": { const v = parseFloat(t.value.replace(",", ".")); if (ui.scanProduct) { ui.scanProduct[t.dataset.bind === "scanAmt" ? "amount" : "each"] = v > 0 ? v : 0; const el = $("#scanKcal"); if (el) el.textContent = qtyInfo(ui.scanProduct); } break; }
    case "pweight": S.profile.weight = parseFloat(t.value.replace(",", ".")) || null; save(); break;
    case "pheight": S.profile.height = parseFloat(t.value.replace(",", ".")) || null; save(); break;
    case "pkcal": S.profile.kcalMax = parseInt(t.value, 10) || 1900; save(); break;
    case "pprot": S.profile.protMin = parseInt(t.value, 10) || null; save(); break;
    case "pm_sk": case "pm_ah": case "pm_cr": case "pm_fo": { const c = medCfg(); c[t.dataset.bind.slice(3)] = t.value; S.profile.meds = c; save(); break; }
    case "pm_d0": case "pm_d1": case "pm_d2": { const c = medCfg(); c.skD = [...c.skD]; c.skD[+t.dataset.bind.slice(4)] = t.value; S.profile.meds = c; save(); break; }
    case "pm_ahmax": { const c = medCfg(); c.ahMax = parseInt(t.value, 10) || null; S.profile.meds = c; save(); break; }
    case "ptherapy": S.profile.therapy = t.value; save(); break;
    case "premind": S.profile.reminder = t.value || "21:00"; save(); break;
    case "pappurl": S.profile.appUrl = t.value.trim(); save(); break;
  }
});
document.addEventListener("change", e => {
  if (e.target.dataset.bind === "slot") { ui.slot = e.target.value; if (ui.mealTimeAuto) { ui.mealTime = defaultMealTime(ui.slot, ui.date); const el = $("#st"); if (el) el.value = ui.mealTime; } }
  if (e.target.dataset.bind === "scanUnit" && ui.scanProduct) { ui.scanProduct.unit = e.target.value; ui.scanProduct.amount = e.target.value === "g" ? 100 : 1; render(); }
  if (e.target.dataset.actInput === "draftQ") render();
  if (e.target.dataset.actChange === "draftU") {
    const it = ui.draft.find(x => x.id === e.target.dataset.id), food = it && FOODS.find(f => f.name === it.food);
    if (it && food) { it.mode = e.target.value; it.qty = it.mode === "g" ? Math.round(it.g) : Math.round(it.g / food.portion * 10) / 10; recalcItem(it); render(); }
  }
});

function restoreBackup(e) {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const j = JSON.parse(rd.result); if (!j.days || !j.profile) throw 0; S = Object.assign(defaults(), j); save(); toast("Sicherung geladen"); render(); } catch (x) { toast("Datei ist keine gültige Sicherung"); } };
  rd.readAsText(f);
}

window.addEventListener("hashchange", () => { if (route() !== "abend") ui.abend = null; render(); });
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); window.deferredInstall = e; if (route() === "verlauf") render(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { if (ui.date !== dkey() && !ui.abend && lastRoute !== "scan") { ui.date = dkey(); } if (!ui.scanning) render(); } });

/* ---------- Start ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* ohne Offline-Modus weiter */ });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if (location.hash === "#abend") openAbendData();
render();
