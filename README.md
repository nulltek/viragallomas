# Virág Állomás Szeged

Reszponzív, önálló webshop és admin felület. Éles környezetben PostgreSQL-ben, helyi fejlesztéskor pedig a `data/store.json` fájlban tárolja a katalógust és a rendeléseket.

## Indítás

1. Telepíts Node.js 18 vagy újabb verziót.
2. Másold át a `.env.example` tartalmát a futtatási környezetedbe, vagy állítsd be a változókat a tárhelyeden.
3. Indítsd el:

```bash
npm start
```

- Webshop: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Kezdeti admin jelszó: `Admin123!`

Az első belépés után az admin felületen azonnal változtasd meg a jelszót. Éles környezetben állíts be hosszú, véletlenszerű `SESSION_SECRET` értéket és egyedi `ADMIN_INITIAL_PASSWORD` értéket még az első indítás előtt.

## Barion beállítása

Állítsd be ezeket a környezeti változókat:

```text
PUBLIC_URL=https://a-sajat-domain.hu
BARION_ENV=sandbox
BARION_POS_KEY=a-barion-sandbox-poskey
BARION_PAYEE_EMAIL=a-barion-fiokhoz-tartozo@email.hu
BARION_PIXEL_ID=BP-XXXXXXXXXX-00
SESSION_SECRET=legalabb-32-karakteres-veletlen-ertek
DATABASE_URL=postgresql://...
```

Éles környezetben állítsd a `BARION_ENV` értékét `live`-ra, és használd az éles, jóváhagyott Barion shop POSKey értékét. A POSKey titok; csak a tárhelyszolgáltató környezeti változójaként tárold.

A Barion shop beállításaiban add meg vagy az indított fizetésben kapja meg ezt a callback címet:

```text
https://a-sajat-domain.hu/api/barion/callback
```

Az alkalmazás a callback után a Barion PaymentState végpontján ellenőrzi a fizetés összegét, pénznemét és végleges állapotát, és csak `Succeeded` állapotnál jelöli fizetettnek a rendelést. A vásárló visszairányítása önmagában nem hitelesíti a fizetést.

Barion kulcs nélkül a webshop készpénzes, személyes átvételes rendelési módja továbbra is működik. Kezdd a Sandbox környezetben, és csak a Barion jóváhagyása után válts élesre.

A Base Barion Pixelhez a Barion shop részleteinél található, `BP-` kezdetű Pixel ID-t add meg `BARION_PIXEL_ID` néven. Ez nem titkos kulcs; a Pixel a publikus webshopoldalakon töltődik be.

## Rendelési e-mail értesítések

A webshop- és egyedi rendelések e-mailben is elküldhetők a tulajdonosnak. Gmail használatakor kapcsold be a kétlépcsős azonosítást, hozz létre Google App Passwordöt, majd állítsd be a következő környezeti változókat:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=viola32ildiko@gmail.com
SMTP_PASS=a-16-karakteres-google-app-password
ORDER_NOTIFICATION_EMAIL=viola32ildiko@gmail.com
```

Az App Passwordöt kizárólag a tárhelyszolgáltató titkos környezeti változójaként tárold, ne a forráskódban. Ha az e-mail küldés nincs konfigurálva vagy átmenetileg hibázik, a rendelés továbbra is elmentődik és megjelenik az admin felületen.

## Funkciók

- reszponzív webshop, termékkeresés, kategória- és színszűrés, rendezés
- kedvencek, termékrészletek, tartós kosár
- személyes átvételes pénztár névvel, e-maillel és telefonszámmal
- készpénzes vagy Barion online bankkártyás fizetés
- védett admin felület, jelszócsere
- termékek, kategóriák és színek létrehozása, szerkesztése és törlése
- termékenként legfeljebb 6 feltöltött kép
- rendelések listázása, keresése, szűrése és állapotkezelése
- adatbázisból kezelt heti nyitvatartás, amely minden publikus oldalon automatikusan frissül
- webshop- és egyedi rendelési e-mail értesítések

## Élesítés előtt

- Töltsd ki a valódi üzletcímet, telefonszámot, e-mailt és nyitvatartást a `public/index.html` fájlban.
- Cseréld le a fejlesztési ÁSZF- és adatkezelési mintaszöveget jogilag ellenőrzött dokumentumokra.
- Állíts be HTTPS-t és rendszeres biztonsági mentést a `data/store.json` fájlra.
- Nagyobb forgalomnál a feltöltött képeket érdemes objektumtárhelyre költöztetni; a jelenlegi adatbázis JSONB mezőben tárolja őket.

## Képi világ

A projekt öt, beépített `image_gen` módban készített, jogtiszta fejlesztési képet használ: egy széles hero-fotót és négy termékfotót. A promptok prémium, természetes virágfotókat kértek a referencia peach/ivory/sage hangulatában, szöveg, logó, vízjel és emberek nélkül.
