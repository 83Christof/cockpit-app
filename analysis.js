"use strict";
/* Haut-Cockpit Auswertung: Verlauf, Zusammenhänge, Empfehlungen, Berichtstext */

const FEATURES = [
  { id: "alc", label: "Alkohol", ev: "B", fn: f => f.tags.has("alc") },
  { id: "sugarDrink", label: "Zuckergetränke", ev: "B", fn: f => f.tags.has("sugarDrink") },
  { id: "sweets", label: "Süßes/Kuchen/Schokolade", ev: "B", fn: f => f.items.some(i => i.r === "r" && (i.tags || []).includes("sugar")) },
  { id: "upf2", label: "Ultra-verarbeitet (2 oder mehr Produkte)", ev: "B", fn: f => f.items.filter(i => (i.tags || []).includes("upf")).length >= 2 },
  { id: "satfat2", label: "Viel gesättigtes Fett (2 oder mehr Produkte)", ev: "B/C", fn: f => f.items.filter(i => (i.tags || []).includes("satfat")).length >= 2 },
  { id: "fastfood", label: "Fast Food", ev: "B", fn: f => f.tags.has("fastfood") || f.tags.has("fried") },
  { id: "redDay", label: "Mindestens ein roter Eintrag", ev: "", fn: f => f.items.some(i => i.r === "r") },
  { id: "procmeat", label: "Wurst/verarbeitetes Fleisch", ev: "C", fn: f => f.tags.has("procmeat") },
  { id: "redmeat", label: "Rotes Fleisch", ev: "D", fn: f => f.tags.has("redmeat") },
  { id: "gluten", label: "Gluten", ev: "C", fn: f => f.tags.has("gluten") },
  { id: "dairy", label: "Milchprodukte", ev: "D", fn: f => f.tags.has("dairy") },
  { id: "nightshade", label: "Nachtschatten (Tomate, Paprika, Kartoffel)", ev: "D", fn: f => f.tags.has("nightshade") },
  { id: "spicy", label: "Scharfes", ev: "D", fn: f => f.tags.has("spicy") },
  { id: "coffee", label: "Kaffee", ev: "D", fn: f => f.tags.has("coffee") },
  { id: "juice", label: "Fruchtsaft", ev: "D", fn: f => f.tags.has("juice") },
  { id: "fish", label: "Fisch (mögliche Schutzwirkung)", ev: "C/D", fn: f => f.tags.has("fish") },
  { id: "veg3", label: "Viel Gemüse/Obst (3 oder mehr)", ev: "C", fn: f => f.items.filter(i => (i.tags || []).includes("veg")).length >= 3 },
  { id: "lateMeal", label: "Mahlzeit nach 20:30 Uhr", ev: "", fn: f => f.late },
  { id: "stress", label: "Hoher Stress (7 oder mehr)", ev: "", nonfood: true, fn: (f, d) => d.check && d.check.stress >= 7 },
  { id: "sleep", label: "Schlecht geschlafen", ev: "", nonfood: true, fn: (f, d) => d.check && d.check.sleepBad },
  { id: "allegra", label: "Antihistaminikum eingenommen", ev: "", nonfood: true, fn: (f, d) => (d.meds && d.meds.allegra > 0) },
  { id: "smoke", label: "Geraucht (Zigarre/Zigarette)", ev: "B", nonfood: true, fn: (f, d) => !!(d.check && d.check.smoke && d.check.smoke !== "none") }
];

function dayFeatures(k) {
  const d = S.days[k];
  const items = dayItems(k);
  const tags = new Set(items.flatMap(i => i.tags || []));
  return { f: { items, tags, late: !!(d && d.meals.some(m => (m.time || "") >= "20:30")) }, d, k };
}

/** Tage mit Abend-Check (Juckreiz-Wert) */
function checkedDays() {
  return Object.keys(S.days).filter(k => S.days[k].check && typeof S.days[k].check.itch === "number").sort();
}
function itchOf(k) { const d = S.days[k]; return d && d.check && typeof d.check.itch === "number" ? d.check.itch : null; }

function welch(a, b) {
  const m1 = mean(a), m2 = mean(b);
  const v = x => { const m = mean(x); return x.length > 1 ? x.reduce((s, y) => s + (y - m) ** 2, 0) / (x.length - 1) : 0; };
  const se = Math.sqrt(v(a) / a.length + v(b) / b.length);
  return { m1, m2, diff: m1 - m2, t: se > 0 ? (m1 - m2) / se : 0 };
}

/** Vergleich Juckreiz an Tagen mit/ohne Merkmal (lag 0 = gleicher Abend, lag 1 = nächster Abend) */
function correlations() {
  const keys = Object.keys(S.days).filter(k => S.days[k].meals.length || S.days[k].check).sort();
  const rows = keys.map(k => ({ ...dayFeatures(k), itch0: itchOf(k), itch1: itchOf(addDays(k, 1)) }));
  const feats = [...FEATURES];
  // einzelne Lebensmittel, die an mindestens 4 Tagen vorkommen
  const nameCount = {};
  rows.forEach(r => { new Set(r.f.items.map(i => i.name)).forEach(n => { nameCount[n] = (nameCount[n] || 0) + 1; }); });
  Object.entries(nameCount).filter(([, c]) => c >= 4).forEach(([n]) => feats.push({ id: "food:" + n, label: n, ev: "", food: true, fn: f => f.items.some(i => i.name === n) }));

  const out = [];
  for (const ft of feats) {
    for (const lag of [0, 1]) {
      const exp = [], un = [];
      rows.forEach(r => {
        const y = lag === 0 ? r.itch0 : r.itch1;
        if (y == null) return;
        if (!ft.nonfood && !r.f.items.length) return; // ohne Essenseintrag keine Aussage
        (ft.fn(r.f, r.d || {}) ? exp : un).push(y);
      });
      if (exp.length < 3 || un.length < 3) continue;
      const w = welch(exp, un);
      let verdict = "kein klarer Unterschied";
      if (Math.abs(w.diff) >= 2 && Math.abs(w.t) >= 2) verdict = w.diff > 0 ? "deutlich höher" : "deutlich niedriger";
      else if (Math.abs(w.diff) >= 1 && Math.abs(w.t) >= 1.2) verdict = w.diff > 0 ? "tendenziell höher" : "tendenziell niedriger";
      out.push({ id: ft.id, label: ft.label, ev: ft.ev, nonfood: !!ft.nonfood, food: !!ft.food, lag, nExp: exp.length, nUn: un.length, mExp: w.m1, mUn: w.m2, diff: w.diff, t: w.t, verdict });
    }
  }
  out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  // Merkmale, die an denselben Tagen auftreten (z. B. Alkohol und Bier), nur einmal zeigen
  const seen = new Set();
  return out.filter(c => { const sig = `${c.lag}|${c.nExp}|${c.nUn}|${c.mExp.toFixed(3)}|${c.mUn.toFixed(3)}`; if (seen.has(sig)) return false; seen.add(sig); return true; });
}

/** Juckreiz-Einträge zwischendurch, verglichen nach Essen der vorherigen 4 Stunden */
function episodeCorrelations() {
  const eps = [];
  Object.keys(S.days).forEach(k => (S.days[k].episodes || []).forEach(e => eps.push({ k, t: toMin(e.time), itch: e.itch })));
  if (eps.length < 6) return [];
  const out = [];
  for (const ft of FEATURES.filter(x => !x.nonfood && x.id !== "lateMeal")) {
    const exp = [], un = [];
    eps.forEach(e => {
      const d = S.days[e.k];
      const meals = (d.meals || []).filter(m => m.time && toMin(m.time) <= e.t && e.t - toMin(m.time) <= 240);
      if (!meals.length) return;
      const items = meals.flatMap(m => m.items), tags = new Set(items.flatMap(i => i.tags || []));
      (ft.fn({ items, tags, late: false }, d) ? exp : un).push(e.itch);
    });
    if (exp.length < 3 || un.length < 3) continue;
    const w = welch(exp, un);
    let verdict = "kein klarer Unterschied";
    if (Math.abs(w.diff) >= 2 && Math.abs(w.t) >= 2) verdict = w.diff > 0 ? "deutlich höher" : "deutlich niedriger";
    else if (Math.abs(w.diff) >= 1 && Math.abs(w.t) >= 1.2) verdict = w.diff > 0 ? "tendenziell höher" : "tendenziell niedriger";
    out.push({ id: ft.id, label: ft.label, ev: ft.ev, lag: "h", nExp: exp.length, nUn: un.length, mExp: w.m1, mUn: w.m2, diff: w.diff, t: w.t, verdict });
  }
  out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const seen = new Set();
  return out.filter(c => { const sig = `${c.nExp}|${c.nUn}|${c.mExp.toFixed(3)}|${c.mUn.toFixed(3)}`; if (seen.has(sig)) return false; seen.add(sig); return true; });
}

function daypartStats(fromKey, toKey) {
  const agg = Object.fromEntries(DAYPARTS.map(([id]) => [id, { peak: 0, eps: [] }]));
  Object.keys(S.days).filter(k => k >= fromKey && k <= toKey).forEach(k => {
    const d = S.days[k];
    ((d.check && d.check.peak) || []).forEach(p => { if (agg[p]) agg[p].peak++; });
    (d.episodes || []).forEach(e => agg[partOf(e.time)].eps.push(e.itch));
  });
  return DAYPARTS.map(([id, label]) => ({ id, label, peak: agg[id].peak, n: agg[id].eps.length, avg: mean(agg[id].eps) }));
}

function regionStats(fromKey, toKey) {
  const agg = {};
  Object.keys(S.days).filter(k => k >= fromKey && k <= toKey).forEach(k => {
    const c = S.days[k].check; if (!c || !c.regions) return;
    Object.entries(c.regions).forEach(([id, lvl]) => { if (lvl > 0) { agg[id] = agg[id] || { days: 0, sum: 0, max: 0 }; agg[id].days++; agg[id].sum += lvl; agg[id].max = Math.max(agg[id].max, lvl); } });
  });
  return Object.entries(agg).map(([id, a]) => ({ id, label: REGION_LABEL[id] || id, days: a.days, avg: a.sum / a.days, max: a.max })).sort((a, b) => b.days - a.days || b.avg - a.avg);
}

function periodStats(n) {
  const to = dkey(), from = addDays(to, -(n - 1));
  const ks = Object.keys(S.days).filter(k => k >= from && k <= to).sort();
  const itch = ks.map(itchOf).filter(x => x != null);
  const checked = ks.filter(k => itchOf(k) != null);
  const meals = ks.filter(k => S.days[k].meals.length);
  const sums = meals.map(daySummary);
  const meds = ks.map(k => S.days[k].meds || {});
  const bloody = checked.filter(k => S.days[k].check.scratchBlood).length;
  return {
    from, to, n, checkedN: checked.length, mealN: meals.length,
    itchAvg: mean(itch), itchMax: itch.length ? Math.max(...itch) : null, itchHigh: itch.filter(x => x >= 7).length,
    bloody, kcalAvg: mean(sums.map(s => s.kcal)), protAvg: mean(sums.map(s => s.prot)), kcalOver: sums.filter(s => s.kcal > S.profile.kcalMax).length,
    redDays: sums.filter(s => s.c.r > 0).length, alcDays: meals.filter(k => dayFeatures(k).f.tags.has("alc")).length,
    skFull: meds.filter(m => m.skM && m.skN && m.skE).length, skDays: meds.filter(m => m.skM || m.skN || m.skE).length,
    allegraDays: meds.filter(m => m.allegra > 0).length, allegraTotal: meds.reduce((s, m) => s + (m.allegra || 0), 0),
    cremeAvg: mean(ks.map(k => (S.days[k].meds || {}).creme || 0)), enstilarDays: meds.filter(m => m.enstilar).length,
    keys: ks
  };
}

function trend() {
  const to = dkey();
  const pick = (a, b) => Object.keys(S.days).filter(k => k >= addDays(to, -a) && k <= addDays(to, -b)).map(itchOf).filter(x => x != null);
  const cur = pick(6, 0), prev = pick(13, 7);
  return { cur: mean(cur), prev: mean(prev), nCur: cur.length, nPrev: prev.length };
}

/** Empfehlungstexte aus den Daten */
function recommendations() {
  const rec = [];
  const days = checkedDays();
  const tr = trend();
  if (days.length < 7) {
    rec.push({ k: "info", t: `Bisher ${days.length} Abend-Checks. Ab 14 Tagen mit Essens- und Abendeinträgen zeigt die Auswertung erste Hinweise, ab 4 bis 6 Wochen werden sie belastbarer.` });
  }
  if (tr.cur != null && tr.prev != null && tr.nCur >= 4 && tr.nPrev >= 4) {
    const d = tr.cur - tr.prev;
    if (d >= 1) rec.push({ k: "neg", t: `Juckreiz ist in den letzten 7 Tagen im Mittel um ${fmtNum(d)} Punkte gestiegen (${fmtNum(tr.prev)} auf ${fmtNum(tr.cur)}). Wenn das anhält, bitte den Hautarzt zeitnah informieren.` });
    else if (d <= -1) rec.push({ k: "pos", t: `Juckreiz ist in den letzten 7 Tagen im Mittel um ${fmtNum(-d)} Punkte gesunken (${fmtNum(tr.prev)} auf ${fmtNum(tr.cur)}).` });
    else rec.push({ k: "info", t: `Juckreiz stabil bei etwa ${fmtNum(tr.cur)} von 10.` });
  }
  const st = periodStats(14);
  if (st.bloody >= 3) rec.push({ k: "neg", t: `An ${st.bloody} der letzten 14 Tage hast du dich blutig gekratzt. Das hält die Haut im Entzündungskreislauf. Kurze Nägel, Kühlen statt Kratzen, Creme direkt bei Juckreiz, und beim Hautarzt ansprechen.` });
  if (st.itchHigh >= 5) rec.push({ k: "neg", t: `An ${st.itchHigh} Tagen lag der Juckreiz bei 7 oder höher. Das ist ein Grund, den Kontrolltermin vorzuziehen und die Therapie zu besprechen.` });
  const cors = correlations().filter(c => !c.nonfood && c.lag === 1 && c.verdict !== "kein klarer Unterschied");
  const worse = cors.filter(c => c.diff > 0).slice(0, 3), better = cors.filter(c => c.diff < 0 && (c.id === "fish" || c.id === "veg3" || c.food)).slice(0, 2);
  worse.forEach(c => rec.push({ k: "neg", t: `Nach Tagen mit "${c.label}" lag der Juckreiz am Folgetag um ${fmtNum(c.diff)} Punkte höher (${fmtNum(c.mExp)} gegenüber ${fmtNum(c.mUn)}; ${c.nExp} und ${c.nUn} Tage). Das ist ein Hinweis, kein Beweis. Sinnvoll: 2 Wochen konsequent weglassen und vergleichen.` }));
  better.forEach(c => rec.push({ k: "pos", t: `Nach Tagen mit "${c.label}" lag der Juckreiz am Folgetag um ${fmtNum(-c.diff)} Punkte niedriger. Das spricht dafür, davon mehr zu essen.` }));
  const ec = episodeCorrelations().filter(c => c.verdict !== "kein klarer Unterschied");
  ec.filter(c => c.diff > 0).slice(0, 2).forEach(c => rec.push({ k: "neg", t: `Innerhalb von 4 Stunden nach "${c.label}" lag der Juckreiz bei Einträgen zwischendurch um ${fmtNum(c.diff)} Punkte höher (${fmtNum(c.mExp)} gegenüber ${fmtNum(c.mUn)}; ${c.nExp} und ${c.nUn} Einträge). Das ist ein Hinweis, kein Beweis.` }));
  const dp = daypartStats(addDays(dkey(), -29), dkey()).filter(x => x.peak > 0).sort((a, b) => b.peak - a.peak);
  if (dp.length && dp[0].peak >= 5) rec.push({ k: "info", t: `Der Juckreiz ist meist ${dp[0].label.replace(/ \(.*\)/, "").toLowerCase()} am stärksten (an ${dp[0].peak} der letzten 30 Tage genannt). Pflege und Antihistaminikum-Zeitpunkt darauf abstimmen, mit Arzt oder Apotheke.` });
  const alcDays = st.alcDays;
  if (alcDays >= 2) rec.push({ k: "neg", t: `Alkohol an ${alcDays} der letzten 14 Tage. Alkohol ist der am besten belegte Ernährungsfaktor (Risiko) und belastet bei Fumarsäureestern (z. B. Skilarence) zusätzlich Magen und Darm.` });
  if (st.mealN >= 5 && st.kcalOver >= 3) rec.push({ k: "info", t: `Das Kalorienziel von ${S.profile.kcalMax} kcal wurde an ${st.kcalOver} Tagen überschritten. Gewichtsreduktion ist die am stärksten belegte Maßnahme bei Übergewicht.` });
  if (st.mealN >= 5 && st.protAvg != null && st.protAvg < protTarget() * 0.85) rec.push({ k: "info", t: `Protein im Schnitt ${Math.round(st.protAvg)} g, Ziel ${protTarget()} g. Mehr Skyr, Quark, Eier, Fisch, Hähnchen, Hülsenfrüchte.` });
  if (st.skDays >= 5 && st.skFull < st.skDays * 0.7) rec.push({ k: "info", t: `${mname("sk")} wurde nur an ${st.skFull} von ${st.skDays} Tagen vollständig (morgens, mittags, abends) abgehakt. Fehlende Dosen mit dem Hautarzt klären, nicht eigenmächtig ändern.` });
  if (!rec.length) rec.push({ k: "info", t: "Noch keine Auffälligkeiten. Weiter täglich eintragen." });
  return rec;
}

/* ---------- Text für Claude / Hautarzt ---------- */
const pp = o => o ? " (" + [o.m || 0, o.n || 0, o.e || 0].join("-") + ")" : "";
function claudeExport(n) {
  n = n || 30;
  const st = periodStats(n);
  const lines = [];
  lines.push(`Bitte werte meine Psoriasis-Daten der letzten ${n} Tage aus (Zeitraum ${st.from} bis ${st.to}).`);
  lines.push("Kontext: Psoriasis. " + (S.profile.therapy ? "Therapie und Besonderheiten: " + S.profile.therapy + ". " : "") + "Ziel max. " + S.profile.kcalMax + " kcal und viel Protein. Juckreiz 0-10 (abends).");
  lines.push("Aufgabe: Zusammenhänge zwischen Essen/Trinken und Juckreiz am gleichen und am Folgetag prüfen, Muster nach Körperregion, Wirkung von Antihistaminikum/Creme, konkrete Empfehlungen für 2 Wochen und Fragen für den Hautarzt. Bitte Evidenzlage nennen und Unsicherheit kennzeichnen.");
  lines.push("");
  lines.push("TAGE (Datum | Juckreiz | Blutig gekratzt | Stress | Schlaf schlecht | Rauchen | Regionen (Stufe 1-3) | Medikation | Essen mit Uhrzeit [Ampel] | Tageszeit der Spitze | Juckreiz zwischendurch (Uhrzeit=Stärke))");
  st.keys.forEach(k => {
    const d = S.days[k], c = d.check || {}, m = d.meds || {};
    const reg = c.regions ? Object.entries(c.regions).filter(([, v]) => v > 0).map(([id, v]) => (REGION_LABEL[id] || id) + " " + v).join("; ") : "";
    const eps = (d.episodes || []).map(e => e.time + "=" + e.itch).join("; ");
    const food = d.meals.map(ml => ml.slot + (ml.time ? " " + ml.time : "") + ": " + ml.items.map(i => `${i.name}${i.g ? " " + i.g + "g" : ""} [${i.r}]`).join(", ")).join(" | ");
    lines.push(`${k} | ${c.itch ?? "-"} | ${c.scratchBlood ? "ja" : "nein"} | ${c.stress ?? "-"} | ${c.sleepBad ? "ja" : "nein"} | ${c.smoke && c.smoke !== "none" ? c.smoke : "nein"} | ${reg || "-"} | Tabletten ${m.skM ? "M" : "-"}${m.skN ? "N" : "-"}${m.skE ? "A" : "-"} Antihistaminikum ${m.allegra || 0}${pp(m.allegraP)} Creme ${m.creme || 0}${pp(m.cremeP)} Schaum ${m.enstilar ? "ja" : "nein"} | ${food || "-"} | Spitze ${(c.peak || []).join("/") || "-"} | Episoden ${eps || "-"}${c.note ? " | Notiz: " + c.note : ""}`);
  });
  return lines.join("\n");
}

function csvExport() {
  const head = ["Datum", "Juckreiz", "Blutig", "Stress", "SchlafSchlecht", "Rauchen", "Hautzustand", "Regionen", "TablettenM", "TablettenN", "TablettenA", "Antihistaminikum", "Creme", "Schaum", "kcal", "Protein", "Rot", "Gelb", "Gruen", "Spitze", "Episoden", "Essen", "Notiz"];
  const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = Object.keys(S.days).sort().map(k => {
    const d = S.days[k], c = d.check || {}, m = d.meds || {}, s = daySummary(k);
    const reg = c.regions ? Object.entries(c.regions).filter(([, v]) => v > 0).map(([id, v]) => (REGION_LABEL[id] || id) + ":" + v).join("; ") : "";
    return [k, c.itch ?? "", c.scratchBlood ? 1 : 0, c.stress ?? "", c.sleepBad ? 1 : 0, c.smoke && c.smoke !== "none" ? c.smoke : "", c.skin ?? "", reg, m.skM ? 1 : 0, m.skN ? 1 : 0, m.skE ? 1 : 0, m.allegra || 0, m.creme || 0, m.enstilar ? 1 : 0, s.kcal, s.prot, s.c.r || 0, s.c.y || 0, s.c.g || 0, (c.peak || []).join("/"), (d.episodes || []).map(e => e.time + "=" + e.itch).join("; "), d.meals.map(ml => ml.slot + (ml.time ? " " + ml.time : "") + ": " + ml.items.map(i => i.name).join(", ")).join(" | "), c.note || ""].map(q).join(";");
  });
  return "﻿" + head.join(";") + "\n" + rows.join("\n");
}

/* ---------- Diagramme (SVG) ---------- */
function itchChart(keys) {
  const W = 340, H = 150, L = 24, R = 8, T = 8, B = 22;
  const n = keys.length; if (n < 2) return `<p class="muted">Zu wenige Tage für ein Diagramm.</p>`;
  const x = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1));
  const y = v => T + (H - T - B) * (1 - v / 10);
  let grid = "";
  [0, 2.5, 5, 7.5, 10].forEach(v => { grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 4}" y="${y(v) + 3}" class="ax" text-anchor="end">${v}</text>`; });
  const pts = keys.map((k, i) => ({ i, v: itchOf(k), k })).filter(p => p.v != null);
  const line = pts.map((p, j) => (j ? "L" : "M") + x(p.i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const avg = pts.map((p, j) => {
    const w = pts.filter(q => q.i <= p.i && q.i > p.i - 7).map(q => q.v);
    return (j ? "L" : "M") + x(p.i).toFixed(1) + " " + y(mean(w)).toFixed(1);
  }).join(" ");
  const dots = pts.map(p => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.6" class="dot${S.days[p.k].check.scratchBlood ? " bl" : ""}"/>`).join("");
  const step = Math.ceil(n / 6);
  let labels = "";
  keys.forEach((k, i) => { if (i % step === 0 || i === n - 1) labels += `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">${k.slice(8)}.${k.slice(5, 7)}.</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Juckreiz-Verlauf">${grid}<path d="${line}" class="ln"/><path d="${avg}" class="av"/>${dots}${labels}</svg>
  <div class="legend"><span><i class="lg dot"></i>Tageswert</span><span><i class="lg bl"></i>blutig gekratzt</span><span><i class="lg av"></i>7-Tage-Mittel</span></div>`;
}
