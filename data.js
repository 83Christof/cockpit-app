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
Cola|cola,coca cola,pepsi,limo,limonade,fanta,sprite,eistee,ice tea,softdrink|42|0|r|330|Dose|sugar sugarDrink upf|Zuckergetränke: Zusammenhang mit schlechterem Therapieansprechen
Cola Zero|cola zero,cola light,zero,light getränk,diet cola|1|0|y|330|Dose|upf|Zuckerfrei, aber Süßstoffe; Datenlage fehlt, in Maßen
Apfelsaft|apfelsaft,orangensaft,saft,multivitaminsaft,traubensaft,grapefruitsaft,fruchtsaft|46|0.1|y|200|Glas|sugar juice|Viel Zucker. Saft senkt die Aufnahme mancher Antihistaminika (Abstand zur Einnahme beachten)
Apfelschorle|apfelschorle,saftschorle,schorle|22|0|y|300|Glas|sugar juice|Zuckerärmer, Abstand zu Antihistaminika beachten
Bier|bier,pils,weizen,weißbier,radler,helles,export|43|0.5|r|500|Glas|alc gluten|Alkohol: Risikofaktor, bei Fumarsäureestern zusätzlich Magen-Darm-Belastung
Wein|wein,rotwein,weißwein,weisswein,sekt,prosecco,champagner,aperol,spritz|80|0.1|r|150|Glas|alc|Alkohol: Risikofaktor, bei Fumarsäureestern zusätzlich Magen-Darm-Belastung
Schnaps|schnaps,whisky,wodka,gin,rum,likör,cocktail,jägermeister,korn,obstler|230|0|r|40|Portion|alc|Spirituosen sind bei Fumarsäureestern ausdrücklich zu meiden
Vollkornbrot|vollkornbrot,körnerbrot,schwarzbrot,roggenbrot,pumpernickel,mehrkornbrot,dinkelvollkornbrot|215|8|g|50|Scheibe|gluten|Ballaststoffe, sättigt
Brot|brot,mischbrot,graubrot,bauernbrot,toast,toastbrot,weißbrot,baguette|250|8|y|50|Scheibe|gluten|Helles Brot hat weniger Ballaststoffe
Vollkornbrötchen|vollkornbrötchen,vollkornbroetchen,körnerbrötchen,dinkelbrötchen|235|9|g|70|Stück|gluten|Ballaststoffe
Brötchen|brötchen,broetchen,semmel,schrippe,wecken,weckle,kaisersemmel,weizenbrötchen,laugenbrötchen,laugenbrezel,brezel,breze|275|9|y|60|Stück|gluten|Helles Weizenmehl, schnell verdaulich
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
Kartoffeln|kartoffeln,kartoffel,salzkartoffeln,pellkartoffeln,ofenkartoffel,kartoffelpüree|85|2|g|250|Portion|nightshade|Neutral (Nachtschatten nur bei persönlichem Trigger)
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
Rindfleisch|rindfleisch,rind,schwein,schweinefleisch,steak,rindersteak,hackfleisch,hack,rinderhack,gulasch,braten,schweinebraten,schweinefleisch,lamm,frikadelle,hacksteak|200|20|y|150|Portion|redmeat satfat|Rotes Fleisch mit gesättigtem Fett, in Maßen (mager wählen)
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
Paprika|paprika,aubergine|30|1.5|g|120|Stück|nightshade veg|Nachtschatten: nur bei persönlichem Trigger relevant
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
Gulaschsuppe|gulaschsuppe,gulasch suppe,ungarische gulaschsuppe,gulaschsuppe gemischt|90|6|y|400|Teller|redmeat nightshade satfat|Rindfleisch und Paprika, oft fettreich. Mit viel Gemüse und ohne Sahne besser
Kartoffelsuppe|kartoffelsuppe,kartoffeleintopf|70|2.5|g|400|Teller|nightshade|Neutral, mit Wurst eher gelb
Erbsensuppe|erbsensuppe,erbseneintopf|75|5|g|400|Teller|veg|Hülsenfrüchte und Ballaststoffe
Hühnersuppe|hühnersuppe,huehnersuppe,hühnerbrühe,nudelsuppe,hühnereintopf|45|4|g|400|Teller||Leicht und eiweißhaltig
Tomatensuppe|tomatensuppe|55|1.5|g|400|Teller|nightshade|Verarbeitete Tomaten sind meist unkritisch, mit Sahne etwas fettreicher
Kürbissuppe|kürbissuppe,kuerbissuppe,karottensuppe,möhrensuppe|55|1.5|g|400|Teller|veg|Gemüsebasis
Eintopf|eintopf,gemüseeintopf,bohneneintopf,graupeneintopf,steckrübeneintopf|80|4|g|400|Teller|veg|Meist gemüsereich, mit Wurst eher gelb
Chili con Carne|chili con carne,chili|110|8|y|400|Teller|redmeat nightshade spicy|Rotes Fleisch, scharf, Tomaten
Spaghetti Bolognese|spaghetti bolognese,bolognese,nudeln mit hackfleischsoße|140|7|y|400|Teller|gluten redmeat nightshade|Weißmehlnudeln und Hackfleisch, Vollkornnudeln besser
Lasagne|lasagne,lasagna,cannelloni,nudelauflauf|165|8|y|350|Portion|gluten satfat dairy redmeat|Viel Käse und Fett
Maultaschen|maultaschen,ravioli,tortellini,gnocchi|165|7|y|250|Portion|gluten|Weißmehlteig, Füllung unterschiedlich
Spätzle|spätzle,spaetzle,käsespätzle,kasespatzle|165|5.5|y|250|Portion|gluten|Weißmehl, Käsespätzle zusätzlich fettreich
Knödel|knödel,semmelknödel,kartoffelknödel,klöße,kloesse,serviettenknödel|150|4|y|150|Stück|gluten|Weißbrot oder Kartoffelmasse
Rouladen|rouladen,rinderrouladen,kohlrouladen,roulade|170|18|y|200|Portion|redmeat|Rotes Fleisch, mageres Stück wählen
Frikadelle|frikadelle,bulette,fleischpflanzerl,hacksteak,hackbraten,fleischküchle|230|15|y|90|Stück|redmeat satfat|Rotes Fleisch, fettreich
Bratkartoffeln|bratkartoffeln,röstkartoffeln,kartoffelpuffer|150|3|y|250|Portion|fried nightshade|Gebraten, mit Fett
Kartoffelsalat|kartoffelsalat|120|2|y|200|Portion|nightshade|Mit Mayonnaise oder Öl, in Maßen
Krautsalat|krautsalat,coleslaw,weißkrautsalat|90|1.5|y|150|Portion|veg|Meist mit Zucker und Öl
Nudelsalat|nudelsalat|170|4|y|200|Portion|gluten|Mayonnaise und Weißmehl
Fleischsalat|fleischsalat,wurstsalat,eiersalat|250|6|r|60|Portion|procmeat satfat upf|Mayonnaise, verarbeitet
Hotdog|hotdog,hot dog|250|10|r|150|Stück|fastfood procmeat gluten|Wurst und Weißmehl
Roggenbrötchen|roggenbrötchen,roggenbroetchen,roggenmischbrötchen,mehrkornbrötchen,mehrkornbroetchen,kürbiskernbrötchen,sonnenblumenbrötchen|250|8|y|70|Stück|gluten|Roggenmisch hat mehr Ballaststoffe als Weizen, ist aber meist kein Vollkorn
Käsebrötchen|käsebrötchen,kaesebroetchen,käsestange,käsebrezel|290|11|y|80|Stück|gluten dairy satfat|Weizen plus Käse
Hähnchenkeule|hähnchenkeule,haehnchenkeule,backhendl,grillhähnchen,hendl,brathähnchen|200|18|y|200|Portion|satfat|Mit Haut fettreicher
Baked Beans|baked beans,bohnen in tomatensoße|95|5|y|200|Portion|sugar nightshade|Mit Zucker und Tomatensoße
Risotto|risotto,reispfanne,paella|150|4|y|300|Portion||Weißer Reis, Fett je nach Rezept
Curry|curry,currygericht,thai curry,gemüsecurry|120|5|y|350|Portion|spicy|Kokosmilch fettreich, oft scharf
Pudding|pudding,vanillepudding,schokopudding|120|3|y|150|Portion|sugar dairy|Zucker
Milchreis|milchreis|130|3.5|y|250|Portion|sugar dairy|Meist gezuckert
Kakao|kakao,trinkschokolade,schokomilch,milchshake|75|3|y|250|Glas|sugar dairy|Gezuckert
Malzbier|malzbier,spezi,mezzo mix|40|0.4|r|330|Dose|sugar sugarDrink|Zuckergetränk
Alkoholfreies Bier|alkoholfreies bier,alkoholfrei bier,bier alkoholfrei,radler alkoholfrei|25|0.3|y|500|Glas|sugar gluten|Kein Alkohol, aber Zucker und Gluten
Smoothie|smoothie|55|0.8|y|250|Glas|sugar juice|Viel Fruchtzucker, Saft-Regel beachten
Sauerkraut|sauerkraut,blaukraut|25|1.2|g|150|Portion|veg|Fermentiertes Gemüse, kaum Kalorien
Monster Energy|monster,monster energy,monster energie|47|0|r|500|Dose|sugar sugarDrink upf|Zuckerhaltiger Energydrink, eine 500-ml-Dose hat etwa 55 g Zucker
Monster Zero|monster zero,monster ultra,monster zero ultra,monster zero sugar|3|0|y|500|Dose|upf|Zuckerfrei, aber Süßstoffe und viel Koffein, in Maßen
Red Bull|red bull,redbull,red bull energy|45|0|r|250|Dose|sugar sugarDrink upf|Zuckerhaltig, eine 250-ml-Dose hat etwa 27 g Zucker
Red Bull Zero|red bull zero,redbull zero,red bull sugarfree,red bull sugar free|3|0|y|250|Dose|upf|Zuckerfrei, aber Süßstoffe und Koffein, in Maßen
Energydrink|energydrink,energy drink,energy,rockstar,effect,flying horse|45|0|r|500|Dose|sugar sugarDrink upf|Zuckerhaltiger Energydrink
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
    note: "Auch süß möglich: Quark mit Zimt und Leinsamen." },
  /* ---- Geschäftlich unterwegs: kaufen, ohne Besteck ---- */
  { id: "u9", kind: "unterwegs", title: "Hähnchen-Vollkornbrötchen vom Bäcker", when: "Mittag", k: 430, p: 30, r: "g",
    tags: ["ohne Besteck", "Bäcker", "Bahnhof"],
    items: ["1 Vollkorn- oder Körnerbrötchen mit Hähnchen- oder Putenbrust", "Salat und Gurke, Senf statt Soße", "1 hartgekochtes Ei oder ein Trinkjoghurt natur", "Wasser"],
    steps: ["Beim Bäcker nach Vollkorn oder Körnern fragen.", "Remoulade, Honig-Senf und süße Soßen weglassen."],
    note: "Gibt es fast an jedem Bahnhof und Flughafen." },
  { id: "u10", kind: "unterwegs", title: "Thunfisch-Wrap mit Salat", when: "Mittag", k: 450, p: 30, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "Kühlregal"],
    items: ["1 Vollkorn-Wrap mit Thunfisch und Salat (Kühlregal)", "Gurken- oder Karottensticks", "Wasser"],
    steps: ["Zutatenliste prüfen: Joghurt- oder Frischkäse-Dressing ist besser als Mayonnaise.", "Wrap vorher im Scanner prüfen."],
    note: "Omega-3 und viel Protein. Einmal scannen reicht, um den Favoriten zu finden." },
  { id: "u11", kind: "unterwegs", title: "Hummus-Gemüse-Wrap", when: "Mittag", k: 460, p: 17, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "vegetarisch"],
    items: ["1 Vollkorn-Wrap mit Hummus, Gurke, Karotte, Salat", "1 Handvoll Nüsse (25 g)", "1 Packung Hüttenkäse oder Skyr-Drink als Proteinquelle"],
    steps: ["Wrap mit Hummus und Gemüse kaufen oder selbst belegen.", "Protein ergänzen, weil der Wrap allein wenig davon hat."],
    note: "Pflanzliches Protein und Nüsse schneiden in Studien günstig ab." },
  { id: "u12", kind: "unterwegs", title: "Snack-Box: Käse, Nüsse, Gemüse, Ei", when: "Frühstück/Mittag", k: 450, p: 32, r: "g",
    tags: ["ohne Besteck", "Tankstelle", "Supermarkt"],
    items: ["2 hartgekochte Eier", "1 Packung Gemüsesticks", "40 g Hartkäse in Würfeln (Snackpackung)", "1 Handvoll Nüsse (25 g)", "Wasser"],
    steps: ["Alles einzeln kaufen und aus der Hand essen."],
    note: "Passt, wenn nur Tankstelle oder Kiosk offen ist." },
  { id: "u13", kind: "unterwegs", title: "Lachs-Frischkäse-Wrap", when: "Mittag", k: 430, p: 26, r: "g",
    tags: ["ohne Besteck", "Supermarkt", "Omega-3"],
    items: ["1 Vollkorn-Wrap mit Räucherlachs und Frischkäse (selbst belegt)", "Gurke und Salat", "Wasser"],
    steps: ["Wrap, Frischkäse light und Räucherlachs getrennt kaufen.", "Zusammen mit Gurke einrollen, in Papier mitnehmen."],
    note: "Räucherlachs ist salzig, ein- bis zweimal pro Woche reicht." },
  { id: "u14", kind: "unterwegs", title: "Salat-Bowl mit Hähnchen (Kühlregal)", when: "Mittag", k: 400, p: 30, r: "y",
    tags: ["Gabel liegt meist bei", "Supermarkt"],
    items: ["1 Salat-Bowl mit Hähnchen oder Ei", "Dressing nur zur Hälfte verwenden", "1 Vollkornbrötchen dazu", "Wasser"],
    steps: ["Dressing und Topping prüfen: Zucker und Fett stecken oft dort.", "Besteck liegt meist im Deckel."],
    note: "Gelb wegen der Dressings. Ohne Besteck lieber die Wraps nehmen." },
  /* ---- Geschäftlich: Restaurant, Hotel, Kantine (was bestellen) ---- */
  { id: "r1", kind: "restaurant", title: "Hotelfrühstück am Buffet", when: "Frühstück", k: 520, p: 35, r: "g",
    tags: ["Geschäftlich", "Hotel", "Buffet"],
    items: ["Rührei oder Spiegelei, 2 bis 3 Eier", "Putenbrust oder Räucherlachs", "Vollkornbrot oder Körnerbrötchen", "Gurke, Paprika, Gemüsesticks", "Naturjoghurt oder Quark ohne Zucker", "Kaffee oder Tee ohne Zucker"],
    steps: ["Weglassen: Croissant, Marmelade, gesüßtes Müsli, Saft, Speck und Wurst.", "Tablette zur Mahlzeit direkt beim Frühstück nehmen."],
    note: "Kein Saft: Antihistaminika wie Allegra sollen 1 Stunde vor oder 2 Stunden nach Essen und Saft genommen werden." },
  { id: "r2", kind: "restaurant", title: "Italiener: Fisch oder Hähnchen mit Gemüse", when: "Mittag/Abend", k: 620, p: 45, r: "y",
    tags: ["Geschäftlich", "Restaurant"],
    items: ["Gegrillter Fisch oder gegrillte Hähnchenbrust", "Gemüse vom Grill oder Spinat", "Salat mit Olivenöl und Zitrone", "Brot ohne Butter, 1 bis 2 Scheiben", "Wasser statt Wein"],
    steps: ["Pasta nur als kleine Portion mit Tomatensoße, nicht Carbonara oder Sahnesoße.", "Statt Tiramisu einen Espresso."],
    note: "Pizza, Carbonara und Dessert sind die Stolperfallen. Tomatensoße ist verarbeitet und unkritisch." },
  { id: "r3", kind: "restaurant", title: "Asiatisch: gedämpft oder gebraten statt frittiert", when: "Mittag/Abend", k: 600, p: 38, r: "y",
    tags: ["Geschäftlich", "Restaurant"],
    items: ["Gebratenes Gemüse mit Hähnchen, Tofu oder Garnelen", "Reis, normale Portion", "Suppe (Pho, Misosuppe, Hühnersuppe) als Vorspeise", "Sushi oder Sashimi als Alternative", "Wasser oder grüner Tee"],
    steps: ["Meiden: frittierte Gerichte, süß-saure Soße, süße Erdnusssoße, Cola.", "Scharf nur, wenn es dich nicht reizt."],
    note: "Sojasoße enthält Gluten und viel Salz: sparsam verwenden." },
  { id: "r4", kind: "restaurant", title: "Türkisch oder Griechisch: Spieß-Teller", when: "Mittag/Abend", k: 650, p: 45, r: "y",
    tags: ["Geschäftlich", "Restaurant", "Imbiss"],
    items: ["Hähnchenspieß oder Hähnchen-Döner-Teller", "Viel Salat, Joghurtsoße", "Reis oder Bulgur statt Pommes", "Ayran ohne Zucker oder Wasser"],
    steps: ["Pommes, Fladenbrot-Berge, Baklava und Cola weglassen.", "Beim Döner-Teller auf Hähnchen statt Lamm und Kalb achten."],
    note: "Rotes Fleisch und fettreiche Soßen sind das Risiko, Hähnchen mit Salat ist solide." },
  { id: "r5", kind: "restaurant", title: "Steakhaus: mageres Steak mit Gemüse", when: "Abend", k: 680, p: 55, r: "y",
    tags: ["Geschäftlich", "Restaurant"],
    items: ["Steak 200 g (Filet, Hüfte oder Rumpsteak)", "Gemüse vom Grill oder Brokkoli", "Ofenkartoffel ohne Sour Cream, oder Salat", "Wasser"],
    steps: ["Weglassen: Pommes, Béarnaise, Pfeffersoße mit Sahne, Bier, Wein.", "Rotes Fleisch gelegentlich, nicht jeden Abend."],
    note: "Gelb wegen rotem Fleisch und gesättigten Fetten, der Rest des Tellers ist gut." },
  { id: "r6", kind: "restaurant", title: "Kantine oder Mittagstisch", when: "Mittag", k: 600, p: 40, r: "g",
    tags: ["Geschäftlich", "Kantine"],
    items: ["Fisch oder Hähnchen, gedünstet oder gegrillt", "Gemüse als Beilage", "Kartoffeln oder Reis, kleine Portion", "Salatbuffet mit Essig und Öl", "Wasser"],
    steps: ["Meiden: Paniertes, Currywurst, Mayonnaise-Salate, Süßspeisen.", "Tellerprinzip: halber Teller Gemüse, Viertel Eiweiß, Viertel Beilage."],
    note: "Im Zweifel die einfachste Variante nehmen." },
  { id: "r7", kind: "restaurant", title: "Gasthof: Fisch statt Schnitzel", when: "Mittag/Abend", k: 650, p: 45, r: "y",
    tags: ["Geschäftlich", "Restaurant", "deutsche Küche"],
    items: ["Forelle, Zander oder Lachs mit Gemüse und Kartoffeln", "Linsensuppe, Gemüsesuppe oder Erbsensuppe als Vorspeise", "Salat mit Essig-Öl-Dressing", "Wasser"],
    steps: ["Schnitzel, Haxe, Currywurst, Knödel mit viel Soße und Bier vermeiden.", "Rouladen sind eine gelbe Alternative."],
    note: "Suppen mit Hülsenfrüchten sind eine gute Vorspeise." },
  { id: "r8", kind: "restaurant", title: "Business-Buffet: Tellerprinzip", when: "Mittag", k: 600, p: 40, r: "g",
    tags: ["Geschäftlich", "Buffet", "Tagung"],
    items: ["Halber Teller Gemüse und Salat", "Ein Viertel Eiweiß: Fisch, Hähnchen, Eier, Hülsenfrüchte", "Ein Viertel Beilage: Kartoffeln, Reis oder Vollkorn", "Wasser oder ungesüßter Tee"],
    steps: ["Zuerst Gemüse und Eiweiß nehmen, dann die Beilage.", "Dessertbuffet und Kuchen zur Kaffeepause auslassen, dafür Nüsse oder Käse."],
    note: "Funktioniert bei Tagungen und Messen, wo du nichts bestellen kannst." },
  /* ---- Vorbereiten für Reisen, Fingerfood ---- */
  { id: "v9", kind: "vorbereiten", title: "Putenröllchen mit Frischkäse und Gurke", when: "Snack/Mittag", k: 260, p: 28, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar", "Geschäftlich"],
    items: ["8 Scheiben Putenbrust-Aufschnitt", "100 g Frischkäse light", "1 Gurke in Streifen", "Kräuter, Pfeffer", "2 Scheiben Vollkornbrot dazu"],
    steps: ["Frischkäse mit Kräutern verrühren, auf die Scheiben streichen.", "Gurkenstreifen darauflegen, aufrollen.", "In Frischhaltedose, im Kühlschrank 2 Tage haltbar."],
    note: "Aufschnitt ist verarbeitet (gelb), ab und zu völlig in Ordnung." },
  { id: "v10", kind: "vorbereiten", title: "Kichererbsen-Fladen", when: "Mittag", k: 350, p: 17, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "vegetarisch", "Geschäftlich"],
    items: ["100 g Kichererbsenmehl", "250 ml Wasser", "1 EL Olivenöl", "Salz, Kreuzkümmel, Kräuter", "Dazu: Joghurt-Dip und Gurke"],
    steps: ["Mehl mit Wasser und Gewürzen glatt rühren, 20 Minuten quellen lassen.", "In einer Pfanne dünne Fladen backen (4 Stück).", "Abkühlen lassen, kalt mit Joghurt-Dip essen."],
    note: "Glutenfrei, viel pflanzliches Protein." },
  { id: "v11", kind: "vorbereiten", title: "Ofen-Hähnchennuggets mit Haferflocken", when: "Mittag", k: 380, p: 45, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar", "Geschäftlich"],
    items: ["200 g Hähnchenbrust in Stücken", "1 Ei", "40 g zarte Haferflocken", "Paprikapulver, Salz, Pfeffer", "Joghurt-Senf-Dip"],
    steps: ["Hähnchen in Ei wenden, in gewürzten Haferflocken drücken.", "20 Minuten bei 200 Grad backen, wenden.", "Kalt oder lauwarm essen."],
    note: "Statt panierter, frittierter Nuggets. Hält 2 Tage im Kühlschrank." },
  { id: "v12", kind: "vorbereiten", title: "Linsen-Gemüse-Bällchen mit Joghurt-Dip", when: "Mittag", k: 420, p: 22, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "vegetarisch", "kalt essbar"],
    items: ["150 g gekochte rote Linsen", "1 Karotte, fein gerieben", "1 Ei", "3 EL Haferflocken", "Kreuzkümmel, Petersilie", "Joghurt-Dip und 1 Vollkornbrötchen"],
    steps: ["Alles mischen, 12 Bällchen formen.", "20 Minuten bei 190 Grad backen.", "Mit Dip und Brötchen mitnehmen."],
    note: "Fingerfood, hält 3 Tage." },
  { id: "v13", kind: "vorbereiten", title: "Vollkorn-Quesadilla mit Hähnchen", when: "Mittag", k: 480, p: 38, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar", "Geschäftlich"],
    items: ["2 kleine Vollkorn-Tortillas", "120 g Hähnchenbrust, gebraten und gezupft", "40 g geriebener Käse", "Gemüsestreifen (Zucchini, Spinat)", "Kräuter, Kreuzkümmel"],
    steps: ["Eine Tortilla mit Hähnchen, Käse und Gemüse belegen, mit der zweiten abdecken.", "In der Pfanne von beiden Seiten 3 Minuten braten.", "Halbieren, in Backpapier einwickeln."],
    note: "Kalt oder warm gut, am Reisetag im Hotel-Kühlschrank lagern." },
  { id: "v14", kind: "vorbereiten", title: "Thunfisch-Frikadellen aus dem Ofen", when: "Mittag/Snack", k: 300, p: 35, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "kalt essbar"],
    items: ["2 Dosen Thunfisch naturell", "1 Ei", "3 EL Haferflocken", "1 Karotte, gerieben", "Zitronensaft, Dill, Pfeffer"],
    steps: ["Alles verkneten, 8 kleine Frikadellen formen.", "20 Minuten bei 200 Grad backen.", "Portion: 3 Stück, kalt mit Gurke."],
    note: "Sehr viel Protein, wenig Kalorien." },
  { id: "v15", kind: "vorbereiten", title: "Quark-Haferflocken-Brötchen (Proteinbrötchen)", when: "Frühstück", k: 160, p: 11, r: "g",
    tags: ["ohne Besteck", "vorbereiten", "5 Tage haltbar", "Geschäftlich"],
    items: ["250 g Magerquark", "100 g Haferflocken", "100 g Vollkornmehl", "1 Ei", "1 TL Backpulver, Salz, Körner zum Bestreuen"],
    steps: ["Alles zu einem Teig verkneten, 8 Brötchen formen.", "25 Minuten bei 180 Grad backen.", "Mit Frischkäse light, Ei oder Aufschnitt belegen."],
    note: "Pro Brötchen etwa 160 kcal. Mit Belag ein Frühstück für unterwegs." },
  /* ---- Zuhause abends ---- */
  { id: "w8", kind: "warm", title: "Hähnchen-Brokkoli-Auflauf", when: "Abend", k: 520, p: 50, r: "g",
    tags: ["warm", "Ofen", "Meal Prep"],
    items: ["200 g Hähnchenbrust in Würfeln", "300 g Brokkoli", "150 g Skyr oder Magerquark", "1 Ei, Senf, Kräuter", "30 g geriebener Käse"],
    steps: ["Hähnchen und Brokkoli in eine Auflaufform.", "Skyr, Ei, Senf und Kräuter verrühren, darüber gießen, Käse darauf.", "25 Minuten bei 190 Grad backen."],
    note: "Hält 3 Tage, für zwei Mahlzeiten kochen." },
  { id: "w9", kind: "warm", title: "Garnelen-Gemüse-Pfanne mit Ingwer", when: "Abend", k: 380, p: 38, r: "g",
    tags: ["warm", "Pfanne", "15 Min"],
    items: ["200 g Garnelen", "300 g Gemüse (Zucchini, Brokkoli, Karotte)", "Ingwer, Knoblauch", "1 EL Olivenöl", "Sojasoße sparsam", "60 g Vollkornreis (roh) oder Reis nach Wahl"],
    steps: ["Reis kochen.", "Gemüse anbraten, Garnelen dazu, 3 Minuten braten, würzen.", "Mit Reis servieren."],
    note: "Schnell und proteinreich." },
  { id: "w10", kind: "warm", title: "Linsen-Bolognese mit Vollkornnudeln", when: "Abend", k: 520, p: 28, r: "g",
    tags: ["warm", "vegetarisch", "Meal Prep"],
    items: ["80 g Vollkornnudeln (roh)", "100 g rote Linsen", "1 Zwiebel, Karotte, Sellerie", "400 g passierte Tomaten (verarbeitet)", "Olivenöl, Oregano, Basilikum"],
    steps: ["Gemüse in Öl anschwitzen, Linsen und passierte Tomaten dazu.", "20 Minuten köcheln.", "Zu den Nudeln servieren."],
    note: "Ergibt 2 Portionen, die zweite am nächsten Tag." },
  { id: "w11", kind: "warm", title: "Seelachs mit Senfkruste und Kartoffeln", when: "Abend", k: 480, p: 42, r: "g",
    tags: ["warm", "Ofen"],
    items: ["200 g Seelachsfilet", "2 EL Senf, 2 EL Haferflocken, Dill", "250 g Kartoffeln", "Gemüse als Beilage (Brokkoli, Spinat)"],
    steps: ["Fisch mit Senf bestreichen, Haferflocken und Dill darauf.", "15 Minuten bei 200 Grad backen.", "Mit Kartoffeln und Gemüse servieren."],
    note: "Mager und eiweißreich." },
  { id: "w12", kind: "warm", title: "Shakshuka mit Spinat", when: "Abend/Frühstück", k: 400, p: 25, r: "g",
    tags: ["warm", "Pfanne", "20 Min"],
    items: ["3 Eier", "300 g passierte Tomaten (verarbeitet)", "100 g Spinat", "1 Zwiebel, Knoblauch", "Kreuzkümmel, Paprikapulver, 1 Scheibe Vollkornbrot"],
    steps: ["Zwiebel und Knoblauch anschwitzen, passierte Tomaten und Gewürze 10 Minuten köcheln.", "Spinat unterheben, Eier hineinschlagen, zugedeckt stocken lassen.", "Mit Brot servieren."],
    note: "Passierte Tomaten sind verarbeitet und unkritisch. Paprikapulver weglassen, wenn Nachtschatten ein persönlicher Trigger sein könnte." },
  { id: "w13", kind: "warm", title: "Thai-Gemüsecurry mit Hähnchen", when: "Abend", k: 480, p: 40, r: "y",
    tags: ["warm", "Pfanne"],
    items: ["150 g Hähnchenbrust", "300 g Gemüse (Zucchini, Brokkoli, Spinat)", "100 ml leichte Kokosmilch", "1 TL Currypaste, Ingwer", "60 g Vollkornreis (roh)"],
    steps: ["Reis kochen.", "Hähnchen anbraten, Gemüse und Currypaste dazu, Kokosmilch aufgießen, 8 Minuten köcheln.", "Mit Reis servieren."],
    note: "Gelb wegen Kokosfett und möglicher Schärfe." },
  { id: "w14", kind: "warm", title: "Gefüllte Süßkartoffel mit Thunfisch-Quark", when: "Abend", k: 450, p: 35, r: "g",
    tags: ["warm", "Ofen"],
    items: ["1 große Süßkartoffel (250 g)", "1 Dose Thunfisch naturell", "100 g Magerquark", "Schnittlauch, Zitrone, Pfeffer", "Salat dazu"],
    steps: ["Süßkartoffel 45 Minuten bei 200 Grad backen oder 8 Minuten in der Mikrowelle.", "Thunfisch mit Quark und Kräutern mischen, in die aufgeschnittene Kartoffel füllen."],
    note: "Ballaststoffreich und sättigend." }
];

/* Persönliche Trigger-Vorschläge für die Beobachtungsliste */
const WATCH_SUGGESTIONS = ["Tomate", "Gluten", "Milchprodukte", "Scharfes", "Kaffee", "Nachtschatten", "Zitrusfrüchte", "Rotes Fleisch"];
const WATCH_TAG_MAP = { Tomate: ["nightshade"], Gluten: ["gluten"], Milchprodukte: ["dairy"], Scharfes: ["spicy"], Kaffee: ["coffee"], Nachtschatten: ["nightshade"], "Rotes Fleisch": ["redmeat"] };
