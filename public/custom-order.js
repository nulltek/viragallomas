const translations = {
  pickup: ['Szegedi átvétel', 'Pickup in Szeged'], handmade: ['Kézzel készül', 'Handmade'], fresh: ['Mindig friss virágok', 'Always fresh flowers'],
  shop: ['Webshop', 'Shop'], about: ['Rólunk', 'About us'], contact: ['Kapcsolat', 'Contact'], backShop: ['Vissza a webshophoz', 'Back to the shop'],
  eyebrow: ['Egyedi elképzelésed van?', 'Have something unique in mind?'], title: ['Megálmodjuk veled, virágba kötjük neked.', 'We dream it with you and bring it to life in flowers.'], intro: ['Írd le, milyen csokrot vagy virágkompozíciót szeretnél. A részletek és az ár egyeztetéséhez telefonon vagy e-mailben keresünk meg.', 'Tell us about the bouquet or floral arrangement you would like. We will contact you by phone or email to discuss the details and price.'],
  step1Title: ['Meséld el az elképzelésed', 'Tell us your idea'], step1Text: ['Színek, alkalom, hangulat vagy különleges virágok.', 'Colours, occasion, mood or special flowers.'], step2Title: ['Küldj inspirációt', 'Share inspiration'], step2Text: ['Legfeljebb 5 referenciafotót is csatolhatsz.', 'You can attach up to 5 reference images.'], step3Title: ['Egyeztetünk veled', 'We will contact you'], step3Text: ['Visszajelzünk a lehetőségekről, árról és átvételről.', 'We will discuss availability, price and pickup with you.'],
  formEyebrow: ['Egyedi rendelés', 'Custom order'], formTitle: ['Kérj személyre szabott virágot', 'Request a made-to-order arrangement'], name: ['Név', 'Name'], phone: ['Telefonszám', 'Phone number'], email: ['E-mail-cím', 'Email address'], description: ['Leírás', 'Description'], images: ['Referenciafotók', 'Reference images'], optional: ['(opcionális)', '(optional)'], chooseImages: ['Képek kiválasztása', 'Choose images'], imageHelp: ['JPG, PNG vagy WebP · legfeljebb 5 kép · maximum 4 MB/kép', 'JPG, PNG or WebP · up to 5 images · maximum 4 MB each'], submit: ['Egyedi igény elküldése', 'Send custom request'], privacy: ['Az adatokat kizárólag az igény egyeztetéséhez és teljesítéséhez használjuk.', 'We use your details only to discuss and fulfil your request.'], privacyLink: ['Adatkezelési tájékoztató', 'Privacy Notice'],
  successTitle: ['Megkaptuk az egyedi rendelésed!', 'We received your custom request!'], successText: ['Köszönjük! Hamarosan felvesszük veled a kapcsolatot az egyeztetéshez.', 'Thank you! We will contact you shortly to discuss the details.'], requestId: ['Igényazonosítód:', 'Your request number:'], returnShop: ['Vissza a webshophoz', 'Back to the shop']
};

const form = document.querySelector('#customOrderForm');
const imageInput = document.querySelector('#customImages');
const previews = document.querySelector('#customImagePreviews');
const errorBox = document.querySelector('#customOrderError');
const languageToggle = document.querySelector('#customLanguageToggle');
const state = { language: localStorage.getItem('va_language') === 'en' ? 'en' : 'hu', images: [] };

function applyLanguage() {
  const english = state.language === 'en';
  document.documentElement.lang = state.language;
  document.title = english ? 'Custom flower order — Virág Állomás Szeged' : 'Egyedi virágrendelés — Virág Állomás Szeged';
  document.querySelector('meta[name="description"]').content = english ? 'Request a unique, made-to-order flower arrangement from Virág Állomás Szeged.' : 'Kérj egyedi, személyre szabott virágcsokrot a Virág Állomás Szegedtől.';
  document.querySelectorAll('[data-i18n]').forEach(element => { const value = translations[element.dataset.i18n]; if (value) element.textContent = value[english ? 1 : 0]; });
  const description = form.elements.description;
  description.placeholder = english ? description.dataset.placeholderEn : description.dataset.placeholderHu;
  languageToggle.textContent = english ? 'HU' : 'EN';
  languageToggle.setAttribute('aria-label', english ? 'Váltás magyar nyelvre' : 'Switch to English');
}

function showToast(message) {
  const toast = document.querySelector('#customToast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function renderPreviews() {
  previews.innerHTML = state.images.map((image, index) => `<div class="custom-image-preview" data-index="${index}"><img src="${image.src}" alt=""><button type="button" aria-label="${state.language === 'en' ? 'Remove image' : 'Kép eltávolítása'}">×</button></div>`).join('');
}

languageToggle.addEventListener('click', () => {
  state.language = state.language === 'hu' ? 'en' : 'hu';
  localStorage.setItem('va_language', state.language); applyLanguage(); renderPreviews();
});

imageInput.addEventListener('change', async event => {
  const available = Math.max(0, 5 - state.images.length);
  const files = [...event.target.files].slice(0, available);
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      showToast(state.language === 'en' ? `${file.name}: use JPG, PNG or WebP up to 4 MB.` : `${file.name}: JPG, PNG vagy WebP formátum, legfeljebb 4 MB lehet.`); continue;
    }
    const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    state.images.push({ name: file.name, src });
  }
  event.target.value = ''; renderPreviews();
});

previews.addEventListener('click', event => {
  const preview = event.target.closest('.custom-image-preview');
  if (!preview || !event.target.closest('button')) return;
  state.images.splice(Number(preview.dataset.index), 1); renderPreviews();
});

form.addEventListener('submit', async event => {
  event.preventDefault(); errorBox.textContent = '';
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = state.language === 'en' ? 'Sending…' : 'Küldés…';
  const data = new FormData(form);
  try {
    const response = await fetch('/api/custom-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), phone: data.get('phone'), email: data.get('email'), description: data.get('description'), images: state.images.map(image => image.src) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || (state.language === 'en' ? 'The request could not be sent.' : 'Az igény nem küldhető el.'));
    form.hidden = true; document.querySelector('#customOrderSuccess').hidden = false; document.querySelector('#customOrderNumber').textContent = result.customOrderId; document.querySelector('#customOrderSuccess').focus();
  } catch (error) { errorBox.textContent = error.message; }
  finally { button.disabled = false; button.textContent = translations.submit[state.language === 'en' ? 1 : 0]; }
});

document.querySelector('#customYear').textContent = new Date().getFullYear();
applyLanguage();
