# Data-migratie: Lovable Cloud → self-hosted (deze server)

Status: **niet blokkerend, nog niet uitgevoerd — aanpak herzien op 2026-07-09.**
Deze self-hosted stack draait met een vers, grotendeels leeg schema. Dit
document beschrijft precies wat er nog moet gebeuren.

## Belangrijke correctie t.o.v. eerdere versie van dit document

De oorspronkelijke aanname was dat dit een gewoon Supabase Cloud-project is
met een normale database-connection-string en service role key beschikbaar.
**Dat klopt niet.** Navraag bij Lovable (via de gebruiker) bevestigt: dit
project draait op **Lovable Cloud** — Lovable's eigen beheerde
Supabase-instantie. Dat betekent concreet:

- **Geen database-connection-string of service role key beschikbaar.** Het
  project staat niet in een Supabase Dashboard die de gebruiker kan
  benaderen. `pg_dump`/`pg_restore` rechtstreeks tegen de cloud-db (zoals
  eerder in dit document stond) **is niet mogelijk**.
- **Auth, Storage, Realtime en Edge Functions blijven volledig bij Lovable
  Cloud.** Die schema's/data zijn niet op te vragen via de standaard
  export-route.
- **Wel mogelijk:** CSV-export per tabel van het `public`-schema, aangeboden
  via de Lovable-chat/UI (Cloud → Advanced settings → Export data, of de
  Lovable-assistent kan dit direct genereren).

### Openstaande vraag: Lovable MCP

Sinds mei 2026 biedt Lovable (op sommige plannen) een **MCP-server met
directe SQL-toegang** tot de Lovable Cloud-database — inclusief `auth.users`
mét wachtwoord-hashes. Als dit voor dit project beschikbaar is, verandert
dat de aanpak volledig (zie "Pad A" hieronder). **Aan de gebruiker gevraagd
om dit bij Lovable na te vragen — antwoord nog niet binnen.**

## Twee mogelijke paden

### Pad A — als Lovable MCP / directe SQL-toegang beschikbaar blijkt

Als de gebruiker de Lovable MCP-server aan een sessie kan koppelen (of een
directe SQL-connectiestring via die route krijgt), kan de volledige
migratie alsnog in één keer: schema, public-data, `auth.users` (met
wachtwoord-hashes), storage-bestanden en edge functions. In dat geval:
gewoon de stappen 1-6 uit de "klassieke" aanpak hieronder gebruiken (sectie
"Restore-mechaniek", die blijft ongewijzigd geldig zodra er wél een
dump/connectie beschikbaar is) — alleen de bron van de dump verandert (via
MCP/SQL i.p.v. een normale `pg_dump` tegen een publiek bereikbare host).

### Pad B — CSV-export (het pad dat nu voorligt, geen MCP)

Alleen `public`-schema-data komt mee, geen auth/storage/realtime/functions.
Gevolgen die de gebruiker moet accepteren:

- **Wachtwoorden kunnen niet worden meegenomen.** Bestaande gebruikers
  krijgen bij eerste keer inloggen op de nieuwe omgeving een
  "wachtwoord instellen"-mail (SMTP is al werkend geconfigureerd — zie
  SETUP_LOG.md sectie 13). Hun e-mailadres/profieldata blijven wel intact
  als het `profiles`/`auth.users`-record met hetzelfde e-mailadres opnieuw
  wordt aangemaakt via een signup- of invite-flow.
  **Dit is nog niet definitief afgesproken met de gebruiker** — de finale
  beslissing wacht op het antwoord over MCP-beschikbaarheid (Pad A).
- **Storage-bestanden** (profielfoto's e.d.) moeten apart opgehaald worden.
  Voor buckets die `public: true` staan (zoals `profile-images`, zie
  migratie `20260315182202_...`) kan dit mogelijk direct via de bestaande
  **anon key** (die al bekend is uit de repo) tegen de Storage REST API,
  zonder dat een service role key nodig is — te proberen zodra de
  bucket-/bestandsnamen bekend zijn (bv. via de `storage.objects`-rijen als
  die ooit in een CSV terechtkomen, of via een lijst die Lovable apart kan
  aanleveren).
- **Schema (DDL) is niet inbegrepen** in de CSV-export. Tabellen, RLS,
  functies en triggers moeten los overgezet worden. **Actie voor de
  gebruiker:** vraag Lovable specifiek om de volledige `CREATE TABLE`
  -statement van `public.profiles` (alle kolommen/types/defaults/RLS
  policies) en de definitie van `public.is_admin(uuid)` — dit is exact het
  ontbrekende basisschema-stuk dat eerder al werd geconstateerd (zie
  sectie "Bekende schema-gap" hieronder). Zonder deze twee dingen falen 13
  van de 20 repo-migraties, en falen ook de CSV-imports (foreign keys naar
  `profiles`).

## Bekende schema-gap (ongewijzigd, blijft relevant)

`supabase/migrations/` in de repo bevat 20 SQL-bestanden. Bij het toepassen
tegen een verse Postgres-instantie faalden 13 van de 20 met fouten als:

```
ERROR: relation "public.profiles" does not exist
ERROR: function public.is_admin(uuid) does not exist
```

De basistabellen (`profiles`) en functies (`is_admin()`) staan nergens in de
migratiegeschiedenis — ze zijn kennelijk rechtstreeks in de Lovable/Supabase
Studio UI aangemaakt, buiten versiebeheer om. Wat al wél succesvol is
toegepast op deze server (7 van 20 migraties):
`otp_codes`, `community_posts`, `direct_messages`, `member_vouchers`,
`user_roles`, `voucher_redemptions`, `admin_credentials`, plus een aantal
policies, triggers en een pg_cron schedule.

**Vóór je CSV's of een dump importeert:** reset het `public`-schema eerst
(zie "Restore-mechaniek" stap 2) — bouw niet voort op deze gedeeltelijke
staat.

## Wat de gebruiker nu bij Lovable moet navragen (samenvatting)

1. ✅ CSV-export van alle `public`-tabellen — **al aangevraagd, staat klaar**
2. ⏳ `CREATE TABLE`-statement voor `profiles` + definitie van `is_admin(uuid)`
   (en eventuele andere RLS/triggers die aan `profiles` hangen)
3. ⏳ Is Lovable MCP / directe SQL-toegang tot de Cloud-database beschikbaar
   op dit plan? (bepaalt of Pad A of Pad B gevolgd wordt, en of
   wachtwoord-hashes mee kunnen)
4. ⏳ Is er een manier om storage-bestanden (profielfoto's) in bulk te
   exporteren, of moeten we dit zelf via de anon key + Storage REST API
   proberen op te halen?

## Restore-mechaniek (blijft geldig, ongeacht welk pad)

Zodra schema (DDL) en data (CSV's of een dump) binnen zijn:

### 1. Reset het schema op de self-hosted db

```bash
docker exec -it eagle-db psql -U postgres -d postgres -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;"
```

### 2. Schema (DDL) toepassen

Eerst de door Lovable aangeleverde `CREATE TABLE profiles (...)` +
`is_admin()`-functie draaien, dan pas de bestaande
`supabase/migrations/*.sql` opnieuw toepassen (nu zouden alle 20 moeten
slagen, aangezien de basis er dan wél staat):

```bash
cd /opt/apps/eagle-amsterdam/supabase/migrations
PGPASS=$(grep '^POSTGRES_PASSWORD=' ../.env | cut -d= -f2-)
for f in $(ls *.sql | sort); do
  docker exec -i eagle-db env PGPASSWORD="$PGPASS" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done
```

### 3a. Data importeren — CSV-pad (Pad B)

Per tabel, bv. voor `profiles.csv`:
```bash
docker cp profiles.csv eagle-db:/tmp/profiles.csv
docker exec -it eagle-db psql -U postgres -d postgres -c \
  "\COPY public.profiles FROM '/tmp/profiles.csv' WITH (FORMAT csv, HEADER true)"
```
Herhalen per tabel, in een volgorde die rekening houdt met foreign keys
(bv. `profiles` vóór `member_vouchers`/`direct_messages`/etc., aangezien die
laatste waarschijnlijk naar `profiles.id` verwijzen).

### 3b. Data importeren — dump-pad (Pad A, als MCP/SQL-toegang beschikbaar is)

```bash
cat cloud_dump.dump | docker exec -i eagle-db pg_restore -U postgres -d postgres --no-owner --no-privileges
```

### 4. Auth-gebruikers

- **Pad A** (dump met `auth`-schema): gebruikers staan al in `auth.users`,
  bestaand wachtwoord blijft werken. Test met een test-account.
- **Pad B** (CSV, geen auth): gebruikers moeten opnieuw een account
  aanmaken of via een password-reset-flow een wachtwoord instellen voor
  hetzelfde e-mailadres. Nog te bepalen hoe dit precies uitgevoerd wordt
  (bv. bulk-invite via GoTrue's admin-API met `email_confirm: true` en dan
  een reset-link, of gebruikers laten het gewoon zelf opnieuw doen).

### 5. Storage-bestanden

Zie "Pad B" hierboven voor het idee om publieke buckets via de anon key op
te halen. Voor niet-publieke buckets is een service role key (dus Pad A/MCP)
nodig. Upload naar self-hosted:
```bash
curl -X POST -H "Authorization: Bearer <SELF_HOSTED_SERVICE_ROLE_KEY>" \
  -H "apikey: <SELF_HOSTED_SERVICE_ROLE_KEY>" \
  --data-binary @localfile \
  "https://api1.eagleamsterdam.com/storage/v1/object/<bucket-name>/<path>"
```

### 6. Edge Functions

Al gedeployed op deze self-hosted stack (`supabase/volumes/functions/`) —
zie `/opt/apps/eagle-amsterdam/README.md`. Geen actie nodig tenzij de
Lovable Cloud-versie afwijkt van wat in git staat.

### 7. Verificatie na migratie

- [ ] Login met een bestaand account werkt op `https://app1.eagleamsterdam.com`
      (met nieuw wachtwoord bij Pad B, met bestaand wachtwoord bij Pad A)
- [ ] Profielfoto's en andere storage-bestanden laden correct
- [ ] Voucher/loyalty-data komt overeen met de cloud-omgeving
- [ ] Edge functions die de database aanspreken werken (bv. `get-profile`)
- [ ] `admin_credentials` / admin-login werkt nog

### 8. Pas daarna: DNS omzetten en Lovable Cloud-project uitzetten

Zet dit pas stil nadat bovenstaande checklist volledig groen is en er
minstens één volledige backup-cyclus (zie backup.sh) is gedraaid op de nieuwe
omgeving.
