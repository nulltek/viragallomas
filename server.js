const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'store.json');
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessions = new Map();
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
    orders: []
  };
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
    return result.rows[0].data;
  }
  if (!fs.existsSync(DATA_FILE)) {
    const data = seedStore();
    await saveStore(data);
    return data;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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

function publicCatalog(store) {
  return {
    categories: store.categories,
    colors: store.colors,
    products: store.products.filter(p => p.active !== false)
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

function mime(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function api(req, res, url) {
  const method = req.method;
  const pathname = url.pathname;
  const store = await loadStore();

  if (pathname === '/api/catalog' && method === 'GET') return json(res, 200, publicCatalog(store));
  if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok: true, stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY) });

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
    const payment = body.payment === 'stripe' ? 'stripe' : 'cash';
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 6 || !Array.isArray(body.items) || !body.items.length) return json(res, 400, { error: 'Kérjük, tölts ki minden adatot és ellenőrizd a kosarat.' });
    if (payment === 'stripe' && !process.env.STRIPE_SECRET_KEY) return json(res, 503, { error: 'A Stripe még nincs konfigurálva. Válaszd a helyszíni készpénzes fizetést.' });
    const items = [];
    let total = 0;
    for (const line of body.items.slice(0, 40)) {
      const product = store.products.find(p => p.id === line.productId && p.active !== false);
      const quantity = Math.max(1, Math.min(20, Number(line.quantity) || 1));
      if (!product) return json(res, 400, { error: 'A kosár egyik terméke már nem elérhető.' });
      items.push({ productId: product.id, name: product.name, price: product.price, quantity, image: product.images?.[0] || '' });
      total += product.price * quantity;
    }
    const order = { id: uid('VA-').toUpperCase(), createdAt: now(), updatedAt: now(), status: payment === 'cash' ? 'new' : 'awaiting_payment', payment, pickup: 'Személyes átvétel', customer: { name, email, phone }, note: cleanText(body.note, 600), items, total };
    store.orders.unshift(order);
    await saveStore(store);

    if (payment === 'stripe') {
      const params = {
        mode: 'payment', success_url: `${PUBLIC_URL}/?payment=success&order=${encodeURIComponent(order.id)}`, cancel_url: `${PUBLIC_URL}/?payment=cancelled`, customer_email: email,
        'metadata[order_id]': order.id, 'payment_method_types[0]': 'card'
      };
      items.forEach((item, i) => {
        params[`line_items[${i}][quantity]`] = String(item.quantity);
        params[`line_items[${i}][price_data][currency]`] = 'huf';
        params[`line_items[${i}][price_data][unit_amount]`] = String(item.price);
        params[`line_items[${i}][price_data][product_data][name]`] = item.name;
      });
      try {
        const session = await stripeRequest('/v1/checkout/sessions', params);
        order.stripeSessionId = session.id; await saveStore(store);
        return json(res, 201, { orderId: order.id, checkoutUrl: session.url });
      } catch (error) {
        order.status = 'payment_error'; order.paymentError = error.message; await saveStore(store);
        return json(res, 502, { error: 'A bankkártyás fizetés nem indítható. Próbáld újra vagy válassz készpénzt.', orderId: order.id });
      }
    }
    return json(res, 201, { orderId: order.id });
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
  if (pathname === '/api/admin/data' && method === 'GET') return json(res, 200, { categories: store.categories, colors: store.colors, products: store.products, orders: store.orders, stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY) });
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
      if (key === 'categories' && store.products.some(p => p.categoryId === id)) return json(res, 409, { error: 'A kategóriához termék tartozik. Előbb módosítsd a terméket.' });
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
  const price = Math.round(Number(body.price));
  if (!Number.isFinite(price) || price < 0) return { error: 'Adj meg érvényes árat.' };
  if (!store.categories.some(x => x.id === body.categoryId)) return { error: 'Válassz kategóriát.' };
  const colorIds = Array.isArray(body.colorIds) ? body.colorIds.filter(cid => store.colors.some(x => x.id === cid)) : [];
  const images = Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string' && (x.startsWith('data:image/') || x.startsWith('/assets/'))).slice(0, 6) : [];
  return { id, name, description: cleanText(body.description, 1200), price, categoryId: body.categoryId, colorIds, images, featured: Boolean(body.featured), active: body.active !== false };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, PUBLIC_URL);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let relative = url.pathname === '/admin' || url.pathname === '/admin/' ? 'admin.html' : url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
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
});

async function startServer() {
  await ensureDatabase();
  server.listen(PORT, () => {
    console.log(`Virág Állomás: ${PUBLIC_URL}`);
    console.log(`Admin: ${PUBLIC_URL}/admin`);
    console.log(dbPool ? 'PostgreSQL adattárolás aktív.' : 'Helyi JSON adattárolás aktív.');
    if (!process.env.STRIPE_SECRET_KEY) console.log('Stripe nincs konfigurálva; a készpénzes rendelés működik.');
  });
}

startServer().catch(error => {
  console.error('Az adatbázis vagy a szerver nem indítható:', error);
  process.exit(1);
});
