const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat(state.language === 'en' ? 'en-GB' : 'hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const uiTranslations = new Map(Object.entries({
  'Szegedi átvétel': 'Pickup in Szeged', 'Kézzel készül': 'Handmade', 'Mindig friss virágok': 'Always fresh flowers',
  'Csokrok': 'Bouquets', 'Egyedi csokor': 'Custom flowers', 'Virágboxok': 'Flower boxes', 'Alkalmak': 'Occasions', 'Esküvő': 'Weddings', 'Rólunk': 'About us', 'Kapcsolat': 'Contact',
  'Szegeden, szeretettel': 'Made with love in Szeged', 'Virágba csomagolt': 'Messages wrapped in', 'üzenetek.': 'flowers.',
  'Egyedi csokrok, friss virágokból, gondosan készítve minden alkalomra.': 'Unique bouquets, carefully made from fresh flowers for every occasion.',
  'Csokrok megtekintése': 'View bouquets', 'Egyedi rendelés': 'Custom order', 'Milyen alkalomra?': 'What is the occasion?',
  'Születésnap': 'Birthday', 'Évforduló': 'Anniversary', 'Köszönet': 'Thank you', 'Csak úgy': 'Just because',
  'Milyen színben?': 'Which colour?', 'Személyes átvétel': 'In-store pickup', 'Ajánlatok mutatása': 'Show recommendations',
  'A virágpult kedvencei': "Florist's favourites", 'Népszerű választások': 'Popular choices', 'Szűrők': 'Filters', 'Rendezés:': 'Sort:',
  'Kiemeltek': 'Featured', 'Ár szerint növekvő': 'Price: low to high', 'Ár szerint csökkenő': 'Price: high to low', 'Név szerint': 'Name',
  'Szűrés': 'Filter', 'Kategória': 'Category', 'Színvilág': 'Colour', 'Szűrők törlése': 'Clear filters',
  'Nincs ilyen csokrunk — még.': "We don't have that bouquet — yet.", 'Próbálj más szűrőt, vagy kérj tőlünk egyedi összeállítást.': 'Try another filter or ask us for a custom arrangement.', 'Összes csokor': 'All bouquets',
  'Kézzel kötött': 'Hand-tied', 'Minden csokor egyedi, gondosan készítve.': 'Every bouquet is unique and carefully made.',
  'Frissen készül': 'Made fresh', 'Virágainkat naponta, gondosan válogatjuk.': 'We carefully select our flowers every day.', 'Rendelésedet üzletünkben veheted át.': 'Collect your order from our shop.',
  'Egy csokor mindig mond valamit': 'A bouquet always says something', 'Minden alkalomra': 'For every occasion',
  'Születésnapra': 'For birthdays', 'Vidám, színes virágok': 'Cheerful, colourful flowers', 'Évfordulóra': 'For anniversaries', 'Romantikus összeállítások': 'Romantic arrangements',
  'Köszönetképpen': 'To say thank you', 'Finom, elegáns gesztus': 'A delicate, elegant gesture', 'Mert a hétköznap is lehet szép': 'Because an ordinary day can be beautiful',
  'A nagy nap virágai': 'Flowers for the big day', 'Esküvői virágok,': 'Wedding flowers,', 'egészen rátok hangolva.': 'made entirely for you.',
  'Menyasszonyi csokor, kitűzők, asztaldíszek és teljes virágdekoráció — egy harmonikus, személyes koncepcióban.': 'Bridal bouquets, buttonholes, table arrangements and complete floral decoration in one harmonious, personal concept.', 'Időpontot kérek': 'Request a consultation',
  'A virágkötészet számunkra egy különleges nyelv.': 'Floristry is a special language to us.',
  '2001 óta dolgozunk azon, hogy minden csokor őszinte, igényes és szeretetteljes üzenetet hordozzon. A gondosságot, a harmóniát és az érzelmek finom kifejezését keressük minden munkánkban.': 'Since 2001, we have created bouquets that carry sincere, refined and loving messages. We look for care, harmony and the subtle expression of emotions in every piece.',
  'Nem futószalagon készítünk: minden összeállítást az alkalomhoz, a színvilághoz és hozzád hangolunk.': 'Nothing is mass-produced: every arrangement is tailored to the occasion, colour palette and to you.',
  'Virágba csomagolt üzenetek,': 'Messages wrapped in flowers,', 'Szegeden, szeretettel.': 'made with love in Szeged.', 'Szeged, Magyarország': 'Szeged, Hungary',
  'Nyitvatartás': 'Opening hours', 'Hétfő–Péntek: 8:00–17:00': 'Monday–Friday: 8:00–17:00', 'Szombat: 8:00–13:00': 'Saturday: 8:00–13:00', 'Vasárnap: zárva': 'Sunday: closed',
  'Információ': 'Information', 'Általános szerződési feltételek': 'Terms and Conditions', 'Adatkezelési tájékoztató': 'Privacy Notice', 'Admin belépés': 'Admin login', 'Friss virág. Gondos kéz. Szívből.': 'Fresh flowers. Caring hands. From the heart.',
  'Rendelésed': 'Your order', 'Kosár': 'Cart', 'A kosarad még üres.': 'Your cart is empty.', 'Válassz egy csokrot, amit örömmel elkészíthetünk.': 'Choose a bouquet we would be delighted to make.', 'Megnézem a csokrokat': 'View bouquets',
  'Összesen': 'Total', 'Kizárólag személyes átvétel üzletünkben': 'In-store pickup only', '⌖ Kizárólag személyes átvétel üzletünkben': '⌖ In-store pickup only', 'Tovább a pénztárhoz': 'Continue to checkout', 'Vissza a kosárhoz': 'Back to cart', '← Vissza a kosárhoz': '← Back to cart',
  'Átvételi adatok': 'Pickup details', 'Név': 'Name', 'Telefonszám': 'Phone number', 'Megjegyzés': 'Note', '(opcionális)': '(optional)', 'Fizetés': 'Payment',
  'Fizetés átvételkor': 'Pay on pickup', 'Készpénzzel az üzletben': 'Cash in store', 'Bankkártya (Stripe)': 'Card (Stripe)', 'Még nem elérhető': 'Not available yet',
  'Elfogadom az ÁSZF-et és az adatkezelési tájékoztatót.': 'I accept the Terms and Conditions and the Privacy Notice.', 'Rendelés leadása': 'Place order', 'Rendelés leadása ·': 'Place order ·', 'Rendelés lemondása': 'Cancel order', 'Virág rendelése esetén a rendelés leadása után nincs lehetőség lemondásra.': 'Flower orders cannot be cancelled after they have been submitted.',
  'Rendelésed sikeresen leadva!': 'Your order has been placed successfully!', 'Köszönjük, rendelésedet rögzítettük.': 'Thank you, we have recorded your order.', 'Rendelési azonosítód:': 'Your order number:', 'Hamarosan felvesszük veled a kapcsolatot az átvétel részleteivel.': 'We will contact you shortly with the pickup details.', 'Rendben': 'Done'
}));

const catalogTranslations = {
  'Rózsák': 'Roses', 'Tulipánok': 'Tulips', 'Púder': 'Blush', 'Barack': 'Peach', 'Fehér': 'White', 'Színes': 'Colourful',
  'Púder álom': 'Blush dream', 'Nyári kert': 'Summer garden', 'Barackos ragyogás': 'Peach glow', 'Fehér harmónia': 'White harmony',
  'Lágy púder és krém árnyalatú, romantikus kézzel kötött csokor.': 'A romantic hand-tied bouquet in soft blush and cream tones.',
  'Vidám, színes válogatás a nyári kert legszebb hangulatával.': 'A cheerful, colourful selection inspired by a summer garden.',
  'Gazdag rózsacsokor barack, korall és krém tónusokban.': 'A rich rose bouquet in peach, coral and cream tones.',
  'Elegáns liliom, rózsa és rezgő kompozíció friss zöldekkel.': "An elegant arrangement of lilies, roses and baby's breath with fresh greenery."
};

const weekdayLabels = {
  monday: ['Hétfő', 'Monday'], tuesday: ['Kedd', 'Tuesday'], wednesday: ['Szerda', 'Wednesday'], thursday: ['Csütörtök', 'Thursday'],
  friday: ['Péntek', 'Friday'], saturday: ['Szombat', 'Saturday'], sunday: ['Vasárnap', 'Sunday']
};

const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();
const tr = (hu, en) => state.language === 'en' ? en : hu;
const localized = value => state.language === 'en' ? (catalogTranslations[value] || uiTranslations.get(value) || value) : value;

const state = {
  language: localStorage.getItem('va_language') === 'en' ? 'en' : 'hu',
  catalog: { products: [], categories: [], colors: [], openingHours: [] },
  filters: { categories: new Set(), colors: new Set(), search: '', sort: 'featured' },
  cart: JSON.parse(localStorage.getItem('va_cart') || '[]')
};

const dom = {
  grid: $('#productGrid'), empty: $('#emptyState'), result: $('#resultCount'),
  categoryFilters: $('#categoryFilters'), colorFilters: $('#colorFilters'), colorFinder: $('#colorFinder'),
  cartDrawer: $('#cartDrawer'), backdrop: $('#backdrop'), cartLines: $('#cartLines'), cartEmpty: $('#cartEmpty'), cartFooter: $('#cartFooter'),
  checkoutForm: $('#checkoutForm'), orderSuccess: $('#orderSuccess'), toast: $('#toast'), languageToggle: $('#languageToggle'), openingHours: $('#openingHours')
};

function renderOpeningHours() {
  if (!dom.openingHours) return;
  dom.openingHours.innerHTML = (state.catalog.openingHours || []).map(day => {
    const label = weekdayLabels[day.id]?.[state.language === 'en' ? 1 : 0] || day.id;
    const value = day.closed ? tr('zárva', 'closed') : `${day.open}–${day.close}`;
    return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
  }).join('');
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.title = tr('Virág Állomás Szeged — Virágba csomagolt üzenetek', 'Virág Állomás Szeged — Messages wrapped in flowers');
  $('meta[name="description"]').content = tr('Egyedi csokrok és virágboxok, szeretettel készítve Szegeden. Online rendelés, személyes átvétellel.', 'Unique bouquets and flower boxes made with love in Szeged. Order online for in-store pickup.');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const original = originalTextNodes.get(node);
    const trimmed = original.trim();
    node.nodeValue = state.language === 'en' && uiTranslations.has(trimmed) ? original.replace(trimmed, uiTranslations.get(trimmed)) : original;
  }
  document.querySelectorAll('[placeholder],[aria-label]').forEach(element => {
    if (!originalAttributes.has(element)) originalAttributes.set(element, { placeholder: element.getAttribute('placeholder'), ariaLabel: element.getAttribute('aria-label') });
    const original = originalAttributes.get(element);
    if (original.placeholder !== null) element.setAttribute('placeholder', state.language === 'en' ? ({ 'Keress név vagy leírás alapján…': 'Search by name or description…', 'Például: a csokor köszöntőkártyájának szövege': 'For example: text for the bouquet card' }[original.placeholder] || original.placeholder) : original.placeholder);
    if (original.ariaLabel !== null) element.setAttribute('aria-label', state.language === 'en' ? ({ 'Kosár megnyitása': 'Open cart', 'Kosár bezárása': 'Close cart', 'Menü megnyitása': 'Open menu', 'Szűrők bezárása': 'Close filters', 'Bezárás': 'Close', 'Fő navigáció': 'Main navigation', 'Üzleti információk': 'Shop information', 'Gyors ajánlatkereső': 'Quick bouquet finder', 'Termékszűrők': 'Product filters', 'Kosár': 'Cart' }[original.ariaLabel] || original.ariaLabel) : original.ariaLabel);
  });
  dom.languageToggle.textContent = state.language === 'hu' ? 'EN' : 'HU';
  dom.languageToggle.setAttribute('aria-label', state.language === 'hu' ? 'Switch to English' : 'Váltás magyar nyelvre');
  renderOpeningHours();
}

function termsContent() {
  if (state.language === 'en') return `<article class="legal-content"><h2>Terms and Conditions</h2><p class="legal-meta">Last updated: 17 July 2026</p><h3>1. Service provider</h3><address><strong>Sárközi Ildikó Éva EV.</strong><br>Registered office and pickup location: 6721 Szeged, Szent Ferenc utca 1., Hungary<br>Tax number: 67678495-1-26<br>Email: <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a><br>Phone: <a href="tel:+36202621726">+36 20 262 1726</a></address><h3>2. Use of the webshop</h3><p>Orders can be placed electronically through the webshop without registration. By submitting an order, the customer accepts these Terms and Conditions and acknowledges the payment obligation.</p><h3>3. Products</h3><p>The webshop offers fresh flowers and related floral products. Descriptions and images are for information; natural flowers, colours, size and composition may vary slightly depending on seasonal availability. Material changes will be agreed with the customer.</p><h3>4. Prices</h3><p>Prices are gross consumer prices in Hungarian forints (HUF). There is no delivery fee because only in-store pickup is available.</p><h3>5. Ordering process</h3><ol><li>Select a product and add it to the cart.</li><li>Provide the required name, email address and phone number.</li><li>Select the available payment method and accept the notices.</li><li>Submit the order. The website displays an order number and confirmation.</li></ol><p>The provider may contact the customer to confirm availability and pickup time. If a product cannot be fulfilled, the customer will be informed without delay.</p><h3>6. Payment</h3><p>The currently available payment method is <strong>cash in the shop upon pickup</strong>. Stripe card payment is under preparation and is clearly marked as unavailable; no card payment data is collected by the webshop at this time.</p><h3>7. Fulfilment and pickup</h3><p>No delivery is available. Orders can be collected at 6721 Szeged, Szent Ferenc utca 1., at the time agreed with the provider. The customer should provide the order number at pickup.</p><h3>8. Right of withdrawal</h3><p>Statutory consumer rights apply. The right of withdrawal may not apply to perishable fresh flowers or products made to the customer's specifications, in accordance with the applicable Hungarian consumer rules. Please report a cancellation request as soon as possible at <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a>.</p><h3>9. Complaints</h3><p>Complaints can be submitted by email, phone or post using the contact details above. The provider investigates and answers complaints in accordance with applicable law.</p><h3>10. Data processing</h3><p>Personal data is processed as described in the Privacy Notice.</p><h3>11. Final provisions</h3><p>Hungarian law governs these Terms. The provider may amend the Terms; changes take effect when published and do not affect orders already placed.</p><p class="legal-notice">The Hungarian version is the governing version. An independent legal review is recommended before long-term commercial use.</p></article>`;
  return `<article class="legal-content"><h2>Általános Szerződési Feltételek (ÁSZF)</h2><p class="legal-meta">Utolsó frissítés: 2026. július 17.</p><h3>1. A szolgáltató adatai</h3><address><strong>Sárközi Ildikó Éva EV.</strong><br>Székhely és átvételi hely: 6721 Szeged, Szent Ferenc utca 1.<br>Adószám: 67678495-1-26<br>E-mail: <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a><br>Telefon: <a href="tel:+36202621726">+36 20 262 1726</a></address><h3>2. A webshop használata</h3><p>A webshopban elektronikus úton, regisztráció nélkül lehet rendelést leadni. A rendelés elküldésével a vásárló elfogadja a jelen ÁSZF-et, és tudomásul veszi, hogy a rendelés fizetési kötelezettséggel jár.</p><h3>3. Termékek</h3><p>A webshop friss virágokat és kapcsolódó virágkötészeti termékeket kínál. A leírások és képek tájékoztató jellegűek; a természetes virágok, a színek, a méret és az összeállítás a szezonális elérhetőség miatt kis mértékben eltérhet. Lényeges eltérés esetén a szolgáltató egyeztet a vásárlóval.</p><h3>4. Árak</h3><p>A feltüntetett árak forintban (HUF) értendő bruttó fogyasztói árak. Szállítási díj nincs, mert kizárólag személyes átvétel érhető el.</p><h3>5. A megrendelés menete</h3><ol><li>A vásárló kiválasztja a terméket és a kosárba helyezi.</li><li>Megadja a szükséges nevet, e-mail-címet és telefonszámot.</li><li>Kiválasztja az elérhető fizetési módot és elfogadja a tájékoztatókat.</li><li>Elküldi a rendelést; a weboldal rendelési azonosítót és visszaigazolást jelenít meg.</li></ol><p>A szolgáltató a készlet és az átvételi időpont megerősítéséhez kapcsolatba léphet a vásárlóval. Ha a termék nem teljesíthető, erről késedelem nélkül tájékoztatja a vásárlót.</p><h3>6. Fizetési módok</h3><p>Jelenleg az elérhető fizetési mód: <strong>készpénzes fizetés az üzletben, átvételkor</strong>. A Stripe bankkártyás fizetés előkészítés alatt áll, a webshopban „Még nem elérhető” jelöléssel szerepel; a webshop jelenleg nem gyűjt bankkártyaadatokat.</p><h3>7. Teljesítés és átvétel</h3><p>Kiszállítás nem érhető el. A rendelés a 6721 Szeged, Szent Ferenc utca 1. alatti üzletben, az előzetesen egyeztetett időpontban vehető át. Átvételkor kérjük a rendelési azonosító megadását.</p><h3>8. Elállási jog</h3><p>A vásárlót a jogszabályok szerinti fogyasztói jogok illetik meg. A gyorsan romló friss virágoknál, valamint a vásárló egyedi utasítása alapján készített termékeknél az elállási jog a vonatkozó fogyasztóvédelmi szabályok alapján kizárt lehet. Elállási szándékát a vásárló mielőbb jelezze a <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a> címen.</p><h3>9. Panaszkezelés</h3><p>Panasz a fenti e-mail-címen, telefonszámon vagy postai címen tehető. A szolgáltató a panaszokat a vonatkozó jogszabályok szerint kivizsgálja és megválaszolja.</p><h3>10. Adatkezelés</h3><p>A személyes adatok kezelése az Adatkezelési Tájékoztató szerint történik.</p><h3>11. Egyéb rendelkezések</h3><p>A jelen ÁSZF-re a magyar jog irányadó. A szolgáltató az ÁSZF-et módosíthatja; a módosítás a közzététellel lép hatályba, és a már leadott rendelésekre nem hat vissza.</p><p class="legal-notice">Tartós kereskedelmi használat előtt javasolt a dokumentum független jogi felülvizsgálata.</p></article>`;
}

function privacyContent() {
  if (state.language === 'en') return `<article class="legal-content"><h2>Privacy Notice</h2><p class="legal-meta">Effective: 5 February 2026 · Updated: 17 July 2026</p><h3>1. Controller</h3><address><strong>Sárközi Ildikó Éva EV.</strong><br>6721 Szeged, Szent Ferenc utca 1., Hungary<br>Tax number: 67678495-1-26<br>Email: <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a><br>Phone: <a href="tel:+36202621726">+36 20 262 1726</a></address><h3>2. Data processed</h3><ul><li>Contact data: name, email address and phone number.</li><li>Order data: ordered products, quantities, amount, time, pickup payment method and optional note.</li><li>Technical data: IP address, browser and device information may appear in security and hosting logs.</li><li>Local browser data: cart, favourites and language preference are stored on the user's device.</li></ul><p>No delivery address or card data is requested in the current checkout.</p><h3>3. Purposes, legal bases and retention</h3><h4>3.1 Orders and customer service</h4><p>Purpose: recording and fulfilling orders, arranging pickup and communication. Legal basis: performance of a contract or steps prior to entering a contract (GDPR Art. 6(1)(b)). Retention: generally five years after fulfilment, subject to legal claims.</p><h4>3.2 Accounting</h4><p>Where an accounting document is issued, the necessary data is retained for the statutory period, generally eight years (GDPR Art. 6(1)(c)).</p><h4>3.3 Enquiries and complaints</h4><p>Purpose: answering enquiries and handling complaints. Legal basis: legitimate interest, legal obligation or consent, as applicable. General enquiries are retained for up to one year; complaint records are retained as required by law.</p><h4>3.4 Cookies and local storage</h4><p>The current webshop does not use advertising or analytics cookies. Essential local storage keeps the cart, favourites and language setting on the user's device. If non-essential cookies are introduced later, the notice and consent mechanism must be updated beforehand.</p><h3>4. Processors and international transfers</h3><p><strong>Render Services, Inc.</strong> (525 Brannan Street, Suite 300, San Francisco, CA 94107, USA) provides website and PostgreSQL hosting. Data may be processed in the United States under appropriate safeguards, including Render's GDPR Data Processing Addendum, Standard Contractual Clauses and/or EU–US Data Privacy Framework certification.</p><p>Stripe card payment is not active. If enabled later, Stripe will be identified as a payment processor before card data is collected. No courier receives data because only in-store pickup is available.</p><h3>5. Security</h3><p>The controller applies proportionate technical and organisational measures, including HTTPS, restricted admin access and database access controls. No internet system can be guaranteed to be completely secure.</p><h3>6. Your rights</h3><p>You may request information and access, rectification, erasure where applicable, restriction, data portability, object to processing based on legitimate interests, and withdraw consent. Requests can be sent to the controller's email address. A response is provided without undue delay and normally within one month.</p><h3>7. Complaints and remedies</h3><p>You may lodge a complaint with the <a href="https://www.naih.hu/" target="_blank" rel="noopener">Hungarian National Authority for Data Protection and Freedom of Information (NAIH)</a>, 1055 Budapest, Falk Miksa utca 9–11., Hungary, or seek a judicial remedy.</p><h3>8. Changes</h3><p>The controller may update this notice. Changes take effect when published on the website.</p><p class="legal-notice">The Hungarian version is the governing version. An independent legal review is recommended before long-term commercial use.</p></article>`;
  return `<article class="legal-content"><h2>Adatkezelési Tájékoztató</h2><p class="legal-meta">Hatályos: 2026. február 5. · Frissítve: 2026. július 17.</p><h3>1. Az adatkezelő adatai</h3><address><strong>Sárközi Ildikó Éva EV.</strong><br>Székhely: 6721 Szeged, Szent Ferenc utca 1.<br>Adószám: 67678495-1-26<br>E-mail: <a href="mailto:viola32ildiko@gmail.com">viola32ildiko@gmail.com</a><br>Telefon: <a href="tel:+36202621726">+36 20 262 1726</a></address><h3>2. A kezelt adatok köre</h3><ul><li>Kapcsolattartási adatok: név, e-mail-cím és telefonszám.</li><li>Megrendelési adatok: termékek, mennyiségek, összeg, időpont, átvételi fizetési mód és opcionális megjegyzés.</li><li>Technikai adatok: az IP-cím, a böngésző és az eszköz adatai biztonsági és tárhelyszolgáltatói naplókban megjelenhetnek.</li><li>Helyi böngészőadatok: a kosár, a kedvencek és a nyelvi beállítás a felhasználó eszközén tárolódik.</li></ul><p>A jelenlegi pénztár nem kér szállítási címet vagy bankkártyaadatot.</p><h3>3. Az adatkezelések célja, jogalapja és időtartama</h3><h4>3.1. Megrendelés és ügyfélszolgálat</h4><p>Cél: a rendelés rögzítése és teljesítése, az átvétel egyeztetése és kapcsolattartás. Jogalap: szerződés teljesítése, illetve szerződéskötést megelőző lépések (GDPR 6. cikk (1) b)). Megőrzés: a teljesítéstől számított általános polgári jogi elévülési idő, jellemzően 5 év.</p><h4>3.2. Számlázás</h4><p>Számviteli bizonylat kiállítása esetén a szükséges adatok a jogszabályi megőrzési idő végéig, általában 8 évig kezelhetők (GDPR 6. cikk (1) c)).</p><h4>3.3. Megkeresések és panaszok</h4><p>Cél: a megkeresések megválaszolása és a panaszok kezelése. Jogalap: az adott esettől függően jogos érdek, jogi kötelezettség vagy hozzájárulás. Az általános megkereséseket legfeljebb 1 évig, a panaszok iratait a jogszabályban előírt ideig őrizzük.</p><h4>3.4. Sütik és helyi tárolás</h4><p>A webshop jelenleg nem használ hirdetési vagy analitikai sütiket. A működéshez szükséges helyi tárhely a felhasználó eszközén őrzi a kosarat, a kedvenceket és a nyelvi beállítást. Nem szükséges sütik későbbi bevezetése előtt a tájékoztatót és a hozzájárulási megoldást frissíteni kell.</p><h3>4. Adatfeldolgozók és adattovábbítás</h3><p><strong>Render Services, Inc.</strong> (525 Brannan Street, Suite 300, San Francisco, CA 94107, USA) biztosítja a weboldal és a PostgreSQL-adatbázis tárhelyét. Az adatok az Egyesült Államokban is kezelhetők megfelelő garanciák, így a Render GDPR adatfeldolgozási megállapodása, általános szerződési kikötések és/vagy az EU–USA adatvédelmi keretrendszer szerinti tanúsítás alapján.</p><p>A Stripe bankkártyás fizetés nem aktív. Aktiválása esetén a Stripe fizetési adatfeldolgozóként még a bankkártyaadatok gyűjtése előtt feltüntetésre kerül. Futárszolgálatnak nem továbbítunk adatot, mert kizárólag személyes átvétel érhető el.</p><h3>5. Adatbiztonság</h3><p>Az adatkezelő arányos technikai és szervezési intézkedéseket alkalmaz, ideértve a HTTPS-kapcsolatot, a korlátozott adminhozzáférést és az adatbázis-hozzáférés védelmét. Egyetlen internetes rendszer teljes biztonsága sem garantálható.</p><h3>6. Az érintettek jogai</h3><p>Ön jogosult tájékoztatást és hozzáférést kérni, helyesbítést, indokolt esetben törlést vagy korlátozást kérni, adathordozhatósággal élni, a jogos érdeken alapuló kezelés ellen tiltakozni, illetve hozzájárulását visszavonni. Kérelmét az adatkezelő e-mail-címére küldheti. Az adatkezelő indokolatlan késedelem nélkül, főszabály szerint egy hónapon belül válaszol.</p><h3>7. Panasztétel és jogorvoslat</h3><p>Panasz tehető a <a href="https://www.naih.hu/" target="_blank" rel="noopener">Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH)</a>, cím: 1055 Budapest, Falk Miksa utca 9–11., továbbá bírósági jogorvoslat is igénybe vehető.</p><h3>8. A tájékoztató módosítása</h3><p>Az adatkezelő a tájékoztatót módosíthatja. A változások a weboldalon történő közzététellel lépnek hatályba.</p><p class="legal-notice">Tartós kereskedelmi használat előtt javasolt a dokumentum független jogi felülvizsgálata.</p></article>`;
}

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || tr('Hálózati hiba történt.', 'A network error occurred.')), { data, status: response.status });
  return data;
}

function categoryName(id) { return localized(state.catalog.categories.find(x => x.id === id)?.name || ''); }
function colorName(id) { return localized(state.catalog.colors.find(x => x.id === id)?.name || ''); }
function productById(id) { return state.catalog.products.find(x => x.id === id); }
function productSizes(product) { return Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : [{ id: 'default', name: 'Normál', price: Number(product?.price) || 0 }]; }
function sizeForLine(line, product = productById(line.productId)) { return productSizes(product).find(size => size.id === line.sizeId) || productSizes(product)[0]; }
function priceRange(product) {
  const prices = productSizes(product).map(size => size.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} – ${money(max)}`;
}
function minimumPrice(product) { return Math.min(...productSizes(product).map(size => size.price)); }

async function init() {
  try {
    state.catalog = await request('/api/catalog');
    renderFilters();
    renderProducts();
    renderCart();
  } catch (error) {
    dom.grid.innerHTML = `<div class="empty-state"><h3>${tr('Most nem érjük el a virágpultot.', 'The flower counter is currently unavailable.')}</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
  $('#year').textContent = new Date().getFullYear();
  applyLanguage();
  handlePaymentReturn();
}

function renderFilters() {
  dom.categoryFilters.innerHTML = state.catalog.categories.map(c => `<label><input type="checkbox" value="${escapeHtml(c.id)}" ${state.filters.categories.has(c.id) ? 'checked' : ''}> <span>${escapeHtml(localized(c.name))}</span></label>`).join('');
  dom.colorFilters.innerHTML = state.catalog.colors.map(c => `<label><input type="checkbox" value="${escapeHtml(c.id)}" ${state.filters.colors.has(c.id) ? 'checked' : ''}><i class="swatch" style="background:${escapeHtml(c.hex)}"></i><span>${escapeHtml(localized(c.name))}</span></label>`).join('');
  dom.colorFinder.innerHTML = `<option value="">${tr('Milyen színben?', 'Which colour?')}</option>${state.catalog.colors.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(localized(c.name))}</option>`).join('')}`;
}

function filteredProducts() {
  const term = state.filters.search.toLocaleLowerCase('hu');
  const items = state.catalog.products.filter(product => {
    const textMatch = !term || `${product.name} ${product.description} ${localized(product.name)} ${localized(product.description)} ${categoryName(product.categoryId)}`.toLocaleLowerCase(state.language === 'en' ? 'en' : 'hu').includes(term);
    const categoryMatch = !state.filters.categories.size || state.filters.categories.has(product.categoryId);
    const colorMatch = !state.filters.colors.size || product.colorIds.some(id => state.filters.colors.has(id));
    return textMatch && categoryMatch && colorMatch;
  });
  return items.sort((a, b) => {
    if (state.filters.sort === 'price-asc') return minimumPrice(a) - minimumPrice(b);
    if (state.filters.sort === 'price-desc') return minimumPrice(b) - minimumPrice(a);
    if (state.filters.sort === 'name') return a.name.localeCompare(b.name, 'hu');
    return Number(b.featured) - Number(a.featured);
  });
}

function renderProducts() {
  const products = filteredProducts();
  dom.grid.innerHTML = products.map((p, index) => `
    <article class="product-card" data-id="${escapeHtml(p.id)}">
      ${p.featured && index === 0 ? `<span class="badge">${tr('Kedvenc', 'Favourite')}</span>` : ''}
      <button class="product-image open-product" aria-label="${escapeHtml(localized(p.name))} ${tr('részletei', 'details')}"><img src="${escapeHtml(p.images?.[0] || '/assets/hero-bouquet.png')}" alt="${escapeHtml(localized(p.name))}" loading="lazy"></button>
      <div class="product-card-body">
        <h3>${escapeHtml(localized(p.name))}</h3>
        <div class="price">${priceRange(p)}</div>
        <div class="category">${escapeHtml(categoryName(p.categoryId))}</div>
        <button class="quick-add" aria-label="${escapeHtml(localized(p.name))} ${tr('kosárba', 'add to cart')}">+</button>
      </div>
    </article>`).join('');
  dom.empty.hidden = products.length > 0;
  dom.result.textContent = state.language === 'en' ? `${products.length} bouquet${products.length === 1 ? '' : 's'}` : `${products.length} csokor`;
  const count = state.filters.categories.size + state.filters.colors.size + (state.filters.search ? 1 : 0);
  $('#filterBadge').textContent = count ? `(${count})` : '';
}

function clearFilters() {
  state.filters.categories.clear(); state.filters.colors.clear(); state.filters.search = '';
  $('#searchInput').value = ''; $('#colorFinder').value = '';
  $$('#categoryFilters input, #colorFilters input').forEach(input => input.checked = false);
  renderProducts(); closeFilters();
}

function saveCart() {
  localStorage.setItem('va_cart', JSON.stringify(state.cart));
  renderCart();
}

function addToCart(productId, sizeId) {
  const product = productById(productId); if (!product) return;
  const size = productSizes(product).find(option => option.id === sizeId) || productSizes(product)[0];
  const line = state.cart.find(x => x.productId === productId && sizeForLine(x, product).id === size.id);
  if (line) line.quantity = Math.min(20, line.quantity + 1);
  else state.cart.push({ productId, sizeId: size.id, quantity: 1 });
  saveCart();
  showToast(tr('A csokor a kosárba került.', 'The bouquet was added to your cart.'));
}

function renderCart() {
  state.cart = state.cart.filter(line => productById(line.productId));
  const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  $('.cart-count').textContent = count;
  dom.cartLines.innerHTML = state.cart.map(line => {
    const product = productById(line.productId);
    const size = sizeForLine(line, product); line.sizeId = size.id;
    return `<div class="cart-line" data-product-id="${escapeHtml(line.productId)}" data-size-id="${escapeHtml(size.id)}">
      <img src="${escapeHtml(product.images?.[0] || '/assets/hero-bouquet.png')}" alt="">
      <div><h4>${escapeHtml(localized(product.name))}</h4><div class="line-size">${tr('Méret', 'Size')}: ${escapeHtml(size.name)}</div><div class="line-price">${money(size.price * line.quantity)}</div><div class="qty"><button data-delta="-1" aria-label="${tr('Mennyiség csökkentése', 'Decrease quantity')}">−</button><span>${line.quantity}</span><button data-delta="1" aria-label="${tr('Mennyiség növelése', 'Increase quantity')}">+</button></div></div>
      <button class="remove-line" aria-label="${tr('Termék eltávolítása', 'Remove item')}">×</button>
    </div>`;
  }).join('');
  const total = state.cart.reduce((sum, line) => sum + sizeForLine(line).price * line.quantity, 0);
  $('#cartTotal').textContent = money(total); $('#checkoutTotal').textContent = money(total);
  dom.cartEmpty.hidden = state.cart.length > 0;
  dom.cartFooter.hidden = !state.cart.length;
}

function openCart() {
  dom.cartDrawer.classList.add('open'); dom.backdrop.classList.add('open'); dom.cartDrawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked');
}
function closePanels() {
  dom.cartDrawer.classList.remove('open'); $('.filters').classList.remove('open'); dom.backdrop.classList.remove('open'); dom.cartDrawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked');
}
function closeFilters() { $('.filters').classList.remove('open'); if (!dom.cartDrawer.classList.contains('open')) { dom.backdrop.classList.remove('open'); document.body.classList.remove('locked'); } }

function showProduct(id) {
  const p = productById(id); if (!p) return;
  const sizes = productSizes(p);
  $('#productDialogContent').innerHTML = `<div class="product-detail"><img src="${escapeHtml(p.images?.[0] || '/assets/hero-bouquet.png')}" alt="${escapeHtml(localized(p.name))}"><div class="product-detail-copy"><p class="eyebrow">${escapeHtml(categoryName(p.categoryId))}</p><h2>${escapeHtml(localized(p.name))}</h2><div class="detail-price" id="selectedSizePrice">${money(sizes[0].price)}</div><p class="description">${escapeHtml(localized(p.description))}</p><label class="size-picker"><span>${tr('Válassz méretet', 'Choose a size')}</span><select id="productSizeSelect">${sizes.map(size => `<option value="${escapeHtml(size.id)}" data-price="${size.price}">${escapeHtml(size.name)} — ${money(size.price)}</option>`).join('')}</select></label><div class="detail-tags">${p.colorIds.map(id => `<span>${escapeHtml(colorName(id))}</span>`).join('')}<span>${tr('Kézzel kötött', 'Hand-tied')}</span><span>${tr('Személyes átvétel', 'In-store pickup')}</span></div><button class="button button-primary full modal-add" data-id="${escapeHtml(p.id)}">${tr('Kosárba teszem', 'Add to cart')}</button></div></div>`;
  $('#productDialog').dataset.productId = id;
  if (!$('#productDialog').open) $('#productDialog').showModal();
}

function showToast(message) {
  dom.toast.textContent = message; dom.toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => dom.toast.classList.remove('show'), 2600);
}

function showInfo(type) {
  $('#infoDialog').dataset.type = type;
  const customRequestPrivacy = state.language === 'en' ? '<p><strong>Custom requests:</strong> the description and any optional reference images are processed to assess, discuss and fulfil the requested arrangement. Requests that do not become orders are retained for up to one year; fulfilled requests follow the order retention period.</p>' : '<p><strong>Egyedi igények:</strong> a leírást és az opcionálisan csatolt referenciafotókat az elképzelés felméréséhez, egyeztetéséhez és teljesítéséhez kezeljük. A megrendeléssé nem váló igényeket legfeljebb 1 évig, a teljesített igényeket a rendelésekre vonatkozó megőrzési idő szerint őrizzük.</p>';
  $('#infoDialogContent').innerHTML = type === 'aszf' ? termsContent() : privacyContent().replace('<h3>3.', `${customRequestPrivacy}<h3>3.`);
  if (!$('#infoDialog').open) $('#infoDialog').showModal();
  $('#infoDialog').scrollTop = 0;
}

function handlePaymentReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get('payment') === 'success') {
    state.cart = []; saveCart();
    setTimeout(() => { openCart(); showOrderSuccess(params.get('order')); }, 300);
    history.replaceState({}, '', '/');
  } else if (params.get('payment') === 'cancelled') {
    showToast(tr('A bankkártyás fizetést megszakítottad. A kosarad megmaradt.', 'Card payment was cancelled. Your cart has been kept.')); history.replaceState({}, '', '/');
  }
}

function showOrderSuccess(id) {
  dom.cartLines.hidden = true; dom.cartEmpty.hidden = true; dom.cartFooter.hidden = true; dom.checkoutForm.hidden = true; dom.orderSuccess.hidden = false; $('#orderNumber').textContent = id || '—';
  dom.orderSuccess.focus();
  showToast(tr('Rendelésed sikeresen leadva!', 'Your order has been placed successfully!'));
}

dom.grid.addEventListener('click', event => {
  const card = event.target.closest('.product-card'); if (!card) return;
  if (event.target.closest('.quick-add')) showProduct(card.dataset.id);
  else if (event.target.closest('.open-product')) showProduct(card.dataset.id);
});

dom.categoryFilters.addEventListener('change', event => { event.target.checked ? state.filters.categories.add(event.target.value) : state.filters.categories.delete(event.target.value); renderProducts(); });
dom.colorFilters.addEventListener('change', event => { event.target.checked ? state.filters.colors.add(event.target.value) : state.filters.colors.delete(event.target.value); renderProducts(); });
$('#searchInput').addEventListener('input', event => { state.filters.search = event.target.value.trim(); renderProducts(); });
$('#sortSelect').addEventListener('change', event => { state.filters.sort = event.target.value; renderProducts(); });
$$('.clear-filters').forEach(button => button.addEventListener('click', clearFilters));
$('.filter-toggle').addEventListener('click', () => { $('.filters').classList.add('open'); dom.backdrop.classList.add('open'); document.body.classList.add('locked'); });
$('.filter-close').addEventListener('click', closeFilters);
$('.cart-button').addEventListener('click', openCart);
$$('.drawer-close').forEach(button => button.addEventListener('click', closePanels));
dom.backdrop.addEventListener('click', closePanels);

dom.cartLines.addEventListener('click', event => {
  const row = event.target.closest('.cart-line'); if (!row) return;
  const line = state.cart.find(x => x.productId === row.dataset.productId && sizeForLine(x).id === row.dataset.sizeId); if (!line) return;
  if (event.target.closest('[data-delta]')) { line.quantity += Number(event.target.closest('[data-delta]').dataset.delta); if (line.quantity < 1) state.cart = state.cart.filter(x => x !== line); saveCart(); }
  if (event.target.closest('.remove-line')) { state.cart = state.cart.filter(x => x !== line); saveCart(); }
});

$('#checkoutButton').addEventListener('click', () => { dom.cartLines.hidden = true; dom.cartFooter.hidden = true; dom.checkoutForm.hidden = false; });
$('.back-to-cart').addEventListener('click', () => { dom.cartLines.hidden = false; dom.cartFooter.hidden = false; dom.checkoutForm.hidden = true; });
dom.checkoutForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = $('button[type=submit]', dom.checkoutForm); const error = $('#checkoutError');
  button.disabled = true; button.textContent = tr('Rendelés mentése…', 'Placing order…'); error.textContent = '';
  const form = new FormData(dom.checkoutForm);
  try {
    const response = await request('/api/orders', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), note: form.get('note'), payment: form.get('payment'), items: state.cart }) });
    if (response.checkoutUrl) { location.href = response.checkoutUrl; return; }
    state.cart = []; saveCart(); showOrderSuccess(response.orderId);
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; button.innerHTML = `${tr('Rendelés leadása', 'Place order')} · <span id="checkoutTotal">${money(state.cart.reduce((sum, line) => sum + sizeForLine(line).price * line.quantity, 0))}</span>`; }
});

$('#productDialog').addEventListener('change', event => { if (event.target.matches('#productSizeSelect')) $('#selectedSizePrice').textContent = money(Number(event.target.selectedOptions[0].dataset.price)); });
$('#productDialog').addEventListener('click', event => { if (event.target === $('#productDialog') || event.target.closest('.dialog-close')) $('#productDialog').close(); if (event.target.closest('.modal-add')) { addToCart(event.target.closest('.modal-add').dataset.id, $('#productSizeSelect').value); $('#productDialog').close(); openCart(); } });
$('#infoDialog').addEventListener('click', event => { if (event.target === $('#infoDialog') || event.target.closest('.dialog-close')) $('#infoDialog').close(); });
$$('[data-info]').forEach(button => button.addEventListener('click', () => showInfo(button.dataset.info)));
$('.menu-button').addEventListener('click', event => { const nav = $('.main-nav'); nav.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open')); });
$$('.main-nav a').forEach(a => a.addEventListener('click', () => $('.main-nav').classList.remove('open')));
$('[data-category-link]').addEventListener('click', event => { clearFilters(); state.filters.categories.add(event.currentTarget.dataset.categoryLink); const input = $(`#categoryFilters input[value="${event.currentTarget.dataset.categoryLink}"]`); if (input) input.checked = true; renderProducts(); });
$('#finderButton').addEventListener('click', () => { const color = $('#colorFinder').value; clearFilters(); if (color) { state.filters.colors.add(color); const input = $(`#colorFilters input[value="${color}"]`); if (input) input.checked = true; } renderProducts(); $('#webshop').scrollIntoView(); });
$$('[data-occasion]').forEach(button => button.addEventListener('click', () => { $('#occasionFinder').value = button.dataset.occasion; $('#webshop').scrollIntoView(); showToast(state.language === 'en' ? `${localized(button.dataset.occasion)}: browse our bouquets or ask for a custom arrangement.` : `${button.dataset.occasion}: válogass csokraink között, vagy kérj egyedi összeállítást.`); }));

dom.languageToggle.addEventListener('click', () => {
  state.language = state.language === 'hu' ? 'en' : 'hu';
  localStorage.setItem('va_language', state.language);
  renderFilters(); renderProducts(); renderCart(); applyLanguage();
  if ($('#infoDialog').open) showInfo($('#infoDialog').dataset.type || 'privacy');
  if ($('#productDialog').open && $('#productDialog').dataset.productId) showProduct($('#productDialog').dataset.productId);
});

init();
