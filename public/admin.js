const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const money = v => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(v);
const dateTime = v => new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const statusLabels = { new: 'Új', awaiting_payment: 'Fizetésre vár', paid: 'Fizetve', preparing: 'Készül', ready: 'Átvehető', completed: 'Teljesítve', cancelled: 'Törölve', payment_error: 'Fizetési hiba' };
const customStatusLabels = { new: 'Új', contacted: 'Kapcsolatfelvétel megtörtént', accepted: 'Elfogadva', completed: 'Teljesítve', declined: 'Elutasítva' };
const openingHourDays = [
  ['monday', 'Hétfő'], ['tuesday', 'Kedd'], ['wednesday', 'Szerda'], ['thursday', 'Csütörtök'], ['friday', 'Péntek'], ['saturday', 'Szombat'], ['sunday', 'Vasárnap']
];
const state = { data: { categories: [], colors: [], products: [], orders: [], customOrders: [], openingHours: [] }, currentImages: [], currentSizes: [] };

function productSizes(product) {
  return Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [{ id: 'default', name: 'Normál', price: Number(product.price) || 0 }];
}

function priceRange(product) {
  const prices = productSizes(product).map(size => size.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} – ${money(max)}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Hálózati hiba.');
  return data;
}

async function start() {
  try { await request('/api/admin/me'); showApp(); await loadData(); }
  catch { $('#loginPage').hidden = false; $('#adminApp').hidden = true; }
}

function showApp() { $('#loginPage').hidden = true; $('#adminApp').hidden = false; }
async function loadData() {
  state.data = await request('/api/admin/data');
  state.data.customOrders = Array.isArray(state.data.customOrders) ? state.data.customOrders : [];
  state.data.openingHours = Array.isArray(state.data.openingHours) ? state.data.openingHours : [];
  renderAll();
}
function catName(id) { return state.data.categories.find(x => x.id === id)?.name || '—'; }

function renderAll() {
  renderOverview(); renderOrders(); renderCustomOrders(); renderProducts(); renderEntities(); renderOpeningHoursEditor();
  $('#stripeChip').className = `stripe-chip ${state.data.stripeConfigured ? 'ok' : 'warn'}`;
  $('#stripeChip').textContent = state.data.stripeConfigured ? '● Stripe csatlakoztatva' : '○ Stripe beállításra vár';
  $('#newOrderCount').textContent = state.data.orders.filter(o => ['new', 'paid'].includes(o.status)).length || '';
  $('#newCustomOrderCount').textContent = state.data.customOrders.filter(order => order.status === 'new').length || '';
}

function renderOverview() {
  const activeProducts = state.data.products.filter(p => p.active !== false).length;
  const openOrders = state.data.orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const revenue = state.data.orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  $('#stats').innerHTML = `<article class="stat"><span>Aktív termék</span><strong>${activeProducts}</strong><small>${state.data.products.length} összesen</small></article><article class="stat"><span>Nyitott rendelés</span><strong>${openOrders}</strong><small>figyelmet igényel</small></article><article class="stat"><span>Fizetett forgalom</span><strong>${money(revenue)}</strong><small>összesített</small></article><article class="stat"><span>Kategóriák</span><strong>${state.data.categories.length}</strong><small>${state.data.colors.length} színvilág</small></article>`;
  $('#recentOrders').innerHTML = state.data.orders.slice(0, 5).map(o => `<button class="recent-order open-order-card" data-order-id="${esc(o.id)}"><strong>${esc(o.id)} · ${esc(o.customer.name)}</strong><span>${dateTime(o.createdAt)} · ${money(o.total)}</span><i class="status status-${o.status}">${statusLabels[o.status] || o.status}</i></button>`).join('') || '<p class="muted">Még nem érkezett rendelés.</p>';
  $('#catalogSummary').innerHTML = `<div class="catalog-row"><span>Termékek</span><b>${state.data.products.length}</b></div><div class="catalog-row"><span>Kiemeltek</span><b>${state.data.products.filter(p => p.featured).length}</b></div><div class="catalog-row"><span>Rejtett termékek</span><b>${state.data.products.filter(p => p.active === false).length}</b></div><div class="catalog-row"><span>Feltöltött képek</span><b>${state.data.products.reduce((s, p) => s + (p.images?.length || 0), 0)}</b></div>`;
}

function filteredOrders() {
  const term = $('#orderSearch').value.toLocaleLowerCase('hu'), status = $('#orderStatusFilter').value;
  return state.data.orders.filter(o => (!status || o.status === status) && (!term || `${o.id} ${o.customer.name} ${o.customer.email} ${o.customer.phone}`.toLocaleLowerCase('hu').includes(term)));
}
function renderOrders() {
  const orders = filteredOrders();
  $('#ordersTable').innerHTML = orders.map(o => `<tr data-id="${esc(o.id)}"><td><strong>${esc(o.id)}</strong><small>${dateTime(o.createdAt)}</small></td><td><strong>${esc(o.customer.name)}</strong><small>${esc(o.customer.email)}<br>${esc(o.customer.phone)}</small>${o.note ? `<small>Megjegyzés: ${esc(o.note)}</small>` : ''}</td><td class="order-items">${o.items.map(i => `<small>${i.quantity}× ${esc(i.name)}${i.sizeName ? ` (${esc(i.sizeName)})` : ''} · ${money(i.price)}</small>`).join('')}</td><td><strong>${o.payment === 'stripe' ? 'Stripe' : 'Készpénz'}</strong><small>Személyes átvétel</small></td><td><strong>${money(o.total)}</strong></td><td><select class="order-status">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${o.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></td><td><button class="open-order" type="button" data-order-id="${esc(o.id)}">Megnyitás</button></td></tr>`).join('');
  $('#ordersEmpty').hidden = orders.length > 0;
}

function openOrderDetails(orderId) {
  const order = state.data.orders.find(item => item.id === orderId); if (!order) return;
  const items = Array.isArray(order.items) ? order.items : [];
  $('#orderDetailsContent').innerHTML = `
    <div class="order-detail-heading">
      <div><p class="eyebrow">Rendelés részletei</p><h2>${esc(order.id)}</h2><p>${dateTime(order.createdAt)}</p></div>
      <i class="status status-${esc(order.status)}">${esc(statusLabels[order.status] || order.status)}</i>
    </div>
    <div class="order-customer-grid">
      <div><span>Név</span><strong>${esc(order.customer?.name || '—')}</strong></div>
      <div><span>Telefonszám</span><a href="tel:${esc(order.customer?.phone || '')}">${esc(order.customer?.phone || '—')}</a></div>
      <div><span>E-mail</span><a href="mailto:${esc(order.customer?.email || '')}">${esc(order.customer?.email || '—')}</a></div>
    </div>
    ${order.note ? `<div class="order-note"><span>Vásárlói leírás / megjegyzés</span>${esc(order.note)}</div>` : ''}
    <h3 class="order-detail-section-title">Rendelt termékek</h3>
    <div class="order-detail-items">${items.map(item => `
      <article class="order-detail-item">
        <img src="${esc(item.image || '/assets/hero-bouquet.png')}" alt="${esc(item.name || 'Termék')}">
        <div><h3>${esc(item.name || '—')}</h3><p>${item.sizeName ? `Méret: ${esc(item.sizeName)}` : 'Méret: —'}</p></div>
        <div class="order-item-prices">
          <div><span>Egységár</span><strong>${money(item.price || 0)}</strong></div>
          <div><span>Mennyiség</span><strong>${Number(item.quantity) || 0} db</strong></div>
          <div><span>Tétel összesen</span><strong>${money((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong></div>
        </div>
      </article>`).join('')}</div>
    <div class="order-detail-total"><span>Rendelés végösszege</span><strong>${money(order.total || 0)}</strong></div>`;
  if (!$('#orderDetailsDialog').open) $('#orderDetailsDialog').showModal();
}

function filteredCustomOrders() {
  const term = ($('#customOrderSearch')?.value || '').toLocaleLowerCase('hu'), status = $('#customOrderStatusFilter')?.value || '';
  return state.data.customOrders.filter(order => (!status || order.status === status) && (!term || `${order.id} ${order.customer.name} ${order.customer.email} ${order.customer.phone} ${order.description}`.toLocaleLowerCase('hu').includes(term)));
}

function renderCustomOrders() {
  const orders = filteredCustomOrders();
  $('#customOrdersTable').innerHTML = orders.map(order => `<tr data-id="${esc(order.id)}"><td><strong>${esc(order.id)}</strong><small>${dateTime(order.createdAt)}</small></td><td><strong>${esc(order.customer.name)}</strong><small><a href="mailto:${esc(order.customer.email)}">${esc(order.customer.email)}</a><br><a href="tel:${esc(order.customer.phone)}">${esc(order.customer.phone)}</a></small></td><td><p class="custom-description">${esc(order.description)}</p></td><td><div class="custom-reference-grid">${order.images?.length ? order.images.map((image, index) => `<a href="${esc(image)}" target="_blank" rel="noopener" title="Referenciafotó ${index + 1}"><img src="${esc(image)}" alt="Referenciafotó ${index + 1}"></a>`).join('') : '<small>Nincs csatolt kép</small>'}</div></td><td><select class="custom-order-status">${Object.entries(customStatusLabels).map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></td></tr>`).join('');
  $('#customOrdersEmpty').hidden = orders.length > 0;
}

function renderProducts() {
  const term = ($('#productSearch')?.value || '').toLocaleLowerCase('hu');
  const products = state.data.products.filter(p => !term || `${p.name} ${p.description} ${catName(p.categoryId)}`.toLocaleLowerCase('hu').includes(term));
  $('#adminProducts').innerHTML = products.map(p => `<article class="admin-product ${p.active === false ? 'inactive' : ''}" data-id="${esc(p.id)}"><img src="${esc(p.images?.[0] || '/assets/hero-bouquet.png')}" alt=""><div class="admin-product-copy"><h3>${esc(p.name)}</h3><p>${esc(catName(p.categoryId))} · ${priceRange(p)} · ${productSizes(p).length} méret${p.seasonal ? ' · Szezonális' : ''}${p.active === false ? ' · Rejtett' : ''}</p></div><div class="admin-product-actions"><button class="edit-product">Szerkesztés</button><button class="delete-product">Törlés</button></div></article>`).join('');
}

function renderEntities() {
  $('#categoryList').innerHTML = state.data.categories.map(c => `<div class="simple-row" data-id="${esc(c.id)}"><span><b>${esc(c.name)}</b></span><span><button class="edit-entity" data-type="category">Szerkesztés</button><button class="delete-entity" data-type="categories">Törlés</button></span></div>`).join('');
  $('#colorList').innerHTML = state.data.colors.map(c => `<div class="simple-row" data-id="${esc(c.id)}"><span><i style="background:${esc(c.hex)}"></i><b>${esc(c.name)}</b><small>${esc(c.hex)}</small></span><span><button class="edit-entity" data-type="color">Szerkesztés</button><button class="delete-entity" data-type="colors">Törlés</button></span></div>`).join('');
}

function renderOpeningHoursEditor() {
  $('#openingHoursEditor').innerHTML = openingHourDays.map(([id, label]) => {
    const day = state.data.openingHours.find(item => item.id === id) || { id, open: '08:00', close: '17:00', closed: false };
    return `<div class="hours-row" data-day="${id}"><strong>${label}</strong><label>Nyitás<input class="hours-open" type="time" value="${esc(day.open || '08:00')}" ${day.closed ? 'disabled' : ''} required></label><label>Zárás<input class="hours-close" type="time" value="${esc(day.close || '17:00')}" ${day.closed ? 'disabled' : ''} required></label><label class="closed-toggle"><input class="hours-closed" type="checkbox" ${day.closed ? 'checked' : ''}>Zárva</label></div>`;
  }).join('');
}

function switchTab(name) {
  $$('.sidebar nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  const names = { overview: ['Ma a virágpultnál', 'Áttekintés'], orders: ['Beérkezett igények', 'Rendelések'], customOrders: ['Személyre szabott virágok', 'Egyedi rendelések'], products: ['Webshop kínálat', 'Termékek'], categories: ['Katalógus rendszerezése', 'Kategóriák'], colors: ['Keresési szűrők', 'Színvilágok'], hours: ['Üzleti információk', 'Nyitvatartás'], security: ['Admin hozzáférés', 'Biztonság'] };
  $('#pageEyebrow').textContent = names[name][0]; $('#pageTitle').textContent = names[name][1];
  $('.sidebar').classList.remove('open');
}

function toast(message) { const el = $('#adminToast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2500); }
function setError(form, message = '') { $('.form-error', form).textContent = message; }

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, button = $('button', form); button.disabled = true; setError(form);
  try { await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: new FormData(form).get('password') }) }); showApp(); await loadData(); }
  catch (error) { setError(form, error.message); }
  finally { button.disabled = false; }
});

$('#logoutButton').addEventListener('click', async () => { await request('/api/admin/logout', { method: 'POST' }); location.reload(); });
$$('.sidebar nav button').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
$$('[data-go]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.go)));
$('.admin-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
$('#orderSearch').addEventListener('input', renderOrders); $('#orderStatusFilter').addEventListener('change', renderOrders);
$('#customOrderSearch').addEventListener('input', renderCustomOrders); $('#customOrderStatusFilter').addEventListener('change', renderCustomOrders);
$('#productSearch').addEventListener('input', renderProducts);

$('#openingHoursEditor').addEventListener('change', event => {
  if (!event.target.matches('.hours-closed')) return;
  const row = event.target.closest('.hours-row');
  $$('.hours-open, .hours-close', row).forEach(input => { input.disabled = event.target.checked; });
});

$('#openingHoursForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget, button = $('button[type=submit]', form), success = $('.form-success', form);
  setError(form); success.textContent = ''; button.disabled = true;
  const openingHours = $$('.hours-row', form).map(row => ({ id: row.dataset.day, open: $('.hours-open', row).value, close: $('.hours-close', row).value, closed: $('.hours-closed', row).checked }));
  try {
    await request('/api/admin/opening-hours', { method: 'PUT', body: JSON.stringify({ openingHours }) });
    await loadData(); success.textContent = 'A nyitvatartás elmentve és frissítve a webshopban.'; toast('Nyitvatartás frissítve.');
  } catch (error) { setError(form, error.message); }
  finally { button.disabled = false; }
});

$('#ordersTable').addEventListener('change', async event => {
  if (!event.target.matches('.order-status')) return; const row = event.target.closest('tr');
  try { await request(`/api/admin/orders/${encodeURIComponent(row.dataset.id)}`, { method: 'PUT', body: JSON.stringify({ status: event.target.value }) }); await loadData(); toast('Rendelési állapot frissítve.'); }
  catch (error) { toast(error.message); }
});

$('#customOrdersTable').addEventListener('change', async event => {
  if (!event.target.matches('.custom-order-status')) return; const row = event.target.closest('tr');
  try { await request(`/api/admin/custom-orders/${encodeURIComponent(row.dataset.id)}`, { method: 'PUT', body: JSON.stringify({ status: event.target.value }) }); await loadData(); toast('Egyedi rendelés állapota frissítve.'); }
  catch (error) { toast(error.message); }
});

function resetEntityForm(form) {
  const formId = form.getAttribute('id');
  form.reset();
  $('[name=id]', form).value = '';
  $(`#${formId.replace('Form', 'FormTitle')}`).textContent = formId === 'categoryForm' ? 'Új kategória' : 'Új szín';
  if (formId === 'colorForm') $('[name=hex]', form).value = '#e7b6ab';
  setError(form);
}
$$('.cancel-edit').forEach(button => button.addEventListener('click', () => resetEntityForm(button.closest('form'))));

['category', 'color'].forEach(type => {
  const form = $(`#${type}Form`);
  form.addEventListener('submit', async event => {
    event.preventDefault(); const data = new FormData(form), id = data.get('id');
    const payload = { name: data.get('name') }; if (type === 'color') payload.hex = data.get('hex');
    try { await request(`/api/admin/${type === 'category' ? 'categories' : 'colors'}${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); resetEntityForm(form); await loadData(); toast('Mentve.'); }
    catch (error) { setError(form, error.message); }
  });
});

document.addEventListener('click', async event => {
  const edit = event.target.closest('.edit-entity');
  if (edit) {
    const row = edit.closest('.simple-row'), type = edit.dataset.type, collection = type === 'category' ? state.data.categories : state.data.colors, item = collection.find(x => x.id === row.dataset.id), form = $(`#${type}Form`);
    $('[name=id]', form).value = item.id; $('[name=name]', form).value = item.name; if (type === 'color') $('[name=hex]', form).value = item.hex;
    $(`#${type}FormTitle`).textContent = type === 'category' ? 'Kategória szerkesztése' : 'Szín szerkesztése'; form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const del = event.target.closest('.delete-entity');
  if (del) {
    const row = del.closest('.simple-row'); if (!confirm('Biztosan törlöd ezt az elemet?')) return;
    try { await request(`/api/admin/${del.dataset.type}/${encodeURIComponent(row.dataset.id)}`, { method: 'DELETE' }); await loadData(); toast('Törölve.'); }
    catch (error) { toast(error.message); }
  }
});

function openProductEditor(product = null) {
  const form = $('#productForm'); form.reset(); setError(form); state.currentImages = product?.images ? [...product.images] : [];
  state.currentSizes = product ? productSizes(product).map(size => ({ ...size })) : [{ id: '', name: 'Normál', price: '' }];
  $('#productFormTitle').textContent = product ? 'Termék szerkesztése' : 'Új termék'; $('[name=id]', form).value = product?.id || '';
  $('[name=name]', form).value = product?.name || ''; $('[name=description]', form).value = product?.description || '';
  $('[name=categoryId]', form).innerHTML = `<option value="">Válassz…</option>${state.data.categories.map(c => `<option value="${esc(c.id)}" ${product?.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;
  $('#productColors').innerHTML = state.data.colors.map(c => `<label><input type="checkbox" value="${esc(c.id)}" ${product?.colorIds?.includes(c.id) ? 'checked' : ''}><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(c.hex)}"></i> ${esc(c.name)}</label>`).join('');
  $('[name=seasonal]', form).checked = Boolean(product?.seasonal); $('[name=featured]', form).checked = Boolean(product?.featured); $('[name=active]', form).checked = product ? product.active !== false : true;
  renderSizeOptions(); renderPreviews(); $('#productEditor').showModal();
}
function renderPreviews() { $('#imagePreviews').innerHTML = state.currentImages.map((src, i) => `<div class="image-preview" data-index="${i}"><img src="${esc(src)}" alt=""><button type="button" aria-label="Kép eltávolítása">×</button></div>`).join(''); }

function renderSizeOptions() {
  $('#sizeOptions').innerHTML = state.currentSizes.map((size, index) => `<div class="size-option-row" data-index="${index}" data-id="${esc(size.id || '')}"><label>Méret neve<input class="size-name" value="${esc(size.name)}" placeholder="Például: Kicsi" required></label><label>Ár (Ft)<input class="size-price" type="number" min="0" step="100" value="${esc(size.price)}" required></label><button type="button" class="remove-size" aria-label="Méret eltávolítása" ${state.currentSizes.length === 1 ? 'disabled' : ''}>×</button></div>`).join('');
}

$('#addSizeOption').addEventListener('click', () => { state.currentSizes.push({ id: '', name: '', price: '' }); renderSizeOptions(); });
$('#sizeOptions').addEventListener('input', event => {
  const row = event.target.closest('.size-option-row'); if (!row) return;
  const size = state.currentSizes[Number(row.dataset.index)];
  if (event.target.matches('.size-name')) size.name = event.target.value;
  if (event.target.matches('.size-price')) size.price = event.target.value;
});

$('#ordersTable').addEventListener('click', event => {
  const button = event.target.closest('.open-order');
  if (button) openOrderDetails(button.dataset.orderId);
});

$('#recentOrders').addEventListener('click', event => {
  const button = event.target.closest('.open-order-card');
  if (button) openOrderDetails(button.dataset.orderId);
});

$('#orderDetailsDialog').addEventListener('click', event => {
  if (event.target === $('#orderDetailsDialog') || event.target.closest('.dialog-close')) $('#orderDetailsDialog').close();
});
$('#sizeOptions').addEventListener('click', event => {
  const row = event.target.closest('.size-option-row');
  if (!row || !event.target.closest('.remove-size') || state.currentSizes.length === 1) return;
  state.currentSizes.splice(Number(row.dataset.index), 1); renderSizeOptions();
});

$('#addProduct').addEventListener('click', () => openProductEditor());
$('#adminProducts').addEventListener('click', async event => {
  const card = event.target.closest('.admin-product'); if (!card) return; const product = state.data.products.find(p => p.id === card.dataset.id);
  if (event.target.closest('.edit-product')) openProductEditor(product);
  if (event.target.closest('.delete-product')) { if (!confirm(`Biztosan törlöd: ${product.name}?`)) return; try { await request(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }); await loadData(); toast('Termék törölve.'); } catch (error) { toast(error.message); } }
});

$('#imageInput').addEventListener('change', async event => {
  const files = [...event.target.files].slice(0, Math.max(0, 6 - state.currentImages.length));
  for (const file of files) {
    if (file.size > 4 * 1024 * 1024) { toast(`${file.name}: a kép legfeljebb 4 MB lehet.`); continue; }
    state.currentImages.push(await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }));
  }
  event.target.value = ''; renderPreviews();
});
$('#imagePreviews').addEventListener('click', event => { const preview = event.target.closest('.image-preview'); if (!preview || !event.target.closest('button')) return; state.currentImages.splice(Number(preview.dataset.index), 1); renderPreviews(); });
$$('#productEditor .dialog-close, .cancel-product').forEach(button => button.addEventListener('click', () => $('#productEditor').close()));

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, data = new FormData(form), id = data.get('id'), button = $('button[type=submit]', form); setError(form); button.disabled = true;
  const sizes = $$('.size-option-row').map(row => ({ id: row.dataset.id, name: $('.size-name', row).value, price: Number($('.size-price', row).value) }));
  const payload = { name: data.get('name'), description: data.get('description'), sizes, categoryId: data.get('categoryId'), colorIds: $$('#productColors input:checked').map(x => x.value), images: state.currentImages, seasonal: $('[name=seasonal]', form).checked, featured: $('[name=featured]', form).checked, active: $('[name=active]', form).checked };
  try { await request(`/api/admin/products${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); $('#productEditor').close(); await loadData(); toast('Termék mentve.'); }
  catch (error) { setError(form, error.message); }
  finally { button.disabled = false; }
});

$('#passwordForm').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, data = new FormData(form), success = $('.form-success', form); setError(form); success.textContent = '';
  if (data.get('newPassword') !== data.get('confirmPassword')) return setError(form, 'A két új jelszó nem egyezik.');
  try { await request('/api/admin/password', { method: 'PUT', body: JSON.stringify({ currentPassword: data.get('currentPassword'), newPassword: data.get('newPassword') }) }); form.reset(); success.textContent = 'A jelszó sikeresen megváltozott.'; }
  catch (error) { setError(form, error.message); }
});

start();
