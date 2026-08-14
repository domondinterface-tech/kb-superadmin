# KB SuperAdmin

Jesyon Multi-Tenant pou [KB Books](https://github.com/domondinterface-tech/myaccountingapp).
Sa a se yon app **konplètman separe** de KB Books — pwòp login, pwòp ti baz done
(SQLite, menm jan ak KB Books). Li pa gen okenn rapò ak app lòtri KB Center la;
li la pou bay lòt biznis ekstèn (ki pa nan sektè lòtri) pwòp enstans KB Books yo.

Gade `ROADMAP.md` nan repo `myaccountingapp` pou kontèks konplè sou pwojè sa a.

## Kijan li mache

1. Yon SuperAdmin konekte, ranpli yon fòm senp (non tenant la, non mak/brand la,
   imèl premye admin la).
2. Sa kreye yon ranje `Tenant` ak estati `PENDING`.
3. Lè SuperAdmin la klike "Provizyone Kounye A" (`src/lib/actions/tenants.ts` →
   `runProvisioning`), `src/lib/railway.ts` rele Railway API a pou:
   - Kreye yon nouvo pwojè + sèvis Railway
   - Tache yon Volume pèsistan sou `/data` (kritik — SQLite pèdi si pa gen
     Volume, gade README KB Books la), ak `DATABASE_URL=file:/data/dev.db`
   - Mete varyab anviwònman tenant la (`ADMIN_EMAIL`, `ADMIN_PASSWORD` jenere,
     `BRAND_NAME`, `DANGER_ZONE_PIN` jenere, `SUPERADMIN_API_KEY`, elatriye)
   - Kreye yon domèn piblik
   - Tenant la vin `NEEDS_GITHUB_CONNECT`
4. **Etap manyèl obligatwa**: token API Railway a pa gen otorizasyon GitHub
   (limit platfòm Railway konfime — gade "Limitasyon konnen" anba a), donk
   SuperAdmin la dwe konekte repo `domondinterface-tech/myaccountingapp`
   (branch `main`) nan sèvis Railway a manyèlman, yon sèl fwa, atravè
   dashboard Railway a (Settings → Source). Paj detay tenant la bay lyen ak
   enstriksyon egzak pou sa.
5. Retounen nan paj detay tenant la, klike "Fini Deplwaman an"
   (`runFinishDeploy` → `finishDeploy()`) pou deklanche premye deplwaman an.
6. Si sa reyisi, tenant la vin `ACTIVE` ak yon URL ak yon modpas tanporè pou
   premye admin la itilize.

## Dashboard jesyon tenant

- **Lis tenant yo** (`/`): tout tenant, estati yo, ak yon kolòn "Aktif" ki ka
  klike pou aktive/dezaktive yon tenant.
- **Paj detay tenant** (`/tenants/[id]`):
  - Bouton Aktive/Dezaktive — se yon **drapo swivi sèlman**, li pa bloke aksè
    tenant la nan pwòp enstans KB Books li; se jis yon fason pou SuperAdmin
    swiv ki tenant ki toujou "vivan" biznis.
  - Lyen dirèk + modpas tanporè ak yon bouton "Kopye" — pou SuperAdmin lan
    ka konekte sou nenpòt enstans tenant ak kont admin li san li pa bezwen
    chèche modpas la nan yon lòt kote (se yon senp lyen + modpas pataje, se
    pa yon vre SSO).
  - Kat "Rezime Finansye" (sèlman lè tenant la `ACTIVE`) — rele
    `fetchTenantSummary()` ki fè yon apèl HTTP otantifye
    (`x-superadmin-key`) sou `GET /api/superadmin/summary` nan pwòp enstans
    KB Books tenant la, e afiche kach kòf, total aktif, pwofi net, ak si
    bilan an balanse.

## Limitasyon konnen

Token API Railway yo (kreye atravè paj "Tokens" kont Railway la) **pa gen
otorizasyon GitHub App/OAuth pèsonèl** — konfime an dirèk kont API Railway a
(requête `me`/`githubRepos` retounen "Not Authorized"). Se poutèt sa etap
"konekte GitHub" la rete manyèl (etap 4 pi wo a). Pa gen okenn koreksyon kòd
pou sa — se yon limit platfòm Railway.

## Devlopman lokal

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Premye kont SuperAdmin la kreye otomatikman soti nan `ADMIN_EMAIL` /
`ADMIN_PASSWORD` / `ADMIN_NAME` nan `.env` (defo: `admin@example.com` /
`changeme123` — chanje l apre premye koneksyon).

## Varyab Anviwònman

Gade `.env.example`. Sou sèvè kb-superadmin an pwodiksyon, de varyab yo enpòtan:

- `RAILWAY_API_TOKEN` — obligatwa pou aksyon "Provizyone" a reyèlman kreye
  yon sèvis Railway.
- `SUPERADMIN_API_KEY` — obligatwa pou kat "Rezime Finansye" a mache sou paj
  detay tenant yo. Menm valè a dwe konfigire kòm varyab anviwònman sou pwòp
  sèvis Railway chak tenant tou, paske se KB Books li menm ki verifye header
  la (gade `.env.example` nan repo `myaccountingapp`). Tenant ki kreye
  **anvan** varyab sa a te konfigire sou kb-superadmin bezwen l ajoute
  manyèlman (Railway → sèvis tenant la → Variables).
