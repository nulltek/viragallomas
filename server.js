const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(ROOT, 'data', 'store.json');
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const BARION_ENV = process.env.BARION_ENV === 'live' ? 'live' : 'sandbox';
const BARION_API_HOST = BARION_ENV === 'live' ? 'api.barion.com' : 'api.test.barion.com';
const BARION_PIXEL_ID = /^BP-[A-Za-z0-9]{10}-[A-Za-z0-9]{2}$/.test(process.env.BARION_PIXEL_ID || '') ? process.env.BARION_PIXEL_ID : '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessions = new Map();
const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL || 'viola32ildiko@gmail.com';
const mailTransport = process.env.SMTP_USER && process.env.SMTP_PASS ? require('nodemailer').createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 8000,
  socketTimeout: 12000
}) : null;
const dbPool = process.env.DATABASE_URL ? new (require('pg').Pool)({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5
}) : null;
let databaseReady = null;

const uid = (prefix = '') => prefix + crypto.randomBytes(8).toString('hex');
const now = () => new Date().toISOString();
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  hash: crypto.scryptSync(password, salt, 64).toString('hex')
});
const safeEqual = (a, b) => {
  const x = Buffer.from(a || '', 'hex');
  const y = Buffer.from(b || '', 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function seedStore() {
  const admin = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'Admin123!');
  return {
    version: 1,
    admin,
    categories: [
      { id: 'csokrok', name: 'Csokrok' },
      { id: 'rozsak', name: 'Rózsák' },
      { id: 'viragboxok', name: 'Virágboxok' },
      { id: 'tulipanok', name: 'Tulipánok' }
    ],
    colors: [
      { id: 'puder', name: 'Púder', hex: '#e7b6ab' },
      { id: 'barack', name: 'Barack', hex: '#efa27c' },
      { id: 'feher', name: 'Fehér', hex: '#f4f0e8' },
      { id: 'szines', name: 'Színes', hex: '#c96962' }
    ],
    products: [
      { id: 'puder-alom', name: 'Púder álom', description: 'Lágy púder és krém árnyalatú, romantikus kézzel kötött csokor.', price: 18900, categoryId: 'csokrok', colorIds: ['puder', 'feher'], images: ['/assets/puder-alom.png'], featured: true, active: true },
      { id: 'nyari-kert', name: 'Nyári kert', description: 'Vidám, színes válogatás a nyári kert legszebb hangulatával.', price: 16900, categoryId: 'csokrok', colorIds: ['szines', 'barack'], images: ['/assets/nyari-kert.png'], featured: true, active: true },
      { id: 'barackos-ragyogas', name: 'Barackos ragyogás', description: 'Gazdag rózsacsokor barack, korall és krém tónusokban.', price: 17900, categoryId: 'rozsak', colorIds: ['barack', 'feher'], images: ['/assets/barackos-ragyogas.png'], featured: true, active: true },
      { id: 'feher-harmonia', name: 'Fehér harmónia', description: 'Elegáns liliom, rózsa és rezgő kompozíció friss zöldekkel.', price: 19900, categoryId: 'csokrok', colorIds: ['feher'], images: ['/assets/feher-harmonia.png'], featured: true, active: true }
    ],
    orders: [],
    customOrders: [],
    openingHours: defaultOpeningHours()
  };
}

function defaultOpeningHours() {
  return [
    { id: 'monday', open: '08:00', close: '17:00', closed: false },
    { id: 'tuesday', open: '08:00', close: '17:00', closed: false },
    { id: 'wednesday', open: '08:00', close: '17:00', closed: false },
    { id: 'thursday', open: '08:00', close: '17:00', closed: false },
    { id: 'friday', open: '08:00', close: '17:00', closed: false },
    { id: 'saturday', open: '08:00', close: '13:00', closed: false },
    { id: 'sunday', open: '', close: '', closed: true }
  ];
}

function normalizeOpeningHours(value) {
  const supplied = Array.isArray(value) ? value : [];
  return defaultOpeningHours().map(fallback => {
    const day = supplied.find(item => item && item.id === fallback.id);
    if (!day) return fallback;
    const closed = Boolean(day.closed);
    const validTime = time => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''));
    return {
      id: fallback.id,
      open: closed ? '' : (validTime(day.open) ? day.open : fallback.open),
      close: closed ? '' : (validTime(day.close) ? day.close : fallback.close),
      closed
    };
  });
}

function normalizeStore(data) {
  data.categories = Array.isArray(data.categories) ? data.categories : [];
  data.colors = Array.isArray(data.colors) ? data.colors : [];
  data.products = Array.isArray(data.products) ? data.products.map(product => {
    const fallbackPrice = Math.max(0, Math.round(Number(product.price) || 0));
    const sizes = Array.isArray(product.sizes) ? product.sizes.filter(size => size && cleanText(size.name, 80) && Number.isFinite(Number(size.price))).map((size, index) => ({
      id: cleanText(size.id, 80) || `size-${index + 1}`,
      name: cleanText(size.name, 80),
      price: Math.max(0, Math.round(Number(size.price)))
    })) : [];
    product.sizes = sizes.length ? sizes : [{ id: 'default', name: 'Normál', price: fallbackPrice }];
    product.price = Math.min(...product.sizes.map(size => size.price));
    const legacyCategoryIds = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId];
    product.categoryIds = [...new Set(legacyCategoryIds.filter(categoryId => data.categories.some(category => category.id === categoryId)))];
    product.categoryId = product.categoryIds[0] || '';
    product.seasonal = Boolean(product.seasonal);
    return product;
  }) : [];
  data.orders = Array.isArray(data.orders) ? data.orders : [];
  data.customOrders = Array.isArray(data.customOrders) ? data.customOrders : [];
  data.openingHours = normalizeOpeningHours(data.openingHours);
  return data;
}

async function ensureDatabase() {
  if (!dbPool) return;
  if (!databaseReady) databaseReady = (async () => {
    await dbPool.query(`CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const existing = await dbPool.query('SELECT id FROM app_state WHERE id = 1');
    if (!existing.rowCount) {
      await dbPool.query('INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)', [JSON.stringify(seedStore())]);
    }
  })();
  return databaseReady;
}

async function loadStore() {
  if (dbPool) {
    await ensureDatabase();
    const result = await dbPool.query('SELECT data FROM app_state WHERE id = 1');
    return normalizeStore(result.rows[0].data);
  }
  if (!fs.existsSync(DATA_FILE)) {
    const data = seedStore();
    await saveStore(data);
    return normalizeStore(data);
  }
  return normalizeStore(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
}

async function saveStore(data) {
  if (dbPool) {
    await ensureDatabase();
    await dbPool.query('UPDATE app_state SET data = $1::jsonb, updated_at = NOW() WHERE id = 1', [JSON.stringify(data)]);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('A feltöltés túl nagy.'), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(p => {
    const [k, ...v] = p.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
}

function signedSession(id) {
  return `${id}.${crypto.createHmac('sha256', SESSION_SECRET).update(id).digest('hex')}`;
}

function getSession(req) {
  const token = parseCookies(req).va_session || '';
  const [id, sig] = token.split('.');
  if (!id || !sig || !safeEqual(Buffer.from(sig).toString('hex'), Buffer.from(crypto.createHmac('sha256', SESSION_SECRET).update(id).digest('hex')).toString('hex'))) return null;
  const session = sessions.get(id);
  if (!session || session.expires < Date.now()) return null;
  return session;
}

function requireAdmin(req, res) {
  if (!getSession(req)) {
    json(res, 401, { error: 'Jelentkezz be az admin felülethez.' });
    return false;
  }
  return true;
}

function cleanText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

async function sendNotification({ subject, replyTo, text }) {
  if (!mailTransport) {
    console.log('Rendelési e-mail nincs konfigurálva; a rendelés az admin felületen elérhető.');
    return false;
  }
  try {
    await mailTransport.sendMail({
      from: `Virág Állomás webshop <${process.env.SMTP_USER}>`,
      to: notificationEmail,
      replyTo,
      subject,
      text
    });
    return true;
  } catch (error) {
    console.error('A rendelési értesítő e-mail küldése sikertelen:', error.message);
    return false;
  }
}

function orderNotification(order) {
  const lines = order.items.map(item => `${item.quantity} × ${item.name} (${item.sizeName}${item.colorName ? `, ${item.colorName}` : ''}) — ${item.price * item.quantity} Ft`).join('\n');
  return sendNotification({
    subject: `Új webshop rendelés: ${order.id}`,
    replyTo: order.customer.email,
    text: `Új webshop rendelés érkezett.\n\nAzonosító: ${order.id}\nNév: ${order.customer.name}\nE-mail: ${order.customer.email}\nTelefon: ${order.customer.phone}\nFizetés: ${order.payment === 'barion' ? 'Barion online fizetés' : 'Készpénz az üzletben'}\nÁtvétel: Személyes átvétel\n\nTermékek:\n${lines}\n\nÖsszesen: ${order.total} Ft\nMegjegyzés: ${order.note || '—'}\n\nMegnyitás az adminban: ${PUBLIC_URL}/admin`
  });
}

function customOrderNotification(order) {
  return sendNotification({
    subject: `Új egyedi virágrendelés: ${order.id}`,
    replyTo: order.customer.email,
    text: `Új egyedi virágrendelési igény érkezett.\n\nAzonosító: ${order.id}\nNév: ${order.customer.name}\nE-mail: ${order.customer.email}\nTelefon: ${order.customer.phone}\nReferenciafotók száma: ${order.images.length}\n\nLeírás:\n${order.description}\n\nA referenciafotók az admin felületen tekinthetők meg: ${PUBLIC_URL}/admin`
  });
}

function publicCatalog(store) {
  return {
    categories: store.categories,
    colors: store.colors,
    products: store.products.filter(p => p.active !== false),
    openingHours: store.openingHours
  };
}

function stripeRequest(pathname, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const request = https.request({
      hostname: 'api.stripe.com', path: pathname, method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, response => {
      const chunks = [];
      response.on('data', c => chunks.push(c));
      response.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(payload);
        else reject(new Error(payload.error?.message || 'Stripe hiba történt.'));
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

function verifyStripe(raw, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const parts = Object.fromEntries(signature.split(',').map(x => x.split('=')));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const digest = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
  return safeEqual(digest, parts.v1);
}

function barionRequest(pathname, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? Buffer.from(JSON.stringify(payload)) : null;
    const request = https.request({
      hostname: BARION_API_HOST, path: pathname, method,
      headers: {
        'x-pos-key': process.env.BARION_POS_KEY,
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': body.length } : {})
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        let data = {};
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        if (response.statusCode >= 200 && response.statusCode < 300 && !data.Errors?.length) return resolve(data);
        const message = data.Errors?.map(error => error.Description || error.Title).filter(Boolean).join(' ') || data.Message || 'Barion hiba történt.';
        reject(new Error(message));
      });
    });
    request.setTimeout(30000, () => request.destroy(new Error('A Barion válasza túl sokáig tartott.')));
    request.on('error', reject);
    request.end(body || undefined);
  });
}

async function refreshBarionOrder(store, order, paymentId = order.barionPaymentId) {
  if (!paymentId || paymentId !== order.barionPaymentId) throw Object.assign(new Error('A Barion fizetési azonosító érvénytelen.'), { status: 400 });
  const payment = await barionRequest(`/v4/Payment/${encodeURIComponent(paymentId)}/PaymentState`);
  if (payment.PaymentId !== order.barionPaymentId || Number(payment.Total) !== Number(order.total) || payment.Currency !== 'HUF') {
    throw new Error('A Barion fizetés adatai nem egyeznek a rendeléssel.');
  }
  order.barionStatus = payment.PaymentStatus;
  order.updatedAt = now();
  if (payment.PaymentStatus === 'Succeeded') {
    order.status = 'paid';
    order.paidAt = order.paidAt || now();
  } else if (['Canceled', 'Expired', 'Failed'].includes(payment.PaymentStatus)) {
    order.status = 'payment_error';
  }
  await saveStore(store);
  return order;
}

function mime(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function api(req, res, url) {
  const method = req.method;
  const pathname = url.pathname;
  const store = await loadStore();

  if (pathname === '/api/catalog' && method === 'GET') return json(res, 200, publicCatalog(store));
  if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok: true, barionConfigured: Boolean(process.env.BARION_POS_KEY && process.env.BARION_PAYEE_EMAIL), databaseConfigured: Boolean(dbPool) });

  if (pathname === '/api/barion/callback' && method === 'POST') {
    await readBody(req, 1024 * 1024);
    const paymentId = url.searchParams.get('paymentId');
    const order = store.orders.find(item => item.barionPaymentId === paymentId);
    if (!order) return json(res, 200, { received: true });
    await refreshBarionOrder(store, order, paymentId);
    return json(res, 200, { received: true });
  }

  if (pathname === '/api/barion/payment-status' && method === 'GET') {
    const orderId = cleanText(url.searchParams.get('order'), 80);
    const paymentId = cleanText(url.searchParams.get('paymentId'), 100);
    const order = store.orders.find(item => item.id === orderId && item.payment === 'barion');
    if (!order || !paymentId || paymentId !== order.barionPaymentId) return json(res, 404, { error: 'A fizetés nem található.' });
    const updated = await refreshBarionOrder(store, order, paymentId);
    return json(res, 200, { orderId: updated.id, status: updated.status });
  }

  if (pathname === '/api/stripe/webhook' && method === 'POST') {
    const raw = await readBody(req);
    if (!verifyStripe(raw, req.headers['stripe-signature'])) return json(res, 400, { error: 'Érvénytelen Stripe aláírás.' });
    const event = JSON.parse(raw.toString('utf8'));
    if (event.type === 'checkout.session.completed') {
      const id = event.data?.object?.metadata?.order_id;
      const order = store.orders.find(o => o.id === id);
      if (order) { order.status = 'paid'; order.paidAt = now(); await saveStore(store); }
    }
    return json(res, 200, { received: true });
  }

  let body = {};
  if (!['GET', 'HEAD'].includes(method)) {
    const raw = await readBody(req);
    try { body = raw.length ? JSON.parse(raw.toString('utf8')) : {}; }
    catch { return json(res, 400, { error: 'Érvénytelen kérés.' }); }
  }

  if (pathname === '/api/orders' && method === 'POST') {
    const name = cleanText(body.name, 100), email = cleanText(body.email, 180), phone = cleanText(body.phone, 40);
    const payment = body.payment === 'barion' ? 'barion' : 'cash';
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 6 || !Array.isArray(body.items) || !body.items.length) return json(res, 400, { error: 'Kérjük, tölts ki minden adatot és ellenőrizd a kosarat.' });
    if (payment === 'barion' && (!process.env.BARION_POS_KEY || !process.env.BARION_PAYEE_EMAIL)) return json(res, 503, { error: 'A Barion fizetés még nincs konfigurálva. Válaszd a helyszíni készpénzes fizetést.' });
    const items = [];
    let total = 0;
    for (const line of body.items.slice(0, 40)) {
      const product = store.products.find(p => p.id === line.productId && p.active !== false);
      const quantity = Math.max(1, Math.min(20, Number(line.quantity) || 1));
      if (!product) return json(res, 400, { error: 'A kosár egyik terméke már nem elérhető.' });
      const size = product.sizes.find(option => option.id === line.sizeId) || product.sizes[0];
      if (!size) return json(res, 400, { error: 'Válassz elérhető méretet minden termékhez.' });
      const color = store.colors.find(option => option.id === line.colorId && product.colorIds.includes(option.id));
      if (!color) return json(res, 400, { error: 'Válassz elérhető színt minden termékhez.' });
      items.push({ productId: product.id, name: product.name, sizeId: size.id, sizeName: size.name, colorId: color.id, colorName: color.name, price: size.price, quantity, image: product.images?.[0] || '' });
      total += size.price * quantity;
    }
    const order = { id: uid('VA-').toUpperCase(), createdAt: now(), updatedAt: now(), status: payment === 'cash' ? 'new' : 'awaiting_payment', payment, pickup: 'Személyes átvétel', customer: { name, email, phone }, note: cleanText(body.note, 600), items, total };
    store.orders.unshift(order);
    await saveStore(store);
    await orderNotification(order);

    if (payment === 'barion') {
      const paymentRequest = {
        POSKey: process.env.BARION_POS_KEY,
        PaymentType: 'Immediate',
        PaymentRequestId: order.id,
        FundingSources: ['All'],
        OrderNumber: order.id,
        RedirectUrl: `${PUBLIC_URL}/?payment=barion&order=${encodeURIComponent(order.id)}`,
        CallbackUrl: `${PUBLIC_URL}/api/barion/callback`,
        Currency: 'HUF',
        Locale: 'hu-HU',
        GuestCheckOut: true,
        PayerHint: email,
        Transactions: [{
          POSTransactionId: `${order.id}-1`,
          Payee: process.env.BARION_PAYEE_EMAIL,
          Total: total,
          Comment: `Virág Állomás rendelés: ${order.id}`,
          Items: items.map(item => ({ Name: item.name, Description: `${item.sizeName}, ${item.colorName}`, Quantity: item.quantity, Unit: 'db', UnitPrice: item.price, ItemTotal: item.price * item.quantity, SKU: item.productId }))
        }]
      };
      try {
        const barionPayment = await barionRequest('/v2/Payment/Start', 'POST', paymentRequest);
        if (!barionPayment.PaymentId || !barionPayment.GatewayUrl) throw new Error('A Barion nem adott vissza fizetési hivatkozást.');
        order.barionPaymentId = barionPayment.PaymentId;
        order.barionTransactionId = barionPayment.Transactions?.[0]?.TransactionId || '';
        order.barionStatus = barionPayment.Status || 'Prepared';
        await saveStore(store);
        return json(res, 201, { orderId: order.id, checkoutUrl: barionPayment.GatewayUrl });
      } catch (error) {
        order.status = 'payment_error'; order.paymentError = error.message; await saveStore(store);
        return json(res, 502, { error: 'A Barion fizetés nem indítható. Próbáld újra vagy válaszd a helyszíni készpénzes fizetést.', orderId: order.id });
      }
    }
    return json(res, 201, { orderId: order.id });
  }

  if (pathname === '/api/custom-orders' && method === 'POST') {
    const name = cleanText(body.name, 100), email = cleanText(body.email, 180), phone = cleanText(body.phone, 40), description = cleanText(body.description, 4000);
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 6 || !description) return json(res, 400, { error: 'Kérjük, tölts ki minden kötelező mezőt.' });
    const images = Array.isArray(body.images) ? body.images.filter(image => typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(image) && image.length <= 6 * 1024 * 1024).slice(0, 5) : [];
    const customOrder = { id: uid('EGR-').toUpperCase(), createdAt: now(), updatedAt: now(), status: 'new', customer: { name, email, phone }, description, images };
    store.customOrders.unshift(customOrder);
    await saveStore(store);
    await customOrderNotification(customOrder);
    return json(res, 201, { customOrderId: customOrder.id });
  }

  if (pathname === '/api/admin/login' && method === 'POST') {
    const candidate = hashPassword(String(body.password || ''), store.admin.salt).hash;
    if (!safeEqual(candidate, store.admin.hash)) return json(res, 401, { error: 'Hibás jelszó.' });
    const id = uid(); sessions.set(id, { expires: Date.now() + 8 * 60 * 60 * 1000 });
    return json(res, 200, { ok: true }, { 'Set-Cookie': `va_session=${encodeURIComponent(signedSession(id))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${PUBLIC_URL.startsWith('https:') ? '; Secure' : ''}` });
  }
  if (pathname === '/api/admin/logout' && method === 'POST') {
    const token = parseCookies(req).va_session || ''; sessions.delete(token.split('.')[0]);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'va_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (pathname === '/api/admin/me' && method === 'GET') return json(res, getSession(req) ? 200 : 401, { authenticated: Boolean(getSession(req)) });

  if (pathname.startsWith('/api/admin/') && !requireAdmin(req, res)) return;
  if (pathname === '/api/admin/data' && method === 'GET') return json(res, 200, { categories: store.categories, colors: store.colors, products: store.products, orders: store.orders, customOrders: store.customOrders, openingHours: store.openingHours, barionConfigured: Boolean(process.env.BARION_POS_KEY && process.env.BARION_PAYEE_EMAIL), databaseConfigured: Boolean(dbPool) });
  if (pathname === '/api/admin/opening-hours' && method === 'PUT') {
    if (!Array.isArray(body.openingHours)) return json(res, 400, { error: 'A nyitvatartási adatok hiányoznak.' });
    const expectedIds = defaultOpeningHours().map(day => day.id);
    if (body.openingHours.length !== expectedIds.length || !expectedIds.every(id => body.openingHours.some(day => day?.id === id))) return json(res, 400, { error: 'Mind a hét nap nyitvatartását add meg.' });
    for (const day of body.openingHours) {
      if (!day.closed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(day.open || '')) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(day.close || '')))) return json(res, 400, { error: 'A nyitási és zárási idő minden nyitva tartó napon kötelező.' });
      if (!day.closed && day.open >= day.close) return json(res, 400, { error: 'A zárási időnek későbbinek kell lennie a nyitásnál.' });
    }
    store.openingHours = normalizeOpeningHours(body.openingHours);
    await saveStore(store);
    return json(res, 200, { openingHours: store.openingHours });
  }
  if (pathname === '/api/admin/password' && method === 'PUT') {
    const current = hashPassword(String(body.currentPassword || ''), store.admin.salt).hash;
    if (!safeEqual(current, store.admin.hash)) return json(res, 400, { error: 'A jelenlegi jelszó nem megfelelő.' });
    if (String(body.newPassword || '').length < 10) return json(res, 400, { error: 'Az új jelszó legalább 10 karakter legyen.' });
    store.admin = hashPassword(String(body.newPassword)); await saveStore(store);
    return json(res, 200, { ok: true });
  }

  const collections = { categories: 'categories', colors: 'colors', products: 'products' };
  const match = pathname.match(/^\/api\/admin\/(categories|colors|products)(?:\/([^/]+))?$/);
  if (match) {
    const key = collections[match[1]], id = match[2] ? decodeURIComponent(match[2]) : null;
    if (method === 'POST' && !id) {
      const record = buildRecord(key, body, store, uid(key === 'products' ? 'item-' : ''));
      if (record.error) return json(res, 400, { error: record.error });
      store[key].push(record); await saveStore(store); return json(res, 201, record);
    }
    const index = store[key].findIndex(x => x.id === id);
    if (index < 0) return json(res, 404, { error: 'Nem található.' });
    if (method === 'PUT') {
      const record = buildRecord(key, body, store, id);
      if (record.error) return json(res, 400, { error: record.error });
      store[key][index] = record; await saveStore(store); return json(res, 200, record);
    }
    if (method === 'DELETE') {
      if (key === 'categories' && store.products.some(p => (p.categoryIds || [p.categoryId]).includes(id))) return json(res, 409, { error: 'A kategóriához termék tartozik. Előbb módosítsd a terméket.' });
      if (key === 'colors' && store.products.some(p => p.colorIds.includes(id))) return json(res, 409, { error: 'A színhez termék tartozik. Előbb módosítsd a terméket.' });
      store[key].splice(index, 1); await saveStore(store); return json(res, 200, { ok: true });
    }
  }

  const orderMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch && method === 'PUT') {
    const order = store.orders.find(o => o.id === decodeURIComponent(orderMatch[1]));
    if (!order) return json(res, 404, { error: 'A rendelés nem található.' });
    const allowed = ['new', 'awaiting_payment', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'payment_error'];
    if (!allowed.includes(body.status)) return json(res, 400, { error: 'Érvénytelen állapot.' });
    order.status = body.status; order.updatedAt = now(); await saveStore(store); return json(res, 200, order);
  }

  const customOrderMatch = pathname.match(/^\/api\/admin\/custom-orders\/([^/]+)$/);
  if (customOrderMatch && method === 'PUT') {
    const customOrder = store.customOrders.find(order => order.id === decodeURIComponent(customOrderMatch[1]));
    if (!customOrder) return json(res, 404, { error: 'Az egyedi rendelés nem található.' });
    const allowed = ['new', 'contacted', 'accepted', 'completed', 'declined'];
    if (!allowed.includes(body.status)) return json(res, 400, { error: 'Érvénytelen állapot.' });
    customOrder.status = body.status; customOrder.updatedAt = now(); await saveStore(store);
    return json(res, 200, customOrder);
  }
  return json(res, 404, { error: 'Nincs ilyen végpont.' });
}

function buildRecord(key, body, store, id) {
  const name = cleanText(body.name, 120);
  if (!name) return { error: 'A név kötelező.' };
  if (key === 'categories') return { id, name };
  if (key === 'colors') {
    const hex = /^#[0-9a-f]{6}$/i.test(body.hex || '') ? body.hex : '#cccccc';
    return { id, name, hex };
  }
  const suppliedSizes = Array.isArray(body.sizes) ? body.sizes.slice(0, 12) : [];
  if (!suppliedSizes.length) return { error: 'Adj meg legalább egy méretet és árat.' };
  const sizes = suppliedSizes.map(size => ({
    id: cleanText(size.id, 80) || uid('size-'),
    name: cleanText(size.name, 80),
    price: Math.round(Number(size.price))
  }));
  if (sizes.some(size => !size.name || !Number.isFinite(size.price) || size.price < 0)) return { error: 'Minden mérethez adj meg nevet és érvényes árat.' };
  if (new Set(sizes.map(size => size.name.toLocaleLowerCase('hu'))).size !== sizes.length) return { error: 'A méretnevek legyenek egyediek.' };
  const price = Math.min(...sizes.map(size => size.price));
  const suppliedCategoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [body.categoryId];
  const categoryIds = [...new Set(suppliedCategoryIds.filter(categoryId => store.categories.some(category => category.id === categoryId)))];
  if (!categoryIds.length) return { error: 'Válassz legalább egy kategóriát.' };
  const colorIds = Array.isArray(body.colorIds) ? body.colorIds.filter(cid => store.colors.some(x => x.id === cid)) : [];
  if (!colorIds.length) return { error: 'Válassz legalább egy rendelhető színt.' };
  const images = Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string' && (x.startsWith('data:image/') || x.startsWith('/assets/'))).slice(0, 6) : [];
  return { id, name, description: cleanText(body.description, 1200), price, sizes, categoryId: categoryIds[0], categoryIds, colorIds, images, seasonal: Boolean(body.seasonal), featured: Boolean(body.featured), active: body.active !== false };
}

async function handler(req, res) {
  try {
    const url = new URL(req.url, PUBLIC_URL);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/barion-pixel.js') {
      const pixelId = JSON.stringify(BARION_PIXEL_ID);
      const script = `(() => { const pixelId = ${pixelId}; if (!pixelId) return; const consentKey = 'va_barion_pixel_consent'; const loadPixel = () => { if (window.__vaBarionPixelLoaded) return; window.__vaBarionPixelLoaded = true; window.bp = window.bp || function () { (window.bp.q = window.bp.q || []).push(arguments); }; window.bp.l = 1 * new Date(); const scriptElement = document.createElement('script'); const firstScript = document.getElementsByTagName('script')[0]; scriptElement.async = true; scriptElement.src = 'https://pixel.barion.com/bp.js'; firstScript.parentNode.insertBefore(scriptElement, firstScript); window.barion_pixel_id = pixelId; window.bp('init', 'addBarionPixelId', pixelId); }; const consent = localStorage.getItem(consentKey); if (consent === 'accepted') { loadPixel(); return; } if (consent === 'declined') return; const showNotice = () => { const notice = document.createElement('section'); notice.id = 'barionConsent'; notice.setAttribute('role', 'dialog'); notice.setAttribute('aria-label', 'Süti beállítások'); notice.style.cssText = 'position:fixed;z-index:9999;left:16px;right:16px;bottom:16px;max-width:560px;margin:auto;padding:18px;background:#fff;color:#213329;border:1px solid #d9ded7;box-shadow:0 12px 36px rgba(0,0,0,.18);font:14px/1.5 system-ui,sans-serif'; notice.innerHTML = '<strong>Adatvédelmi beállítások</strong><p style="margin:8px 0 14px">A Barion Pixel fizetési csalások megelőzését segíti. Csak hozzájárulás után töltjük be. Részletek az adatkezelési tájékoztatóban.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-choice="declined">Elutasítom</button><button type="button" data-choice="accepted" style="background:#294c3b;color:#fff;border:1px solid #294c3b;padding:7px 11px">Elfogadom</button></div>'; notice.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => { localStorage.setItem(consentKey, button.dataset.choice); if (button.dataset.choice === 'accepted') loadPixel(); notice.remove(); })); document.body.appendChild(notice); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNotice, { once: true }); else showNotice(); })();`;
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(script);
    }
    if (url.pathname === '/barion-pixel.gif') {
      if (!BARION_PIXEL_ID) { res.writeHead(204); return res.end(); }
      res.writeHead(302, { Location: `https://pixel.barion.com/a.gif?ba_pixel_id=${encodeURIComponent(BARION_PIXEL_ID)}&ev=contentView&noscript=1`, 'Cache-Control': 'no-store' }); return res.end();
    }
    let relative = url.pathname === '/admin' || url.pathname === '/admin/' ? 'admin.html' : ['/egyedi-rendeles', '/egyedi-rendeles/', '/custom-order', '/custom-order/'].includes(url.pathname) ? 'custom-order.html' : url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const file = path.resolve(PUBLIC, relative);
    if (!file.startsWith(path.resolve(PUBLIC)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Az oldal nem található.');
    }
    res.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': /\.(png|svg)$/.test(file) ? 'public, max-age=86400' : 'no-cache' });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, error.status || 500, { error: error.message || 'Szerverhiba.' });
  }
}

const server = http.createServer(handler);

async function startServer() {
  await ensureDatabase();
  server.listen(PORT, () => {
    console.log(`Virág Állomás: ${PUBLIC_URL}`);
    console.log(`Admin: ${PUBLIC_URL}/admin`);
    console.log(dbPool ? 'PostgreSQL adattárolás aktív.' : 'Helyi JSON adattárolás aktív.');
    if (!process.env.BARION_POS_KEY || !process.env.BARION_PAYEE_EMAIL) console.log('Barion nincs konfigurálva; a készpénzes rendelés működik.');
  });
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Az adatbázis vagy a szerver nem indítható:', error);
    process.exit(1);
  });
}

module.exports = handler;
