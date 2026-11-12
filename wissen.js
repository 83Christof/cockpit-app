"use strict";
/* Haut-Cockpit: Wissen-Tab mit Rezepten, Lebensmittel-Datenbank und Studien-Tipps */

function viewRezepte() {
  const tabs = [["rezepte", "Rezepte"], ["datenbank", "Datenbank"], ["tipps", "Studien-Tipps"]];
  const t = ui.rezTab;
  return `<div class="topbar"><h1>Wissen</h1></div>
  <div class="seg">${tabs.map(([id, l]) => `<button class="${t === id ? "on" : ""}" data-act="rt" data-t="${id}">${l}</button>`).join("")}</div>
  ${t === "rezepte" ? viewRezeptList() : t === "datenbank" ? viewDatenbank() : viewTipps()}`;
}

function dbList() {
  const q = normTxt(ui.dbq || ""), f = ui.dbf;
  const rows = FOODS.filter(x => (f === "alle" || x.r === f) && !(S.profile.hideFruit && x.tags.includes("fruit")) && (!q || x.nsyn.some(s => s.includes(q))));
  const order = { r: 0, y: 1, g: 2 };
  rows.sort((a, b) => order[a.r] - order[b.r] || a.name.localeCompare(b.name, "de"));
  if (!rows.length) return `<p class="muted">Nichts gefunden. Im Tagebuch kannst du alles eintippen, unbekannte Einträge schickst du mir per Knopf.</p>`;
  const head = { r: "Meiden", y: "In Maßen", g: "Passt" };
  let html = "", cur = "";
  rows.forEach(x => {
    if (x.r !== cur) { cur = x.r; html += `<h3 class="dbh">${dot(cur)} ${head[cur]}</h3>`; }
    html += `<div class="item"><span class="lamp r-${x.r}"></span><div class="im"><strong>${esc(x.name)}</strong><span class="why">${esc(x.why)}</span><span class="muted small">${x.kcal} kcal und ${fmtNum(x.p)} g Protein pro 100 g</span></div></div>`;
  });
  return html;
}

function viewDatenbank() {
  const fl = [["alle", "Alle"], ["r", "Meiden"], ["y", "In Maßen"], ["g", "Passt"]];
  return `<section class="card"><label class="label" for="dbq">Lebensmittel suchen</label>
    <input id="dbq" type="search" placeholder="z. B. Käse, Bier, Lachs" value="${esc(ui.dbq)}" data-bind="dbq" autocomplete="off">
    <div class="chips">${fl.map(([id, l]) => `<button class="chip btnchip ${ui.dbf === id ? "on" : ""}" data-act="dbf" data-f="${id}">${l}</button>`).join("")}</div>
    <p class="muted small">Die Ampel warnt vor Lebensmitteln, die Schuppenflechte begünstigen können. Kalorien und Protein stehen nur zur Orientierung dabei.</p></section>
  <section class="card" id="dblist">${dbList()}</section>`;
}

function viewTipps() {
  const lnk = (u, l) => `<li><a href="${u}" target="_blank" rel="noopener noreferrer">${esc(l)}</a></li>`;
  return `<section class="card"><h2>Was die Studien sagen</h2>
    <p class="muted small">Stufen: ${Object.entries(EVIDENCE).map(([k, v]) => `<b>${k}</b> ${esc(v)}`).join(" · ")}. Fast alles sind Hinweise aus Beobachtung, keine Beweise.</p></section>
  ${TIPS.map(t => `<details class="card tip"><summary><span class="lamp r-${t.r}"></span><div class="rs"><strong>${esc(t.t)}</strong><span class="muted small">Stufe ${t.ev}: ${esc(EVIDENCE[t.ev])}</span></div></summary><p>${esc(t.s)}</p><p class="note">${esc(t.d)}</p></details>`).join("")}
  <section class="card"><h2>Deine Medikamente und das Essen</h2>${MED_TIPS.map(m => `<p><strong>${esc(m.t)}</strong><br>${esc(m.d)}</p>`).join("")}</section>
  <section class="card"><h2>Quellen</h2><ul class="small">
    ${lnk("https://www.cochrane.org/CD011972/SKIN_lifestyle-changes-treating-psoriasis", "Cochrane 2019: Lifestyle changes for treating psoriasis")}
    ${lnk("https://jamanetwork.com/journals/jamadermatology/fullarticle/1690928", "Jensen 2013, JAMA Dermatol: Effect of weight loss on severity of psoriasis (RCT)")}
    ${lnk("https://pmc.ncbi.nlm.nih.gov/articles/PMC9234314/", "Chung 2022: Dietary intervention and supplements in psoriasis")}
    ${lnk("https://pmc.ncbi.nlm.nih.gov/articles/PMC8747310", "Garbicz 2022, Nutrients: Nutritional therapy in persons suffering from psoriasis")}
    ${lnk("https://pmc.ncbi.nlm.nih.gov/articles/PMC12920720", "Zanesco 2026, APPLE-Umfrage: Makronährstoffe und Schweregrad")}
    ${lnk("https://www.dovepress.com/sugary-drinks-and-high-fat-foods-are-associated-with-poor-treatment-re-peer-reviewed-fulltext-article-PTT", "Song 2026: Zuckergetränke, fettreiche Speisen, Rauchen, Alkohol und Therapieansprechen")}
    ${lnk("https://pmc.ncbi.nlm.nih.gov/articles/PMC6896351", "Yang und Chi 2019: Fischöl bei Psoriasis, Meta-Analyse")}
    ${lnk("https://pmc.ncbi.nlm.nih.gov/articles/PMC9007593", "van Acht 2022: Lifestyle changes and psoriasis severity")}
    ${lnk("https://zendy.io/title/10.1111/bjd.12670", "Armstrong 2014, Br J Dermatol: Psoriasis and smoking, Meta-Analyse")}
    ${lnk("https://www.medicines.org.uk/emc/product/101237/smpc", "Allegra (Bilastin) 20 mg, Fachinformation")}
    ${lnk("https://www.medicines.org.uk/emc/files/pil.7480.pdf", "Skilarence, Patienteninformation")}
  </ul></section>`;
}
