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
  return { profile: { weight: null, height: null, kcalMax: 1900, protPerKg: 1.4, protMin: null, reminder: "21:00", watch: [], appUrl: "", hideFruit: true, custom: [], alias: {}, therapy: "", meds: { sk: "", skD: ["", "", ""], ah: "", ahMax: null, cr: "", fo: "" } }, days: {}, offCache: {}, scanHistory: [], altCache: {} };
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
function day(k) { if (!S.days[k]) S.days[k] = { meals: [], meds: {}, check: null, episodes: [] }; if (!S.days[k].episodes) S.days[k].episodes = []; return S.days[k]; }
/* Mögliche Doppeleinträge eines Tages: gleiche Mahlzeit, gleicher Name, gleiche Menge (der erste bleibt unmarkiert) */
function dupIds(k) {
  const d = S.days[k], seen = new Set(), dup = new Set();
  if (!d) return dup;
  d.meals.slice().sort((a, b) => (a.time || "").localeCompare(b.time || "")).forEach(m => m.items.forEach(i => {
    const key = m.slot + "|" + i.name + "|" + (i.g ?? "");
    if (seen.has(key)) dup.add(i.id); else seen.add(key);
  }));
  return dup;
}

/* Lebensmittel zur passenden Mahlzeit desselben Tages hinzufügen (gleiche Mahlzeit, höchstens 2 Stunden Abstand) */
function addToMeal(k, slot, time, items) {
  const d = day(k);
  let m = d.meals.find(x => x.slot === slot && x.time && Math.abs(toMin(x.time) - toMin(time)) <= 120);
  if (!m) { m = { id: uid(), slot, time, t: Date.now(), items: [] }; d.meals.push(m); }
  m.items.push(...items);
  return m;
}
/* ---------- Uhrzeiten ---------- */
const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const SLOT_TIME = { "Frühstück": "07:30", "Mittagessen": "12:30", "Abendessen": "19:00", "Snack": "15:30" };
const toMin = t => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
const DAYPARTS = [["morgens", "Morgens (5-9)", 5, 9], ["vormittags", "Vormittags (9-12)", 9, 12], ["mittags", "Mittags (12-14)", 12, 14], ["nachmittags", "Nachmittags (14-18)", 14, 18], ["abends", "Abends (18-22)", 18, 22], ["nachts", "Nachts (22-5)", 22, 29]];
function partOf(time) { let h = parseInt(time.slice(0, 2), 10); if (h < 5) h += 24; return (DAYPARTS.find(p => h >= p[2] && h < p[3]) || DAYPARTS[5])[0]; }
const defaultMealTime = (slot, k) => k === dkey() ? nowTime() : (SLOT_TIME[slot] || "12:00");
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

/* Eigene Lebensmittel (auf dem Gerät gespeichert) */
if (!Array.isArray(S.profile.custom)) S.profile.custom = [];
if (!S.profile.alias || typeof S.profile.alias !== "object") S.profile.alias = {};
function foodFromCustom(x) {
  return { name: x.name, syn: [x.name.toLowerCase()], nsyn: [normTxt(x.name)], kcal: x.kcal, p: x.p, r: x.r, portion: x.portion || 100, unit: x.unit || "Portion", tags: [], why: x.why || "Eigener Eintrag", custom: true };
}
S.profile.custom.forEach(x => FOODS.push(foodFromCustom(x)));

const NUMWORDS = { ein: 1, eine: 1, einen: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, halbe: 0.5, halbes: 0.5, halber: 0.5, anderthalb: 1.5 };
const UNIT_G = { g: 1, gr: 1, gramm: 1, kg: 1000, ml: 1, l: 1000, el: null, tl: 5, tasse: 200, tassen: 200, glas: 200, glaeser: 200, dose: 330, becher: 150, handvoll: 25, schale: 150 };

function splitMeals(text) {
  // Ein Komma zwischen Ziffern ist ein Dezimalkomma ("0,5 l", "1,5 Teller") und trennt keine Einträge
  return text.replace(/\n/g, ";").split(/(?<!\d),|,(?!\d)|;|\+|\bund\b|\bmit\b|\bsowie\b|\//i).map(s => s.trim()).filter(Boolean);
}

const UNIT_RE = "x|g|gr|gramm|kg|ml|l|el|tl|scheibe|scheiben|stk|stück|stueck|stücke|stuecke|portion|portionen|tasse|tassen|glas|gläser|glaeser|dose|dosen|becher|handvoll|schale|schalen|teller|tellern|schüssel|schüsseln|schuessel|schuesseln|kelle|kellen|krug|flasche|flaschen";
const GRAM_UNITS = ["g", "gr", "gramm", "kg", "ml", "l", "tl"];
const canonUnit = u => { u = normTxt(u || ""); return /^(stk|stuc|stue)/.test(u) ? "stueck" : u.slice(0, 4); };

function parseToken(tok) {
  let t = tok.replace(/½/g, "0.5").replace(/¼/g, "0.25").trim();
  let qty = 1, unit = null, rest = t, factor = 1;
  let m = t.match(new RegExp("^(\\d+(?:[.,]\\d+)?|ein|eine|einen|einem|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|halbe|halbes|halber|anderthalb)\\s*(" + UNIT_RE + ")?\\.?\\s+(.+)$", "i"));
  if (m) {
    const n = m[1].toLowerCase();
    qty = NUMWORDS[n] ?? parseFloat(n.replace(",", "."));
    unit = (m[2] || "").toLowerCase() || null; rest = m[3];
  } else {
    m = t.match(new RegExp("^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(" + UNIT_RE + ")\\.?$", "i"));
    if (m) { rest = m[1]; qty = parseFloat(m[2].replace(",", ".")); unit = m[3].toLowerCase(); }
  }
  rest = rest.replace(/\b(teller|tellern|schüssel\w*|schuessel\w*|portion\w*)\b/gi, " ").replace(/\b(klein\w*|groß\w*|gross\w*|halb\w*)\b/gi, w => { const l = w.toLowerCase(); factor *= l.startsWith("klein") ? 0.7 : l.startsWith("halb") ? 0.5 : 1.3; return " "; }).replace(/\s+/g, " ").trim();
  return { qty: isFinite(qty) ? qty : 1, unit, rest, factor };
}

/* Zuordnung Text -> Lebensmittel: gemerkte Zuordnung zuerst, dann ganzes Wort (mit Plural), dann Wortende eines zusammengesetzten Worts */
function matchFood(txt) {
  const n = normTxt(txt);
  const al = S.profile.alias[n];
  if (al) { const f = FOODS.find(x => x.name === al); if (f) return f; }
  const words = n.split(" ").filter(Boolean), padded = " " + n + " ";
  let best = null, bestScore = 0;
  for (const f of FOODS) {
    for (const s of f.nsyn) {
      let sc = 0;
      if (s.includes(" ")) { if (padded.includes(" " + s + " ")) sc = s.length + 6; }
      else {
        const plurals = s.length <= 3 ? [""] : ["", "e", "n", "en", "s", "er"];
        for (const w of words) {
          if (plurals.some(p => w === s + p)) sc = Math.max(sc, s.length + 4);
          else if (s.length >= 4 && w.length > s.length && w.endsWith(s)) sc = Math.max(sc, s.length + 1);
          else if (s.length >= 6 && w.startsWith(s) && w.length - s.length <= 3) sc = Math.max(sc, s.length - 1);
        }
      }
      if (sc > bestScore) { best = f; bestScore = sc; }
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

/* mode "p": qty Einheiten (Stück, Teller, Portion), mode "g": qty Gramm */
/* Flüssigkeiten werden in ml angezeigt */
const LIQ_UNITS = ["Glas", "Dose", "Tasse", "Flasche"];
const isLiquid = f => !!f && (LIQ_UNITS.includes(f.unit) || f.name === "Schnaps");
const unitOfFood = f => isLiquid(f) ? "ml" : "g";
function itemUnit(i) {
  if (i.liq !== undefined) return i.liq ? "ml" : "g";
  return unitOfFood(FOODS.find(x => x.name === (i.food || i.name)));
}

/* Anzeigename: bei Sammelbegriffen steht das getippte Wort dabei, z. B. "Gemüse (Brokkoli)" */
function foodLabel(food, rest) {
  const k = normTxt(rest || ""), f = normTxt(food.name);
  if (!k || f.includes(k) || (k.startsWith(f) && k.length - f.length <= 2)) return food.name;
  const r = rest.trim();
  if (k.includes(f)) return r.charAt(0).toUpperCase() + r.slice(1);
  return food.name + " (" + r.charAt(0).toUpperCase() + r.slice(1) + ")";
}
function foodItem(food, g, text, qty, mode, key, rest) {
  const item = { id: uid(), name: foodLabel(food, rest), food: food.name, rest: rest || "", text, key, qty, mode, g: Math.round(g), kcal: Math.round(food.kcal * g / 100), p: r1(food.p * g / 100), r: food.r, tags: [...food.tags], why: food.why, src: "db", liq: isLiquid(food) };
  const w = watchHit(item);
  if (w.length) { item.watch = w; if (item.r === "g") item.r = "y"; item.why += " Auf deiner Beobachtungsliste: " + w.join(", ") + "."; }
  return item;
}
function recalcItem(it) {
  const food = FOODS.find(f => f.name === it.food); if (!food) return;
  const g = it.mode === "g" ? it.qty : it.qty * food.portion;
  it.g = Math.round(g); it.kcal = Math.round(food.kcal * g / 100); it.p = r1(food.p * g / 100);
}
/* anderes Lebensmittel zuordnen, Menge bleibt, Zuordnung wird gemerkt */
function applyFood(it, food) {
  const mode = it.mode || "p", qty = it.qty > 0 ? it.qty : 1, id = it.id, key = it.key;
  const nu = foodItem(food, mode === "g" ? qty : qty * food.portion, it.text, qty, mode, key, it.rest);
  Object.keys(it).forEach(k => delete it[k]);
  Object.assign(it, nu, { id });
  if (key) { S.profile.alias[key] = food.name; save(); }
}

function parseMeal(text) {
  return splitMeals(text).map(tok => {
    const { qty, unit, rest, factor } = parseToken(tok);
    const key = normTxt(rest);
    const food = matchFood(rest);
    const isG = unit && GRAM_UNITS.includes(unit);
    if (!food) return { id: uid(), name: rest || tok, rest: rest || "", text: tok, key, food: null, qty: isG ? (unit === "kg" || unit === "l" ? qty * 1000 : unit === "tl" ? qty * 5 : qty) : qty * factor, mode: isG ? "g" : "p", g: null, kcal: null, p: null, r: "u", tags: [], why: "Nicht in der Datenbank. Über zuordnen ein Lebensmittel wählen oder neu anlegen.", src: "unknown" };
    let g, mode = "p", q = qty * factor;
    if (isG) { g = qty * ({ kg: 1000, l: 1000, tl: 5 }[unit] || 1); mode = "g"; q = g; }
    else if (unit && canonUnit(unit) === canonUnit(food.unit)) g = q * food.portion;
    else if (unit === "el") { g = q * (food.unit === "EL" ? food.portion : 15); mode = "g"; q = g; }
    else if (unit && ({ tasse: 200, tassen: 200, glas: 200, glaeser: 200, gläser: 200, dose: 330, dosen: 330, becher: 150, handvoll: 25, schale: 150, schalen: 150, krug: 500, flasche: 500, flaschen: 500, kelle: 150, kellen: 150 })[unit]) { g = q * ({ tasse: 200, tassen: 200, glas: 200, glaeser: 200, gläser: 200, dose: 330, dosen: 330, becher: 150, handvoll: 25, schale: 150, schalen: 150, krug: 500, flasche: 500, flaschen: 500, kelle: 150, kellen: 150 })[unit]; mode = "g"; q = g; }
    else g = q * food.portion;
    return foodItem(food, g, tok, q, mode, key, rest);
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
  let lastErr = null;
  for (let i = 0; i < 2; i++) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 10000);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, { signal: ctl.signal });
      if (r.status === 404) return { code, notFound: true };
      if (!r.ok) lastErr = new Error("Antwort " + r.status);
      else {
        const j = await r.json();
        if (j.status !== 1 || !j.product) return { code, notFound: true };
        const p = normalizeOFF(code, j.product);
        S.offCache[code] = p; save();
        return p;
      }
    } catch (e) { lastErr = e.name === "AbortError" ? new Error("Zeitüberschreitung") : new Error("keine Verbindung"); }
    finally { clearTimeout(to); }
    await new Promise(res => setTimeout(res, 1500));
  }
  throw lastErr || new Error("unbekannter Fehler");
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
  return { id: uid(), liq: p.cats.includes("en:beverages") || p.cats.includes("en:waters"), name: (p.brand ? p.brand + " " : "") + p.name, text: "Scan " + p.code, g: Math.round(g), kcal: p.kcal != null ? Math.round(p.kcal * g / 100) : null, p: p.prot != null ? r1(p.prot * g / 100) : null, r: ev.r, tags: ev.tags, why: ev.reasons.filter(x => x.k === "neg").map(x => x.t).join(" ") || "Scan-Bewertung", src: "scan", code: p.code };
}


/* ---------- Mengen-Einheiten beim Scan ---------- */
function parseQty(q) {
  const s = (q || "").toLowerCase().replace(",", ".");
  const toG = (v, u) => (u === "kg" || u === "l") ? v * 1000 : u === "cl" ? v * 10 : v;
  let m = s.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|cl|ml)/);
  if (m) { const n = +m[1], each = toG(+m[2], m[3]); return { pieces: n, each, total: n * each }; }
  m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|cl|ml)/);
  return m ? { total: toG(+m[1], m[2]) } : {};
}
function unitOptions(p) {
  const bev = p.cats.includes("en:beverages") || p.cats.includes("en:waters");
  const o = [{ id: "g", label: bev ? "ml" : "g", g: 1 }];
  const q = parseQty(p.qty);
  const gu = bev ? "ml" : "g";
  if (p.serving) o.push({ id: "portion", label: "Portion (" + Math.round(p.serving) + " " + gu + ")", g: p.serving });
  if (q.each) o.push({ id: "piece", label: "Stück (" + Math.round(q.each) + " " + gu + ")", g: q.each });
  if (q.total) o.push({ id: "pack", label: (bev ? "Flasche/Dose (" : "Packung (") + Math.round(q.total) + " " + gu + ")", g: q.total });
  o.push({ id: "custom", label: "Stück (Gewicht selbst eintragen)", g: null });
  return o;
}
function initScanQty(p) {
  const ids = unitOptions(p).map(o => o.id);
  const unit = ids.includes("portion") ? "portion" : ids.includes("piece") ? "piece" : "g";
  return { unit, amount: unit === "g" ? 100 : 1, each: Math.round(p.serving || parseQty(p.qty).each || 30) };
}
function spGrams(sp) {
  if (sp.unit === "custom") return Math.max(0, (sp.amount || 0) * (sp.each || 0));
  const o = unitOptions(sp.p).find(x => x.id === sp.unit) || { g: 1 };
  return Math.max(0, (sp.amount || 0) * (o.g || 1));
}

/* ---------- Alternativen aus derselben Kategorie (Open Food Facts Suche) ---------- */
const RANK = { g: 0, y: 1, r: 2, u: 3 };
const GENERIC_CATS = ["en:foods", "en:plant-based-foods-and-beverages", "en:plant-based-foods"];
const tagLabel = t => t.replace(/^en:/, "").replace(/-/g, " ");

/* Open Food Facts begrenzt Suchanfragen (ca. 10 pro Minute). Darum wenige Versuche mit Pausen:
   zweimal mit Deutschland-Filter, zuletzt einmal ohne Filter. */
async function searchOFF(tag, cancelled) {
  const base = "https://world.openfoodfacts.org/api/v2/search?page_size=40&sort_by=unique_scans_n&categories_tags=" + encodeURIComponent(tag);
  const urls = [base + "&countries_tags=en:germany&fields=code," + OFF_FIELDS, base + "&countries_tags=en:germany&fields=code," + OFF_FIELDS, base + "&fields=code," + OFF_FIELDS];
  const pauses = [0, 6000, 9000];
  for (let i = 0; i < urls.length; i++) {
    if (pauses[i]) await new Promise(res => setTimeout(res, pauses[i]));
    if (cancelled && cancelled()) throw new Error("abgebrochen");
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 12000);
    try { const r = await fetch(urls[i], { signal: ctl.signal }); if (r.ok) { const j = await r.json(); return j.products || []; } }
    catch (e) { /* nächster Versuch */ }
    finally { clearTimeout(to); }
  }
  throw new Error("Suche fehlgeschlagen");
}

async function findAlternatives(p, ev, cancelled) {
  if (ev.tags.includes("alc")) return { t: Date.now(), tag: "", items: [], note: "Bei Alkohol gibt es keine bessere Variante in der gleichen Kategorie. Alternativen: Wasser, ungesüßter Tee, Kaffee ohne Zucker." };
  const tags = p.cats.filter(c => c.startsWith("en:") && !GENERIC_CATS.includes(c));
  if (!tags.length) return { t: Date.now(), tag: "", items: [], note: "Zu diesem Produkt ist keine Kategorie hinterlegt." };
  const hit = S.altCache[p.code];
  if (hit && Date.now() - hit.t < 7 * 864e5) return hit;
  const cand = tags.slice(-3).reverse();
  const seen = new Set(), items = []; let usedTag = cand[0];
  for (const tag of cand) {
    usedTag = tag;
    const prods = await searchOFF(tag, cancelled);
    for (const raw of prods) {
      if (!raw.code || raw.code === p.code || seen.has(raw.code)) continue;
      seen.add(raw.code);
      const q = normalizeOFF(raw.code, raw);
      if (q.name === "Produkt ohne Namen") continue;
      if (q.kcal == null || q.sugar == null || q.sat == null) continue; // unvollständige Daten würden fälschlich grün wirken
      const bevP = p.cats.includes("en:beverages");
      const cap = Math.min(bevP ? 4.5 : 12.5, Math.max(p.sugar == null ? 99 : p.sugar, 3));
      if (q.sugar > cap) continue;
      if (p.sat != null && q.sat > p.sat + 0.5) continue;
      const e = evalProduct(q);
      if (RANK[e.r] < RANK[ev.r]) items.push({ code: q.code, name: q.name, brand: q.brand, r: e.r, score: e.score, sugar: q.sugar, sat: q.sat, prot: q.prot });
    }
    if (items.filter(x => x.r === "g").length >= 3) break;
  }
  items.sort((a, b) => RANK[a.r] - RANK[b.r] || a.score - b.score);
  const names = new Set(), top = [];
  for (const x of items) { const k = (x.brand + "|" + x.name).toLowerCase(); if (names.has(k)) continue; names.add(k); top.push(x); if (top.length >= 5) break; }
  const out = { t: Date.now(), tag: tagLabel(usedTag), items: top };
  if (p.cats.includes("en:beverages")) out.extra = "Immer geeignet: Wasser, Mineralwasser mit Zitrone, ungesüßter Tee.";
  S.altCache[p.code] = out;
  const ks = Object.keys(S.altCache); if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete S.altCache[k]);
  save();
  return out;
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
