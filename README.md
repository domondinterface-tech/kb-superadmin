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
   - Kreye yon nouvo pwojè + sèvis Railway, deplwaye menm kòd KB Books la
     (`domondinterface-tech/myaccountingapp`, branch `main`)
   - Tache yon Volume pèsistan (kritik — SQLite pèdi si pa gen Volume, gade
     README KB Books la)
   - Mete varyab anviwònman tenant la (`ADMIN_EMAIL`, `ADMIN_PASSWORD` jenere,
     `BRAND_NAME`, `DANGER_ZONE_PIN` jenere, elatriye)
   - Kreye yon domèn piblik e lanse premye deplwaman an
4. Si sa reyisi, tenant la vin `ACTIVE` ak yon URL ak yon modpas tanporè pou
   premye admin la itilize.

## Estati aktyèl (enpòtan)

`src/lib/railway.ts` ekri ak konesans jeneral sou API GraphQL piblik Railway a
(URL, header otantifikasyon, non mitasyon yo) — men **poko janm teste kont yon
vre kont Railway**, paske pa gen `RAILWAY_API_TOKEN` disponib ankò nan
anviwònman kote sa te ekri a, e sandbox la pa gen aksè rezo pou verifye
dokimantasyon Railway a an dirèk. Anvan w konte sou li an pwodiksyon:

1. Fè yon requête "introspection" kont API Railway a ak yon vre token pou
   konfime non mitasyon/chan yo toujou kòrèk.
2. Fè yon vre tès `provisionTenant()` kont yon tenant jetab.

San `RAILWAY_API_TOKEN`, kreyasyon tenant toujou mache (ranje `Tenant` kreye
nòmalman), men bouton "Provizyone" a retounen yon estati `BLOCKED_NO_TOKEN` ak
yon mesaj ki eksplike sa.

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

Gade `.env.example`. `RAILWAY_API_TOKEN` se sèl la ki opsyonèl pou devlopman
lokal, men obligatwa pou aksyon "Provizyone" a reyèlman kreye yon sèvis
Railway.
