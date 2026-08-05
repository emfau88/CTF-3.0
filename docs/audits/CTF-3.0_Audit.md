# CTF-3.0 beziehungsweise Core Arena

CTF besitzt im aktuellen Stand nicht zwei, sondern drei Premium-Maps. Das sind Helix Canopy, Temple of the Drowned Sun und Foundry Circuit. Diese Reihenfolge ist in den aktuellen Tests und im Kartenkatalog festgeschrieben. Deshalb werden alle drei Maps berücksichtigt.

CTF besitzt von den drei Projekten die stärkste technische Basis. Das Hauptproblem ist nicht fehlende Substanz, sondern eine fragile Map-Pipeline mit zwei getrennten Wahrheiten: der sichtbaren Karte und der separat gepflegten Kollisionsgeometrie. Zusätzlich existiert ein brauchbares Schwierigkeitssystem, das an der zentralen Bot-Fabrik nicht durchgereicht wird.

## Technische Vermessung

Allein die neueren Kernmodule der Bot-V2-Architektur umfassen mindestens 1.334 Zeilen. Der Teamkoordinator besitzt 445 Zeilen. Der Bot-Diagnoseadapter umfasst 367 Zeilen. Der Premium-Bot-Audit besteht aus einem Runner mit 138 Zeilen und einem Bericht mit 234 Zeilen. Der Kartenproduktionsvertrag umfasst 736 Zeilen. Das Map-Qualitätsgate besitzt mehr als 360 Zeilen. Premium-Kosmetik und Beleuchtung umfassen zusammen 373 Zeilen.

Das Projekt verwendet Phaser 3.90, TypeScript 5.8, Vite 7, Node-basierte Tests und Playwright. Es besitzt Skripte für Build, Typecheck, Tests, Botdiagnose und Premium-Bot-Audit.

Diese Zahlen werden nicht als Qualitätsbeweis benutzt. Sie zeigen nur, dass die Systeme substanziell genug sind, dass ein Neubau nicht zu rechtfertigen ist.

## Was bei CTF gut ist

Die Karten sind als explizite Verträge modelliert. Das Datenmodell trennt Weltgrenzen, feste Geometrie, Gaps, Sprunglinks, Spawnpunkte, Pickup-Spawns, Waffenroster, Gameplayzonen, Botprofile, Präsentation und Bot-Routen. Das ist deutlich besser als verteilte Koordinaten und Magic Numbers direkt im Szenencode.

Die Tests prüfen echte Designabsicht. Bei den Premium-Maps wird nicht nur kontrolliert, ob eine Datei vorhanden ist. Geprüft werden Modus- und Teamgrößenverträglichkeit, Spiegelung, Mindestabstände, blockierte Sichtlinien, Routenlängen, Pickup-Ökonomie, konkrete offene und blockierte Punkte, Botsicherheitsrouten, Bildabmessungen sowie Debug- und Heatmap-Schalter.

Auch die Bot-KI muss nicht neu entwickelt werden. Bereits vorhanden sind Teamkoordination, Zielauswahl, Utility-Bewertung, Kampfgelegenheiten, Grid-Navigation, lokale Bewegung, Controller für Team Deathmatch, klassisches Capture the Flag und One Flag, drei Schwierigkeitsprofile, Karten-Botprofile, Headless-Diagnose und Massenaudits.

Der Premium-Audit ist ebenfalls ernst zu nehmen. Er umfasst drei Premium-Maps, drei Modi, drei Teamgrößen und zehn Wiederholungen. Das ergibt 270 Matches. Gemessen werden unter anderem Pfade, Neuberechnungen, Schüsse, Zielwechsel, Objective-Fortschritt, Stillstände und CPU-Zeiten.

Das Problem ist also nicht, dass keine Infrastruktur existiert. Das Problem ist, dass mehrere wichtige Teile nicht bis in das tatsächlich gestartete Spiel verdrahtet sind oder nur mathematische, aber keine visuelle Wahrheit prüfen.

## Das grundlegende Map-Problem

Der wichtigste CTF-Befund lautet: Die Map wird zweimal erstellt.

Die Premium-Maps verwenden ein fertiges, integriertes Rasterbild als sichtbare Arena. Die Begehbarkeit wird unabhängig davon über rechteckige AABB-Kollisionsflächen in `geometry.solids` und `geometry.gaps` beschrieben.

Das Rasterbild enthält die visuelle Wahrheit. Die Rechtecke enthalten die physische Wahrheit. Beide müssen von Hand synchron gehalten werden.

Das Datenmodell weiß nicht, dass ein bestimmter sichtbarer Bereich blockierende Architektur ist. Es weiß nicht, ob ein Objekt nur Dekoration darstellt. Es kennt keine semantische Unterscheidung zwischen niedriger Deckung und voller Wand. Es kennt auch nicht den Unterschied zwischen einem sichtbaren Vordergrundelement und einer tatsächlichen Kollision.

Deshalb ist es so schwer, Dekoration gleichzeitig nicht begehbar und eindeutig lesbar zu machen. Das Problem liegt nicht hauptsächlich in einzelnen Colliderwerten. Das Problem liegt darin, dass Bild und Physik getrennt authored werden.

Jede Änderung an der Grafik kann eine unsichtbare Kollision oder eine begehbare Fläche erzeugen, die massiv und blockierend aussieht. Umgekehrt kann eine sichtbare Säule außerhalb jeder Solid-Fläche liegen.

Der strukturelle Fehler lautet daher nicht „zu viel Deko“ oder „zu schlechte Collider“. Der strukturelle Fehler lautet: Die Map besitzt zwei Wahrheiten.

## Warum das vorhandene Qualitätsgate dieses Problem nicht löst

Das Qualitätsgate prüft, ob Präsentationsrechtecke und Kollisionsrechtecke dieselbe Anzahl, Reihenfolge und dieselben Koordinaten besitzen. Das ist sinnvoll, aber nicht ausreichend.

Ein Rechteck kann mathematisch exakt übereinstimmen und trotzdem visuell wie Wasser, Schatten, Glas, Pflanzen oder offener Boden aussehen. Umgekehrt kann das integrierte Masterbild eine massive Struktur zeigen, die in keiner Kollisionsbox auftaucht.

Ein grüner Test bedeutet deshalb nur: „Präsentationsrechteck und Kollisionsrechteck besitzen dieselben Zahlen.“ Er bedeutet nicht: „Ein Spieler versteht die Kollision.“

Das Gate misst derzeit nicht die sichtbare Solid-Fläche gegen die Kollisionsfläche. Es misst nicht blockierend aussehende Pixel außerhalb von Solids. Es misst nicht begehbar aussehende Pixel innerhalb von Solids. Es unterscheidet keine niedrige Deckung von voller Wand. Es prüft keine Silhouettenkontinuität entlang gestufter Rechteckdiagonalen. Es misst die Lesbarkeit nicht beim tatsächlichen Gameplay-Zoom und berücksichtigt auch nicht, wie Figuren, Projektile oder Effekte die Architektur verdecken.

## Das eigentliche Bot-Schwierigkeitsproblem

CTF besitzt bereits drei Schwierigkeitsprofile: Casual, Normal und Strong.

Beim Casual-Profil beträgt die Reaktionszeit 480 Millisekunden. Normal nutzt 300 Millisekunden, Strong 180 Millisekunden. Die Intent-Commit-Zeit sinkt von 900 über 700 auf 520 Millisekunden. Der Ziel-Commit sinkt von 1.150 über 950 auf 720 Millisekunden. Der Zieljitter liegt bei 1,65, 1,00 und 0,62. Die Vorhersage steigt von 0,55 über 0,82 auf 1,00. Die Wahrnehmungsreichweite steigt von 780 über 940 auf 1.150.

Die Controller können diese Profile verwenden. Die zentrale Erzeugungsfunktion `createArenaBotControllerGroup` kann aber keinen Difficulty-Parameter entgegennehmen. Sie erzeugt die Controller über lange Positionsargumentlisten und übergibt an mehreren Stellen `undefined`. Dadurch greifen die Standardwerte der Controller. Das echte Produkt spielt daher immer mit dem Normal-Profil.

Das Schwierigkeitssystem ist also intern funktionsfähig, aber produktseitig tot verdrahtet.

Das bedeutet: Menü, Liga und dynamische Anpassung können die Stärke aktuell nicht steuern. Einzelne Controllertests können korrekt sein, während das ausgelieferte Spiel trotzdem immer dieselbe Schwierigkeit verwendet.

Ein Neubau der KI würde am falschen Ort ansetzen.

## Warum die Konstruktoren das Problem begünstigen

Die Bot-Controller werden über lange Positionsargumentlisten erzeugt. Mehrere Konfigurationsplätze werden mit `undefined` übersprungen, bevor spätere Werte wie Slot, menschliche Actor-IDs oder Koordinator übergeben werden.

Damit ist beim Lesen kaum erkennbar, welches `undefined` welche Option deaktiviert. Diese Struktur hat konkret dazu geführt, dass die Difficulty-Konfiguration an der Fabrikgrenze endet.

Das ist kein kosmetisches Codeproblem. Es ist die Ursache eines echten Produktfehlers.

Die Controller sollten über benannte Optionsobjekte erzeugt werden.

## Was der Premium-Bot-Audit tatsächlich beweist

Der Audit meldet null kritische Fehler und sechs Warnungen.

In Classic CTF mit vier gegen vier gab es vier Läufe ohne Flaggenaufnahme. Zwei davon traten im Temple auf, zwei in Foundry. Bei Foundry wurden Bot-CPU-p95-Werte bis 4,2065 Millisekunden gemessen. In One Flag vier gegen vier lag Foundry bei bis zu 4,0301 Millisekunden.

„Null kritisch“ bedeutet nicht, dass die KI fertig oder gut ist. Es bedeutet nur, dass nach den aktuellen Grenzwerten keine technische Katastrophe festgestellt wurde.

Der Audit misst nicht ausreichend, ob Bewegungen menschlich plausibel wirken. Er misst nicht, ob Bots unfair vorhersagen, ob sie einander blockieren, ob Taktiken verständlich sind oder ob Schwierigkeitsunterschiede organisch wahrgenommen werden.

## Helix Canopy im Detail

Helix besitzt eine Weltgröße von 2.208 mal 1.104 Pixeln. Das Seitenverhältnis ist exakt 2,0.

Das Masterbild besitzt 1.647 mal 955 Pixel. Sein Seitenverhältnis beträgt ungefähr 1,725.

Der Renderer erhält die Bildproportion und skaliert auf die Welthöhe. Daraus ergibt sich eine gerenderte Bildbreite von ungefähr 1.903,88 Pixeln. Die Welt ist 2.208 Pixel breit. Damit bleiben rechnerisch rund 304,12 Pixel übrig, also etwa 152 Pixel auf jeder Seite, wenn das Bild zentriert wird.

Der aktuelle Test verbietet eine Verzerrung des Masters. Welt und Master besitzen aber unterschiedliche Seitenverhältnisse. Mindestens 304 Weltpixel können deshalb nicht gleichzeitig vom unverzerrten Masterbild abgedeckt werden.

Das kann bewusst als Außenrahmen gelöst sein. Falls die Map aber optisch wie ein Bild in einer größeren Spielfläche wirkt, ist dies die rechnerische Ursache.

Helix besitzt 50 Solid-Rechtecke, keine Gaps, vier Sprunglinks, acht Spawns und elf Pickups. Das Waffenroster umfasst Whip, Rail, Pulse und Shard. Die Karte besitzt keine separate Decoration-Liste; die Grafik ist in das Masterbild integriert.

Positiv sind die starken Tests für Spiegelung, Deckung, Clearance und drei unterschiedliche Routenrollen. Der One-Flag-Kern ist gegen direkte Spamlinien abgesichert. Die Botsicherheitsrouten werden geprüft.

Das Risiko besteht darin, dass 50 rechteckige Solids organische Canopy-Formen nur gestuft approximieren. Von allen Premium-Maps ist Helix deshalb wahrscheinlich am empfindlichsten gegenüber sichtbaren Differenzen zwischen Bildkante und Rechteckkante.

Zusätzlich existieren für Helix teilweise Kosmetik- oder Lichtassets, die in der aktuellen Konfiguration nicht aktiviert werden.

Das Urteil zu Helix lautet: testseitig gut abgesichert, aber technisch die empfindlichste Registrierung. Es sollten keine neuen Helix-Grafiken erstellt werden, bevor Master und Kollision einen gemeinsamen semantischen Vertrag besitzen.

## Temple of the Drowned Sun im Detail

Die Temple-Welt besitzt 2.280 mal 980 Pixel. Das Seitenverhältnis liegt bei ungefähr 2,3265. Das Masterbild besitzt 1.913 mal 822 Pixel und ein Verhältnis von ungefähr 2,3273. Die Abweichung beträgt nur rund 0,03 Prozent.

Damit kann das Masterbild die Welt praktisch ohne asymmetrischen Rest abdecken.

Temple besitzt 53 Solids, zwei Gaps, vier Sprunglinks, acht Spawns und 13 Pickups. Das Waffenroster umfasst Whip, Rocket, Grenade und Disc. Die Decoration-Liste ist leer. Auch hier wird ein integriertes Masterbild verwendet.

Die Tests prüfen einen geschlossenen Außenrand, offene Innenhofpunkte, Botsicherheitsrouten und Projektilfeedback für niedrige Deckung. Die visuelle Registrierung ist wesentlich sauberer als bei Helix.

Das verbleibende Risiko liegt in den unterschiedlichen Koordinatentransformationen und Projektionen zwischen Mastergrafik und Gameplay-Rechtecken. Spätere Änderungen an Welt- oder Bildgröße können dadurch Drift erzeugen.

Außerdem traten im Premium-Audit zwei Classic-CTF-Läufe mit vier gegen vier ohne Flaggenaufnahme auf.

Das Urteil lautet: Temple besitzt den saubersten visuellen Registrierungsvertrag der gelesenen Maps. Das aktuelle Problem liegt eher im Objective-Verhalten bei großen Teams als in der Grafikregistrierung.

## Foundry Circuit im Detail

Die Foundry-Welt besitzt ein Seitenverhältnis von ungefähr 2,3327. Das Masterbild liegt bei ungefähr 2,3325. Die Abweichung beträgt nur rund 0,01 Prozent.

Foundry verwendet ebenfalls ein integriertes Masterbild, besitzt zwei Gaps, 13 Pickups und das Waffenroster Whip, Rocket, Rail und Disc. Drei taktische Zonen sind dokumentiert. Die Beleuchtungsreaktionen sind in einem separaten Adapter verdrahtet.

Foundry besitzt die höchsten gemessenen Bot-CPU-p95-Werte des Premium-Audits. Auch hier gab es in Classic CTF mit vier gegen vier mehrere Läufe ohne Flaggenaufnahme.

Die Rechteckprojektion rundet Koordinaten und Größen teilweise unabhängig voneinander. Dadurch können Abweichungen von einem Pixel entstehen.

Vermutlich kann die industrielle Detaildichte der Mastergrafik niedrige Deckung und reine Dekoration leichter vermischen als die klarere Temple-Architektur.

Das Urteil lautet: Foundry ist nicht kaputt. Sie ist die Map, an der Zielwechsel, Pfadneuberechnungen und die Skalierung auf vier gegen vier zuerst untersucht werden sollten.

## Datenmodell, Assets und Kosmetik der Premium-Maps

Alle drei Karten besitzen datenreiche Verträge. Die taktischen Rollen werden aber teilweise nur über ausgewählte Testpunkte und manuell definierte Routen nachgewiesen.

Es fehlt ein allgemeiner Graphvertrag. Zum Beispiel wird nicht grundsätzlich geprüft, dass jede Basis mehrere unabhängige Wege zum Objective besitzt. Es wird nicht geprüft, dass Objective und Spawns nicht durch denselben einzigen Engpass verbunden sind. Eine Map kann deshalb alle Stichproben bestehen und nach einer späteren Rechteckänderung trotzdem strategisch kollabieren.

Auch Kosmetik- und Lichttypen laufen teilweise den Daten voraus. Das Kosmetiksystem erlaubt alle drei Premium-Map-IDs, konfiguriert aktuell aber nur einen Temple-Frosch. Ein Helix-Blumenasset existiert, ist aber nicht aktiv verdrahtet. Das Lichtsystem kennt alle drei Map-IDs, besitzt aber nur Konfigurationen für Temple und Foundry.

Das zeigt einen typischen Fehler von `satisfies`: Es prüft vorhandene Einträge, aber nicht, ob für jede erlaubte Map-ID ein Eintrag existiert.

Das ist kein Kernproblem und rechtfertigt keine neue Kosmetikinitiative. Es ist aber ein Wartungssignal.

## Konkrete Lösungen für CTF

Der erste Fix ist klein. Die zentrale Bot-Fabrik muss einen Difficulty-Parameter erhalten und diesen explizit an alle Controller weiterreichen. Aufwand: vier bis acht Stunden. Risiko: niedrig.

Danach sollten die Controllerkonstruktoren auf benannte Optionsobjekte umgestellt werden. Aufwand: ein bis zwei Tage. Risiko: mittel.

Für eine stufenlose Schwierigkeit ist kein neues KI-System erforderlich. Die vorhandenen Profile können über einen Skillwert zwischen null und eins interpoliert werden.

Ein Skillwert von null entspricht Casual. Ein Wert von 0,5 entspricht Normal. Ein Wert von eins entspricht Strong. Interpoliert werden Reaktionszeit, Intent-Commit, Ziel-Commit, Zieljitter, Vorhersage und Wahrnehmungsreichweite.

Nicht verändert werden sollten Objective-Regeln, Rollen, Teamloyalität, illegales Wissen, Waffenschaden oder Bewegungsgeschwindigkeit. Schwierige Bots sollen besser entscheiden, nicht betrügen.

Eine adaptive Schwierigkeit sollte sehr langsam reagieren. Die Leistung sollte mindestens über 30 Sekunden oder eine vollständige Runde geglättet werden. Pro Anpassung sollte sich der Skillwert höchstens um 0,05 ändern. Während eines Schusses oder einer laufenden Zielentscheidung darf keine Änderung stattfinden. Außerdem braucht das System feste Mindest- und Höchstwerte sowie eine sichtbare Option, ob adaptive Schwierigkeit aktiv ist.

Für die Maps sollte kein großer Ingame-Editor entwickelt werden. Es genügt eine kleine semantische Authoringquelle, beispielsweise SVG, LDtk oder Tiled, mit festen Layern wie hohe Kollision, niedrige Deckung, Gap, begehbar, nicht blockierende Dekoration, Sprunglink, Spawn, Pickup und Routenmarker.

Aus derselben Quelle sollten Runtime-Kollision, Debugbild, Testpunkte und ein Registrierungsmanifest für das Masterbild erzeugt werden. Dadurch endet das doppelte Authoring.

Zusätzlich sollte jede Premium-Map acht bis zwölf feste Landmarken erhalten. Für jede Landmarke werden Bildpunkt, Weltpunkt, erwarteter Kollisionsstatus, erwartete Deckungshöhe und erwartete Route festgelegt.

Die Classic-CTF-Warnungen bei vier gegen vier sollten isoliert reproduziert werden. Foundry sollte zusätzlich auf unnötige Pfadneuberechnungen untersucht werden.

## Was bei CTF ausdrücklich nicht gebaut werden sollte

Die Bot-KI sollte nicht neu geschrieben werden. Machine Learning für dynamische Schwierigkeit wäre untestbar, teuer und schlechter erklärbar als die vorhandenen Parameter.

Ein allgemeines 3D-Navmesh ist nicht sinnvoll. Das Spiel besitzt eine zweidimensionale Rechteckwelt mit authored Sprüngen.

Ein großer Ingame-Mapeditor wäre überdimensioniert. Ein semantischer Exportvertrag genügt.

Neue Premium-Kosmetik löst weder Kollisionslesbarkeit noch Objective-Probleme.

Bots sollten keine Sonderlogik für konkrete Map-IDs erhalten.

Eine vierte Premium-Map sollte nicht gebaut werden, bevor die drei vorhandenen Maps denselben Produktionsvertrag nutzen.

Die Maßnahme mit der besten Wirkung pro Stunde ist die Durchreichung der CTF-Difficulty bis zur Bot-Fabrik. Aufwand: vier bis acht Stunden. Dadurch wird ein vorhandenes und getestetes System im echten Produkt nutzbar.

Dann sollten die CTF-Controller auf Optionsobjekte umgestellt werden. Aufwand: ein bis zwei Tage.

Anschließend sollten die CTF-Warnungen aus Classic CTF mit vier gegen vier reproduziert werden. Aufwand: ein bis zwei Tage.

Registrierungsfixpunkte für CTF benötigen ungefähr einen Tag.

Der semantische Kartenexport für CTF benötigt ebenfalls drei bis fünf Tage.

Sechs Stunden sollten in das CTF-Difficulty-Wiring fließen.

CTF sollte ungefähr 25 Prozent erhalten. Das Ziel lautet, die vorhandene technische Reife produktwirksam zu machen. Dazu gehören Difficulty-Wiring, die Warnungen bei vier gegen vier und Registrierungstests. Eine neue Map ist ausgeschlossen.

CTF sollte nicht neu erfunden werden. Die Verdrahtung der Schwierigkeit und die gemeinsame Wahrheit von Bild und Kollision müssen repariert werden.
