/* Haut-Cockpit: Lebensmitteldatenbank, Rezepte, Regeln.
   Werte sind Näherungen (pro 100 g/ml bzw. pro Standardportion) und dienen der Orientierung.
   Ampel: g = grün (passt), y = gelb (in Maßen), r = rot (meiden).
   Grundlage: siehe recherche-psoriasis-ernaehrung.md (Evidenzstufen A-D). */

const TAGS = {
  alc: "Alkohol", sugar: "Zucker/Süßes", sugarDrink: "Zuckergetränk", upf: "Ultra-verarbeitet",
  satfat: "Gesättigte Fette", gluten: "Gluten", dairy: "Milchprodukte", nightshade: "Nachtschatten",
  spicy: "Scharf", redmeat: "Rotes Fleisch", procmeat: "Wurst/verarbeitetes Fleisch", fastfood: "Fast Food",
  juice: "Fruchtsaft", coffee: "Kaffee", fish: "Fisch", veg: "Gemüse/Obst", fried: "Frittiert"
};

/* Zeile: Name | Synonyme (Komma) | kcal/100g | Protein/100g | Ampel | Portion g | Einheit | Tags | Begründung */
const FOOD_ROWS = `
Ei|eier,spiegelei,rührei,ruehrei,omelett,gekochtes ei,hartgekochtes ei,frühstücksei|143|12.6|g|55|Stück||Gute Proteinquelle, kaum Zucker
Eiweiß|eiklar|52|11|g|33|Stück||Reines Protein
Magerquark|quark,quark mager|67|12|g|150|Portion|dairy|Viel Protein, wenig Fett
Skyr|skyr natur,skyr naturell|63|11|g|150|Portion|dairy|Viel Protein, wenig Zucker (ungesüßt)
Skyr Frucht|skyr vanille,skyr erdbeere,fruchtskyr|85|9|y|150|Portion|dairy sugar|Gesüßt, besser Natur plus frische Früchte
Naturjoghurt|joghurt natur,joghurt,naturjoghurt 1,5|55|4|g|150|Portion|dairy|Ungesüßt gut verträglich
Griechischer Joghurt|griechischer joghurt,joghurt griechisch|115|5|y|150|Portion|dairy satfat|Viel gesättigtes Fett, lieber 0,2 % oder Skyr
Fruchtjoghurt|joghurt frucht,fruchtjoghurt,erdbeerjoghurt|95|3.5|r|150|Portion|dairy sugar upf|Viel Zucker, oft verarbeitet
Hüttenkäse|hüttenkäse,huettenkaese,körniger frischkäse|98|12|g|100|Portion|dairy|Viel Protein
Frischkäse|frischkäse,frischkaese|240|6|y|30|Portion|dairy satfat|Gesättigtes Fett, in Maßen; Light-Variante besser
Mozzarella|mozzarella,büffelmozzarella|250|18|y|60|Portion|dairy satfat|Protein, aber gesättigtes Fett
Gouda|gouda,käse,edamer,emmentaler,bergkäse,hartkäse,käsescheibe|356|25|y|30|Scheibe|dairy satfat|Gesättigtes Fett, 1 Scheibe geht
Parmesan|parmesan,grana padano|392|36|y|10|EL|dairy satfat|Kleine Menge unkritisch
Feta|feta,schafskäse|264|14|y|50|Portion|dairy satfat|In Maßen
Butter|butter,streichfett|740|0.7|y|10|Portion|dairy satfat|Gesättigtes Fett, dünn streichen
Margarine|margarine,halbfettmargarine|360|0|y|10|Portion|upf|Verarbeitet, in Maßen
Olivenöl|olivenöl,oliven öl,öl,rapsöl|884|0|g|10|EL||Ungesättigte Fette, mediterran
Sahne|sahne,schlagsahne,schmand,crème fraîche,creme fraiche|300|2.5|y|30|EL|dairy satfat|Gesättigtes Fett
Milch|milch,vollmilch,kuhmilch|64|3.4|y|200|Glas|dairy satfat|Vollmilch in Maßen, fettarm besser
Milch fettarm|milch 1,5,fettarme milch,h-milch 1,5|47|3.4|g|200|Glas|dairy|Wenig gesättigtes Fett
Hafermilch|hafermilch,haferdrink,sojadrink,sojamilch,mandelmilch|45|1|g|200|Glas||Ungesüßt unkritisch
Milchkaffee|latte,latte macchiato,cappuccino,milchkaffee,flat white|55|3|y|250|Tasse|dairy coffee|Milch plus Sirup oft Zucker
Kaffee|kaffee,espresso,filterkaffee,americano|2|0.1|g|200|Tasse|coffee|Bis ca. 3 Tassen unkritisch, Datenlage gemischt
Tee|tee,kräutertee,gruener tee,grüner tee,pfefferminztee,früchtetee,schwarzer tee|1|0|g|250|Tasse||Ungesüßt gut
Wasser|wasser,mineralwasser,sprudel,leitungswasser,schorle ungesüßt|0|0|g|250|Glas||Beste Wahl
Cola|cola,coca cola,pepsi,limo,limonade,fanta,sprite,eistee,ice tea,softdrink,energy,energydrink,red bull,monster|42|0|r|330|Dose|sugar sugarDrink upf|Zuckergetränke: Zusammenhang mit schlechterem Therapieansprechen
Cola Zero|cola zero,cola light,zero,light getränk,diet cola|1|0|y|330|Dose|upf|Zuckerfrei, aber Süßstoffe; Datenlage fehlt, in Maßen
Apfelsaft|apfelsaft,orangensaft,saft,multivitaminsaft,traubensaft,grapefruitsaft,fruchtsaft|46|0.1|y|200|Glas|sugar juice|Viel Zucker. Saft senkt die Aufnahme mancher Antihistaminika (Abstand zur Einnahme beachten)
Apfelschorle|apfelschorle,saftschorle,schorle|22|0|y|300|Glas|sugar juice|Zuckerärmer, Abstand zu Antihistaminika beachten
Bier|bier,pils,weizen,weißbier,radler,alkoholfreies bier,helles,export|43|0.5|r|500|Glas|alc gluten|Alkohol: Risikofaktor, bei Fumarsäureestern zusätzlich Magen-Darm-Belastung
Wein|wein,rotwein,weißwein,weisswein,sekt,prosecco,champagner,aperol,spritz|80|0.1|r|150|Glas|alc|Alkohol: Risikofaktor, bei Fumarsäureestern zusätzlich Magen-Darm-Belastung
Schnaps|schnaps,whisky,wodka,gin,rum,likör,cocktail,jägermeister,korn,obstler|230|0|r|40|Portion|alc|Spirituosen sind bei Fumarsäureestern ausdrücklich zu meiden
Vollkornbrot|vollkornbrot,körnerbrot,schwarzbrot,roggenbrot,pumpernickel,mehrkornbrot,dinkelvollkornbrot|215|8|g|50|Scheibe|gluten|Ballaststoffe, sättigt
Brot|brot,mischbrot,graubrot,bauernbrot,toast,toastbrot,weißbrot,baguette|250|8|y|50|Scheibe|gluten|Helles Brot hat weniger Ballaststoffe
Vollkornbrötchen|vollkornbrötchen,vollkornbroetchen,körnerbrötchen,dinkelbrötchen|235|9|g|70|Stück|gluten|Ballaststoffe
Brötchen|brötchen,broetchen,semmel,weizenbrötchen,laugenbrötchen,laugenbrezel,brezel,breze|275|9|y|60|Stück|gluten|Helles Weizenmehl, schnell verdaulich
Croissant|croissant,butterhörnchen,plunderstück,plunder,berliner,donut,krapfen,nussecke|400|7|r|60|Stück|gluten sugar satfat upf|Zucker und gesättigtes Fett
Kuchen|kuchen,torte,gebäck,muffin,keks,kekse,cookie,waffel,brownie,apfelstrudel,streuselkuchen|420|5|r|80|Stück|gluten sugar satfat upf|Zucker und gesättigtes Fett
Haferflocken|haferflocken,porridge,haferbrei,overnight oats,oats|370|13|g|50|Portion|gluten|Ballaststoffe und Protein (Hafer enthält teils Gluten-Spuren)
Müsli|müsli,muesli,granola,knuspermüsli,crunchy|400|10|y|50|Portion|gluten sugar|Oft viel Zucker, ungesüßtes Müsli wählen
Cornflakes|cornflakes,frühstückscerealien,cerealien,choco,frosties,schokomüsli,pops|380|7|r|40|Portion|gluten sugar upf|Stark verarbeitet, viel Zucker
Reis|reis,basmatireis,jasminreis,vollkornreis,naturreis,milchreis ungesüßt|130|2.7|g|180|Portion||Neutral, Vollkorn besser
Nudeln|nudeln,spaghetti,penne,pasta,tagliatelle,fusilli,makkaroni|150|5|y|220|Portion|gluten|Neutral, Vollkorn besser, Soße beachten
Vollkornnudeln|vollkornnudeln,vollkornpasta,vollkornspaghetti|150|6|g|220|Portion|gluten|Ballaststoffe
Quinoa|quinoa,hirse,hirsebrei,couscous,bulgur,buchweizen,polenta,amaranth,dinkel|120|4.5|g|180|Portion|gluten|Ballaststoffe, Vollkorn-Beilage
Sushi|sushi,maki,nigiri,sashimi,poke bowl|150|6|y|250|Portion|fish|Fisch gut, weißer Reis und süße Soßen in Maßen
Pesto|pesto,pasta soße,sahnesoße,käsesoße,bechamel|450|4|y|20|EL|satfat|Fettreich, kleine Menge
Kartoffeln|kartoffeln,kartoffel,salzkartoffeln,pellkartoffeln,ofenkartoffel,bratkartoffeln,kartoffelpüree|85|2|g|250|Portion|nightshade|Neutral (Nachtschatten nur bei persönlichem Trigger)
Süßkartoffel|süßkartoffel,suesskartoffel|86|1.6|g|200|Portion||Ballaststoffe
Pommes|pommes,pommes frites,fritten,kroketten,rösti,reibekuchen|300|3.5|r|150|Portion|fried upf satfat nightshade|Frittiert, verarbeitet
Linsen|linsen,rote linsen,linsensuppe,linseneintopf,dal|116|9|g|200|Portion|veg|Protein und Ballaststoffe
Kichererbsen|kichererbsen,falafel,hummus|164|9|g|150|Portion|veg|Protein und Ballaststoffe
Bohnen|bohnen,kidneybohnen,weiße bohnen,schwarze bohnen,edamame,erbsen,tofu|120|9|g|150|Portion|veg|Pflanzliches Protein
Lachs|lachs,räucherlachs,lachsfilet,graved lachs,forelle,makrele,hering,sardine,sardinen,matjes|200|20|g|150|Portion|fish|Omega-3, Protein
Thunfisch|thunfisch,thunfisch dose,thunfischsalat|116|26|g|100|Portion|fish|Viel Protein, wenig Fett (naturell)
Fisch|fisch,kabeljau,seelachs,pangasius,zander,scholle,garnelen,shrimps,meeresfrüchte|95|18|g|150|Portion|fish|Mageres Protein
Fischstäbchen|fischstäbchen,backfisch,fish and chips|220|12|y|120|Portion|fried upf|Paniert und verarbeitet
Hähnchenbrust|hähnchenbrust,hähnchen,huhn,hühnchen,chicken,pute,putenbrust,putenschnitzel,geflügel|110|23|g|150|Portion||Mageres Protein
Hähnchenschnitzel|schnitzel,hähnchenschnitzel,cordon bleu,nuggets,chicken nuggets,chickenburger,crispy chicken|240|15|r|150|Portion|fried upf satfat|Paniert und frittiert
Rindfleisch|rindfleisch,steak,rindersteak,hackfleisch,hack,rinderhack,gulasch,braten,schweinebraten,schweinefleisch,lamm,frikadelle,hacksteak|200|20|y|150|Portion|redmeat satfat|Rotes Fleisch mit gesättigtem Fett, in Maßen (mager wählen)
Wurst|wurst,salami,bratwurst,currywurst,wiener,würstchen,leberwurst,mettwurst,leberkäse,bockwurst,fleischwurst,speck,bacon,mortadella,teewurst,landjäger,kabanos,chorizo,pepperoni|320|14|r|60|Portion|procmeat satfat upf|Verarbeitetes Fleisch, viel gesättigtes Fett
Schinken|schinken,kochschinken,putenaufschnitt,hähnchenaufschnitt,geflügelwurst,aufschnitt|110|18|y|40|Scheibe|procmeat upf|Verarbeitet, aber mager: in Maßen
Burger|burger,cheeseburger,hamburger,big mac,whopper,mcdouble,mcchicken|260|13|r|200|Stück|fastfood fried satfat upf gluten|Fast Food: gesättigte Fette, Zucker in Brötchen und Soßen
Döner|döner,dönerkebab,kebab,dürüm,gyros,schawarma|215|14|y|350|Stück|fastfood satfat gluten spicy|Sehr unterschiedlich; Hähnchen-Döner mit viel Salat ist die bessere Wahl
Pizza|pizza,tiefkühlpizza,pizzastück,flammkuchen|265|11|r|300|Portion|gluten satfat upf nightshade|Viel Käse, Fertigteig, oft verarbeitet
Chips|chips,erdnussflips,flips,salzstangen,cracker,kräcker,popcorn gesüßt|520|6|r|40|Portion|fried upf satfat|Frittiert, ultra-verarbeitet
Schokolade|schokolade,schoki,riegel,schokoriegel,snickers,twix,mars,kinderschokolade,nutella,nugat,praline,pralinen|540|6|r|25|Portion|sugar satfat upf|Zucker und gesättigtes Fett
Zartbitterschokolade|zartbitter,zartbitterschokolade,bitterschokolade 70,dunkle schokolade|560|8|y|20|Portion|sugar satfat|Wenig Zucker, 1-2 Stück in Maßen
Süßigkeiten|süßigkeiten,gummibärchen,haribo,bonbons,lakritz,fruchtgummi,zuckerl,marshmallow|340|4|r|30|Portion|sugar upf|Reiner Zucker
Eis|eis,speiseeis,eiscreme,softeis,eisbecher|210|3.5|r|100|Portion|sugar satfat dairy|Zucker und gesättigtes Fett
Honig|honig,marmelade,konfitüre,sirup,ahornsirup,agavendicksaft,zucker,süßen|300|0.4|y|10|TL|sugar|Zucker bleibt Zucker, kleine Menge
Erdnussbutter|erdnussbutter,nussmus,mandelmus,tahini|600|25|y|15|EL||Gesunde Fette, aber energiedicht und oft mit Zucker
Nüsse|nüsse,nuss,mandeln,walnüsse,walnuss,haselnüsse,cashews,cashew,pistazien,erdnüsse,paranüsse,studentenfutter,nussmischung|600|20|g|25|Portion||Ungesättigte Fette, Handvoll (25 g)
Samen|chiasamen,leinsamen,leinöl,sonnenblumenkerne,kürbiskerne,sesam,flohsamen|520|20|g|10|EL||Omega-3 und Ballaststoffe
Apfel|apfel,äpfel,birne,pfirsich,nektarine,kiwi,orange,mandarine,clementine,pflaume,aprikose,melone,wassermelone,ananas,trauben,weintrauben|55|0.4|g|150|Stück|veg fruit|Ganze Früchte mit Ballaststoffen
Banane|banane,bananen|90|1.2|g|120|Stück|veg fruit|Ballaststoffe, sättigt
Beeren|beeren,erdbeeren,himbeeren,heidelbeeren,blaubeeren,brombeeren,johannisbeeren,kirschen|45|0.8|g|120|Portion|veg fruit|Antioxidantien, wenig Zucker
Trockenfrüchte|trockenfrüchte,rosinen,datteln,feigen,trockenobst,fruchtriegel,fruchtschnitte|300|3|y|30|Portion|sugar fruit|Konzentrierter Zucker, kleine Menge
Gemüse|gemüse,brokkoli,blumenkohl,karotte,karotten,möhren,zucchini,spinat,salat,blattsalat,kopfsalat,rucola,gurke,kohl,rotkohl,weißkohl,fenchel,spargel,pilze,champignons,zwiebel,lauch,sellerie,kohlrabi,rosenkohl,mangold,rohkost,gemüsesticks,ofengemüse,gemüsepfanne,gemüsesuppe|35|2.5|g|200|Portion|veg|Ballaststoffe, Vitamine, kaum Kalorien
Tomate|tomate,tomaten,cherrytomaten,tomatensoße,tomatensauce,ketchup,passierte tomaten|20|1|g|120|Portion|nightshade veg|Verarbeitet (Soße, Dose, Ketchup) meist unkritisch. Nachtschatten wird in Umfragen manchmal als Trigger genannt, Studienbeleg fehlt
Paprika|paprika,aubergine,chili|30|1.5|g|120|Stück|nightshade veg|Nachtschatten: nur bei persönlichem Trigger relevant
Avocado|avocado|160|2|g|100|Stück|veg|Ungesättigte Fette, energiedicht
Oliven|oliven|145|1|g|30|Portion||Mediterran, salzig
Salat mit Dressing|caesar salat,salatteller,gemischter salat,bunter salat,hähnchensalat,thunfischsalat mit,wrap salat|120|6|g|300|Portion|veg|Mit leichtem Dressing gut
Wrap|wrap,wraps,tortilla,burrito,fajita|230|7|y|180|Stück|gluten|Hängt von Füllung und Soße ab; Hähnchen und Salat wählen
Sandwich|sandwich,belegtes brötchen,belegtes brot,baguette belegt,panini,subway|240|11|y|220|Stück|gluten|Hängt von Belag und Soße ab
Leberkäsebrötchen|leberkäsebrötchen,mettbrötchen,mettbroetchen,leberkässemmel,fleischkäsebrötchen,wurstbrötchen,schnitzelbrötchen|290|11|r|200|Stück|gluten procmeat satfat upf|Verarbeitetes Fleisch, gesättigtes Fett
Suppe|suppe,gemüsesuppe,hühnersuppe,erbsensuppe,eintopf,brühe|50|3|g|350|Portion|veg|Meist unkritisch, Sahne-Suppen beachten
Currywurst mit Pommes|currywurst pommes|290|8|r|350|Portion|procmeat fried satfat upf|Fast Food: verarbeitet, frittiert
Proteinriegel|proteinriegel,proteinriegel,eiweißriegel,protein bar,proteinshake,proteindrink,eiweißshake|370|30|y|50|Stück|sugar upf|Praktisch unterwegs, aber verarbeitet: Notlösung
Proteinpulver|proteinpulver,whey,eiweißpulver|380|78|y|30|Portion|dairy upf|Verarbeitet, Notlösung
Mayonnaise|mayo,mayonnaise,remoulade,salatsoße,dressing,caesar dressing|600|1|y|15|EL|satfat upf|Fettreich, in Maßen
Gemüsesticks mit Hummus|gemüsesticks hummus,hummus gemüse|90|3|g|200|Portion|veg|Gut für unterwegs
Pfannkuchen|pfannkuchen,eierkuchen,crêpe,crepes,palatschinken|200|6|y|120|Stück|gluten sugar|Mit Zucker/Nutella rot, mit Quark und Beeren gelb
Reiswaffel|reiswaffel,reiswaffeln,reiscracker,knäckebrot,knäcke|380|8|y|10|Stück|gluten|Wenig Ballaststoffe, schnell verdaulich
Fruchtmus|quetschie,fruchtquetschie,fruchtmus,apfelmus|60|0.3|y|100|Portion|sugar fruit|Zuckerhaltig, ganze Frucht besser
`;

function parseFoods(txt) {
  return txt.trim().split("\n").map(line => {
    const [name, syn, kcal, prot, r, portion, unit, tags, why] = line.split("|");
    return {
      name, syn: [name.toLowerCase(), ...syn.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)],
      kcal: +kcal, p: +prot, r, portion: +portion, unit, tags: tags ? tags.split(" ") : [], why
    };
  });
}
const FOODS = parseFoods(FOOD_ROWS);

/* Körperregionen für den Abend-Check. v = Ansicht (f vorne, b hinten) */
const REGIONS = [
  { id: "kopfhaut", label: "Kopfhaut", v: "b" }, { id: "gesicht", label: "Gesicht/Ohren", v: "f" },
  { id: "nacken", label: "Nacken", v: "b" }, { id: "brust", label: "Brust", v: "f" },
  { id: "bauch", label: "Bauch", v: "f" }, { id: "rueckenO", label: "Oberer Rücken", v: "b" },
  { id: "rueckenU", label: "Unterer Rücken", v: "b" }, { id: "gesaess", label: "Gesäß", v: "b" },
  { id: "leiste", label: "Leiste/Genital", v: "f" },
  { id: "armOL", label: "Oberarm links", v: "f" }, { id: "armOR", label: "Oberarm rechts", v: "f" },
  { id: "ellL", label: "Ellenbogen links", v: "b" }, { id: "ellR", label: "Ellenbogen rechts", v: "b" },
  { id: "armUL", label: "Unterarm links", v: "f" }, { id: "armUR", label: "Unterarm rechts", v: "f" },
  { id: "handL", label: "Hand links", v: "f" }, { id: "handR", label: "Hand rechts", v: "f" },
  { id: "beinOL", label: "Oberschenkel links", v: "f" }, { id: "beinOR", label: "Oberschenkel rechts", v: "f" },
  { id: "kniL", label: "Knie links", v: "f" }, { id: "kniR", label: "Knie rechts", v: "f" },
  { id: "beinUL", label: "Unterschenkel links", v: "b" }, { id: "beinUR", label: "Unterschenkel rechts", v: "b" },
  { id: "fussL", label: "Fuß links", v: "f" }, { id: "fussR", label: "Fuß rechts", v: "f" }
];
const REGION_LABEL = Object.fromEntries(REGIONS.map(r => [r.id, r.label]));

/* Rezepte. k = kcal pro Portion (ca.), p = Protein g, kind: unterwegs | vorbereiten | warm */
const RECIPES = [
  { id: "u1", kind: "unterwegs", title: "Eier, Vollkornbrötchen, Rohkost", when: "Frühstück/Mittag", k: 460, p: 30, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "5 Min"],
    items: ["2 gekochte Eier (Kühlregal, gepellt)", "1 Vollkornbrötchen", "1 Gurke oder 2 Karotten oder Paprika (roh)"],
    steps: ["Alles im Supermarkt kaufen, Gurke/Karotte waschen lassen oder abwischen.", "Ei pellen, mit Brötchen und Rohkost essen."],
    note: "Eine echte Mahlzeit, passend zu Tabletten, die zum Essen gehören. Paprika nur, wenn Nachtschatten kein Trigger ist." },
  { id: "u2", kind: "unterwegs", title: "Hähnchen-Wrap mit Gurke und Nüssen", when: "Mittag", k: 520, p: 34, r: "y",
    tags: ["ohne Besteck", "Supermarkt", "Kühlregal"],
    items: ["1 Vollkorn-Wrap mit Hähnchen und Salat (Kühlregal)", "1 Gurke oder Karotte", "1 kleine Handvoll Nüsse", "Wasser"],
    steps: ["Zutatenliste prüfen: wenige Soßen, kein süßes Dressing.", "Wrap im Scanner prüfen, Gurke und Nüsse dazu."],
    note: "Gelb, weil Fertig-Wraps oft Soßen mit Zucker und Fett enthalten. Scannen!" },
  { id: "u3", kind: "unterwegs", title: "Trinkjoghurt natur, Ei, Nüsse", when: "Frühstück", k: 380, p: 25, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "Tankstelle"],
    items: ["1 Trinkjoghurt oder Skyr-Drink ohne Zuckerzusatz (ca. 330 ml)", "1 hartgekochtes Ei (Kühlregal)", "1 Handvoll Nüsse (25 g, ungesalzen)"],
    steps: ["Zucker pro 100 g auf dem Etikett prüfen: unter 5 g wählen.", "Alles im Stehen verzehrfertig."],
    note: "Schnell, kein Besteck, überall erhältlich. Antihistaminika (z. B. Allegra) nach Packungsbeilage zeitlich von Essen und Saft trennen." },
  { id: "u4", kind: "unterwegs", title: "Lachsbrötchen mit Frischkäse", when: "Frühstück/Mittag", k: 390, p: 22, r: "g",
    tags: ["ohne Besteck", "Bäcker", "Omega-3"],
    items: ["1 Vollkornbrötchen mit Räucherlachs und Frischkäse (Bäcker oder Kühlregal)", "1 Gurke oder Karotte", "Wasser oder ungesüßter Tee"],
    steps: ["Im Backshop ein Vollkorn- oder Körnerbrötchen wählen.", "Keinen süßen Aufstrich oder Remoulade dazu nehmen."],
    note: "Omega-3 aus Fisch. Als Mahlzeit gut für Tabletten, die zum Essen gehören." },
  { id: "u5", kind: "unterwegs", title: "Gemüsesticks, Hummus, Putenaufschnitt", when: "Mittag", k: 430, p: 26, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "Fingerfood"],
    items: ["1 Packung Gemüsesticks mit Dip (Hummus)", "4 Scheiben Putenaufschnitt oder Hähnchenbrust-Aufschnitt", "1 Vollkornbrötchen"],
    steps: ["Aufschnitt auf das Brötchen legen, Gemüse in den Hummus tauchen."],
    note: "Aufschnitt ist verarbeitet (gelb): lieber mageren Geflügelaufschnitt als Wurst nehmen." },
  { id: "u6", kind: "unterwegs", title: "Tankstellen-Notfall", when: "Frühstück/Mittag", k: 340, p: 22, r: "y",
    tags: ["ohne Besteck", "Tankstelle", "Notlösung"],
    items: ["2 hartgekochte Eier", "Gurke oder Karotte, falls im Kühlregal", "1 Handvoll Nüsse", "Wasser statt Softdrink"],
    steps: ["Von Brötchen, Croissant, Chips und Cola die Finger lassen."],
    note: "Wenn nichts anderes offen hat. Besser als Fast Food." },
  { id: "u7", kind: "unterwegs", title: "Falafel-Wrap vom Imbiss", when: "Mittag", k: 560, p: 18, r: "y",
    tags: ["ohne Besteck", "Imbiss", "vegetarisch"],
    items: ["1 Falafel-Wrap mit viel Salat", "Soße: Joghurt statt Mayo, scharf weglassen", "Wasser"],
    steps: ["Frittierte Falafel sind gelb, aber mit Salat und Hülsenfrüchten besser als Burger."],
    note: "Notlösung: Frittiertes bleibt gelb." },
  { id: "u8", kind: "unterwegs", title: "Fast Food, wenn es nicht anders geht", when: "Notfall", k: 520, p: 28, r: "y",
    tags: ["ohne Besteck", "Burger-Restaurant", "Notlösung"],
    items: ["Hähnchen-Wrap oder Hähnchen-Salat (nicht paniert, wenn möglich)", "Wasser statt Cola", "Keine Pommes, stattdessen Salat oder Gemüsesticks", "Soße zur Seite oder weglassen"],
    steps: ["Zuerst nach gegrilltem statt paniertem Hähnchen fragen.", "Getränk: Wasser oder ungesüßter Tee."],
    note: "Das Menü wechselt, bitte vor Ort prüfen. Ziel: Frittiertes, Zucker und Alkohol meiden." },
  { id: "v1", kind: "vorbereiten", title: "Gemüse-Eier-Muffins", when: "Frühstück/Mittag", k: 330, p: 27, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "4 Tage haltbar", "kalt essbar"],
    items: ["8 Eier", "150 g Magerquark", "1 Zucchini (fein gerieben)", "1 Handvoll Spinat", "100 g Schinkenwürfel (mager, optional)", "Salz, Pfeffer, Kräuter"],
    steps: ["Ofen auf 180 Grad vorheizen, Muffinform fetten.", "Eier mit Quark verquirlen, Gemüse unterheben, würzen.", "In 12 Mulden füllen, 20 Min backen.", "Pro Portion 3 Muffins. Im Kühlschrank 4 Tage haltbar, kalt essbar."],
    note: "Etwa 110 kcal und 9 g Protein pro Muffin." },
  { id: "v2", kind: "vorbereiten", title: "Herzhafte Protein-Pfannkuchen-Rollen", when: "Frühstück/Mittag", k: 340, p: 32, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "Fingerfood"],
    items: ["60 g Haferflocken (fein gemahlen)", "2 Eier", "150 g Magerquark", "1 TL Backpulver", "Salz, Kräuter", "Füllung: 100 g Hüttenkäse oder Frischkäse light, 4 Scheiben Putenaufschnitt, Gurke"],
    steps: ["Alles pürieren, in beschichteter Pfanne dünne Pfannkuchen backen (ergibt 4).", "Auskühlen lassen, mit Frischkäse bestreichen, Aufschnitt und Gurke darauf, rollen.", "In Frischhaltefolie eingewickelt mitnehmen."],
    note: "Ohne Zucker, ohne Obst. Hält 3 Tage im Kühlschrank." },
  { id: "v3", kind: "vorbereiten", title: "Hähnchen-Gemüse-Wrap", when: "Mittag", k: 480, p: 40, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar"],
    items: ["1 Vollkorn-Tortilla", "120 g gebratene Hähnchenbrust in Streifen", "2 EL Skyr oder Magerquark mit Kräutern", "Salatblätter, Gurke, Karotte (geraspelt)", "Zitronensaft, Pfeffer"],
    steps: ["Hähnchen am Vorabend braten (oder 2 Brüste auf einmal).", "Tortilla mit Skyr-Kräuter-Mix bestreichen, belegen, eng einrollen.", "In Backpapier wickeln, hält 8 Stunden ungekühlt gut."],
    note: "Fertig in 10 Minuten, sehr viel Protein." },
  { id: "v4", kind: "vorbereiten", title: "Lachs-Skyr-Brot", when: "Mittag", k: 420, p: 33, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "Omega-3"],
    items: ["2 Scheiben Vollkornbrot", "100 g Räucherlachs", "3 EL Skyr mit Dill und Zitrone", "Gurkenscheiben"],
    steps: ["Skyr mit Dill, Zitrone, Pfeffer verrühren, auf das Brot streichen.", "Lachs und Gurke darauf, zusammenklappen und einpacken."],
    note: "Omega-3. Räucherlachs ist salzig, einmal die Woche reicht." },
  { id: "v5", kind: "vorbereiten", title: "Ofen-Falafel-Bällchen", when: "Mittag", k: 430, p: 20, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "vegetarisch"],
    items: ["1 Dose Kichererbsen (240 g abgetropft)", "1 Ei", "Petersilie, Kreuzkümmel, Knoblauch", "3 EL Haferflocken", "1 Vollkorn-Pita", "Gurke, Salat, Joghurt-Dip"],
    steps: ["Alles zu grober Masse mixen, 12 Bällchen formen.", "20 Min bei 200 Grad backen (statt frittieren).", "Kalt in der Pita mit Salat und Joghurt-Dip essen."],
    note: "Ofen statt Fritteuse: bleibt grün." },
  { id: "v6", kind: "vorbereiten", title: "Thunfisch-Skyr-Aufstrich auf Vollkornbrot", when: "Mittag", k: 400, p: 38, r: "g",
    tags: ["ohne Besteck", "vorbereiten"],
    items: ["1 Dose Thunfisch naturell (ca. 110 g abgetropft)", "100 g Skyr", "1 TL Senf, Zitronensaft, Schnittlauch", "2 Scheiben Vollkornbrot", "Rucola"],
    steps: ["Thunfisch zerdrücken, mit Skyr und Gewürzen mischen.", "Auf Brot streichen, mit Rucola belegen, zusammenklappen."],
    note: "Aufstrich hält im Kühlschrank 2 Tage." },
  { id: "v7", kind: "vorbereiten", title: "Hähnchen-Spieße mit Rohkost", when: "Mittag", k: 380, p: 42, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar"],
    items: ["200 g Hähnchenbrust in Würfeln", "Joghurt, Zitrone, Kräuter, Knoblauch (Marinade)", "Gurke, Karotten, Kohlrabi als Sticks", "1 Vollkornbrötchen"],
    steps: ["Hähnchen 1 h marinieren, auf Holzspieße stecken, im Ofen 15 Min garen.", "Kalt mit Rohkost und Brötchen essen."],
    note: "Spieße sind Fingerfood." },
  { id: "v8", kind: "vorbereiten", title: "Nuss-Hafer-Quark-Riegel", when: "Frühstück/Snack", k: 240, p: 13, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "7 Tage haltbar"],
    items: ["200 g Haferflocken", "150 g Magerquark", "3 Eier", "80 g gehackte Nüsse", "2 EL Leinsamen", "Zimt, Vanille, 1 TL Honig (optional)"],
    steps: ["Alles mischen, in eine Form (20x20 cm) drücken.", "25 Min bei 180 Grad backen, auskühlen, in 8 Riegel schneiden."],
    note: "Pro Riegel etwa 230 kcal. Praktisch ohne Zucker, ohne Obst." },
  { id: "w1", kind: "warm", title: "Lachs mit Ofengemüse und Kartoffeln", when: "Abend", k: 560, p: 38, r: "g",
    tags: ["warm", "Ofen", "Omega-3"],
    items: ["150 g Lachsfilet", "300 g Gemüse (Brokkoli, Karotte, Zucchini)", "200 g Kartoffeln", "1 EL Olivenöl, Zitrone, Kräuter"],
    steps: ["Kartoffeln und Gemüse mit Öl 15 Min bei 200 Grad backen.", "Lachs dazulegen, 12 Min mitbacken.", "Mit Zitrone servieren."],
    note: "Mediterran, Omega-3." },
  { id: "w2", kind: "warm", title: "Hähnchen-Gemüse-Pfanne mit Reis", when: "Abend", k: 520, p: 45, r: "g",
    tags: ["warm", "Pfanne", "20 Min"],
    items: ["150 g Hähnchenbrust", "300 g Gemüse", "60 g Vollkornreis (roh)", "1 EL Olivenöl, Ingwer, Knoblauch, Sojasoße"],
    steps: ["Reis kochen.", "Hähnchen anbraten, Gemüse dazu, würzen.", "Mit Reis servieren."],
    note: "Scharf nur, wenn es dich nicht reizt." },
  { id: "w3", kind: "warm", title: "Rotes Linsen-Dal", when: "Abend", k: 430, p: 26, r: "g",
    tags: ["warm", "vegetarisch", "Meal Prep"],
    items: ["100 g rote Linsen", "1 Zwiebel, Knoblauch, Ingwer", "Kurkuma, Kreuzkümmel", "1 Karotte, Spinat", "200 ml Gemüsebrühe", "2 EL Skyr zum Servieren"],
    steps: ["Zwiebel andünsten, Gewürze und Linsen dazu.", "Brühe aufgießen, 15 Min köcheln, Spinat unterrühren.", "Mit Skyr servieren."],
    note: "Hält 3 Tage im Kühlschrank, gut für Mittag mitnehmen (Thermobehälter, dann Löffel nötig)." },
  { id: "w4", kind: "warm", title: "Spinat-Omelett mit Vollkornbrot", when: "Abend/Frühstück", k: 430, p: 30, r: "g",
    tags: ["warm", "10 Min"],
    items: ["3 Eier", "100 g Spinat", "30 g Feta", "1 Scheibe Vollkornbrot", "1 TL Olivenöl"],
    steps: ["Spinat anbraten, Eier verquirlen, darübergeben, Feta darauf, stocken lassen."],
    note: "Schnell und proteinreich." },
  { id: "w5", kind: "warm", title: "Ofenkartoffel mit Lachs-Kräuterquark", when: "Abend", k: 520, p: 36, r: "g",
    tags: ["warm", "Ofen"],
    items: ["300 g Kartoffeln", "150 g Magerquark", "80 g Räucherlachs", "Schnittlauch, Dill, Zitrone", "Salat"],
    steps: ["Kartoffeln 45 Min bei 200 Grad backen.", "Quark mit Kräutern und Zitrone verrühren, Lachs dazu."],
    note: "Mit Salat als Beilage." },
  { id: "w6", kind: "warm", title: "Thunfisch-Bohnen-Salat", when: "Abend/Mittag", k: 460, p: 40, r: "g",
    tags: ["kalt", "10 Min", "Dose"],
    items: ["1 Dose Thunfisch naturell", "1 Dose weiße Bohnen", "Rote Zwiebel, Petersilie, Gurke", "2 EL Olivenöl, Zitronensaft"],
    steps: ["Alles mischen, 10 Min ziehen lassen."],
    note: "Mit Gabel; als Meal Prep 2 Tage haltbar." },
  { id: "w7", kind: "warm", title: "Kräuterquark mit Gemüsesticks", when: "Mittag/Snack", k: 260, p: 34, r: "g",
    tags: ["kalt", "5 Min", "Fingerfood"],
    items: ["250 g Magerquark", "Schnittlauch, Petersilie, Zitronensaft, Salz, Pfeffer", "Gurke, Karotte, Kohlrabi als Sticks", "1 Handvoll Nüsse"],
    steps: ["Quark mit Kräutern und Zitrone würzen, Gemüse eintauchen."],
    note: "Auch süß möglich: Quark mit Zimt und Leinsamen." }
];

/* Persönliche Trigger-Vorschläge für die Beobachtungsliste */
const WATCH_SUGGESTIONS = ["Tomate", "Gluten", "Milchprodukte", "Scharfes", "Kaffee", "Nachtschatten", "Zitrusfrüchte", "Rotes Fleisch"];
const WATCH_TAG_MAP = { Tomate: ["nightshade"], Gluten: ["gluten"], Milchprodukte: ["dairy"], Scharfes: ["spicy"], Kaffee: ["coffee"], Nachtschatten: ["nightshade"], "Rotes Fleisch": ["redmeat"] };
