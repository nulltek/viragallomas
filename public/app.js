const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const state = {
  catalog: { products: [], categories: [], colors: [] },
  filters: { categories: new Set(), colors: new Set(), search: '', sort: 'featured' },
  cart: JSON.parse(localStorage.getItem('va_cart') || '[]'),
  favorites: new Set(JSON.parse(localStorage.getItem('va_favorites') || '[]'))
};

const dom = {
  grid: $('#productGrid'), empty: $('#emptyState'), result: $('#resultCount'),
  categoryFilters: $('#categoryFilters'), colorFilters: $('#colorFilters'), colorFinder: $('#colorFinder'),
  cartDrawer: $('#cartDrawer'), backdrop: $('#backdrop'), cartLines: $('#cartLines'), cartEmpty: $('#cartEmpty'), cartFooter: $('#cartFooter'),
  checkoutForm: $('#checkoutForm'), orderSuccess: $('#orderSuccess'), toast: $('#toast')
};

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Hálózati hiba történt.'), { data, status: response.status });
  return data;
}

function categoryName(id) { return state.catalog.categories.find(x => x.id === id)?.name || ''; }
function colorName(id) { return state.catalog.colors.find(x => x.id === id)?.name || ''; }
function productById(id) { return state.catalog.products.find(x => x.id === id); }

async function init() {
  try {
    state.catalog = await request('/api/catalog');
    renderFilters();
    renderProducts();
    renderCart();
  } catch (error) {
    dom.grid.innerHTML = `<div class="empty-state"><h3>Most nem érjük el a virágpultot.</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
  $('#year').textContent = new Date().getFullYear();
  handlePaymentReturn();
}

function renderFilters() {
  dom.categoryFilters.innerHTML = state.catalog.categories.map(c => `<label><input type="checkbox" value="${escapeHtml(c.id)}"> <span>${escapeHtml(c.name)}</span></label>`).join('');
  dom.colorFilters.innerHTML = state.catalog.colors.map(c => `<label><input type="checkbox" value="${escapeHtml(c.id)}"><i class="swatch" style="background:${escapeHtml(c.hex)}"></i><span>${escapeHtml(c.name)}</span></label>`).join('');
  dom.colorFinder.innerHTML = `<option value="">Milyen színben?</option>${state.catalog.colors.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}`;
}

function filteredProducts() {
  const term = state.filters.search.toLocaleLowerCase('hu');
  const items = state.catalog.products.filter(product => {
    const textMatch = !term || `${product.name} ${product.description} ${categoryName(product.categoryId)}`.toLocaleLowerCase('hu').includes(term);
    const categoryMatch = !state.filters.categories.size || state.filters.categories.has(product.categoryId);
    const colorMatch = !state.filters.colors.size || product.colorIds.some(id => state.filters.colors.has(id));
    return textMatch && categoryMatch && colorMatch;
  });
  return items.sort((a, b) => {
    if (state.filters.sort === 'price-asc') return a.price - b.price;
    if (state.filters.sort === 'price-desc') return b.price - a.price;
    if (state.filters.sort === 'name') return a.name.localeCompare(b.name, 'hu');
    return Number(b.featured) - Number(a.featured);
  });
}

function renderProducts() {
  const products = filteredProducts();
  dom.grid.innerHTML = products.map((p, index) => `
    <article class="product-card" data-id="${escapeHtml(p.id)}">
      ${p.featured && index === 0 ? '<span class="badge">Kedvenc</span>' : ''}
      <button class="favorite" aria-label="${state.favorites.has(p.id) ? 'Eltávolítás a kedvencekből' : 'Hozzáadás a kedvencekhez'}" aria-pressed="${state.favorites.has(p.id)}">${state.favorites.has(p.id) ? '♥' : '♡'}</button>
      <button class="product-image open-product" aria-label="${escapeHtml(p.name)} részletei"><img src="${escapeHtml(p.images?.[0] || '/assets/hero-bouquet.png')}" alt="${escapeHtml(p.name)}" loading="lazy"></button>
      <div class="product-card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${money(p.price)}</div>
        <div class="category">${escapeHtml(categoryName(p.categoryId))}</div>
        <button class="quick-add" aria-label="${escapeHtml(p.name)} kosárba">+</button>
      </div>
    </article>`).join('');
  dom.empty.hidden = products.length > 0;
  dom.result.textContent = `${products.length} csokor`;
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

function addToCart(productId) {
  const line = state.cart.find(x => x.productId === productId);
  if (line) line.quantity = Math.min(20, line.quantity + 1);
  else state.cart.push({ productId, quantity: 1 });
  saveCart();
  showToast('A csokor a kosárba került.');
}

function renderCart() {
  state.cart = state.cart.filter(line => productById(line.productId));
  const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  $('.cart-count').textContent = count;
  dom.cartLines.innerHTML = state.cart.map(line => {
    const product = productById(line.productId);
    return `<div class="cart-line" data-id="${escapeHtml(line.productId)}">
      <img src="${escapeHtml(product.images?.[0] || '/assets/hero-bouquet.png')}" alt="">
      <div><h4>${escapeHtml(product.name)}</h4><div class="line-price">${money(product.price * line.quantity)}</div><div class="qty"><button data-delta="-1" aria-label="Mennyiség csökkentése">−</button><span>${line.quantity}</span><button data-delta="1" aria-label="Mennyiség növelése">+</button></div></div>
      <button class="remove-line" aria-label="Termék eltávolítása">×</button>
    </div>`;
  }).join('');
  const total = state.cart.reduce((sum, line) => sum + productById(line.productId).price * line.quantity, 0);
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
  $('#productDialogContent').innerHTML = `<div class="product-detail"><img src="${escapeHtml(p.images?.[0] || '/assets/hero-bouquet.png')}" alt="${escapeHtml(p.name)}"><div class="product-detail-copy"><p class="eyebrow">${escapeHtml(categoryName(p.categoryId))}</p><h2>${escapeHtml(p.name)}</h2><div class="detail-price">${money(p.price)}</div><p class="description">${escapeHtml(p.description)}</p><div class="detail-tags">${p.colorIds.map(id => `<span>${escapeHtml(colorName(id))}</span>`).join('')}<span>Kézzel kötött</span><span>Személyes átvétel</span></div><button class="button button-primary full modal-add" data-id="${escapeHtml(p.id)}">Kosárba teszem</button></div></div>`;
  $('#productDialog').showModal();
}

function showToast(message) {
  dom.toast.textContent = message; dom.toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => dom.toast.classList.remove('show'), 2600);
}

function showInfo(type) {
  const content = type === 'aszf' ? `<h2>Általános szerződési feltételek</h2><p>Ez a mintaszöveg a fejlesztési változat része. Élesítés előtt a vállalkozás hivatalos adataival, rendelési, fizetési, elállási és panaszkezelési feltételeivel kitöltött, jogilag ellenőrzött dokumentum szükséges.</p><p>A webshop jelenlegi folyamata: online kosár, kizárólag személyes átvétel, bankkártyás Stripe fizetés vagy készpénzes fizetés átvételkor.</p>` : `<h2>Adatkezelési tájékoztató</h2><p>Ez a fejlesztési változat kizárólag a rendelés teljesítéséhez szükséges nevet, e-mail-címet és telefonszámot kéri be. Élesítés előtt adatkezelői adatokkal, megőrzési időkkel, jogalapokkal és érintetti jogokkal kitöltött, jogilag ellenőrzött tájékoztató szükséges.</p>`;
  $('#infoDialogContent').innerHTML = content; $('#infoDialog').showModal();
}

function handlePaymentReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get('payment') === 'success') {
    state.cart = []; saveCart();
    setTimeout(() => { openCart(); showOrderSuccess(params.get('order')); }, 300);
    history.replaceState({}, '', '/');
  } else if (params.get('payment') === 'cancelled') {
    showToast('A bankkártyás fizetést megszakítottad. A kosarad megmaradt.'); history.replaceState({}, '', '/');
  }
}

function showOrderSuccess(id) {
  dom.cartLines.hidden = true; dom.cartEmpty.hidden = true; dom.cartFooter.hidden = true; dom.checkoutForm.hidden = true; dom.orderSuccess.hidden = false; $('#orderNumber').textContent = id || '—';
  dom.orderSuccess.focus();
  showToast('Rendelésed sikeresen leadva!');
}

dom.grid.addEventListener('click', event => {
  const card = event.target.closest('.product-card'); if (!card) return;
  if (event.target.closest('.quick-add')) addToCart(card.dataset.id);
  else if (event.target.closest('.favorite')) {
    const id = card.dataset.id; state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    localStorage.setItem('va_favorites', JSON.stringify([...state.favorites])); renderProducts();
  } else if (event.target.closest('.open-product')) showProduct(card.dataset.id);
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
  const line = state.cart.find(x => x.productId === row.dataset.id); if (!line) return;
  if (event.target.closest('[data-delta]')) { line.quantity += Number(event.target.closest('[data-delta]').dataset.delta); if (line.quantity < 1) state.cart = state.cart.filter(x => x !== line); saveCart(); }
  if (event.target.closest('.remove-line')) { state.cart = state.cart.filter(x => x !== line); saveCart(); }
});

$('#checkoutButton').addEventListener('click', () => { dom.cartLines.hidden = true; dom.cartFooter.hidden = true; dom.checkoutForm.hidden = false; });
$('.back-to-cart').addEventListener('click', () => { dom.cartLines.hidden = false; dom.cartFooter.hidden = false; dom.checkoutForm.hidden = true; });
dom.checkoutForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = $('button[type=submit]', dom.checkoutForm); const error = $('#checkoutError');
  button.disabled = true; button.textContent = 'Rendelés mentése…'; error.textContent = '';
  const form = new FormData(dom.checkoutForm);
  try {
    const response = await request('/api/orders', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), note: form.get('note'), payment: form.get('payment'), items: state.cart }) });
    if (response.checkoutUrl) { location.href = response.checkoutUrl; return; }
    state.cart = []; saveCart(); showOrderSuccess(response.orderId);
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; button.innerHTML = `Rendelés leadása · <span id="checkoutTotal">${money(state.cart.reduce((sum, line) => sum + (productById(line.productId)?.price || 0) * line.quantity, 0))}</span>`; }
});

$('#productDialog').addEventListener('click', event => { if (event.target === $('#productDialog') || event.target.closest('.dialog-close')) $('#productDialog').close(); if (event.target.closest('.modal-add')) { addToCart(event.target.closest('.modal-add').dataset.id); $('#productDialog').close(); openCart(); } });
$('#infoDialog').addEventListener('click', event => { if (event.target === $('#infoDialog') || event.target.closest('.dialog-close')) $('#infoDialog').close(); });
$$('[data-info]').forEach(button => button.addEventListener('click', () => showInfo(button.dataset.info)));
$('.menu-button').addEventListener('click', event => { const nav = $('.main-nav'); nav.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open')); });
$$('.main-nav a').forEach(a => a.addEventListener('click', () => $('.main-nav').classList.remove('open')));
$('[data-category-link]').addEventListener('click', event => { clearFilters(); state.filters.categories.add(event.currentTarget.dataset.categoryLink); const input = $(`#categoryFilters input[value="${event.currentTarget.dataset.categoryLink}"]`); if (input) input.checked = true; renderProducts(); });
$('#finderButton').addEventListener('click', () => { const color = $('#colorFinder').value; clearFilters(); if (color) { state.filters.colors.add(color); const input = $(`#colorFilters input[value="${color}"]`); if (input) input.checked = true; } renderProducts(); $('#webshop').scrollIntoView(); });
$$('[data-occasion]').forEach(button => button.addEventListener('click', () => { $('#occasionFinder').value = button.dataset.occasion; $('#webshop').scrollIntoView(); showToast(`${button.dataset.occasion}: válogass csokraink között, vagy kérj egyedi összeállítást.`); }));

init();
