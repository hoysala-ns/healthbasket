// ─── HEALTH BASKET SHARED LIBRARY ───
// All persistent data stored in Cloudflare D1 via Pages Functions API
// localStorage used only for: cart, telegram config, product cache, rzp key

const API = '/api';

async function apiFetch(path, options = {}) {
  const token    = sessionStorage.getItem('hb_token');
  const adminKey = sessionStorage.getItem('hb_admin_key');
  const headers  = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token)    headers['Authorization'] = 'Bearer ' + token;
  if (adminKey) headers['X-Admin-Key']   = adminKey;
  try {
    const res  = await fetch(API + path, { ...options, headers });
    const data = await res.json();
    return data;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────
function getCurrentCustomer() {
  return JSON.parse(sessionStorage.getItem('hb_current_customer') || 'null');
}
function setCurrentCustomer(c) {
  sessionStorage.setItem('hb_current_customer', JSON.stringify(c));
  sessionStorage.setItem('hb_last_active', Date.now().toString());
}
function logoutCustomer() {
  const token = sessionStorage.getItem('hb_token');
  if (token) apiFetch('/auth?action=logout', { method: 'POST' });
  sessionStorage.removeItem('hb_current_customer');
  sessionStorage.removeItem('hb_token');
  sessionStorage.removeItem('hb_last_active');
}

async function registerCustomer(name, email, phone, password) {
  const r = await apiFetch('/auth?action=register', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, password })
  });
  if (r.ok) { sessionStorage.setItem('hb_token', r.token); setCurrentCustomer(r.customer); }
  return r;
}

async function loginCustomer(identifier, password) {
  const r = await apiFetch('/auth?action=login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
  });
  if (r.ok) { sessionStorage.setItem('hb_token', r.token); setCurrentCustomer(r.customer); }
  return r;
}

async function updateCustomerPassword(email, newPassword) {
  const r = await apiFetch('/auth?action=update-password', {
    method: 'POST', body: JSON.stringify({ email, newPassword })
  });
  return r.ok;
}

async function getCustomerOrders() {
  const r = await apiFetch('/orders');
  return r.ok ? r.orders : [];
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────
async function getProducts() {
  const r = await apiFetch('/products');
  if (r.ok && r.products.length) {
    localStorage.setItem('hb_products_cache', JSON.stringify(r.products));
    return r.products;
  }
  const cached = localStorage.getItem('hb_products_cache');
  return cached ? JSON.parse(cached) : DEFAULT_PRODUCTS;
}
function saveProducts(p) { localStorage.setItem('hb_products_cache', JSON.stringify(p)); }

// ─── ORDERS ──────────────────────────────────────────────────────────────
function getAllOrders() { return JSON.parse(localStorage.getItem('hb_orders') || '[]'); }
function saveAllOrders(o) { localStorage.setItem('hb_orders', JSON.stringify(o)); }

async function saveOrder(order) {
  await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ order }) });
  const orders = getAllOrders(); orders.push(order); saveAllOrders(orders);
  localStorage.setItem('hb_new_order', JSON.stringify(order));
}

async function getOrderById(id) {
  const r = await apiFetch('/orders?id=' + encodeURIComponent(id));
  if (r.ok) return r.order;
  return getAllOrders().find(o => o.id === id) || null;
}

async function updateOrderStatus(id, status) {
  await apiFetch('/orders?id=' + encodeURIComponent(id), {
    method: 'PUT', body: JSON.stringify({ status })
  });
  const orders = getAllOrders();
  const o = orders.find(o => o.id === id);
  if (o) { o.status = status; o.updatedAt = Date.now(); saveAllOrders(orders); }
}

// ─── STATUS HELPERS ───────────────────────────────────────────────────────
const STATUS_STEPS  = ['pending','confirmed','dispatched','out_for_delivery','delivered'];
const STATUS_LABELS = {
  pending:'Order placed', confirmed:'Confirmed', dispatched:'Dispatched',
  out_for_delivery:'Out for delivery', delivered:'Delivered', cancelled:'Cancelled',
};

// ─── RAZORPAY ─────────────────────────────────────────────────────────────
function loadRazorpay(callback) {
  if (window.Razorpay) { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = callback; document.head.appendChild(s);
}
function openRazorpay({amount, orderId, customerName, customerEmail, customerPhone, onSuccess, onFailure}) {
  loadRazorpay(() => {
    const key = localStorage.getItem('hb_rzp_key') || 'rzp_test_YourKeyHere';
    const rzp = new window.Razorpay({
      key, amount: amount * 100, currency: 'INR',
      name: 'Health Basket', description: `Order ${orderId}`,
      prefill: {name: customerName, email: customerEmail, contact: customerPhone},
      theme: {color: '#3A6B4A'},
      handler: r => onSuccess({ razorpay_payment_id: r.razorpay_payment_id }),
      modal: { ondismiss: () => { if(onFailure) onFailure('Payment cancelled'); } }
    });
    rzp.on('payment.failed', e => { if(onFailure) onFailure(e.error.description); });
    rzp.open();
  });
}

// ─── TOAST ────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let t = document.getElementById('hb-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'hb-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#3D2B1F;color:#fff;padding:12px 20px;border-radius:10px;font-size:0.82rem;z-index:9999;transform:translateY(80px);opacity:0;transition:all .3s;max-width:300px;box-shadow:0 8px 32px rgba(61,43,31,.2);border-left:3px solid #3A6B4A;font-family:Jost,sans-serif';
    document.body.appendChild(t);
  }
  const colors = {err:'#C0392B', ok:'#22C55E', info:'#1A5FA8'};
  t.style.borderLeftColor = colors[type] || '#3A6B4A';
  t.textContent = msg;
  t.style.transform = 'translateY(0)'; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.transform='translateY(80px)'; t.style.opacity='0'; }, 3000);
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); }
function fmtCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// ─── DEFAULT PRODUCTS (offline fallback) ──────────────────────────────────
const DEFAULT_PRODUCTS = [
  {id:1,name:"Toor Dal",img:"images/toor-dal.jpg",emoji:"🫘",category:"dals",price:149,originalPrice:179,weight:"1 kg",badge:"organic",desc:"Hand-sorted toor dal. Ideal for everyday dal and sambar.",weights:["500g","1 kg","2 kg","5 kg"],tags:["High protein","Gluten-free"],nutrition:{Protein:"22g",Carbs:"63g",Fibre:"15g",Calories:"341"},inStock:true},
  {id:2,name:"Moong Dal",img:"images/moong-dal.jpg",emoji:"🟢",category:"dals",price:189,originalPrice:219,weight:"1 kg",badge:"organic",desc:"Split green gram. Light on digestion.",weights:["500g","1 kg","2 kg"],tags:["Easy to digest","High protein"],nutrition:{Protein:"24g",Carbs:"60g",Fibre:"16g",Calories:"347"},inStock:true},
  {id:3,name:"Masoor Dal",img:"images/masoor-dal.jpg",emoji:"🔴",category:"dals",price:129,originalPrice:null,weight:"1 kg",badge:"new",desc:"Red lentils that cook quickly.",weights:["500g","1 kg","2 kg","5 kg"],tags:["Iron rich","Quick cook"],nutrition:{Protein:"25g",Carbs:"58g",Fibre:"11g",Calories:"352"},inStock:true},
  {id:4,name:"Chana Dal",img:"images/chana-dal.jpg",emoji:"🟡",category:"dals",price:139,originalPrice:159,weight:"1 kg",badge:"sale",desc:"Split Bengal gram.",weights:["500g","1 kg","2 kg","5 kg"],tags:["Low GI","High fibre"],nutrition:{Protein:"20g",Carbs:"62g",Fibre:"18g",Calories:"364"},inStock:true},
  {id:5,name:"Urad Dal",img:"images/urad-dal.jpg",emoji:"⚪",category:"dals",price:169,originalPrice:199,weight:"1 kg",badge:"organic",desc:"Black gram for idli and dosa.",weights:["500g","1 kg","2 kg"],tags:["Idli & dosa","Stone ground"],nutrition:{Protein:"26g",Carbs:"58g",Fibre:"18g",Calories:"341"},inStock:true},
  {id:6,name:"Red Rice",img:"images/red-rice.jpg",emoji:"🌾",category:"grains",price:120,originalPrice:140,weight:"1 kg",badge:"organic",desc:"Hand-pounded red rice from Karnataka.",weights:["1 kg","2 kg","5 kg"],tags:["Antioxidant rich"],nutrition:{Protein:"7g",Carbs:"76g",Fibre:"3g",Calories:"362"},inStock:true},
  {id:7,name:"Sona Masoori Rice",img:"images/sona-masoori-rice.jpg",emoji:"🍚",category:"grains",price:99,originalPrice:null,weight:"1 kg",badge:null,desc:"Lightweight aromatic rice.",weights:["1 kg","2 kg","5 kg","10 kg"],tags:["Low starch","Aromatic"],nutrition:{Protein:"6g",Carbs:"78g",Fibre:"1g",Calories:"345"},inStock:true},
  {id:8,name:"Foxtail Millet",img:"images/foxtail-millet.jpg",emoji:"🌿",category:"millets",price:110,originalPrice:130,weight:"500g",badge:"new",desc:"Ancient grain from Deccan plateau.",weights:["500g","1 kg","2 kg"],tags:["Gluten-free","Ancient grain"],nutrition:{Protein:"12g",Carbs:"60g",Fibre:"8g",Calories:"351"},inStock:true},
  {id:9,name:"Pearl Millet (Bajra)",img:"images/pearl-millet-bajra.jpg",emoji:"🟤",category:"millets",price:89,originalPrice:null,weight:"1 kg",badge:null,desc:"Bajra for rotis.",weights:["500g","1 kg","2 kg"],tags:["Heart healthy"],nutrition:{Protein:"11g",Carbs:"67g",Fibre:"1g",Calories:"378"},inStock:true},
  {id:10,name:"Finger Millet (Ragi)",img:"images/finger-millet-ragi.jpg",emoji:"🟫",category:"millets",price:95,originalPrice:115,weight:"1 kg",badge:"organic",desc:"Ragi from Karnataka.",weights:["500g","1 kg","2 kg"],tags:["Highest calcium"],nutrition:{Protein:"7g",Carbs:"72g",Fibre:"3g",Calories:"336"},inStock:true},
  {id:11,name:"Turmeric Powder",img:"images/turmeric-powder.jpg",emoji:"🟡",category:"spices",price:79,originalPrice:99,weight:"200g",badge:"organic",desc:"Single-origin turmeric from Erode.",weights:["100g","200g","500g"],tags:["Single origin","3.5% curcumin"],nutrition:{Protein:"9g",Carbs:"65g",Fibre:"21g",Calories:"354"},inStock:true},
  {id:12,name:"Coriander Seeds",img:"images/coriander-seeds.jpg",emoji:"🌰",category:"spices",price:59,originalPrice:null,weight:"200g",badge:null,desc:"Whole coriander seeds.",weights:["100g","200g","500g"],tags:["Sun dried","Whole spice"],nutrition:{Protein:"12g",Carbs:"55g",Fibre:"42g",Calories:"298"},inStock:true},
];

// ─── SESSION MANAGER ─────────────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
const SESSION_WARNING_MS =  2 * 60 * 1000;
const SESSION_CHECK_MS   = 10 * 1000;

const SessionManager = (() => {
  let warningShown = false, countdownInterval = null, checkInterval = null;

  function ensureUI() {
    if (document.getElementById('hb-session-warning')) return;
    const bd = document.createElement('div');
    bd.id = 'hb-session-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0);z-index:10000;pointer-events:none;transition:background .3s;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Jost,sans-serif';
    const card = document.createElement('div');
    card.id = 'hb-session-warning';
    card.style.cssText = 'background:#fff;border-radius:16px;padding:28px;max-width:360px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(61,43,31,.25);text-align:center;display:none';
    card.innerHTML = `<div style="width:56px;height:56px;background:#FBF0DC;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.6rem">⏱</div><div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#3D2B1F;margin-bottom:8px">Still there?</div><div style="font-size:0.8rem;color:#9C7B6A;margin-bottom:6px;line-height:1.6">You will be signed out in</div><div id="hb-session-countdown" style="font-family:'Playfair Display',serif;font-size:2.2rem;color:#C8860A;margin:10px 0 20px">2:00</div><button id="hb-session-stay-btn" style="width:100%;padding:13px;border-radius:30px;border:none;cursor:pointer;font-family:Jost,sans-serif;font-size:0.88rem;font-weight:500;background:#3A6B4A;color:#fff;margin-bottom:10px">Yes, keep me signed in</button><button id="hb-session-logout-btn" style="width:100%;padding:10px;border-radius:30px;border:1.5px solid #E4D9C4;cursor:pointer;font-family:Jost,sans-serif;font-size:0.8rem;background:none;color:#9C7B6A">Sign out now</button>`;
    bd.appendChild(card); document.body.appendChild(bd);
    document.getElementById('hb-session-stay-btn').addEventListener('click', stayActive);
    document.getElementById('hb-session-logout-btn').addEventListener('click', forceLogout);
  }

  function showWarning(s) {
    ensureUI();
    const bd = document.getElementById('hb-session-backdrop');
    const card = document.getElementById('hb-session-warning');
    bd.style.background = 'rgba(0,0,0,0.45)'; bd.style.pointerEvents = 'all';
    card.style.display = 'block'; updateCountdown(s);
  }
  function hideWarning() {
    const bd = document.getElementById('hb-session-backdrop');
    const card = document.getElementById('hb-session-warning');
    if (bd) { bd.style.background = 'rgba(0,0,0,0)'; bd.style.pointerEvents = 'none'; }
    if (card) card.style.display = 'none';
  }
  function updateCountdown(s) {
    const el = document.getElementById('hb-session-countdown');
    if (!el) return;
    el.textContent = `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    el.style.color = s <= 30 ? '#C0392B' : '#C8860A';
  }
  function resetTimer() {
    if (!getCurrentCustomer()) return;
    sessionStorage.setItem('hb_last_active', Date.now().toString());
    if (warningShown) stayActive();
  }
  function stayActive() {
    warningShown = false; clearInterval(countdownInterval); countdownInterval = null;
    hideWarning(); sessionStorage.setItem('hb_last_active', Date.now().toString());
  }
  function forceLogout() {
    clearInterval(countdownInterval); clearInterval(checkInterval);
    hideWarning(); logoutCustomer();
    window.dispatchEvent(new CustomEvent('hb:session-expired'));
  }
  function tick() {
    if (!getCurrentCustomer()) return;
    const idle = Date.now() - parseInt(sessionStorage.getItem('hb_last_active')||'0',10);
    const rem  = SESSION_TIMEOUT_MS - idle;
    if (rem <= 0) { forceLogout(); }
    else if (rem <= SESSION_WARNING_MS && !warningShown) {
      warningShown = true;
      let s = Math.floor(rem/1000);
      showWarning(s);
      countdownInterval = setInterval(() => {
        s--;
        if (s <= 0) { clearInterval(countdownInterval); forceLogout(); }
        else updateCountdown(s);
      }, 1000);
    } else if (rem > SESSION_WARNING_MS && warningShown) { stayActive(); }
  }
  function init() {
    ['mousemove','mousedown','keydown','touchstart','scroll','click']
      .forEach(ev => document.addEventListener(ev, resetTimer, {passive:true}));
    checkInterval = setInterval(tick, SESSION_CHECK_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resetTimer(); });
    window.addEventListener('storage', e => {
      if (e.key === 'hb_current_customer' && !e.newValue) {
        clearInterval(countdownInterval); hideWarning();
        window.dispatchEvent(new CustomEvent('hb:session-expired'));
      }
    });
  }
  return { init, resetTimer, stayActive, forceLogout };
})();
