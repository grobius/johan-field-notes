# Likes och delning

Varje inlägg får en like-knapp med räknare, LinkedIn, en meny med Facebook/X/Bluesky/e-post, systemdelning där webbläsaren stöder det och Copy link. Knapparna ligger efter artikeltexten. Sociala länkar fungerar även utan JavaScript. Kopiering har en reservlösning med ett markerbart textfält.

## Aktivera likes i Cloudflare

Webbplatsens Worker har redan D1-bindningen `johan_sensors` till databasen `johan-sensors`. Likes använder en ny tabell, `article_likes`. Sensortabellerna ändras inte. Inga nya lösenord eller API-nycklar behöver läggas i webbplatsens kod.

Efter att du har hämtat grenen/mergat ändringen, kör från repots rot i PowerShell:

```powershell
npm ci
npx wrangler login
npm run likes:setup
```

`wrangler login` behövs bara om du inte redan är inloggad. `likes:setup` kör D1-migrationen mot den befintliga databasen i ditt Cloudflare-konto. Kontrollera att Wrangler visar rätt konto och databas. Migrationen kan köras igen utan att radera likes eller sensordata. Den använder en separat migrationstabell, `article_d1_migrations`.

Kör migrationen före produktionsdeploy. Webbplatsen kan laddas utan tabellen, men like-knappen visar då ett fel och möjlighet att försöka igen. Den visar aldrig ett påhittat antal likes. Merging till `main` startar den vanliga Cloudflare-deployen; bindningarna för begränsning av anropsfrekvens följer med `wrangler.jsonc`.

Delningsknappar och delningsbilder behöver ingen databasinställning. Standardadressen är `https://johan-field-notes.johansj.workers.dev`. Om du använder en egen domän, sätt byggvariabeln `PUBLIC_SITE_URL` till den fullständiga adressen, exempelvis `https://example.se`, och bygg om. Förhandsvisningsbyggen använder samma kanoniska produktionsadress, så delning sprider inte tillfälliga preview-adresser.

## Hur likes fungerar

- Webbläsaren skapar ett slumpmässigt UUID i `localStorage` vid första like. Besökaren behöver inget konto. Lagring krävs för att komma ihåg valet.
- En databasrad per `(post_id, visitor_id)` gör att omförsök inte ökar räknaren. Ett andra klick tar bort den egna raden.
- API:t accepterar bara publicerade inlägg från innehållssamlingen. Det kontrollerar ursprung och indata och använder parametriserad SQL.
- Läsningar går till D1:s primära databas. Skrivning och efterföljande räknarläsning sker i samma transaktion.
- Worker-bindningar begränsar läsningar till 120 och skrivningar till 20 per minut och limiter-nyckel. Cloudflares gränser gäller per plats och är ungefärliga, inte ett globalt skydd mot alla botar.
- IP-adresser sparas inte i like-tabellen. En dagligen varierande hash används tillfälligt som limiter-nyckel. Cloudflares vanliga driftloggning hanteras separat i kontot.
- Det är en like per webbläsar-ID, inte en verifierad person. Rensad lagring, annan enhet eller avsiktligt nya ID:n kan ge fler likes.
- Räknaren gäller webbplatsen; den summerar inte likes eller delningar från sociala medier.

Inläggets `note.id` används normalt som ID. Om du byter filnamn/slug efter publicering, lägg till `reactionId: gammalt-inläggs-id` i frontmatter för att behålla likes. Två inlägg får inte dela samma ID.

## Delningsbilder och metadata

`npm run build` genererar först 1200 × 630 JPEG-bilder i `public/social/` från lokala bilder under `public/images/`. Även SVG och WebP får JPEG-versioner. Originalbilderna ändras inte. Bilden skalas med marginaler så att kretskort och diagram inte kapas. Framtida lokala artikelbilder hanteras av samma byggsteg.

Ett inlägg med `image: '/images/minipill-v2.webp'` delar automatiskt `/social/minipill-v2.webp.jpg`. Inlägg utan en lokal bild använder en gemensam Field Notes-bild. Titel, beskrivning, absolut bildadress, kanonisk URL och Open Graph/X-kort finns i sidans HTML, så sociala tjänster kan läsa dem utan JavaScript. Sociala tjänster kan cachelagra gamla förhandsvisningar; använd deras verktyg för att läsa om en ändrad länk.

## Lokal kontroll

```powershell
npm run likes:setup:local
npm test
npm run build
npm run preview
```

Kontrollera ett inlägg i vanlig och smal mobilbredd: gilla, ladda om, ångra, testa ett annat webbläsarfönster med separat lagring, öppna delningsmenyn med tangentbord och kopiera länken. Testa även avbruten systemdelning och API-fel. Besök en genererad `/social/...jpg` direkt och kontrollera delningskortet i LinkedIn Post Inspector.
