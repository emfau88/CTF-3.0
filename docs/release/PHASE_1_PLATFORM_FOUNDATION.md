# Phase 1 – Produkt- und Plattformfundament

- **Status:** `COMPLETE`
- **Abgeschlossen:** 2026-08-28
- **Releaseprofil:** `core-arena-standalone-v1`
- **Kanonische Roadmap:** [CORE_ARENA_RELEASE_ROADMAP.md](../CORE_ARENA_RELEASE_ROADMAP.md)

## Ergebnis

- `ReleaseProfile` legt Standalone/Portal, Desktop-Support, Startflow,
  DE/EN und Featureflags fest und validiert widersprüchliche Profile.
- `PlatformServices` kapselt Analytics, Save, SDK, Fokus/Sichtbarkeit sowie
  vorbereitete Ads- und Account-Ports.
- Der Standalone-Adapter nutzt lokalen Browser-Speicher, ein No-op-SDK und
  pausiert über einen gemeinsamen Lifecycle-Port.
- Produkt-Events sind typisiert, auf 200 Session-Einträge begrenzt und über
  `core-arena-product-event` lokal inspizierbar. Es gibt keinen Netztransport.
- Career- und League-Repositories erhalten ihren Speicher über den Save-Port.
- App-, Match-, League-, Team- und Wingman-Ereignisse sind an reale Flows
  angeschlossen; Qualifier-/Tutorial-Ereignisse sind für Phase 2 vorbereitet.
- Der Gameplay-Core importiert keine Plattformmodule.

## Abnahme

| Gate | Ergebnis |
| --- | --- |
| Unit/Integration/Simulation | `PASS` – 226/226 |
| Test-Typecheck | `PASS` |
| Produktionsbuild | `PASS` – 175 Module |
| Browser-E2E | `PASS` – 10/10 |
| Externer Eventtransport | keiner |
| Audioänderungen | keine |

## Bekannte Folgearbeit

- Der Qualifier bindet in Phase 2 die vorbereiteten First-Run- und
  Tutorialereignisse an den tatsächlichen Onboarding-Flow.
- Portal-SDK, Werbung und Accounts bleiben bis zur jeweiligen Releasephase
  bewusst No-op beziehungsweise nicht verfügbar.
