# Serviett i nord — karaoke

[Åpne karaoken](https://jenstang.github.io/afterlightmusic/) · [Se AFTERLIGHT](https://jenstang.github.io/afterlightmusic/afterlight/)

Forsiden viser **Serviett i nord**: en 3:36 karaokevideo i TypeScript og Three.js, med originalmusikk, sentrert sangtekst og ordmarkering i SpareBank 1s profilfarger. Velg flytende farge eller sprettende prikk, og åpne fullskjerm for å synge med. **Last ned MP4** lagrer en ferdig 1080p-video med flytende ordmarkering.

## Prosjektene

| Mappe | Innhold |
| --- | --- |
| `karaoke/` | Karaokespiller, sangtekst, tidskoder og lokal videoeksport |
| `public/karaoke/` | Karaoke-lydspor, skrifttyper og ferdig MP4 |
| `afterlight/` | Inngang og dokumentasjon til den opprinnelige AFTERLIGHT-filmen |
| `src/` | Three.js-scener og avspiller for AFTERLIGHT |
| `scripts/` | Lydanalyse og validering av tekst og tidskoder |

AFTERLIGHT er fortsatt tilgjengelig på `/afterlight/`; karaoken vises både på forsiden og på `/karaoke/`.

## Kjør lokalt

```sh
pnpm install
pnpm dev
```

Åpne serveradressen for karaoken, eller `/afterlight/` for den gamle musikkfilmen. `pnpm build` sjekker TypeScript og bygger begge spillerne. `pnpm preview` viser produksjonsbygget med GitHub Pages-basestien `/afterlightmusic/`.

Endringer på `main` bygges og publiseres automatisk gjennom `.github/workflows/deploy.yml`. Pages bruker **GitHub Actions** som publiseringskilde.

Se [karaoke-dokumentasjonen](karaoke/README.md) for synkronisering og lokal MP4-eksport, og [AFTERLIGHT-dokumentasjonen](afterlight/README.md) for den opprinnelige filmen. WAV-originaler, modeller og arbeidsfiler ligger kun lokalt og inngår ikke i nettsiden.
