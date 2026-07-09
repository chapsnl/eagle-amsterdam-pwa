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
