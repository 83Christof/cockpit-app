"use strict";
/* Haut-Cockpit Kern: Zustand, Hilfsfunktionen, Text-Parser, Produktbewertung */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (k, n) => { const [y, m, d] = k.split("-").map(Number); return dkey(new Date(y, m - 1, d + n)); };
const dateOf = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const fmtDate = k => dateOf(k).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
const fmtDateLong = k => dateOf(k).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
const uid = () => Math.random().toString(36).slice(2, 9);
const r1 = x => Math.round(x * 10) / 10;
const fmtNum = x => (x == null || isNaN(x)) ? "?" : (Math.round(x * 10) / 10).toString().replace(".", ",");
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

/* ---------- Speicher ---------- */
const KEY = "haut-cockpit-v1";
function defaults() {
  return { profile: { weight: null, height: null, kcalMax: 1900, protPerKg: 1.4, protMin: null, reminder: "21:00", watch: [], appUrl: "", hideFruit: true, therapy: "", meds: { sk: "", skD: ["", "", ""], ah: "", ahMax: null, cr: "", fo: "" } }, days: {}, offCache: {}, scanHistory: [] };
}
function loadState() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j) { const d = defaults(); return Object.assign(d, j, { profile: Object.assign(d.profile, j.profile || {}) }); }
  } catch (e) { /* leer */ }
  return defaults();
}
let S = loadState();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(S.offCache);
      if (keys.length > 150) keys.slice(0, keys.length - 150).forEach(k => delete S.offCache[k]);
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) { toast("Speichern fehlgeschlagen. Speicher voll oder gesperrt."); }
  }, 80);
}
function day(k) { if (!S.days[k]) S.days[k] = { meals: [], meds: {}, check: null }; return S.days[k]; }
function dayItems(k) { const d = S.days[k]; return d ? d.meals.flatMap(m => m.items.map(i => ({ ...i, slot: m.slot }))) : []; }
function protTarget() { const p = S.profile; return p.protMin || (p.weight ? Math.round(p.weight * p.protPerKg) : 100); }

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- Medikamenten-Bezeichnungen (frei einstellbar, nur auf dem Gerät) ---------- */
function medCfg() { return Object.assign({ sk: "", skD: ["", "", ""], ah: "", ahMax: null, cr: "", fo: "" }, S.profile.meds || {}); }
function mname(k) { const c = medCfg(); return c[k] || { sk: "Tabletten zur Mahlzeit", ah: "Antihistaminikum", cr: "Creme", fo: "Schaum oder Lösung" }[k]; }
function doseLbl(i, base) { const d = (medCfg().skD || [])[i]; return d ? base + " " + d : base; }
function ahLimit() { return medCfg().ahMax || null; }

/* ---------- Text-Parser ---------- */
const normTxt = s => s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/[^a-z0-9% ]/g, " ").replace(/\s+/g, " ").trim();
FOODS.forEach(f => { f.nsyn = [...new Set(f.syn.map(normTxt))].filter(Boolean); });

const NUMWORDS = { ein: 1, eine: 1, einen: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, funf: 5, sechs: 6, halbe: 0.5, halbes: 0.5, halber: 0.5 };
const UNIT_G = { g: 1, gr: 1, gramm: 1, kg: 1000, ml: 1, l: 1000, el: null, tl: 5, tasse: 200, tassen: 200, glas: 200, glaeser: 200, dose: 330, becher: 150, handvoll: 25, schale: 150 };

function splitMeals(text) {
  return text.replace(/\n/g, ",").split(/,|;|\+|\bund\b|\bmit\b|\bsowie\b|\//i).map(s => s.trim()).filter(Boolean);
}

function parseToken(tok) {
  let t = tok.replace(/½/g, "0.5").replace(/¼/g, "0.25").trim();
  let qty = 1, unit = null, rest = t, grams = null;
  const unitRe = "x|g|gr|gramm|kg|ml|l|el|tl|scheibe|scheiben|stk|stück|stueck|portion|portionen|tasse|tassen|glas|gläser|glaeser|dose|dosen|becher|handvoll|schale|stücke|stuecke";
  let m = t.match(new RegExp("^(\\d+(?:[.,]\\d+)?|ein|eine|einen|einem|zwei|drei|vier|fünf|fuenf|sechs|halbe|halbes|halber)\\s*(" + unitRe + ")?\\.?\\s+(.+)$", "i"));
  if (m) {
    const n = m[1].toLowerCase();
    qty = NUMWORDS[n] ?? parseFloat(n.replace(",", "."));
    unit = (m[2] || "").toLowerCase() || null; rest = m[3];
  } else {
    m = t.match(new RegExp("^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(" + unitRe + ")\\.?$", "i"));
    if (m) { rest = m[1]; qty = parseFloat(m[2].replace(",", ".")); unit = m[3].toLowerCase(); }
  }
  return { qty: isFinite(qty) ? qty : 1, unit, rest: rest.trim() };
}

function matchFood(txt) {
  const n = " " + normTxt(txt) + " ";
  let best = null, bestScore = 0;
  for (const f of FOODS) {
    for (const s of f.nsyn) {
      let hit = false;
      if (s.length <= 3) hit = n.includes(" " + s + " ");
      else hit = n.includes(" " + s) || (s.length >= 5 && n.includes(s));
      if (hit) {
        const sc = s.length + (n.includes(" " + s + " ") ? 0.5 : 0);
        if (sc > bestScore) { best = f; bestScore = sc; }
      }
    }
  }
  return best;
}

function watchHit(item) {
  const hits = [];
  for (const w of S.profile.watch) {
    const tags = WATCH_TAG_MAP[w] || [];
    const nm = normTxt(item.name + " " + (item.text || ""));
    if (tags.some(t => (item.tags || []).includes(t)) || (nm && nm.includes(normTxt(w)))) hits.push(w);
  }
  return hits;
}

function foodItem(food, g, text) {
  const item = { id: uid(), name: food.name, text, g: Math.round(g), kcal: Math.round(food.kcal * g / 100), p: r1(food.p * g / 100), r: food.r, tags: [...food.tags], why: food.why, src: "db" };
  const w = watchHit(item);
  if (w.length) { item.watch = w; if (item.r === "g") item.r = "y"; item.why += " Auf deiner Beobachtungsliste: " + w.join(", ") + "."; }
  return item;
}

function parseMeal(text) {
  return splitMeals(text).map(tok => {
    const { qty, unit, rest } = parseToken(tok);
    const food = matchFood(rest);
    if (!food) return { id: uid(), name: rest || tok, text: tok, g: null, kcal: null, p: null, r: "u", tags: [], why: "Nicht in der Datenbank. Beim Hinzufügen unbewertet, bitte mit Claude prüfen.", src: "unknown" };
    let g;
    if (unit && ["g", "gr", "gramm", "kg", "ml", "l", "tl", "tasse", "tassen", "glas", "glaeser", "gläser", "dose", "dosen", "becher", "handvoll", "schale"].includes(unit) && UNIT_G[unit.replace("ä", "ae")] != null) g = qty * UNIT_G[unit.replace("ä", "ae")];
    else if (unit === "el") g = qty * (food.unit === "EL" ? food.portion : 15);
    else g = qty * food.portion;
    return foodItem(food, g, tok);
  });
}

/* ---------- Open Food Facts ---------- */
const OFF_FIELDS = "product_name,product_name_de,generic_name,brands,quantity,serving_quantity,nutriments,nova_group,categories_tags,allergens_tags,ingredients_text,ingredients_text_de,nutriscore_grade,image_front_small_url";
function validEAN(c) {
  if (!/^\d{8}$|^\d{12,14}$/.test(c)) return false;
  const d = c.split("").map(Number), chk = d.pop();
  let sum = 0;
  d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === chk;
}
async function lookupOFF(code) {
  if (S.offCache[code]) return S.offCache[code];
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, { signal: ctl.signal });
    const j = await r.json();
    if (j.status !== 1 || !j.product) return { code, notFound: true };
    const p = normalizeOFF(code, j.product);
    S.offCache[code] = p; save();
    return p;
  } finally { clearTimeout(to); }
}
function normalizeOFF(code, p) {
  const n = p.nutriments || {};
  const g = k => { const v = n[k + "_100g"]; return (v === undefined || v === "" || v === null) ? null : +v; };
  let kcal = g("energy-kcal"); if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  return {
    code, name: p.product_name_de || p.product_name || p.generic_name || "Produkt ohne Namen", brand: (p.brands || "").split(",")[0], qty: p.quantity || "",
    serving: p.serving_quantity ? +p.serving_quantity : null, kcal, sugar: g("sugars"), sat: g("saturated-fat"), prot: g("proteins"), fiber: g("fiber"), fat: g("fat"), salt: g("salt"),
    nova: p.nova_group ? +p.nova_group : null, cats: p.categories_tags || [], allergens: p.allergens_tags || [],
    ing: (p.ingredients_text_de || p.ingredients_text || "").toLowerCase(), alcohol: g("alcohol"), img: p.image_front_small_url || "", nutri: p.nutriscore_grade || null
  };
}

/* ---------- Produktbewertung ---------- */
const NOTE_BILASTIN = "Fruchtsaft senkt die Aufnahme mancher Antihistaminika. Allegra (Bilastin): 1 Stunde vor oder 2 Stunden nach Essen und Saft einnehmen (Fachinformation). Fumarsäureester gehören dagegen zur Mahlzeit. Packungsbeilage prüfen.";
const NOTE_SKIL = "Fumarsäureester (z. B. Skilarence) nur mit oder direkt nach einer Mahlzeit einnehmen, nicht auf nüchternen Magen.";

function evalProduct(p) {
  const reasons = [], notes = [], tags = [];
  let score = 0;
  const has = (...c) => c.some(x => p.cats.includes(x));
  const add = (t, k) => reasons.push({ t, k });
  const nonAlc = has("en:non-alcoholic-beers", "en:alcohol-free-beverages", "en:non-alcoholic-beverages");
  const alcohol = (p.alcohol != null && p.alcohol >= 0.5) || (p.alcohol == null && !nonAlc && has("en:alcoholic-beverages", "en:beers", "en:wines", "en:spirits", "en:ciders"));
  if (alcohol) {
    notes.push(NOTE_SKIL);
    return { r: "r", score: 99, tags: ["alc"], notes, reasons: [{ t: "Enthält Alkohol: gilt als Risikofaktor bei Psoriasis. Bei Fumarsäureestern (z. B. Skilarence) zusätzlich Magen-Darm-Belastung, Spirituosen sind ausdrücklich zu meiden.", k: "neg" }] };
  }
  const nova = p.nova, ing = p.ing || "";
  const bev = has("en:beverages", "en:waters", "en:sodas", "en:fruit-juices", "en:juices-and-nectars", "en:plant-based-beverages") && !has("en:milks", "en:dairy-drinks");
  const milk = has("en:milks", "en:dairy-drinks");
  const oil = has("en:olive-oils", "en:vegetable-oils", "en:rapeseed-oils", "en:vegetable-fats");
  const fresh = has("en:fresh-fruits", "en:fruits", "en:vegetables", "en:fresh-vegetables", "en:legumes") || nova === 1;
  const sugar = p.sugar, sat = p.sat;

  if (bev) {
    if (has("en:fruit-juices", "en:juices-and-nectars", "en:fruit-nectars")) {
      score += 1; tags.push("juice", "sugar"); add("Fruchtsaft: viel Fruchtzucker ohne Ballaststoffe. Ganze Frucht ist besser.", "neg"); notes.push(NOTE_BILASTIN);
    } else if (sugar != null) {
      if (sugar >= 4.5) { score += 3; tags.push("sugarDrink", "sugar"); add(`Zuckergetränk (${fmtNum(sugar)} g Zucker/100 ml). Zuckergetränke hängen mit schlechterem Therapieansprechen zusammen.`, "neg"); }
      else if (sugar >= 2.5) { score += 1; tags.push("sugar"); add(`Etwas Zucker (${fmtNum(sugar)} g/100 ml).`, "neg"); }
      else add("Zuckerarm.", "pos");
    }
    if (has("en:artificially-sweetened-beverages") || /süßstoff|aspartam|sucralose|acesulfam|cyclamat/.test(ing)) { score += 1; add("Mit Süßstoffen: Studienlage dünn, in Maßen.", "info"); tags.push("upf"); }
    if (has("en:waters") && !has("en:flavoured-waters") && (sugar == null || sugar < 0.5)) { score -= 1; add("Wasser ist die beste Wahl.", "pos"); }
    if (has("en:teas", "en:herbal-teas", "en:coffees")) { if (sugar == null || sugar < 2.5) { score -= 1; add("Ungesüßt unkritisch.", "pos"); } }
  } else if (milk) {
    tags.push("dairy");
    if (sugar != null && sugar > 6) { score += 3; tags.push("sugar"); add(`Gesüßtes Milchgetränk (${fmtNum(sugar)} g Zucker/100 ml).`, "neg"); }
    else if (sat != null && sat >= 1.5) { score += 1; tags.push("satfat"); add("Vollfett-Milch: gesättigtes Fett, fettarm wäre besser.", "neg"); }
    else add("Ungesüßt und fettarm, unkritisch.", "pos");
  } else {
    if (sugar != null && !fresh) {
      if (sugar >= 22.5) { score += 3; tags.push("sugar"); add(`Sehr viel Zucker (${fmtNum(sugar)} g/100 g).`, "neg"); }
      else if (sugar >= 12.5) { score += 2; tags.push("sugar"); add(`Viel Zucker (${fmtNum(sugar)} g/100 g).`, "neg"); }
      else if (sugar >= 7.5) { score += 1; add(`Etwas Zucker (${fmtNum(sugar)} g/100 g).`, "neg"); }
    }
    if (sat != null && !oil) {
      if (sat >= 5) { score += 2; tags.push("satfat"); add(`Viel gesättigtes Fett (${fmtNum(sat)} g/100 g).`, "neg"); }
      else if (sat >= 2.5) { score += 1; tags.push("satfat"); add(`Mäßig gesättigtes Fett (${fmtNum(sat)} g/100 g).`, "neg"); }
    }
    if (has("en:fried-foods", "en:chips-and-fries", "en:salty-snacks", "en:crisps")) { score += 1; tags.push("fried"); add("Frittiertes oder Knabbergebäck.", "neg"); }
    if (has("en:sausages", "en:cured-meats", "en:salamis", "en:processed-meats")) { tags.push("procmeat"); add("Verarbeitetes Fleisch.", "neg"); }
    if (p.fiber != null && p.fiber >= 6) { score -= 1; add(`Ballaststoffreich (${fmtNum(p.fiber)} g/100 g).`, "pos"); }
    if (p.prot != null && p.prot >= 12 && !(sugar != null && sugar >= 12.5)) { score -= 1; add(`Proteinreich (${fmtNum(p.prot)} g/100 g).`, "pos"); }
  }
  if (nova === 4) { score += 2; tags.push("upf"); add("Ultra-verarbeitet (NOVA 4): in Studien mit aktiver Psoriasis verbunden.", "neg"); }
  else if (nova === 1 || nova === 2) { score -= 1; add("Kaum verarbeitet (NOVA " + nova + ").", "pos"); }
  if (p.allergens.includes("en:gluten")) { tags.push("gluten"); add("Enthält Gluten. Nur bei nachgewiesener Gluten-Sensitivität relevant, das klärt der Hautarzt per Bluttest.", "info"); }
  if (p.allergens.includes("en:milk")) tags.push("dairy");

  const hits = [];
  for (const w of S.profile.watch) {
    const wt = WATCH_TAG_MAP[w] || [];
    const key = normTxt(w);
    if (wt.some(t => tags.includes(t)) || (key && normTxt(ing).includes(key)) || (w === "Nachtschatten" && /tomat|paprika|kartoffel|aubergine|chili/.test(ing)) || (w === "Tomate" && /tomat/.test(ing))) hits.push(w);
  }
  if (hits.length) { if (score < 1) score = 1; add("Auf deiner Beobachtungsliste: " + hits.join(", ") + ".", "neg"); }

  const known = sugar != null || sat != null || nova != null;
  let r = score <= 0 ? "g" : score <= 2 ? "y" : "r";
  if (!known && !bev && !milk) { r = "u"; add("Zu wenige Nährwertdaten in Open Food Facts. Manuell einschätzen oder Etikett prüfen.", "info"); }
  if (!notes.includes(NOTE_SKIL)) notes.push(NOTE_SKIL);
  return { r, score, reasons, notes, tags: [...new Set(tags)] };
}

function productToItem(p, ev, grams) {
  const g = grams || p.serving || 100;
  return { id: uid(), name: (p.brand ? p.brand + " " : "") + p.name, text: "Scan " + p.code, g: Math.round(g), kcal: p.kcal != null ? Math.round(p.kcal * g / 100) : null, p: p.prot != null ? r1(p.prot * g / 100) : null, r: ev.r, tags: ev.tags, why: ev.reasons.filter(x => x.k === "neg").map(x => x.t).join(" ") || "Scan-Bewertung", src: "scan", code: p.code };
}

/* ---------- Tageszusammenfassung ---------- */
function daySummary(k) {
  const items = dayItems(k);
  const known = items.filter(i => i.kcal != null);
  const c = { g: 0, y: 0, r: 0, u: 0 };
  items.forEach(i => { c[i.r] = (c[i.r] || 0) + 1; });
  let light = null;
  if (items.length) light = c.r >= 2 ? "r" : (c.r === 1 || c.y >= 3) ? "y" : "g";
  return { items, c, kcal: known.reduce((s, i) => s + i.kcal, 0), prot: r1(known.reduce((s, i) => s + (i.p || 0), 0)), light, unknown: items.filter(i => i.r === "u" || i.kcal == null).length };
}

/* ---------- Erinnerungs-Datei (Kalender, täglich) ---------- */
function buildICS(time, url) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + 10);
  const endStr = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
  const link = (url || "").replace(/#.*$/, "") + "#abend";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Haut-Cockpit//DE", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:haut-cockpit-abend@lokal", "DTSTAMP:" + stamp,
    `DTSTART:${ymd}T${pad(h)}${pad(m)}00`, "DTEND:" + endStr, "RRULE:FREQ=DAILY", "SUMMARY:Haut-Cockpit Abend-Check",
    "DESCRIPTION:Juckreiz und Tag eintragen. " + link, "URL:" + link, "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Abend-Check", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

function downloadFile(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("In die Zwischenablage kopiert"); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Kopiert"); } catch (e2) { toast("Kopieren nicht möglich"); }
    ta.remove();
  }
}
