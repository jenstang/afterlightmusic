# AFTERLIGHT

[Se filmen på GitHub Pages](https://jenstang.github.io/afterlightmusic/)

En 3:44 musikkfilm i TypeScript og Three.js til `Triomphe Orchestral.wav`.
Soldaten følger en ødelagt bygates akse, møter maskinene, søker dekning og fortsetter mot et evakueringssignal.

## Kjør

```sh
pnpm install
pnpm dev
```

Åpne adressen Vite viser og trykk **Snurr film**. `pnpm build` sjekker TypeScript og bygger `dist/`; `pnpm preview` viser produksjonsbygget.

Mellomrom spiller/pauser, piltaster hopper fem sekunder, F åpner fullskjerm, Escape avslutter kinomodus.
Kapittelknappene og bølgeformen lar deg hoppe i filmen. Filmens tidslinje følger lydens faktiske avspillingsposisjon og er deterministisk ved hopping.

## Musikk og regi

`scripts/analyze_audio.py` analyserer stereo-PCM-filen med Python standardbibliotek og lager `src/audio-map.json`: RMS-energi per halvsekund og energiøkninger. Analyse er allerede inkludert. Nettleserens Web Audio-analyse gir ekstra respons i kamerarystelser. Ingen ekstra lydeffekter legges over musikken.

| Start | Sekvens |
| --- | --- |
| 0:00 | The Silent City — rekognosering og bybilder |
| 0:56 | First Contact — roboter, sporlys og eksplosjoner |
| 1:56 | Under the Ash — soldaten søker dekning, byen puster |
| 2:31 | The Last Stand — kortere kamerakutt og siste kamp |
| 3:19 | Afterlight — kameraet stiger, lys og avslutning |

Alle karakterer og miljøelementer er prosedyrebygd med Three.js: artikulerte soldat-/robotrigger, drone, vrak, ruiner, jernbanebro, røyk, aske, lys, skygger, bloom og filmgradering. Geometrien er stilisert, uten eksterne 3D-modeller. Tekstfontene lastes fra Google Fonts med lokale systemfonter som reserve.

## Eksporter video

Nedlastingsknappen starter et **sanntidsopptak av hele filmen fra begynnelsen**, med canvas-video i 1920 × 1080 ved 30 fps og musikken via Web Audio. Hold fanen åpen og aktiv i 3:44; WebM lastes ned når sangen slutter. Chrome/Edge anbefales. Ytelsen avhenger av GPU. Dette er ikke en offline MP4-renderer. Pause og bakgrunnsfaner kan påvirke opptaket.

Originalfilen er bevart lokalt. `public/soundtrack.mp3` er en 256 kbps avspillingskopi av samme lydspor som inkluderes i nettsiden. WAV-originalen og de store videoopptakene inngår ikke i Git-repoet.

## GitHub Pages

Endringer på `main` bygges og publiseres automatisk gjennom `.github/workflows/deploy.yml`. GitHub Pages må bruke **GitHub Actions** som publiseringskilde. Produksjonsbygget bruker `/afterlightmusic/` som basesti; utviklingsserveren bruker `/`. På den offentlige nettsiden lastes videoopptak ned i nettleseren. Direkte lagring til `artifacts/` er bare tilgjengelig når den lokale utviklingsserveren kjører.

Det komplette første opptaket ligger også som `artifacts/Afterlight-final.webm` (1080p, VP9/Opus, 3:44). Denne kopien er remukset uten omkoding for å legge til lengde og søkeindeks. Nettleserens opprinnelige opptak er bevart på skrivebordet. Lokal utviklingsserver lagrer nye opptak direkte i `artifacts/Afterlight-Triomphe-Orchestral.webm` i tillegg til å tilby nedlasting.
