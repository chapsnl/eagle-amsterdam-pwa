# Setup-logboek: multi-app Docker hosting server

**Server:** 188.245.237.210 (Hetzner, Ubuntu 26.04 "resolute", 2 vCPU / 3.7GB RAM / 75GB disk)
**Uitgevoerd op:** 2026-07-09
**Door:** Claude (agent-sessie), zelfstandig zonder tussentijdse bevestiging, in opdracht van de gebruiker

Dit document beschrijft **wat er is gedaan, in welke volgorde, waarom, en met
welke concrete commando's/bestanden** — zodat toekomstige aanpassingen niet
blind hoeven te gebeuren. Voor de architectuur-samenvatting en de "nieuwe app
toevoegen"-handleiding: zie `/opt/apps/README.md`. Voor de openstaande
data-migratie: zie `/opt/apps/eagle-amsterdam/MIGRATION.md`.

---

## 0. Voorwaarden en context bij start

- Verse Ubuntu-VPS, geen Docker, geen bestaande apps.
- Belangrijke ontdekking tijdens de sessie: **188.245.237.210 is dezelfde
  machine als waar de agent-sessie zelf op draait** (loopback) — er bestond
  al een `deploy`-gebruiker (uid 1000) met een actieve Claude Code-installatie
  en `NOPASSWD: ALL` sudo (aangemaakt door cloud-init). Dit is *niet* iets wat
  deze sessie heeft aangemaakt. Zie sectie 8 voor hoe hiermee is omgegaan.
- Toegang verkregen via een door de gebruiker aangeleverde SSH private key
  (root). **Advies:** roteer deze key op termijn, aangezien hij in de
  sessiehistorie van dit gesprek heeft gestaan.
- Geen firewall (ufw/iptables) geconfigureerd — expliciet verzoek, wordt
  extern toegevoegd.

---

## 1. Basissysteem

```bash
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg jq htop unzip git \
  postgresql-client fail2ban apt-transport-https software-properties-common
```

**Docker Engine + Compose plugin** via officiële Docker apt-repo (codename
`resolute` bleek al ondersteund):
```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu resolute stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```
Resultaat: Docker 29.6.1, Compose v5.3.1.

**Swap** (RAM was 3.7GB, onder de 4GB-drempel uit de opdracht):
```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf && sysctl --system
```

**fail2ban** (geen firewall, wel SSH-bruteforce-bescherming):
```bash
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600
```

**Gedeeld netwerk:**
```bash
docker network create edge
```

---

## 2. Gedeelde Caddy reverse proxy

Locatie: `/opt/caddy/`

- `Caddyfile`: bevat alleen een globale `email`-instelling (voor Let's
  Encrypt, `leatherpridebv@gmail.com`) en `import /etc/caddy/sites/*.caddy`.
- `docker-compose.yml`: image `caddy:latest`, netwerk `edge`, poorten
  `80:80` en `443:443` (enige container op de hele server met
  host-gepubliceerde poorten), volumes `/opt/caddy/data` en
  `/opt/caddy/config` (persistent — hier staan de certificaten), bind-mounts
  van `Caddyfile` en `sites/`.
- Gestart met `docker compose up -d`, geverifieerd met `docker compose logs`
  (geen import-fouten, admin-endpoint actief).

Reload-commando voor nieuwe sites: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`.

---

## 3. Eagle Amsterdam — repo en analyse

```bash
git clone https://github.com/chapsnl/eagle-amsterdam-pwa.git /opt/apps/eagle-amsterdam
```

Bevindingen bij analyse:
- Vite + React + TypeScript + shadcn-ui + Tailwind, package manager is
  eigenlijk **bun** (bun.lock/bun.lockb aanwezig), package-lock.json bleek
  **niet in sync** met package.json → `npm ci` faalde, opgelost door
  `npm install` te gebruiken in het Dockerfile (zie sectie 6).
- Repo bevatte al een `.env` (getrackt in git!) met cloud Supabase-gegevens:
  `VITE_SUPABASE_PROJECT_ID=cohyfjbokmdsuluaoroz`,
  `VITE_SUPABASE_URL=https://cohyfjbokmdsuluaoroz.supabase.co`, en de
  publieke anon-key. Dit is de bron voor de cloud-projectgegevens in
  `MIGRATION.md`.
- `supabase/migrations/`: 20 SQL-bestanden.
- `supabase/functions/`: 23 edge function-mappen (+ later 24 met `main`-router
  meegerekend).
- Frontend leest `import.meta.env.VITE_SUPABASE_URL` en
  `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  (`src/integrations/supabase/client.ts`) — dus **niet** de meer gebruikelijke
  `VITE_SUPABASE_ANON_KEY`-naam. Belangrijk als je dit later aanpast: de
  envvar-naam moet exact overeenkomen met wat de code leest.

---

## 4. Self-hosted Supabase-stack voor eagle-amsterdam

Bron: officiële `supabase/supabase` repo, map `docker/`, gekloond naar
`/tmp/supabase-src` en gekopieerd naar `/opt/apps/eagle-amsterdam/supabase/`.

### 4.1 Waarom de compose-file is aangepast

De originele `docker-compose.yml` van Supabase gebruikt **vaste,
niet-configureerbare `container_name`-waarden** (`supabase-studio`,
`supabase-kong`, `supabase-db`, etc.) én publiceert Kong- en
Supavisor-poorten direct naar de host (`KONG_HTTP_PORT:8000`,
`POSTGRES_PORT:5432`, etc.). Beide zijn **niet compatibel** met de eis dat
meerdere apps naast elkaar moeten kunnen draaien zonder poort-/naamconflict.
Dus:

1. **Alle `container_name`-waarden geprefixt** met `eagle-` (bv.
   `supabase-db` → `eagle-db`). Uitzondering: de Realtime-container heet
   letterlijk `realtime-dev.supabase-realtime` in de officiële set — deze
   naam wordt door Realtime zelf geparsed om de tenant-id te bepalen (zie
   code-comment in de originele compose-file). Hernoemd naar
   `realtime-dev.eagle`, en de vier hardcoded verwijzingen ernaar in
   `volumes/api/kong.yml` (regels met `url: http://realtime-dev.supabase-realtime:4000/...`)
   zijn meegewijzigd naar `realtime-dev.eagle`.
2. **`name: supabase`** (compose-projectnaam) → `name: eagle-amsterdam`.
3. **Host-poorten verwijderd** bij `kong` (`8000`/`8443`) en `supavisor`
   (`5432`/`6543`) — deze services zijn nu alleen bereikbaar via
   Docker-netwerken, niet vanaf de host/het internet.
4. **`edge`-netwerk toegevoegd, alleen aan de `kong`-service**
   (naast het standaard project-netwerk), zodat Caddy er via `eagle-kong:8000`
   bij kan. Alle andere Supabase-containers (db, auth, rest, storage,
   realtime, meta, functions, studio, pooler) zitten **niet** op `edge` —
   enige bereikbare ingang van buiten het project-netwerk is Kong.

Dezelfde transformatie is 1-op-1 toegepast op de **TEMPLATE**-versie
(sectie 7), met `APPNAME` als placeholder in plaats van `eagle`.

### 4.2 Secrets gegenereerd

Met de **officiële Supabase key-generator-scripts** (in `supabase/utils/`):
```bash
cd /opt/apps/eagle-amsterdam/supabase
cp .env.example .env && chmod 600 .env
sh utils/generate-keys.sh --update-env      # POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY,
                                             # SERVICE_ROLE_KEY, SECRET_KEY_BASE,
                                             # REALTIME_DB_ENC_KEY, VAULT_ENC_KEY,
                                             # PG_META_CRYPTO_KEY, DASHBOARD_PASSWORD, etc.
sh utils/add-new-auth-keys.sh --update-env  # ES256 keypair (JWT_KEYS/JWT_JWKS) +
                                             # opaque sb_publishable_/sb_secret_ keys
                                             # (draait via een tijdelijke node:22-alpine
                                             # container, want geen node op de host)
```
`ANON_KEY`/`SERVICE_ROLE_KEY` zijn dus **geldige HS256-JWT's ondertekend met
het eigen `JWT_SECRET`** van deze stack — niet hergebruikt van de cloud.

Handmatig ingevuld in `.env` na generatie:
```
SUPABASE_PUBLIC_URL=https://api1.eagleamsterdam.com
API_EXTERNAL_URL=https://api1.eagleamsterdam.com/auth/v1
SITE_URL=https://app1.eagleamsterdam.com
ADDITIONAL_REDIRECT_URLS=https://app1.eagleamsterdam.com/**
POOLER_TENANT_ID=eagle-amsterdam
STUDIO_DEFAULT_ORGANIZATION=Eagle Amsterdam
STUDIO_DEFAULT_PROJECT=Eagle Amsterdam
GLOBAL_S3_BUCKET=eagle-amsterdam-storage
REGION=eu-west-1
STORAGE_TENANT_ID=eagle-amsterdam
DASHBOARD_USERNAME=admin
```
`COMPOSE_FILE` is bewust op alleen `docker-compose.yml` gelaten (geen
`docker-compose.logs.yml`/Vector/Logflare) om RAM te sparen op deze
3.7GB-server — niet vereist door de opdracht.

### 4.3 Starten en verifiëren

```bash
cd /opt/apps/eagle-amsterdam/supabase
docker compose config   # syntax-validatie
docker compose up -d
docker compose ps       # alle 11 containers -> healthy
```
Extra verificatie: een tijdelijke container op het `edge`-netwerk kon
`http://eagle-kong:8000/auth/v1/health` bereiken (401 zonder apikey, 200 mét
geldige `ANON_KEY`) — bevestigt dat Kong correct op `edge` hangt en de
gegenereerde keys werken.

---

## 5. Database-migraties

```bash
cd /opt/apps/eagle-amsterdam/supabase/migrations
for f in $(ls *.sql | sort); do
  docker exec -i eagle-db env PGPASSWORD="$PGPASS" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done
```

**Resultaat: 7 van de 20 migraties geslaagd, 13 gefaald.** Foutmelding
steeds van het type `relation "public.profiles" does not exist` of
`function public.is_admin(uuid) does not exist`.

**Root cause:** de basistabellen (`profiles`) en functies (`is_admin()`)
worden **nergens** in `supabase/migrations/` aangemaakt — ze bestonden al in
het cloud-project vóórdat migratiebestanden werden bijgehouden (vermoedelijk
rechtstreeks aangemaakt via de Lovable/Supabase Studio UI, buiten
versiebeheer om). De migraties in git zijn dus incrementeel bovenop een
niet-getrackt basisschema. **Dit is geen fout van deze setup** — het is een
eigenschap van de brongegevens.

Wat wél succesvol is aangemaakt: `otp_codes`, `community_posts`,
`direct_messages`, `member_vouchers`, `user_roles`, `voucher_redemptions`,
`admin_credentials`, plus een aantal policies/triggers/een pg_cron schedule.

**Vervolgstap (uitgewerkt in `MIGRATION.md`):** vóór een echte pg_dump vanaf
de cloud wordt geïmporteerd, eerst `DROP SCHEMA public CASCADE; CREATE SCHEMA
public;` draaien — niet voortbouwen op deze partiële staat.

---

## 6. Caddy-site + frontend

### 6.1 Caddy-site
`/opt/caddy/sites/eagle-amsterdam.caddy`:
```caddyfile
app1.eagleamsterdam.com {
	reverse_proxy eagle-frontend:80
}
api1.eagleamsterdam.com {
	reverse_proxy eagle-kong:8000
}
```
Reload: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`.

### 6.2 Frontend build
`/opt/apps/eagle-amsterdam/Dockerfile` — multi-stage:
- Stage 1 (`node:20-alpine`): `npm install` (niet `npm ci`, zie sectie 3),
  `ARG`/`ENV` voor `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID`, dan `npm run build`.
- Stage 2 (`nginx:alpine`): kopieert `dist/` naar
  `/usr/share/nginx/html`, custom `nginx.conf` met SPA-fallback
  (`try_files $uri $uri/ /index.html`) en cache-headers voor `/assets/`.

`/opt/apps/eagle-amsterdam/.env` (build-env, **niet** hetzelfde bestand als
`supabase/.env`):
```
VITE_SUPABASE_URL="https://api1.eagleamsterdam.com"
VITE_SUPABASE_PUBLISHABLE_KEY="<de nieuw gegenereerde ANON_KEY>"
VITE_SUPABASE_PROJECT_ID="eagle-amsterdam"
```

`docker-compose.yml` (frontend): container `eagle-frontend`, alleen op
`edge`-netwerk, geen host-poort.

### 6.3 Projectnaam-conflict opgelost

Bij de eerste `docker compose up -d` gaf Compose een "orphan containers"
waarschuwing: **zowel** `supabase/docker-compose.yml` als
`eagle-amsterdam/docker-compose.yml` gebruikten toevallig dezelfde
compose-projectnaam (`eagle-amsterdam`), waardoor Docker de 11
Supabase-containers als "orphans" van het frontend-project zag. Risico:
iemand die later `docker compose up -d --remove-orphans` in de frontend-map
draait, zou per ongeluk de hele Supabase-stack kunnen verwijderen.

**Opgelost** door de frontend-compose-projectnaam te wijzigen naar
`eagle-amsterdam-app` (regel `name: eagle-amsterdam-app` in
`/opt/apps/eagle-amsterdam/docker-compose.yml`). De Supabase-compose behield
`name: eagle-amsterdam`. **Let hierop bij het kopiëren van dit patroon voor
nieuwe apps** — zorg dat frontend- en supabase-compose een verschillende
projectnaam hebben (de TEMPLATE gebruikt al `APPNAME-app` vs `APPNAME`).

### 6.4 .gitignore aangevuld

De gekopieerde officiële Supabase-infra (docker-compose-varianten, `utils/`,
`volumes/`, en vooral `supabase/.env` met alle secrets) stond na het kopiëren
als **untracked bestanden midden in een al getrackte git-repo-map**
(`supabase/` bevatte al `migrations/` en `functions/` uit de originele repo).
Risico: een onnadenkende `git add -A` zou alle Postgres/JWT/service-role
secrets in git-historie zetten. **Opgelost** door
`/opt/apps/eagle-amsterdam/.gitignore` aan te vullen met o.a.
`supabase/.env`, `supabase/volumes/`, `supabase/docker-compose*.yml`, etc.
(zie het bestand zelf voor de volledige lijst). Deze wijziging staat **lokaal
klaar maar is niet gepusht** — dat kan alleen de gebruiker doen.

De root-`.env` (met alleen de publieke anon-key) was al vóór deze sessie
getrackt in git — bewust zo gelaten, want dit is een client-side publieke
key, geen geheim.

---

## 7. Edge Functions

De self-hosted `functions`-container draait een `main`-router
(`supabase/volumes/functions/main/index.ts`, onderdeel van de officiële
Supabase-docker-set) die requests naar `/functions/v1/<naam>` doorstuurt naar
`/home/deno/functions/<naam>`. Alle 23 functiemappen uit de app-repo
(`supabase/functions/*`) zijn gekopieerd naar
`supabase/volumes/functions/*`, gevolgd door `docker compose restart
functions`. Getest: `GET /functions/v1/hello` via Kong gaf de verwachte
response.

**Let op:** dit is een **kopie**, geen symlink. Als de functie-broncode in de
repo wijzigt (via `git pull`), moet die kopie opnieuw gemaakt worden — dit
gebeurt **niet automatisch** door `deploy.sh` in de huidige vorm. Zie
"Openstaande verbeterpunten" onderaan dit document.

---

## 8. Backups

`/opt/apps/eagle-amsterdam/backup.sh`: draait `pg_dump --format=custom` via
`docker exec eagle-db` (dus zonder dat Postgres een host-poort nodig heeft)
naar `/opt/backups/eagle-amsterdam/`, met een `find ... -mtime +14 -delete`
voor retentie. Cron (root's crontab):
```
15 3 * * * /opt/apps/eagle-amsterdam/backup.sh >> /var/log/eagle-amsterdam-backup.log 2>&1
```
Eén keer handmatig getest vóór het inplannen — succesvolle dump van 333KB.

---

## 9. CI/CD

### 9.1 De `deploy`-gebruiker

Zoals vermeld in sectie 0: er bestond al een `deploy`-gebruiker met volledige
NOPASSWD-sudo (cloud-init default, gekoppeld aan de actieve
Claude-Code-sessie op deze machine). In overleg met de gebruiker is **deze
gebruiker hergebruikt** in plaats van een nieuwe aan te maken:
- `usermod -aG docker deploy` — zodat `docker compose` zonder sudo werkt
  (geverifieerd met `sudo -u deploy -i docker ps`).
- `chown -R deploy:deploy /opt/apps/eagle-amsterdam` — zodat `git pull` /
  `npm install` / `docker compose build` als `deploy` kunnen zonder root.
- Secret-bestanden (`.env`, `supabase/.env`) na de chown expliciet weer op
  `chmod 600` gezet.

**Consequentie om te onthouden:** de `deploy`-gebruiker heeft (via de
al-bestaande sudo-configuratie) volledige root-rechten — dit is dus **niet**
de "minimaal benodigde rechten"-opzet die de oorspronkelijke opdracht voor
een geïsoleerde CI/CD-gebruiker voorstelde. Die keuze is bewust gemaakt op
verzoek van de gebruiker, niet een tekortkoming van de uitvoering.

### 9.2 Apart SSH-keypair voor GitHub Actions

```bash
ssh-keygen -t ed25519 -f /root/secrets/deploy_eagle_amsterdam.key -N "" \
  -C "github-actions-deploy@eagle-amsterdam"
cat /root/secrets/deploy_eagle_amsterdam.key.pub >> /home/deploy/.ssh/authorized_keys
```
De **private key is eenmalig in de chat getoond** en staat op de server in
`/root/secrets/deploy_eagle_amsterdam.key` (chmod 600, root-only). Moet als
GitHub Actions-secret `DEPLOY_SSH_KEY` worden toegevoegd door de gebruiker
(niet door deze sessie te doen — geen GitHub-toegang).

### 9.3 deploy.sh
`/opt/apps/eagle-amsterdam/deploy.sh`: `git pull --ff-only origin main` →
`npm install` → `source .env` → `docker compose up -d --build` →
`docker image prune -f`. Bewust **geen** `--remove-orphans` gebruikt (zie
sectie 6.3 — zou de Supabase-stack kunnen raken als projectnamen ooit weer
zouden botsen).

**Let op:** dit script herbouwt alleen de frontend-container. Het
herdeployt **niet** automatisch de Supabase-migraties of edge functions bij
elke push — dat blijft een handmatige stap (zie openstaande
verbeterpunten).

### 9.4 GitHub Actions workflow (te plaatsen door gebruiker)

Zie `/opt/apps/README.md`, sectie "CI/CD — GitHub Actions", voor de
kant-en-klare workflow-YAML (`appleboy/ssh-action`, trigger op push naar
`main`, roept `deploy.sh` aan via SSH als user `deploy`).

---

## 10. TEMPLATE voor app 2/3/4

`/opt/apps/TEMPLATE/` bevat een **niet-gestarte** kopie van hetzelfde patroon
als eagle-amsterdam, met `APPNAME` als placeholder overal waar normaal
`eagle` stond:
- `supabase/` — verse, ongewijzigde officiële Supabase docker-set met
  dezelfde container-naam-/poort-/netwerk-transformaties als sectie 4.1
  (dus al klaar om alleen `APPNAME` te vervangen).
- `docker-compose.yml`, `Dockerfile`, `nginx.conf`, `.env.example` — frontend
  skelet.
- `example.caddy.template` — voorbeeld Caddy-site met twee domeinen.
- `backup.sh.template` — backup-script-skelet.

Volledige "5 stappen"-procedure staat in `/opt/apps/README.md`.

---

## 11. Openstaande verbeterpunten (niet blokkerend, ter overweging)

Dit zijn dingen die tijdens de bouw zijn opgevallen maar buiten de scope van
de oorspronkelijke opdracht vielen — het is aan de gebruiker om te bepalen of
dit de moeite waard is:

1. **Edge functions worden niet automatisch opnieuw uitgerold bij een
   `deploy.sh`-run.** Als de repo een functie wijzigt, moet
   `supabase/functions/<naam>` handmatig opnieuw naar
   `supabase/volumes/functions/<naam>` gekopieerd worden + `docker compose
   restart functions` in de `supabase/`-map. Zou aan `deploy.sh` toegevoegd
   kunnen worden.
2. **Nieuwe migraties worden niet automatisch toegepast bij deploy.** Bewust
   niet automatisch gemaakt (risico op stuklopen bij destructieve migraties
   zonder review) — blijft een bewuste, handmatige stap.
3. **`deploy`-gebruiker heeft volledige sudo**, niet de "alleen docker"-scope
   die oorspronkelijk bedoeld was — zie sectie 9.1. Prima zolang dit de enige
   operator-gebruiker op de server blijft; overweeg dit te verfijnen als er
   ooit een externe/minder vertrouwde CI-runner gebruikt gaat worden.
4. **RAM is nu al deels in gebruik via swap** (± 1.5GB van de 4GB swap in
   gebruik met alleen eagle-amsterdam actief). Bij het toevoegen van app 2/3
   met eigen volledige Supabase-stacks (elk ±11 containers) kan dit krap
   worden op een 3.7GB-server — overweeg een RAM-upgrade vóór app 2 als de
   Postgres/Realtime/Storage-combinatie merkbaar traag wordt.
5. **SMTP niet geconfigureerd** — zie `/opt/apps/README.md`, "Bekende
   beperkingen".
6. **Root-SSH-key die voor deze sessie is gebruikt** heeft in de
   sessiehistorie gestaan — overweeg rotatie.

---

## 12. Belangrijkste bestanden — quick reference

| Bestand | Inhoud |
|---|---|
| `/opt/apps/README.md` | Architectuuroverzicht + "nieuwe app in 5 stappen" + CI/CD-workflow-YAML |
| `/opt/apps/eagle-amsterdam/MIGRATION.md` | Cloud→self-hosted migratiestappen (schema-gap, storage, auth) |
| `/opt/apps/eagle-amsterdam/SETUP_LOG.md` | Dit document |
| `/opt/apps/eagle-amsterdam/supabase/.env` | Alle Supabase-secrets (chmod 600) |
| `/opt/apps/eagle-amsterdam/.env` | Frontend build-env (publieke anon-key) |
| `/opt/apps/eagle-amsterdam/deploy.sh` | CI/CD deploy-script |
| `/opt/apps/eagle-amsterdam/backup.sh` | Dagelijkse pg_dump |
| `/opt/caddy/sites/eagle-amsterdam.caddy` | Reverse-proxy-routes voor deze app |
| `/root/secrets/deploy_eagle_amsterdam.key` | CI/CD SSH private key |

---

## 13. SMTP geconfigureerd (2026-07-09, na oplevering)

Gebruiker leverde SMTP-gegevens aan (mxroute): host `safari.mxrouting.net`,
poort 587, user/from `noreply@eagleamsterdam.net`. Verwerkt in
`/opt/apps/eagle-amsterdam/supabase/.env` (`SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`), gevolgd
door `docker compose up -d auth` om de nieuwe env vars te laden.

### Bijwerkende bug gevonden en gefixt: Postgres-datadirectory-permissies

Na het herstarten van `eagle-auth` crashte de container in een restart-loop:
```
FATAL: could not open file global/pg_filenode.map: Permission denied (SQLSTATE 42501)
```
Oorzaak: de eerdere `chown -R deploy:deploy /opt/apps/eagle-amsterdam` uit
sectie 9.1 (CI/CD-gebruiker-setup) had **ook** de Postgres-datadirectory
(`supabase/volumes/db/data/`, een bind-mount) van UID 100 (de `postgres`-user
binnen de `supabase/postgres`-image) naar UID 1000 (`deploy`) veranderd.
De draaiende `eagle-db`-container bleef zelf gezond staan (bestaande
verbindingen/cache bleven werken), maar zodra `eagle-auth` een NIEUWE
Postgres-transactie probeerde te starten, kon de `postgres`-OS-user de
databasebestanden niet meer lezen.

**Fix:**
```bash
chown -R 100:101 /opt/apps/eagle-amsterdam/supabase/volumes/db/data
docker compose restart auth
```
Alle 11 containers weer `healthy` na de fix. Storage-volumes zijn NIET
geraakt (de `storage-api`-container draait intern als root, dus is niet
gevoelig voor host-UID-mismatches).

**Les voor toekomstige aanpassingen:** gebruik nooit een brede
`chown -R deploy:deploy` op een app-map die ook een Postgres-bind-mount
bevat (`supabase/volumes/db/data/`). Chown specifieke submappen los, en houd
`volumes/db/data` op UID:GID `100:101` (de `postgres`-user/group binnen de
`supabase/postgres`-image).

> **Update 2026-07-10:** deze exacte fout is hierna nog een keer gemaakt,
> door een andere sessie die dit document niet had geraadpleegd — zie
> sectie 18.6 voor het vervolg.

### Verificatie

Testmail getriggerd via `POST /auth/v1/otp` naar `leatherpridebv@gmail.com`
— request duurde 2.6s en gaf `200` terug (een falende SMTP-config had direct
een foutrespons gegeven), dus de mail is daadwerkelijk verstuurd via
`safari.mxrouting.net`.

---

## 14. SSL-verificatie beide domeinen (2026-07-09)

Op verzoek geverifieerd of `app1` en `api1` daadwerkelijk onder geldig HTTPS
draaien (niet alleen aangenomen).

- `app1.eagleamsterdam.com`: direct in orde — geldig Let's Encrypt-certificaat,
  `curl --ssl-verify` slaagt (verify result 0), HTTP 200.
- `api1.eagleamsterdam.com`: **faalde eerst** met
  `TLS alert internal error` — Caddy had geen geldig certificaat.

### Root cause

In Caddy's logs bleek dat de allereerste certificaataanvraag voor
`api1.eagleamsterdam.com` (op het moment van de eerste `caddy reload`, kort
na het aanmaken van de Caddy-site) faalde met
`DNS problem: NXDOMAIN looking up A for api1.eagleamsterdam.com`. Op dat
moment was de DNS voor `api1` blijkbaar nog niet (volledig) gepropageerd,
terwijl `app1`'s DNS toen al wel klopte. Caddy liet daarna een lock-bestand
achter (`/opt/caddy/data/caddy/locks/issue_cert_api1.eagleamsterdam.com.lock`)
en probeerde het niet vanzelf opnieuw binnen de sessie.

### Fix

Een `docker exec caddy caddy reload` bleek **niet genoeg** — Caddy zag de
Caddyfile-inhoud als ongewijzigd (`"config is unchanged"`) en deed daardoor
geen nieuwe certificaatpoging. Pas een volledige herstart forceerde een
verse aanvraag:
```bash
rm -f /opt/caddy/data/caddy/locks/issue_cert_api1.eagleamsterdam.com.lock
cd /opt/caddy && docker compose restart caddy
```
Binnen enkele seconden: `authz_status: valid`, certificaat uitgegeven,
`curl` naar `https://api1.eagleamsterdam.com/` geeft nu een geldig
Let's Encrypt-certificaat en verify result 0.

**Les voor nieuwe apps:** als je een Caddy-site droppt vlak nadat je de DNS
hebt ingesteld, kan één van de domeinen een certificaatpoging missen doordat
DNS nog aan het propageren is op het moment van de `caddy reload`. Een
losse `reload` triggert dan geen nieuwe poging (config wordt als
"unchanged" gezien). Los op met een volledige
`docker compose restart caddy` in `/opt/caddy/` nadat je hebt geverifieerd
dat de DNS wél klopt (`dig +short <domein> A`).


---

## 15. Data-migratie uitgevoerd: Lovable Cloud → self-hosted (2026-07-09)

Vervolg op sectie 13/14 van `MIGRATION.md`: navraag bij Lovable bevestigde
**Lovable Cloud** (geen eigen Supabase-account, geen DB-connectiestring/
service-role key beschikbaar, geen MCP/SQL-toegang, wachtwoord-hashes
principieel niet exporteerbaar). Aanpak: CSV-export per tabel door Lovable,
handmatig via `scp` naar `/opt/apps/eagle-amsterdam/migration-data/`
(chmod 700, root-only — bevat PII en een bcrypt-hash, nooit in git; staat
nu ook expliciet in `.gitignore`).

### 15.1 Ontbrekend basisschema alsnog gereconstrueerd

Lovable leverde de volledige `CREATE TABLE profiles`-DDL + `is_admin()` +
bijbehorende triggers (dit vulde exact de gap uit sectie 5/13: `profiles`
en `is_admin()` stonden nergens in `supabase/migrations/`). Toegepast,
gevolgd door het **opnieuw draaien van alle 20 migratiebestanden** — nu
slaagden alle 20 (de eerdere 7 waren al toegepast in de vorige sessie, de
overige 13 gaven verwachte "already exists"-meldingen voor wat al bestond,
en pasten de nog ontbrekende delta's alsnog toe).

**Extra gevonden tijdens het opnieuw draaien:**
- Een **duplicate trigger** op `profiles` (`assign_member_number_trigger` uit
  Lovable's antwoord + `trigger_assign_member_number` uit de originele
  git-migratie, functioneel identiek). De git-migratie-versie is leidend
  gehouden, de andere verwijderd.
- Migratie `20260630070046` (meest recente, 30 juni) bevatte een
  **verscherpte** `profiles`-UPDATE-policy (pint `vip_status`/
  `total_stamps_earned`/`member_number` vast tegen zelf-aanpassen door de
  gebruiker) die eerder nooit toegepast was omdat het bestand stopte bij een
  FK-fout op een hardcoded admin-seed-rij. Los toegepast.
- `admin_credentials` miste de kolommen `failed_attempts`/`locked_until`
  (wel aanwezig in het live Lovable-schema volgens `types.ts`, nooit in een
  git-migratie terechtgekomen). `ALTER TABLE ... ADD COLUMN` toegepast.
- Drie tabellen (`active_loyalty_code`, `loyalty_stamps`, `tickets`) stonden
  **helemaal niet** in `supabase/migrations/` — gereconstrueerd uit
  `src/integrations/supabase/types.ts` (het auto-gegenereerde Supabase
  TypeScript-types-bestand, bevat de complete kolomdefinities van alle
  tabellen — bruikbaar als schema-bron wanneer migraties incompleet zijn).
  RLS voor deze drie is **niet** door Lovable aangeleverd, maar afgeleid uit
  daadwerkelijk query-gedrag in de broncode (`grep` naar `supabase.from(...)`
  per tabelnaam):
  - `active_loyalty_code`: alleen via service-role edge functions
    aangeraakt → RLS aan, geen policies (default-deny voor anon/authenticated).
  - `loyalty_stamps`: frontend leest/schrijft eigen rijen met de
    ingelogde-gebruiker-JWT → policies op `auth.uid() = user_id`.
  - `tickets`: **nergens** in actieve code bevraagd (frontend gebruikt een
    hardcoded lokale array in `Events.tsx`) → publieke read-only policy
    toegepast als **aanname**, niet bevestigd gebruik. Overweeg dit bij
    Lovable te verifiëren als er ooit een CMS-achtige tickets-feature
    gebouwd wordt.

### 15.2 UUID-remapping voor 88 gebruikers

Cloud-UUID's van gebruikers konden niet hergebruikt worden (geen
`auth.users`-export mogelijk). Aanpak:
1. Alle 88 rijen uit `profiles.csv` via de GoTrue **admin-API**
   (`POST /auth/v1/admin/users` met alleen `email` + `email_confirm:true`,
   geen wachtwoord) omgezet in nieuwe self-hosted auth-accounts — via een
   tijdelijke `python:3.12-alpine`-container op het `edge`-netwerk
   (`migrate_users.py`, stdlib-only, geen dependencies nodig).
   1 van de 88 (`leatherpridebv@gmail.com`) bestond al lokaal (test-account
   uit een eerdere SMTP-test in dezelfde sessie) — handmatig gemapt i.p.v.
   opnieuw aangemaakt.
2. Mapping (`old_id,new_id,email`) weggeschreven naar `id_map.csv`.
3. Elke tabel-CSV geladen in een staging-schema (`mig`), gevolgd door
   `INSERT INTO public.<tabel> SELECT ... FROM mig.<tabel> JOIN mig.id_map
   ON <kolom> = old_id` — dus user-kolommen (`user_id`, `sender_id`,
   `recipient_id`, `created_by`) herschreven naar de nieuwe UUID's, terwijl
   niet-user-gerelateerde primary/foreign keys (bv. `community_posts.id`/
   `parent_id`, onderling zelfverwijzend) ongewijzigd overgenomen zijn.
   `profiles`-insert gebruikte `ON CONFLICT (id) DO UPDATE` omdat de
   `on_auth_user_created`-trigger (sectie 15.4 hieronder) al automatisch een
   lege profielrij aanmaakt zodra een auth-user wordt aangemaakt in stap 1.
4. Resultaat (rijen geïmporteerd, 100% van de brondata):
   `profiles` 88, `direct_messages` 140, `member_vouchers` 78,
   `loyalty_stamps` 86, `tickets` 11, `community_posts` 4,
   `voucher_redemptions` 3, `user_roles` 1, `active_loyalty_code` 1,
   `admin_credentials` 1.
5. Staging-schema (`mig`) achteraf gedropt, `.service_role_key`-bestand en
   in-container `/tmp/migration-data` verwijderd. De CSV's zelf staan nog
   op de host (chmod 700 root-only) als audit-trail.

**Storage:** geen enkel profiel had een `profile_image_url` ingevuld (0 van
88) — storage-bestanden-migratie bleek voor deze dataset niet nodig.

**`admin_credentials` bijzonderheid:** dit is een eigen app-tabel (custom
SHA-256-achtige hash, zie `admin-auth`-functie), **niet** Supabase Auth —
dus het bestaande admin-wachtwoord van Michael is gewoon **behouden**,
geen reset nodig voor de admin-login op `admin.eagleamsterdam.com`.

### 15.3 SMTP ontbrak op de functions-container (aparte bug, blokkeerde alle OTP-mails)

`send-otp` (en `send-contact-email`/`send-invite-email`) lezen hun eigen
`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` rechtstreeks via
`Deno.env.get(...)` — **onafhankelijk** van de `auth`-service (GoTrue), die
haar eigen, apart doorgegeven SMTP-config heeft (zie sectie 13). De
`functions`-service in `supabase/docker-compose.yml` gaf deze vars nooit
door, dus elke `send-otp`-aanroep faalde stil met `SMTP not configured`
(zichtbaar in de UI als "Kon code niet versturen. Probeer opnieuw.").

**Fix:** `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SENDER_NAME`/
`SMTP_ADMIN_EMAIL` toegevoegd aan de `functions`-service in
`supabase/docker-compose.yml`, gevolgd door `docker compose up -d functions`.

**Overige env-vars die edge functions verwachten maar niet zijn doorgegeven**
(gecontroleerd, niet blokkerend, met fallback of optioneel):
`LOYALTY_QR_CODE` (heeft een hardcoded fallback `"EAGLE2027"` in
`scan-loyalty-stamp`), `ONESIGNAL_APP_ID`/`ONESIGNAL_REST_API_KEY` (push
notificaties, optioneel), `SENDER_API_TOKEN`/`SENDER_GROUP_ID`
(nieuwsbrief-inschrijving, optioneel, al defensief gecodeerd met een
`if (token && group)`-guard). Zet deze pas op de server als de gebruiker
die features daadwerkelijk wil activeren.

### 15.4 Wachtwoord-loze login, en twee bugs gevonden tijdens het bouwen van de "systeemupgrade"-feature

Op verzoek van de gebruiker: **geen** bulk-e-mail-wachtwoordreset. In plaats
daarvan aangehaakt op het **bestaande** OTP-inlogsysteem
(`send-otp`/`verify-otp`, gebruikt door `VipLogin.tsx`/`VipVerify.tsx`) —
dit systeem is sowieso al wachtwoordloos: een geldige OTP-code resulteert
in een door GoTrue gegenereerde **magic link**-sessie, geen wachtwoord
nodig om in te loggen.

**Aanpak:**
1. Alle 88 gemigreerde gebruikers gemarkeerd met
   `raw_user_meta_data->>'needs_password_reset' = true` (eenmalige
   `UPDATE auth.users`, geen versiebeheerde migratie — is data, geen schema).
2. `verify-otp`-functie uitgebreid: geeft nu `needs_password_reset` terug in
   de response (uitgelezen uit `existingUserData.user.user_metadata`).
3. Nieuwe pagina `/vip/set-password` (`src/pages/VipSetPassword.tsx`):
   toont een vriendelijke uitleg ("systeemupgrade, wachtwoord kon om
   veiligheidsredenen niet worden meegenomen") + wachtwoord/bevestig-velden,
   roept `supabase.auth.updateUser({ password, data: {
   needs_password_reset: false } })` aan bij versturen. Vertaald in alle 5
   ondersteunde talen (`src/i18n/locales/{en,nl,de,fr,es}.json`, key
   `vipSetPassword`).
4. `VipVerify.tsx`: na succesvolle OTP-verificatie, als
   `needs_password_reset` true is, doorsturen naar `/vip/set-password`
   (i.p.v. direct naar dashboard/profile-setup); na het instellen van het
   wachtwoord gaat de gebruiker alsnog naar dezelfde bestemming als normaal.
5. Route toegevoegd in `src/App.tsx` (`/vip/set-password` → lazy-loaded
   `VipSetPassword`).

**Bug #1 — GoTrue verwerpt `email` + `token_hash` samen.** Tijdens het
end-to-end testen (zie 15.5) bleek `supabase.auth.verifyOtp({ email,
token_hash, type: "magiclink" })` in `VipVerify.tsx` te falen met
`400 validation_failed: "Only the token_hash and type should be provided"`
op deze GoTrue-versie (v2.189.0) — het gemixte email+token_hash-payload dat
in oudere/andere GoTrue-versies werd geaccepteerd, wordt hier geweigerd.
**Fix:** `email` weggehaald uit die specifieke call, alleen `token_hash` +
`type` blijven staan. Dit is een pre-existing bug in de broncode (niet iets
dat door zelf-hosten geïntroduceerd is), die op de self-hosted GoTrue-versie
zichtbaar werd.

**Bug #2 — `vip_session` (localStorage) werd nooit gezet bij een succesvolle
auth-sessie.** Grote ontdekking: **de hele rest van de app**
(`VipDashboard.tsx`, `useProfile.ts`, `useMemberVouchers.ts`,
`useDirectMessages.ts`, `useActivityHeartbeat.ts`, `VipMemberPass.tsx`,
`VipInfo.tsx`, `VipMessageCenter.tsx`, `Settings.tsx`, `Vip.tsx`, `App.tsx`,
etc. — met `grep -rn "vip_session"` op te sporen) leest **uitsluitend** een
eigen `vip_session`-object uit `localStorage` om te bepalen of iemand is
ingelogd — **niet** de echte Supabase Auth-sessie. In de originele code
werd `vip_session` echter **alleen** gezet in de `if (authError)`-tak van
de `verifyOtp`-aanroep in `VipVerify.tsx` (dus alleen wanneer die aanroep
**faalde**). Zodra Bug #1 gefixed was en `verifyOtp` dus ging **slagen**,
werd `vip_session` nooit meer gezet, en stuurde `VipDashboard.tsx`'s eigen
check de gebruiker linea recta terug naar `/vip/login` — een nieuwe,
stille breuk veroorzaakt door het fixen van Bug #1.

**Fix:** `vip_session` wordt nu **altijd** gezet na een succesvolle
OTP-verificatie, ongeacht of de Supabase Auth-sessie-aanroep zelf slaagt of
faalt — consistent met hoe de rest van de app daadwerkelijk werkt.

**Vermoeden over de originele (Lovable Cloud) omgeving:** gegeven dat de
hele app op deze `vip_session`-cache leunt in plaats van op een echte auth-
sessie, is aannemelijk dat Bug #1 (of iets vergelijkbaars) ook al op
Supabase Cloud aanwezig was/is, en dat de app daar in de praktijk feitelijk
altijd via de `authError`-fallback liep — dit verklaart waarom het ooit zo
gebouwd is. Niet geverifieerd (geen toegang tot de cloud-omgeving meer
nodig), puur ter context voor toekomstig onderhoud.

### 15.5 Verificatiemethode: headless browser via Playwright in Docker

Er is geen `chromium-cli` of node/npx op deze server. Gebruikte aanpak voor
visuele/functionele verificatie van de live site:
```bash
docker run --rm -v <workdir>:/work -v <outdir>:/out -w /work \
  mcr.microsoft.com/playwright:v1.48.0-jammy node <script>.js
```
Twee app-specifieke obstakels tegengekomen (nuttig om te weten bij
toekomstig testen van deze app):
- **`PwaGate`-component** blokkeert alle niet-mobiele/niet-standalone
  bezoekers met een "installeer de app"-scherm. Omzeild door
  `context.addInitScript()` te gebruiken om `window.matchMedia("(display-
  mode: standalone)")` te laten `true` teruggeven (simuleert een
  geïnstalleerde PWA), gecombineerd met `devices['iPhone 13']`-emulatie
  (desktop-viewports krijgen een ander "Mobile Only"-scherm).
- **Sessie tussen twee scriptaanroepen delen**: `context.storageState({
  path })` opslaan na stap 1 (OTP aanvragen), inladen in stap 2 (code
  invullen) — nodig omdat de OTP-code niet synchroon binnen één
  scriptrun beschikbaar is (moet apart uit de database gehaald worden
  tussen de twee Playwright-aanroepen in).

Volledige flow (inloggen → OTP → wachtwoord instellen → dashboard) is
op deze manier end-to-end bevestigd te werken, inclusief een zichtbare
screenshot van het dashboard met de juiste naam/VIP-status/data.

### 15.6 Git-commit

Alle broncode-wijzigingen (VipVerify.tsx, VipSetPassword.tsx, App.tsx,
verify-otp/index.ts, i18n-bestanden) + infra-bestanden (Dockerfile,
docker-compose.yml, nginx.conf, deploy.sh, backup.sh, MIGRATION.md,
SETUP_LOG.md) zijn **lokaal gecommit** op de server (commit `d4e0468`).
**Niet gepusht** naar de GitHub-remote — dat is aan de gebruiker, of moet
apart gevraagd worden. `migration-data/` staat in `.gitignore` en is nooit
meegenomen in git.

### 15.7 Openstaande statussen voor de 88 gemigreerde gebruikers

Alle 88 accounts hebben op dit moment `needs_password_reset: true` in hun
`user_metadata` (het testaccount `michael.roks@icloud.com` is na testen
weer teruggezet naar `true`). Bij hun **eerste** OTP-login na de migratie
zien zij automatisch het "systeemupgrade"-scherm en moeten ze een nieuw
wachtwoord instellen voor ze verder kunnen — geen actie van de gebruiker
nodig, dit gebeurt vanzelf per account bij de eerstvolgende keer dat
iemand inlogt.

---

## 16. Admin-panel op admin1.eagleamsterdam.com (2026-07-09)

Gebruiker had tijdelijk `admin1.eagleamsterdam.com` in DNS aangemaakt
(wijst naar dit IP) als stand-in voor de uiteindelijke
`admin.eagleamsterdam.com`, om het admin-panel te kunnen testen vóór de
definitieve cutover.

### Caddy

Derde domein toegevoegd aan `/opt/caddy/sites/eagle-amsterdam.caddy`,
zelfde frontend-container als `app1` (het admin-panel is **geen aparte
app/container** — het is dezelfde React-SPA, die op basis van
`window.location.hostname` clientside beslist of ze de normale site of
`<AdminLogin />` toont, zie App.tsx):
```caddyfile
admin1.eagleamsterdam.com {
	reverse_proxy eagle-frontend:80
}
```
Certificaat werd bij de eerste `caddy reload` meteen correct uitgegeven
(DNS klopte al op het moment van de aanvraag, in tegenstelling tot het
eerdere `api1`-incident in sectie 14).

### Bevinding: hostname-check was hardcoded op het exacte domein

`PwaGate.tsx` (`BYPASS_HOSTS`) en `App.tsx` (root-route) checkten allebei
letterlijk `window.location.hostname === "admin.eagleamsterdam.com"` — dus
`admin1.eagleamsterdam.com` viel hier niet onder en toonde gewoon de
normale publieke site / mobile-gate, niet het admin-panel. Dit is
**visueel bevestigd** vóór en na de fix (Playwright-screenshot toonde eerst
het "Mobile Only"-scherm, na de fix het admin-loginscherm).

**Fix:** `admin1.eagleamsterdam.com` toegevoegd náást (niet i.p.v.)
`admin.eagleamsterdam.com` op beide plekken, zodat straks ook de definitieve
domeinnaam gewoon blijft werken zonder verdere wijziging. Frontend opnieuw
gebouwd en gedeployed.

### Admin-wachtwoord ingesteld

Het admin-login-systeem is **volledig los van Supabase Auth** — een eigen
tabel `admin_credentials` met een simpele SHA-256-hash (zie
`supabase/functions/admin-auth/index.ts`), plus een verplichte 2e factor
(OTP per e-mail, zelfde `otp_codes`-tabel/SMTP-pad als de VIP-login). De
`set-password`-actie in die functie weigert als er al een hash bestaat
(en die was er al, gemigreerd uit Lovable Cloud) — dus het wachtwoord is
**rechtstreeks in de database gezet**, niet via de API:
```bash
python3 -c "import hashlib; print(hashlib.sha256('<wachtwoord>'.encode()).hexdigest())"
# UPDATE admin_credentials SET password_hash = '<hash>', failed_attempts = 0,
#   locked_until = NULL WHERE user_id = (SELECT id FROM profiles WHERE email = 'michael.roks@icloud.com');
```
**Belangrijk om te onthouden:** de admin-wachtwoord-hash is **puur SHA-256**
zonder salt — dit is geen bcrypt/scrypt/argon2 en dus zwakker dan een
"echt" wachtwoordsysteem (kwetsbaar voor rainbow tables als de
database-inhoud ooit zou lekken). Buiten scope om dit nu te herbouwen,
maar het is een legitiem punt om ooit te verbeteren (bv. overstappen naar
bcrypt via een Deno-bcrypt-library in `admin-auth`).

### Volledige flow end-to-end getest (Playwright)

Wachtwoord → OTP-mail → code invullen → `/eagle-admin-dashboard`, met
zichtbare echte data ("Member Stats: 88", ledenlijst met namen/e-mails/
tokens/vouchers). **Verschil met de VIP-flow:** hier is **geen**
auto-submit bij de 4e cijfer-invoer — er moet expliciet op de
"VERIFY CODE"-knop geklikt worden. Er is ook **geen** Supabase Auth
GoTrue-sessie betrokken (dus Bug #1/#2 uit sectie 15.4 zijn hier niet van
toepassing) — het admin-paneel gebruikt uitsluitend zijn eigen
`admin_session`-object in localStorage, volledig onafhankelijk van de
VIP-sessie (`vip_session`) of een echte Supabase-sessie.

### Openstaand voor de gebruiker

Zodra de DNS van het **definitieve** `admin.eagleamsterdam.com` naar dit
IP wijst, werkt dat domein direct mee (staat al in de hostname-allowlist
en kan zo aan `/opt/caddy/sites/eagle-amsterdam.caddy` toegevoegd worden
met dezelfde `reverse_proxy eagle-frontend:80`-regel). `admin1` kan dan als
tijdelijk testdomein verwijderd worden uit zowel Caddy als de
hostname-allowlist in de broncode (niet blokkerend, puur opruimen).

---

## 17. Definitieve domeinen: cutover van app1/api1/admin1 naar app/api/admin (2026-07-09)

Gebruiker gaf de opdracht om over te schakelen naar de definitieve
domeinnamen (zonder "1"-suffix) en zou daarna zelf de DNS omzetten.

### Voorbereidend werk (vóór DNS-wijziging)

1. `supabase/.env`: `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`,
   `ADDITIONAL_REDIRECT_URLS` bijgewerkt naar `app.`/`api.eagleamsterdam.com`
   (zonder "1"), gevolgd door `docker compose up -d auth kong` om GoTrue de
   nieuwe waardes te laten oppikken.
2. `/opt/apps/eagle-amsterdam/.env`: `VITE_SUPABASE_URL` bijgewerkt naar
   `https://api.eagleamsterdam.com`, frontend opnieuw gebouwd (`docker
   compose up -d --build`) — nodig omdat `VITE_*`-vars ten tijde van de
   build ingebakken worden, niet at runtime leesbaar zijn.
3. `/opt/caddy/sites/eagle-amsterdam.caddy`: drie nieuwe site-blocks
   (`app`/`api`/`admin`, zonder "1") toegevoegd **naast** de bestaande
   `app1`/`api1`/`admin1`-blocks (niet vervangen) — bewuste keuze om een
   werkend failover-domein te behouden tijdens de DNS-overgang.
4. `kong.yml` gecontroleerd op hardcoded hostname-verwijzingen — geen
   gevonden (Kong routeert uitsluitend op pad, niet op Host-header, dus
   domeinwissels hier hebben geen impact op de Kong-configuratie).

### Timing-bevinding: Let's Encrypt-validatie kan sneller zijn dan lokale DNS-cache

Bij het herladen van Caddy (nog vóórdat de gebruiker `app.eagleamsterdam.com`
had omgezet) bleek `api.` en `admin.` al naar dit IP te wijzen, maar `app.`
volgens onze eigen `dig`/`curl` nog naar de oude Netlify-deployment.
**Toch** kreeg Caddy meteen voor alle drie domeinen, inclusief `app.`,
succesvol een certificaat ("authz_status: valid" / "certificate obtained
successfully"). Verklaring: Let's Encrypt's eigen validatie-resolvers
zagen kennelijk al de nieuwe DNS-waarde, terwijl onze server se eigen
`dig`/`curl`-aanroepen (via een mogelijk trager bijwerkende resolver/cache)
nog het oude antwoord teruggaven. Bevestigd met
`curl -sI https://app.eagleamsterdam.com/` (toonde `server: Netlify`) vs.
`curl -sI --resolve app.eagleamsterdam.com:443:188.245.237.210 https://app.eagleamsterdam.com/`
(toonde `server: nginx` / `via: 1.1 Caddy` — onze eigen stack, cert al
klaarliggend). **Les:** DNS-propagatie is niet uniform over resolvers;
"mijn eigen dig zegt nog oud" betekent niet dat een ACME-aanvraag
daardoor per se faalt — en omgekeerd, als de aanvraag al eerder is gedaan
(met een oudere DNS-staat) hoeft dat geen probleem te zijn zodra de
publieke resolvers wél bijgewerkt zijn.

### Resultaat na daadwerkelijke DNS-wijziging door de gebruiker

Binnen enkele seconden na "ik heb de dns aangepast" resolvede
`app.eagleamsterdam.com` naar dit IP en serveerde Caddy de site direct
correct (certificaat lag al klaar, geen nieuwe ACME-aanvraag nodig). Alle
drie definitieve domeinen geverifieerd:
- `app.eagleamsterdam.com` → `eagle-frontend:80`, HTTP 200, TLS geldig
- `api.eagleamsterdam.com` → `eagle-kong:8000`, TLS geldig, live
  `send-otp`-aanroep bevestigd werkend
- `admin.eagleamsterdam.com` → `eagle-frontend:80`, HTTP 200, TLS geldig

### Openstaand

`app1`/`api1`/`admin1.eagleamsterdam.com` staan nog actief in zowel Caddy
als de hostname-allowlist in `PwaGate.tsx`/`App.tsx` (zie sectie 16) — met
opzet niet verwijderd, als failover tijdens de overgangsperiode. Kunnen
opgeruimd worden zodra de gebruiker dat wil: DNS-records verwijderen bij de
registrar, de drie `*1`-blocks uit
`/opt/caddy/sites/eagle-amsterdam.caddy` verwijderen + `caddy reload`, en
optioneel `admin1.eagleamsterdam.com` uit de `BYPASS_HOSTS`/route-check in
de broncode verwijderen (niet urgent, geen kwetsbaarheid — een extra
toegestaan hostname is geen beveiligingsrisico zolang de DNS ervoor niet
meer bestaat).

---

## 18. Performance-audit, storage-opruiming en deploy-fixes (2026-07-10)

Vervolgsessie (nieuwe agent-instantie, geen geheugen van sectie 1-17 anders
dan wat in dit document en de repo staat). Opdracht: performance-audit van
de frontend, gevolgd door concrete fixes, en later op verzoek verder
opgeruimd (ongebruikte storage-feature, Docker-cruft).

### 18.1 Performance-fixes (frontend)

Commit `b4c6e7d`:
- **Dubbele service worker opgelost.** `index.html` registreerde handmatig
  `/sw.js` (een hand-geschreven SW in `public/sw.js`), terwijl
  `vite-plugin-pwa` óók een SW genereerde (`workbox`-config in
  `vite.config.ts`) die nooit expliciet geregistreerd werd maar bij build
  wél auto-inject kreeg (`injectRegister: "auto"`, default) — risico op een
  race tussen twee registraties op dezelfde scope. Hand-geschreven
  `public/sw.js` + registratiescript verwijderd, workbox is nu de enige bron
  (`filename: "sw.js"`), met `runtimeCaching`-regels toegevoegd voor Google
  Fonts (de Supabase/OneSignal-uitsluitingen van de oude hand-rolled SW
  werken nu impliciet: geen `runtimeCaching`-match = geen SW-interceptie).
- **PWA-icons bleken 1024×1024 volresolutie-PNG's**, terwijl bestandsnaam +
  manifest 192×192/512×512 beloofden — nooit daadwerkelijk verkleind.
  `apple-touch-icon.png`/`eagle-logo-192.png`: 849KB → 5KB.
  `eagle-logo-512.png`: 798KB → 45KB. Verkleind met Pillow (juiste
  pixelafmeting) + `pngquant`/`optipng` (extra compressie).
- **`html5-qrcode`** (~335KB ongecomprimeerd) werd eager gebundeld in de
  Loyalty-pagina-chunk, ook voor bezoekers die nooit scannen.
  `React.lazy()` toegepast in `ScannerDialog.tsx` en
  `MemberScannerSection.tsx` — zit nu in een eigen chunk, alleen geladen na
  klik op "Scan".
- `vite.config.ts`: `build.rollupOptions.output.manualChunks` toegevoegd
  (vendor-react/-radix/-supabase/-query gesplitst).
- `AdminDashboard.tsx`: `filteredMembers`/`recentMembers`/`stats` liepen bij
  elke render opnieuw door de volledige ledenlijst — nu in `useMemo`.
  `admin-get-members` edge function kreeg een `.limit(5000)`-guardrail
  (geen paginatie — zou search/stats-aggregatie server-side moeten
  herschrijven, bewust buiten scope gehouden).
- Losse `loading="lazy"` + expliciete afmetingen op de resterende
  `<img>`-tags zonder lazy-loading; default `staleTime: 60_000` op de
  globale React Query `QueryClient` (vangnet, alle bestaande hooks zetten al
  hun eigen staleTime).
- **Bewust overgeslagen:** i18next lazy-loading per taal — `BottomNav.tsx`
  en `PwaGate.tsx` gebruiken `useTranslation()` buiten de enige
  `<Suspense>`-boundary in `App.tsx`; een async vertaal-backend kan daar
  zonder boundary crashen. Winst (~20KB) woog niet op tegen het risico,
  zonder werkende build/testomgeving in de eerste sessie om het te
  verifiëren.
- Build geverifieerd via `docker run node:20-alpine ... npm run build`
  (geen node/npm op de VPS-host zelf) — bundle-analyse bevestigde de
  chunk-splitsing werkt zoals bedoeld.

Commit `918b214`: "Backroom Moderation" in het adminpaneel visueel gelijk
getrokken met "Broadcast Message"/"Push Notification" (`bg-card border
border-border rounded-xl`-kaartstijl toegepast op de toggle-knop).

### 18.2 Ongebruikte storage-feature verwijderd

Gebruiker vroeg wat `eagle-storage` deed; bleek dat er nergens in de
frontend een `<input type="file">` bestond — de enige schrijver
(`upload-profile-image` edge function, geüpload naar bucket
`profile-images`) werd door niets aangeroepen. Bucket bevatte 0 objecten
(geverifieerd vóór verwijdering).

Migratie `20260710083344_drop_unused_profile_images_storage.sql` dropt de
RLS-policies (directe SQL op `storage.buckets`/`storage.objects` wordt
geblokkeerd door Supabase's `protect_delete()`-trigger — de bucket zelf is
daarom via de Storage API verwijderd, niet via SQL):
```bash
docker run --rm --network eagle-amsterdam_default curlimages/curl -s \
  -X DELETE "http://storage:5000/bucket/profile-images" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```
`upload-profile-image` verwijderd uit zowel de repo
(`supabase/functions/`) als de gedeployde kopie
(`supabase/volumes/functions/`), gevolgd door `docker restart
eagle-functions`. De `storage`-service in `supabase/docker-compose.yml` is
**uitgecommentarieerd** (niet verwijderd) met een dagtekening + reden in een
comment, zodat een toekomstige upload-feature 'm zo kan terugzetten.
Container gestopt + verwijderd. RAM-gebruik: 2.1GB → 1.8GB.

### 18.3 `deploy.sh` bug: host-side `npm install` faalde altijd

`deploy.sh` deed `npm install` rechtstreeks op de VPS-host, vóór `docker
compose up -d --build` — maar er staat geen node/npm op de host (bevestigd:
noch root, noch de `deploy`-user hebben het). De Dockerfile draait zijn
eigen `npm install` al binnenin de `node:20-alpine`-buildstage, dus deze
regel was zowel overbodig als kapot. Verwijderd uit `deploy.sh` (commit
`99a0093`).

**Nog niet eerder opgemerkt omdat de GitHub Actions-workflow uit sectie 9.4
nooit daadwerkelijk is aangemaakt** (zie 18.4) — `deploy.sh` was tot nu toe
alleen handmatig gedraaid, en blijkbaar altijd mét een aanwezige node/npm op
de machine van de uitvoerende sessie in plaats van op de VPS zelf. Bij de
eerste écht geautomatiseerde run (of een handmatige run als de `deploy`-user
zelf) was dit direct fataal geweest.

### 18.4 GitHub Actions workflow: aangemaakt, niet geactiveerd

`.github/workflows/deploy.yml` (de YAML uit sectie 9.4 van dit document)
alsnog aangemaakt — maar **kon niet gepusht worden met een gewoon
Personal Access Token** ("refusing to allow a Personal Access Token to
create or update workflow `.github/workflows/deploy.yml` without `workflow`
scope", een GitHub-beperking los van repo-rechten). Gebruiker vond de
UI-route (zelf het bestand aanmaken via GitHub's "Create new file") en het
secret-beheer (`DEPLOY_SSH_KEY` toevoegen) te omslachtig, en koos expliciet
voor **doorgaan met handmatige deploys** (`sudo -u deploy bash
/opt/apps/eagle-amsterdam/deploy.sh`, uitgevoerd door de agent op verzoek).

De workflow-commit (`12894a7`) staat lokaal klaar in
`/root/eagle-amsterdam-pwa` maar is **niet gepusht** — punt 1 uit sectie 11
("edge functions/migraties niet automatisch bij deploy") blijft dus
onveranderd van toepassing, plus: er is ook geen automatische
*frontend*-deploy. Alle deploys tot nader order zijn handmatig, op verzoek
("push en deploy").

### 18.5 Docker-opruiming

Op verzoek: ongebruikte image `eagle-amsterdam-frontend:latest` (oude
naamgeving, niet meer gerefereerd door een draaiende container) +
`docker image prune -a -f` + `docker builder prune -f`. Reclaimed: 3.2GB
(losse `node`/`python`/`playwright`/`curl`/`hadolint`-images uit eerdere,
ongerelateerde sessies) + 1.6GB build-cache. Geen van de 13 draaiende
containers geraakt.

### 18.6 Herhaling van de sectie-13-bug: `chown -R deploy:deploy` opnieuw de Postgres-datadirectory gebroken

**Dit is exact dezelfde fout als sectie 13**, deze keer gemaakt door de
agent zelf (niet uit de deploy.sh/CI-setup, maar tijdens het onderzoeken
van een permissieprobleem met `git pull` op `/opt/apps/eagle-amsterdam` —
eerdere `git fetch`/`merge`/`stash`-commando's als root hadden
root-eigenaar-bestanden in `.git/` achtergelaten). Fix daarvoor was een
brede `chown -R deploy:deploy /opt/apps/eagle-amsterdam` — die wederom
`supabase/volumes/db/data/` meepakte (UID 100 → 1000), zonder dat sectie 13
van dit document geraadpleegd was vóór het uitvoeren van dat commando.

Symptoom ditmaal: gebruiker meldde "Failed to load data" op de
adminpagina. `eagle-db` bleef "healthy" in `docker ps` (bestaande
verbindingen/cache bleven werken — zelfde patroon als sectie 13), maar
`eagle-rest` en `realtime-dev.eagle` faalden op nieuwe verbindingen:
```
FATAL: could not open file "global/pg_filenode.map": Permission denied
```
Ook `supabase/.env` en `supabase/.env.old` (horen `root:root` te zijn, zie
sectie 12/README-secrettabel) waren per ongeluk meegenomen in de
`chown -R deploy:deploy` — apart teruggezet naar `root:root` chmod 600,
vóórdat de Postgres-permissiefout uberhaupt opgemerkt werd.

**Fix (identiek aan sectie 13):**
```bash
chown -R 100:101 /opt/apps/eagle-amsterdam/supabase/volumes/db/data
docker restart eagle-db
```
`eagle-rest`/`realtime` herstelden zelf via hun eigen retry-logica zodra
`eagle-db` weer gezond was. Alle 12 containers geverifieerd, `admin-get-members`
end-to-end opnieuw getest via Kong (`success:true`).

**Les, ditmaal dubbel onderstreept:** dit document waarschuwt al sinds
sectie 13 expliciet tegen `chown -R deploy:deploy` op een map die
`supabase/volumes/db/data/` bevat — en het gebeurde alsnog, omdat de
uitvoerende sessie dit document niet had geraadpleegd vóór het commando.
**Concreet advies voor een volgende sessie:** nooit `chown -R` los toepassen
op `/opt/apps/<app>/`; scope het altijd expliciet tot de submap die het
probleem heeft (bv. `.git/`), en behandel `supabase/volumes/db/data/` en
`supabase/.env*` als een vaste uitzondering die nooit meeloopt in een
bulk-chown.

---
