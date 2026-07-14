# Character UI Portrait Batch

Stand: 2026-07-14

## Zweck und Produktvertrag

Dieser Batch stellt fuer alle neun spielbaren Fighter eigenstaendige
Roster-Portraets fuer Quick Play und League HQ bereit. Die Dateien ersetzen
dort die zuvor ausgeschnittenen Einzelbilder aus den Gameplay-Spritesheets.
Gameplay-Texturen, Animationen, Hitboxen, Stats, Movement, Damage und Waffen
bleiben unveraendert. Die Auswahl bleibt rein kosmetisch.

## Finale Runtime-Assets

Alle Dateien liegen unter `public/assets/ui/portraits/`, sind 512x512 Pixel
gross, verwenden RGBA und besitzen transparente Ecken:

- `briarhorn-ui-portrait.png`
- `ax9-mantis-ui-portrait.png`
- `null-courier-ui-portrait.png`
- `aegis-vanguard-ui-portrait.png`
- `xeno-runner-ui-portrait.png`
- `volt-hound-ui-portrait.png`
- `mirejaw-ui-portrait.png`
- `scrapwing-ui-portrait.png`
- `prism-bastion-ui-portrait.png`

## Erzeugung

- Werkzeug: OpenAI ImageGen, eingebauter Generierungsmodus.
- Identitaetsreferenz: ausschliesslich das jeweils vorhandene 6x4-
  Gameplay-Spritesheet dieses Projekts.
- Stilreferenz fuer den zusammengehoerigen Batch: das zuerst abgenommene
  Xeno-Runner-Portraet.
- Hintergrund der Generierung: flaches `#ff00ff` ohne Schatten, Text,
  Umgebung oder UI-Elemente.

Gemeinsame finale Prompt-Spezifikation:

> Create one polished square UI character portrait using the supplied
> sprite sheet as the exact identity and silhouette reference. Preserve the
> character's defining anatomy, materials, palette and non-human traits.
> Use a centered head-and-upper-torso roster composition that fills about
> 85-92 percent of the canvas with clean breathing room. Render premium
> stylized sci-fi game roster art with crisp readable forms, disciplined
> lighting, restrained wear and a clean cutout finish. No weapons, text,
> logos, pedestal, environment, extra limbs or generic humanoid redesign.
> Background must be perfectly flat solid chroma magenta `#ff00ff`, edge to
> edge, without gradient, texture, shadow or scenery. Do not use magenta on
> the character.

Figurenspezifische Leitplanken:

- Briarhorn: Stein-/Borkenkoerper, Moos, grosse geschwungene Hoerner, Cyan-Core.
- AX-9 Mantis: elfenbeinfarbene und anthrazitfarbene Robotik, Cyan-Visier,
  kleine orange Akzente.
- Null Courier: schwebender dunkelblauer Koerper, cyanfarbenes V-Visier,
  sichtbarer Energieantrieb.
- Aegis Vanguard: massiger Elfenbein-/Navy-Panzer, oranges Visier, blauer Core.
- Xeno Runner: blassgruene organische Panzerung, cyanfarbene Augen,
  schlanke Alien-Silhouette.
- Volt Hound: klarer mechanischer Vierbeiner mit Hundeschnauze; keine
  menschlichen Schultern oder Arme.
- Mirejaw: breites Krokodil-/Sumpfwesen mit Fels, Moos und gelben
  biolumineszenten Knoten; kein humanoider Drachenkrieger.
- Scrapwing: Eulenwesen mit Schnabel, Federn und gefalteten Fluegeln; keine
  menschlichen Arme.
- Prism Bastion: gesichtsloser Steingolem mit dominanten blauen Kristallen und
  genau einem goldenen Core; kein Mech-Gesicht.

## Nachbearbeitung und Verifikation

1. Chroma-Key-Entfernung mit dem Imagegen-Helfer `remove_chroma_key.py`, Soft
   Matte, leichtem Edge Contract und Despill.
2. Zuschnitt und Normalisierung mit
   `scripts/optimize-transparent-asset.py` auf 512x512 und 18 Pixel Padding.
3. Automatisierte Pruefung auf PNG-Signatur, 512x512 und RGBA.
4. Visuelle Einzelpruefung aller neun finalen Freisteller.
5. Browserpruefung in Quick Play und League HQ bei 1024x768 und 1366x768.

Die generierten Quellen und Alpha-Zwischenstufen unter `tmp/ui-portraits/`
sind keine Runtime-Assets und gehoeren nicht in einen Produktcommit. Dasselbe
gilt fuer das unreferenzierte rohe Zwischenbild
`public/assets/ui/portraits/xeno-runner-portrait.png`; Runtime-Code und Tests
verwenden ausschliesslich die neun Dateien mit dem Suffix `-ui-portrait.png`.
