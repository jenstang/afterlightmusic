# Serviett i nord — karaoke

Lokal karaokevideo i TypeScript og Three.js til brukerens `Serviett i nord v6.wav`.
Videoen inneholder kun en heldekkende profilfarge og sentrert tekst med ordmarkering.
Karaoken ligger på [prosjektets hovedside](https://jenstang.github.io/afterlightmusic/). Den opprinnelige AFTERLIGHT-filmen er bevart på [/afterlight/](https://jenstang.github.io/afterlightmusic/afterlight/).

## Spill av

Fra prosjektroten: `pnpm dev`, og åpne `/karaoke/` på serveradressen. Trykk Spill av eller Mellomrom. F åpner fullskjerm. Piltastene hopper fem sekunder.

Velg **Flytende farge** eller **Sprettende prikk**. Standardbakgrunnen bruker Vann i det meste av sangen, Fjell i før-refreng og breakdown, og Sand i tredje vers. Du kan også velge én fast profilfarge. Alle videolinjer står sentrert, og lange linjer deles i to. Kontroller og innstillinger inngår ikke i videofilen.

## Tekst og synkronisering

- `lyrics-original.txt`: det opprinnelige tekstarket fra brukeren.
- `lyrics.txt`: fremføringsteksten med gjentakelser og utelatelser fra den reviderte videoen.
- `timing.json`: 61 tekstlinjer og 288 ord med tidskoder i sekunder, revisjon 2.
- `timeline.ts`: visningsvinduer med kort leseforsprang og faste sluttider. Instrumentalpauser viser bare bakgrunnsfargen.
- `renderer.ts`: deterministisk Three.js-renderer; samme tidskode gir samme bilde i avspilling og eksport.
- `../scripts/transcribe_karaoke.py`: lokal vokalanalyse med Whisper, kun for å finne tidspunkter.
- `../scripts/align_karaoke.py`: lager et kandidatforslag i `artifacts/karaoke/` fra originalteksten, uten å overskrive de redigerte tidskodene.
- `../scripts/revise_karaoke.py`: gjenskaper revisjon 2 fra den første publiserte tidskodefilen og de redigerte frasegrensene.
- `../scripts/test-karaoke-timeline.ts`: kontrollerer tekstpauser, sluttider og de konkrete rettelsene.

Tidskoder for ordinær sang er basert på lokal vokalanalyse og frasevinduer. I revisjon 2 er introen og avslutningen justert mot lokalt isolert vokal. Teksten slukkes ved 1:24 og i oppbyggingen ved 2:58. De to «Hey»-svarene i breakdown er fjernet. Avslutningen deler gjentatte «Oh»-runder og «Hey»-rop i egne tekstblokker som forsvinner når frasen er ferdig. Korte korrop og ikke-leksikalske «Oh»-partier har fortsatt omtrentlige ordmarkeringer. Innstillingen «Forsink tekst» gjør det mulig å kompensere for lydforsinkelse i visningsutstyret. Originalmusikken er beholdt, inkludert vokalen.

## Profil

Fargene er hentet fra [SpareBank 1s fargeprofil](https://design.sparebank1.no/visuell-identitet/farger/):

| Navn | HEX |
| --- | --- |
| Vann | `#005AA4` |
| Fjell | `#002776` |
| Sand | `#F8E9DD` |
| Frost | `#7EB5D2` |
| Syrin | `#D3D3EA` |

SpareBank1 medium og regular er hentet fra de offentlig tilgjengelige fontressursene som brukes på samme profilside, og lagret lokalt sammen med avspillingskopien. Videoen har ingen logo, fotografier eller illustrasjoner.

## Lag en MP4

Trykk **Lag MP4** i den lokale spilleren. WebCodecs koder alle Three.js-bildene i 1920 × 1080 ved 30 bilder/s. Deretter legger den lokale Vite-serveren til original WAV som AAC-stereo og skriver en vanlig MP4 med H.264-video og søkeindeks i `../artifacts/karaoke/`. Nettleseren trenger støtte for H.264 VideoEncoder, normalt Chrome/Edge. Avbryt-knappen avbryter bildeproduksjonen før lagringen begynner.

Lokal eksport trenger WAV-kopien i `artifacts/karaoke/source.wav` og den lokale FFmpeg-binæren som allerede brukes i dette prosjektet. Ingen lyd sendes til en transkripsjonstjeneste. På GitHub Pages tilbyr **Last ned MP4** den ferdige videofilen fra `public/karaoke/serviett-i-nord-karaoke.mp4`; lokal nyeksport er tilgjengelig i utviklingsserveren.

`pnpm build` validerer begge TypeScript-spillerne og bygger karaoken på `dist/index.html` og `dist/karaoke/index.html`, samt AFTERLIGHT på `dist/afterlight/index.html`. GitHub Pages-basestien støttes. Ny videoeksport med valgte innstillinger krever den lokale utviklingsserveren.
