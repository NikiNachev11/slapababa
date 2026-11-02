// Slapababa Shop — the storefront.
// Products come from products.js, accounts/orders/reviews go through window.DB (db.js).
// Cart, wishlist, compare list and settings are kept in this browser (like most real shops do for guests).

(function () {
  "use strict";

  // ───────────────────────── Helpers ─────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const catById = (id) => CATEGORIES.find((c) => c.id === id);
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fmtDate = (t, opts) => new Date(t).toLocaleDateString("en-GB", opts || { day: "numeric", month: "short", year: "numeric" });
  const tint = (p, pct = 14) => `background: color-mix(in srgb, ${p.colors[0]} ${pct}%, var(--surface-2))`;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  function seeded(seed) {
    let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const ls = {
    get(k, d) { try { const v = localStorage.getItem("slapshop_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("slapshop_" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  // ───────────────────────── Icons (Lucide-style, inline SVG) ─────────────────────────
  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    returns: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    support: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    filter: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    compare: '<path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-2 1 2 2 0 0 1-2-2z"/>',
  };
  const icon = (name, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const starsHtml = (r) => `<span class="stars" aria-label="${r} out of 5">${[1, 2, 3, 4, 5].map((i) => icon("star", i <= Math.round(r) ? "on" : "")).join("")}</span>`;

  // ───────────────────────── Currency ─────────────────────────
  const RATES = { EUR: 1, BGN: 1.95583, USD: 1.08, GBP: 0.85 };
  let currency = ls.get("currency", "EUR");
  if (!RATES[currency]) currency = "EUR";
  const fmtCache = {};
  function money(eur) {
    const f = fmtCache[currency] || (fmtCache[currency] = new Intl.NumberFormat(currency === "BGN" ? "bg-BG" : "en-IE", { style: "currency", currency }));
    return f.format(eur * RATES[currency]);
  }

  // ───────────────────────── Local state ─────────────────────────
  const state = {
    cart: ls.get("cart2", []),
    wish: ls.get("wish", []),
    compare: ls.get("compare", []),
    recent: ls.get("recent", []),
    coupon: ls.get("coupon", null),
    view: ls.get("view", "grid"),
    stock: ls.get("stock", {}), // admin stock overrides (this browser)
  };
  const save = (k) => ls.set(k === "cart" ? "cart2" : k, state[k]);
  for (const [id, n] of Object.entries(state.stock)) { const p = byId(id); if (p) p.stock = n; }

  let user = null;
  const DBX = () => window.DB.backend;

  // ───────────────────────── Toasts ─────────────────────────
  function toast(msg, type = "ok", action) {
    const el = document.createElement("div");
    el.className = "toast " + (type === "err" ? "err" : "");
    el.innerHTML = icon(type === "err" ? "alert" : "check") + `<span>${esc(msg)}</span>` + (action ? `<a href="${action.href}">${esc(action.label)}</a>` : "");
    $("#toasts").appendChild(el);
    while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove();
    setTimeout(() => el.remove(), 3200);
  }

  // ───────────────────────── Product options ─────────────────────────
  const SIZES = ["XS", "S", "M", "L", "XL"];
  const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45"];
  const COLORS = [["Black", "#111827"], ["White", "#f3f4f6"], ["Navy", "#1e3a8a"], ["Red", "#b91c1c"], ["Olive", "#4d7c0f"]];
  function productOptions(p) {
    const o = {};
    if (p.category === "fashion") {
      if (p.tags.includes("shoes")) o.size = SHOE_SIZES;
      else if (!["glasses", "bag", "watch", "belt"].some((t) => p.tags.includes(t))) o.size = SIZES;
      o.color = COLORS;
    } else if (p.category === "sports" && p.tags.includes("shoes")) {
      o.size = SHOE_SIZES; o.color = COLORS.slice(0, 3);
    } else if (["electronics", "sports"].includes(p.category) && p.price > 40) {
      o.color = COLORS.slice(0, 3);
    }
    return o;
  }
  function defaultOpts(p) {
    const o = productOptions(p), d = {};
    if (o.size) d.size = o.size[Math.floor(o.size.length / 2)];
    if (o.color) d.color = o.color[0][0];
    return d;
  }
  const optsText = (opts) => Object.entries(opts || {}).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${esc(v)}`).join(" · ");

  function specsFor(p) {
    const r = seeded(p.id + "spec");
    const base = [["Brand", p.brand], ["Model", p.id.toUpperCase() + "-" + Math.floor(r() * 900 + 100)], ["Category", catById(p.category).name]];
    const extra = {
      electronics: [["Warranty", "2 years"], ["Connectivity", ["Bluetooth 5.3", "Wi-Fi 6", "USB-C"][Math.floor(r() * 3)]], ["Battery", Math.floor(r() * 30 + 8) + " hours"], ["Weight", Math.floor(r() * 900 + 80) + " g"]],
      fashion: [["Material", ["100% cotton", "Recycled polyester", "Genuine leather", "Merino wool"][Math.floor(r() * 4)]], ["Fit", ["Regular", "Slim", "Relaxed"][Math.floor(r() * 3)]], ["Care", "Machine wash 30°C"], ["Made in", ["Portugal", "Italy", "Bulgaria"][Math.floor(r() * 3)]]],
      home: [["Material", ["Stainless steel", "Ceramic", "Cotton", "Glass"][Math.floor(r() * 4)]], ["Dimensions", `${Math.floor(r() * 40 + 10)} × ${Math.floor(r() * 40 + 10)} cm`], ["Dishwasher safe", r() > 0.5 ? "Yes" : "No"], ["Warranty", "2 years"]],
      sports: [["Material", ["Aluminium", "Nylon", "Rubber", "Carbon"][Math.floor(r() * 4)]], ["Level", ["Beginner", "Intermediate", "Pro"][Math.floor(r() * 3)]], ["Weight", (r() * 5 + 0.2).toFixed(1) + " kg"], ["Warranty", "1 year"]],
      toys: [["Age", Math.floor(r() * 8 + 3) + "+"], ["Players", Math.floor(r() * 4 + 1) + "+"], ["Batteries", r() > 0.6 ? "Included" : "Not needed"]],
      books: [["Pages", Math.floor(r() * 400 + 120)], ["Format", "Paperback"], ["Language", "English"], ["Publisher", p.brand]],
      beauty: [["Volume", Math.floor(r() * 200 + 30) + " ml"], ["Skin type", "All"], ["Vegan", r() > 0.4 ? "Yes" : "No"]],
      food: [["Weight", Math.floor(r() * 900 + 100) + " g"], ["Origin", ["Belgium", "Colombia", "Bulgaria", "Greece", "Japan"][Math.floor(r() * 5)]], ["Organic", r() > 0.5 ? "Yes" : "No"]],
      garden: [["Material", ["Plastic", "Wood", "Metal"][Math.floor(r() * 3)]], ["Outdoor use", "Yes"], ["Warranty", "1 year"]],
      auto: [["Fits", "Most cars"], ["Power", "12V"], ["Warranty", "2 years"]],
    }[p.category] || [];
    return base.concat(extra);
  }

  // ───────────────────────── Cart ─────────────────────────
  const FREE_SHIP = 50;
  const SHIPPING = {
    standard: { label: "Standard delivery", eta: "3–5 business days", price: 4.99 },
    express: { label: "Express delivery", eta: "1–2 business days", price: 9.99 },
    pickup: { label: "Click & collect", eta: "Ready tomorrow in store", price: 0 },
  };
  const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);

  function addToCart(id, qty = 1, opts, silent) {
    const p = byId(id); if (!p) return;
    opts = opts || defaultOpts(p);
    const key = id + "|" + JSON.stringify(opts);
    const inCart = state.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
    if (p.stock <= 0) return toast("Sorry, this item is out of stock", "err");
    if (inCart + qty > p.stock) { qty = p.stock - inCart; if (qty <= 0) return toast(`Only ${p.stock} available`, "err"); }
    const line = state.cart.find((l) => l.key === key);
    if (line) line.qty += qty; else state.cart.push({ key, id, qty, opts });
    save("cart"); updateHeader();
    if (!silent) openCart(true);
  }
  function setQty(key, qty) {
    const l = state.cart.find((x) => x.key === key); if (!l) return;
    const p = byId(l.id);
    if (qty <= 0) state.cart = state.cart.filter((x) => x.key !== key);
    else l.qty = Math.min(p.stock, qty);
    save("cart"); updateHeader();
  }

  function totals({ ship = "standard", points = 0, giftWrap = false } = {}) {
    const items = state.cart.map((l) => ({ ...l, p: byId(l.id) })).filter((l) => l.p);
    const subtotal = items.reduce((s, l) => s + l.p.price * l.qty, 0);
    const savings = items.reduce((s, l) => s + ((l.p.oldPrice || l.p.price) - l.p.price) * l.qty, 0);
    let discount = 0, shipping = SHIPPING[ship].price;
    if (ship === "standard" && subtotal >= FREE_SHIP) shipping = 0;
    const c = state.coupon && COUPONS[state.coupon];
    if (c) {
      if (c.type === "percent") discount = +(subtotal * c.value / 100).toFixed(2);
      if (c.type === "fixed") discount = Math.min(subtotal, c.value);
      if (c.type === "shipping") shipping = 0;
    }
    const maxPoints = Math.floor(Math.max(0, subtotal - discount) * 0.5) * 100;
    const usedPoints = Math.min(points, maxPoints);
    const pointsValue = usedPoints / 100;
    const wrap = giftWrap ? 3 : 0;
    if (!items.length) shipping = 0;
    const total = Math.max(0, +(subtotal - discount - pointsValue + shipping + wrap).toFixed(2));
    return { items, subtotal, savings, discount, shipping, wrap, usedPoints, pointsValue, total, count: items.reduce((s, l) => s + l.qty, 0) };
  }

  // ───────────────────────── Wishlist & compare ─────────────────────────
  function toggleWish(id) {
    const on = state.wish.includes(id);
    state.wish = on ? state.wish.filter((x) => x !== id) : [...state.wish, id];
    save("wish"); updateHeader();
    toast(on ? "Removed from wishlist" : "Saved to wishlist", "ok", on ? null : { href: "#/wishlist", label: "View" });
    $$(`[data-wish="${id}"]`).forEach((b) => b.classList.toggle("on", !on));
  }
  function toggleCompare(id) {
    if (state.compare.includes(id)) state.compare = state.compare.filter((x) => x !== id);
    else {
      if (state.compare.length >= 4) return toast("You can compare up to 4 products", "err");
      state.compare.push(id);
    }
    save("compare");
    $$(`[data-compare="${id}"]`).forEach((b) => b.classList.toggle("on", state.compare.includes(id)));
    renderCompareBar();
  }
  function renderCompareBar() {
    const n = state.compare.length;
    const show = n > 0 && route().path !== "/compare";
    $("#compareBar").innerHTML = show ? `<div class="compare-bar no-print">${icon("compare", "ico-sm")} ${n} product${n > 1 ? "s" : ""} to compare <a class="btn btn-sm" href="#/compare">Compare</a><button class="tool" style="width:32px;height:32px" id="clearCompare" aria-label="Clear">${icon("x", "ico-sm")}</button></div>` : "";
    const c = $("#clearCompare");
    if (c) c.onclick = () => { state.compare = []; save("compare"); $$("[data-compare]").forEach((b) => b.classList.remove("on")); renderCompareBar(); };
  }

  // ───────────────────────── Reviews ─────────────────────────
  const NAMES = ["Maria K.", "Georgi P.", "Elena D.", "Ivan S.", "Polq", "Niki", "Alex M.", "Sofia T.", "Dimitar V.", "Anna R.", "Peter G.", "Viktoria N."];
  const TEXTS = {
    5: ["Absolutely love it. Quality is excellent and it arrived quickly.", "Exactly as described. Would buy again without thinking.", "Best purchase I've made this year. Highly recommend.", "Great quality for the price. Packaging was lovely too."],
    4: ["Very good overall, just one small thing I'd change.", "Solid product and great value for money.", "Works well and looks great. Delivery took a day longer.", "Happy with it. The colour is slightly different from the photos."],
    3: ["It's okay and does the job, nothing special.", "Average quality, but fine for the price."],
    2: ["Expected a bit more, to be honest.", "Arrived with a small scratch, but support helped."],
  };
  const TITLES = { 5: ["Perfect", "Love it", "Excellent"], 4: ["Very good", "Great value", "Recommended"], 3: ["Okay", "Decent"], 2: ["Not great", "Could be better"] };
  function fakeReviews(p) {
    const r = seeded(p.id);
    return Array.from({ length: 6 }, () => {
      const rating = Math.max(2, Math.min(5, Math.round(p.rating + (r() - 0.62) * 2)));
      return { name: NAMES[Math.floor(r() * NAMES.length)], rating, title: TITLES[rating][Math.floor(r() * TITLES[rating].length)], text: TEXTS[rating][Math.floor(r() * TEXTS[rating].length)], createdAt: Date.now() - Math.floor(r() * 200 + 3) * 864e5, verified: r() > 0.25 };
    });
  }

  // ───────────────────────── Product card & quick view ─────────────────────────
  const isNew = (p) => p.added >= PRODUCTS.length - 14;
  function card(p) {
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `
    <article class="card">
      <a class="media" href="#/product/${p.id}" style="${tint(p)}" aria-label="${esc(p.name)}">
        <span class="em">${p.emoji}</span>
        <span class="badges">${off ? `<span class="badge sale">−${off}%</span>` : ""}${isNew(p) ? `<span class="badge new">New</span>` : ""}${p.stock === 0 ? `<span class="badge">Sold out</span>` : ""}</span>
      </a>
      <div class="tools">
        <button class="tool ${state.wish.includes(p.id) ? "on" : ""}" data-wish="${p.id}" aria-label="Save to wishlist" title="Wishlist">${icon("heart", "ico-sm")}</button>
        <button class="tool" data-quick="${p.id}" aria-label="Quick view" title="Quick view">${icon("eye", "ico-sm")}</button>
        <button class="tool ${state.compare.includes(p.id) ? "on" : ""}" data-compare="${p.id}" aria-label="Compare" title="Compare">${icon("compare", "ico-sm")}</button>
      </div>
      <button class="btn btn-primary btn-sm quick-add" data-add="${p.id}" ${p.stock ? "" : "disabled"}>${icon("plus", "ico-sm")} Add to cart</button>
      <div class="info">
        <span class="brand">${esc(p.brand)}</span>
        <a class="name" href="#/product/${p.id}">${esc(p.name)}</a>
        <span class="rating">${starsHtml(p.rating)} ${p.rating} <span>(${p.reviews.toLocaleString("en")})</span></span>
        <span class="price ${p.oldPrice ? "sale" : ""}"><span class="now">${money(p.price)}</span>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</span>
        ${p.stock > 0 && p.stock <= 10 ? `<span class="stock-low">Only ${p.stock} left</span>` : ""}
        <p class="desc">${esc(p.description)}</p>
      </div>
    </article>`;
  }

  function openModal(html) {
    $("#modalBox").innerHTML = `<button class="icon-btn modal-close" data-close aria-label="Close">${icon("x")}</button>` + html;
    $("#modal").classList.add("open"); $("#modal").setAttribute("aria-hidden", "false");
    $("#overlay").classList.add("open");
  }
  function closeAll() {
    $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden", "true");
    $("#cartDrawer").classList.remove("open"); $("#menuDrawer").classList.remove("open");
    $("#overlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  function quickView(id) {
    const p = byId(id); const chosen = defaultOpts(p); const o = productOptions(p);
    openModal(`
      <div class="qv">
        <div class="media" style="${tint(p, 18)}">${p.emoji}</div>
        <div class="content">
          <span class="muted small">${esc(p.brand)}</span>
          <h2 style="margin:4px 0 8px">${esc(p.name)}</h2>
          <span class="rating">${starsHtml(p.rating)} ${p.rating} · ${p.reviews.toLocaleString("en")} reviews</span>
          <div class="price ${p.oldPrice ? "sale" : ""}" style="font-size:24px;margin:16px 0"><span class="now">${money(p.price)}</span>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</div>
          <p class="muted">${esc(p.description)}</p>
          ${o.size ? `<div class="opt-label">Size</div><div class="opts">${o.size.map((s) => `<button class="opt ${s === chosen.size ? "on" : ""}" data-qsize="${s}">${s}</button>`).join("")}</div>` : ""}
          ${o.color ? `<div class="opt-label">Colour</div><div class="opts">${o.color.map(([n, c]) => `<button class="swatch ${n === chosen.color ? "on" : ""}" data-qcolor="${n}" title="${n}" style="background:${c}"></button>`).join("")}</div>` : ""}
          <div class="buy"><button class="btn btn-primary btn-lg" id="qvAdd" ${p.stock ? "" : "disabled"}>Add to cart</button></div>
          <a class="link" style="display:inline-block;margin-top:16px" href="#/product/${p.id}">View full details →</a>
        </div>
      </div>`);
    $$("[data-qsize]").forEach((b) => b.onclick = () => { chosen.size = b.dataset.qsize; $$("[data-qsize]").forEach((x) => x.classList.toggle("on", x === b)); });
    $$("[data-qcolor]").forEach((b) => b.onclick = () => { chosen.color = b.dataset.qcolor; $$("[data-qcolor]").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#qvAdd").onclick = () => { closeAll(); addToCart(p.id, 1, { ...chosen }); };
  }

  // ───────────────────────── Mini cart drawer ─────────────────────────
  function openCart(justAdded) {
    renderCartDrawer(justAdded);
    $("#cartDrawer").classList.add("open"); $("#overlay").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function renderCartDrawer(justAdded) {
    const t = totals();
    const left = FREE_SHIP - t.subtotal;
    $("#cartDrawer").innerHTML = `
      <div class="drawer-head"><h3>${justAdded ? "Added to your cart" : "Your cart"} <span class="muted" style="font-weight:500">(${t.count})</span></h3><button class="icon-btn" data-close aria-label="Close">${icon("x")}</button></div>
      ${t.items.length ? `
        <div class="drawer-body">
          <div class="ship-meter" style="margin:12px 0">${left > 0 ? `You're <b>${money(left)}</b> away from free delivery` : `${icon("check", "ico-sm")} You've unlocked <b>free delivery</b>`}<div class="track-bar"><i style="width:${Math.min(100, t.subtotal / FREE_SHIP * 100)}%"></i></div></div>
          ${t.items.map((l) => `
            <div class="line">
              <a href="#/product/${l.id}" class="thumb-sm" style="${tint(l.p)}" data-close>${l.p.emoji}</a>
              <div>
                <a class="name" href="#/product/${l.id}" data-close>${esc(l.p.name)}</a>
                <div class="meta">${optsText(l.opts) || esc(l.p.brand)}</div>
                <div class="qty sm" style="margin-top:8px"><button data-dq="${esc(l.key)}" data-d="-1" aria-label="Less">${icon("minus", "ico-sm")}</button><input value="${l.qty}" readonly aria-label="Quantity"><button data-dq="${esc(l.key)}" data-d="1" aria-label="More">${icon("plus", "ico-sm")}</button></div>
              </div>
              <div style="display:grid;justify-items:end;gap:8px"><b>${money(l.p.price * l.qty)}</b><button class="icon-btn" style="height:32px;min-width:32px" data-dq="${esc(l.key)}" data-d="-999" aria-label="Remove">${icon("trash", "ico-sm")}</button></div>
            </div>`).join("")}
        </div>
        <div class="drawer-foot">
          <div class="row between"><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
          <span class="muted small">Delivery and discounts are calculated at checkout.</span>
          <a class="btn btn-primary btn-lg btn-block" href="#/checkout" data-close>Checkout</a>
          <a class="btn btn-block" href="#/cart" data-close>View cart</a>
        </div>` : `
        <div class="drawer-body"><div class="empty" style="margin-top:20px;border:none">${icon("bag")}<h3>Your cart is empty</h3><p>Find something you love.</p><a class="btn btn-primary" href="#/shop" data-close>Start shopping</a></div></div>`}`;
    $$("#cartDrawer [data-dq]").forEach((b) => b.onclick = () => {
      const l = state.cart.find((x) => x.key === b.dataset.dq);
      setQty(l.key, +b.dataset.d === -999 ? 0 : l.qty + +b.dataset.d);
      renderCartDrawer();
      if (route().path === "/cart") render();
    });
  }

  // ───────────────────────── Header ─────────────────────────
  function updateHeader() {
    const cc = $("#cartCount"); cc.textContent = cartCount() || ""; cc.dataset.n = cartCount();
    const wc = $("#wishCount"); wc.textContent = state.wish.length || ""; wc.dataset.n = state.wish.length;
    $("#accountLabel").textContent = user ? user.name.split(" ")[0] : "Sign in";
    const isDark = document.documentElement.dataset.theme === "dark";
    $("#themeBtn").innerHTML = icon(isDark ? "sun" : "moon");
    renderAccountMenu();
  }

  function renderAccountMenu() {
    $("#accountMenu").innerHTML = user ? `
      <div class="head"><b>${esc(user.name)}</b><div class="muted small">${esc(user.email)}</div></div>
      <a href="#/account">${icon("user", "ico-sm")} My account</a>
      <a href="#/account/orders">${icon("package", "ico-sm")} Orders</a>
      <a href="#/wishlist">${icon("heart", "ico-sm")} Wishlist</a>
      ${user.role === "admin" ? `<a href="#/admin">${icon("chart", "ico-sm")} Admin dashboard</a>` : ""}
      <button data-logout>${icon("logout", "ico-sm")} Sign out</button>` : `
      <div class="head"><b>Welcome</b><div class="muted small">Sign in for orders, points and faster checkout.</div></div>
      <a href="#/login">${icon("user", "ico-sm")} Sign in</a>
      <a href="#/signup">${icon("plus", "ico-sm")} Create account</a>
      <a href="#/track">${icon("package", "ico-sm")} Track an order</a>`;
  }

  function buildChrome() {
    $("#menuBtn").innerHTML = icon("menu");
    $("#searchToggle").innerHTML = icon("search");
    $('[data-icon="search"]').outerHTML = icon("search");
    $("#wishBtn").insertAdjacentHTML("afterbegin", icon("heart"));
    $("#accountBtn").insertAdjacentHTML("afterbegin", icon("user"));
    $("#cartBtn").insertAdjacentHTML("afterbegin", icon("bag"));
    $("#year").textContent = new Date().getFullYear();
    $("#nav").innerHTML = `<a href="#/shop">All products</a><a href="#/deals" class="sale-link">Deals</a><a href="#/shop?sort=new">New in</a>` +
      CATEGORIES.map((c) => `<a href="#/shop?cat=${c.id}">${esc(c.name)}</a>`).join("") + `<a href="#/brands">Brands</a>`;
    $("#menuDrawer").innerHTML = `
      <div class="drawer-head"><a class="logo" href="#/" data-close><span class="logo-mark">S</span>Slapababa</a><button class="icon-btn" data-close aria-label="Close">${icon("x")}</button></div>
      <div class="drawer-body side-nav" style="position:static;display:grid">
        <a href="#/shop" data-close>${icon("store", "ico-sm")} All products</a>
        <a href="#/deals" data-close>${icon("tag", "ico-sm")} Deals</a>
        ${CATEGORIES.map((c) => `<a href="#/shop?cat=${c.id}" data-close><span style="width:20px;text-align:center">${c.emoji}</span> ${esc(c.name)}</a>`).join("")}
        <hr><a href="#/wishlist" data-close>${icon("heart", "ico-sm")} Wishlist</a><a href="#/brands" data-close>Brands</a><a href="#/compare" data-close>Compare</a><a href="#/help" data-close>Help centre</a>
        <button id="menuTheme">${icon("moon", "ico-sm")} Light / dark mode</button>
      </div>`;

    $("#currency").value = currency;
    $("#currency").onchange = (e) => { currency = e.target.value; ls.set("currency", currency); render(); };
    $("#themeBtn").onclick = () => {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = t; ls.set("theme", t); updateHeader();
    };
    $("#cartBtn").onclick = () => openCart();
    $("#menuTheme").onclick = () => $("#themeBtn").click();
    $("#menuBtn").onclick = () => { $("#menuDrawer").classList.add("open"); $("#overlay").classList.add("open"); };
    $("#searchToggle").onclick = () => { $("#search").classList.toggle("open"); $("#searchInput").focus(); };
    $("#accountBtn").onclick = (e) => { e.stopPropagation(); $("#accountMenu").classList.toggle("hidden"); };
    $("#overlay").onclick = closeAll;
    $("#modal").onclick = (e) => { if (e.target.id === "modal") closeAll(); };
    setupSearch();
  }

  // Live search suggestions
  function setupSearch() {
    const input = $("#searchInput"), box = $("#suggest");
    let idx = -1;
    function results(q) {
      q = q.trim().toLowerCase(); if (!q) return null;
      const words = q.split(/\s+/);
      const hit = (s) => words.every((w) => s.toLowerCase().includes(w));
      return {
        products: PRODUCTS.filter((p) => hit(p.name + " " + p.brand + " " + p.tags.join(" "))).slice(0, 5),
        cats: CATEGORIES.filter((c) => hit(c.name)).slice(0, 2),
        brands: [...new Set(PRODUCTS.map((p) => p.brand))].filter((b) => hit(b)).slice(0, 3),
      };
    }
    const show = debounce(() => {
      const r = results(input.value); idx = -1;
      if (!r) { box.classList.add("hidden"); return; }
      const q = encodeURIComponent(input.value.trim());
      box.innerHTML =
        (r.cats.length || r.brands.length ? `<div class="title">Categories & brands</div>` +
          r.cats.map((c) => `<a href="#/shop?cat=${c.id}"><span class="thumb-xs" style="background:var(--surface-2)">${c.emoji}</span>${esc(c.name)}</a>`).join("") +
          r.brands.map((b) => `<a href="#/shop?brand=${encodeURIComponent(b)}"><span class="thumb-xs" style="background:var(--surface-2);font-size:14px;font-weight:800">${esc(b[0])}</span>${esc(b)}</a>`).join("") : "") +
        (r.products.length ? `<div class="title">Products</div>` + r.products.map((p) => `<a href="#/product/${p.id}"><span class="thumb-xs" style="${tint(p)}">${p.emoji}</span><span class="grow">${esc(p.name)}<div class="muted small">${esc(p.brand)}</div></span><b class="small">${money(p.price)}</b></a>`).join("") : `<div class="title">No products found</div>`) +
        `<a class="all" href="#/shop?q=${q}">See all results for “${esc(input.value.trim())}”</a>`;
      box.classList.remove("hidden");
    }, 120);
    input.addEventListener("input", show);
    input.addEventListener("focus", show);
    input.addEventListener("keydown", (e) => {
      const links = $$("a", box);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle("active", i === idx));
      } else if (e.key === "Enter") {
        e.preventDefault();
        location.hash = idx >= 0 && links[idx] ? links[idx].getAttribute("href") : "#/shop?q=" + encodeURIComponent(input.value.trim());
        box.classList.add("hidden"); input.blur(); $("#search").classList.remove("open");
      } else if (e.key === "Escape") { box.classList.add("hidden"); input.blur(); }
    });
    box.addEventListener("click", () => { box.classList.add("hidden"); $("#search").classList.remove("open"); });
    document.addEventListener("click", (e) => { if (!e.target.closest("#search")) box.classList.add("hidden"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
      if (e.key === "Escape") closeAll();
    });
  }

  // Global click handling for buttons that appear everywhere
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest("#accountDd")) $("#accountMenu").classList.add("hidden");
    else if (t.closest("#accountMenu a, #accountMenu button")) $("#accountMenu").classList.add("hidden");
    let b;
    if ((b = t.closest("[data-add]"))) { e.preventDefault(); addToCart(b.dataset.add); }
    else if ((b = t.closest("[data-wish]"))) { e.preventDefault(); toggleWish(b.dataset.wish); if (route().path === "/wishlist") render(); }
    else if ((b = t.closest("[data-quick]"))) { e.preventDefault(); quickView(b.dataset.quick); }
    else if ((b = t.closest("[data-compare]"))) { e.preventDefault(); toggleCompare(b.dataset.compare); }
    else if (t.closest("[data-logout]")) { e.preventDefault(); signOut(); }
    if (t.closest("[data-close]")) closeAll();
  });

  async function signOut() {
    await DBX().logOut();
    toast("You've been signed out");
    location.hash = "#/";
  }

  // ───────────────────────── Router ─────────────────────────
  function route() {
    const h = location.hash.slice(1) || "/";
    const i = h.indexOf("?");
    return { path: (i < 0 ? h : h.slice(0, i)) || "/", params: new URLSearchParams(i < 0 ? "" : h.slice(i + 1)) };
  }
  const ROUTES = [
    [/^\/$/, viewHome],
    [/^\/shop$/, () => viewShop(false)],
    [/^\/deals$/, () => viewShop(true)],
    [/^\/brands$/, viewBrands],
    [/^\/product\/(\w+)$/, viewProduct],
    [/^\/cart$/, viewCart],
    [/^\/checkout$/, viewCheckout],
    [/^\/order\/([\w-]+)$/, viewOrderDone],
    [/^\/invoice\/([\w-]+)$/, viewInvoice],
    [/^\/track$/, viewTrack],
    [/^\/login$/, () => viewAuth("login")],
    [/^\/signup$/, () => viewAuth("signup")],
    [/^\/forgot$/, () => viewAuth("forgot")],
    [/^\/account$/, () => viewAccount("overview")],
    [/^\/account\/(orders|addresses|profile|security)$/, (t) => viewAccount(t)],
    [/^\/wishlist$/, viewWishlist],
    [/^\/compare$/, viewCompare],
    [/^\/admin$/, () => viewAdmin("overview")],
    [/^\/admin\/(orders|customers|products)$/, (t) => viewAdmin(t)],
    [/^\/help$/, viewHelp],
    [/^\/contact$/, viewContact],
    [/^\/about$/, viewAbout],
    [/^\/gift-cards$/, viewGiftCards],
    [/^\/terms$/, () => viewLegal("terms")],
    [/^\/privacy$/, () => viewLegal("privacy")],
  ];
  let timers = [];
  let renderId = 0;
  async function render() {
    const id = ++renderId;
    timers.forEach(clearInterval); timers = [];
    const { path } = route();
    const hit = ROUTES.find(([re]) => re.test(path));
    try {
      if (hit) await hit[1](...path.match(hit[0]).slice(1), id);
      else view404();
    } catch (err) {
      console.error(err);
      if (id === renderId) app.innerHTML = `<div class="empty">${icon("alert")}<h2>Something went wrong</h2><p>${esc(err.message)}</p><a class="btn btn-primary" href="#/">Go home</a></div>`;
    }
    $$("#nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === location.hash));
    if (!/^\/shop|^\/deals/.test(path)) $("#searchInput").value = "";
    updateHeader(); renderCompareBar();
  }
  const stale = (id) => id !== renderId;
  window.addEventListener("hashchange", () => { closeAll(); render().then(() => window.scrollTo(0, 0)); });
  const title = (t) => { document.title = t ? `${t} | Slapababa` : "Slapababa — Everything you love, delivered"; };
  const crumbs = (...parts) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a>${parts.map(([l, h]) => icon("right") + (h ? `<a href="${h}">${esc(l)}</a>` : `<span>${esc(l)}</span>`)).join("")}</nav>`;
  const loading = () => { app.innerHTML = `<div class="processing"><div class="spinner"></div></div>`; };

  // ───────────────────────── Home ─────────────────────────
  function viewHome() {
    title("");
    const deals = PRODUCTS.filter((p) => p.oldPrice).sort((a, b) => (1 - b.price / b.oldPrice) - (1 - a.price / a.oldPrice)).slice(0, 8);
    const best = [...PRODUCTS].sort((a, b) => b.rating * Math.log(b.reviews) - a.rating * Math.log(a.reviews)).slice(0, 8);
    const fresh = [...PRODUCTS].sort((a, b) => b.added - a.added).slice(0, 8);
    const recent = state.recent.map(byId).filter(Boolean);
    const heroPicks = ["p1", "p15", "p43", "p23"].map(byId).filter(Boolean);
    const brands = [...new Set(PRODUCTS.map((p) => p.brand))];

    app.innerHTML = `
      <section class="hero">
        <div>
          <span class="eyebrow">${icon("zap", "ico-sm")} Autumn sale · up to 30% off</span>
          <h1>Everything you love, delivered.</h1>
          <p>Shop ${PRODUCTS.length}+ hand-picked products from ${brands.length} brands. Free delivery over ${money(FREE_SHIP)} and free 30-day returns.</p>
          <div class="row wrap" style="gap:12px">
            <a class="btn btn-primary btn-lg" href="#/shop">Shop now ${icon("arrow", "ico-sm")}</a>
            <a class="btn btn-lg" href="#/deals">View deals</a>
          </div>
          <div class="hero-stats">
            <div><b>4.7/5</b><span>Average rating</span></div>
            <div><b>${PRODUCTS.reduce((s, p) => s + p.reviews, 0).toLocaleString("en")}</b><span>Customer reviews</span></div>
            <div><b>24h</b><span>Dispatch</span></div>
          </div>
        </div>
        <div class="hero-visual">
          ${heroPicks.map((p) => `<a class="hero-tile" href="#/product/${p.id}" style="${tint(p, 22)}">${p.emoji}<span class="price-tag">${money(p.price)}</span></a>`).join("")}
        </div>
      </section>

      <section class="trust">
        <div>${icon("truck")}<div><b>Free delivery</b><span>On orders over ${money(FREE_SHIP)}</span></div></div>
        <div>${icon("returns")}<div><b>30-day returns</b><span>Change your mind for free</span></div></div>
        <div>${icon("shield")}<div><b>Secure checkout</b><span>Your details stay safe</span></div></div>
        <div>${icon("support")}<div><b>Help when you need it</b><span>Support 7 days a week</span></div></div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Shop by category</h2><p>Find exactly what you're looking for.</p></div><a class="see-all" href="#/shop">All products ${icon("arrow", "ico-sm")}</a></div>
        <div class="cats">${CATEGORIES.map((c) => `<a class="cat" href="#/shop?cat=${c.id}"><span class="cat-ico" style="background:color-mix(in srgb, ${c.colors[0]} 14%, var(--surface-2))">${c.emoji}</span><span><b>${esc(c.name)}</b><span>${PRODUCTS.filter((p) => p.category === c.id).length} products</span></span></a>`).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Today's deals</h2><p class="timer">Ends in <b id="countdown">--:--:--</b></p></div><a class="see-all" href="#/deals">All deals ${icon("arrow", "ico-sm")}</a></div>
        <div class="grid">${deals.map(card).join("")}</div>
      </section>

      <section class="section promo-grid">
        <div class="promo dark"><div><h3>New-season tech</h3><p>Headphones, phones and laptops from Voltra, Nexon and Pixelia.</p><a class="btn" href="#/shop?cat=electronics">Shop electronics</a></div><span class="big">🎧</span></div>
        <div class="promo" style="background:color-mix(in srgb, #f59e0b 16%, var(--surface-2))"><div><h3>Cosy home edit</h3><p>Blankets, candles and kitchen favourites for colder days.</p><a class="btn btn-primary" href="#/shop?cat=home">Shop home</a></div><span class="big">🕯️</span></div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Best sellers</h2><p>Our customers' favourites right now.</p></div><a class="see-all" href="#/shop?sort=rating">See more ${icon("arrow", "ico-sm")}</a></div>
        <div class="grid">${best.map(card).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Shop by brand</h2><a class="see-all" href="#/brands">All brands ${icon("arrow", "ico-sm")}</a></div>
        <div class="brands">${brands.map((b) => `<a href="#/shop?brand=${encodeURIComponent(b)}">${esc(b)}</a>`).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>New arrivals</h2><p>Just landed in store.</p></div><a class="see-all" href="#/shop?sort=new">See more ${icon("arrow", "ico-sm")}</a></div>
        <div class="hscroll">${fresh.map(card).join("")}</div>
      </section>

      ${recent.length ? `<section class="section"><div class="section-head"><h2>Recently viewed</h2></div><div class="hscroll">${recent.map(card).join("")}</div></section>` : ""}

      <section class="section newsletter">
        <div><h2>Get 15% off your first order</h2><p class="muted" style="margin:0">Join the newsletter for early access to sales and new arrivals.</p></div>
        <form id="newsForm"><input type="email" required placeholder="Enter your email" aria-label="Email"><button class="btn btn-primary btn-lg">Subscribe</button></form>
      </section>`;

    const cd = $("#countdown");
    const tick = () => { const n = new Date(), e = new Date(n); e.setHours(24, 0, 0, 0); const s = Math.floor((e - n) / 1000); cd.textContent = [s / 3600, (s / 60) % 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, "0")).join(":"); };
    tick(); timers.push(setInterval(tick, 1000));
    $("#newsForm").onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast("You're subscribed. Your code is WELCOME15"); };
  }

  // ───────────────────────── Shop / catalogue ─────────────────────────
  const PAGE = 16;
  const SORTS = [["popular", "Most popular"], ["rating", "Best rated"], ["new", "Newest"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["discount", "Biggest discount"], ["name", "Name A–Z"]];
  const SORTERS = {
    popular: (a, b) => b.reviews - a.reviews,
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    new: (a, b) => b.added - a.added,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => (1 - b.price / (b.oldPrice || b.price)) - (1 - a.price / (a.oldPrice || a.price)),
    name: (a, b) => a.name.localeCompare(b.name),
  };

  function viewShop(dealsOnly) {
    const { params, path } = route();
    const q = (params.get("q") || "").trim();
    const cats = (params.get("cat") || "").split(",").filter(Boolean);
    const brandsSel = (params.get("brand") || "").split(",").filter(Boolean);
    const sort = SORTERS[params.get("sort")] ? params.get("sort") : "popular";
    const min = parseFloat(params.get("min")) || 0;
    const max = parseFloat(params.get("max")) || 0;
    const minRating = parseFloat(params.get("rating")) || 0;
    const inStock = params.get("stock") === "1";
    const sale = dealsOnly || params.get("sale") === "1";
    const page = Math.max(1, parseInt(params.get("page")) || 1);

    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const base = PRODUCTS.filter((p) => {
      if (words.length) { const hay = (p.name + " " + p.brand + " " + p.tags.join(" ") + " " + p.description + " " + catById(p.category).name).toLowerCase(); if (!words.every((w) => hay.includes(w))) return false; }
      if (min && p.price < min) return false;
      if (max && p.price > max) return false;
      if (p.rating < minRating) return false;
      if (inStock && p.stock <= 0) return false;
      if (sale && !p.oldPrice) return false;
      return true;
    });
    const list = base.filter((p) => (!cats.length || cats.includes(p.category)) && (!brandsSel.length || brandsSel.includes(p.brand))).sort(SORTERS[sort]);
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    const shown = list.slice((page - 1) * PAGE, page * PAGE);
    const brandNames = [...new Set(PRODUCTS.filter((p) => !cats.length || cats.includes(p.category)).map((p) => p.brand))].sort();

    let heading = dealsOnly ? "Deals" : "All products";
    if (cats.length === 1) heading = catById(cats[0])?.name || heading;
    if (brandsSel.length === 1) heading = brandsSel[0];
    if (q) heading = `Results for “${q}”`;
    title(heading);
    $("#searchInput").value = q;

    const chips = [
      ...cats.map((c) => ["cat", c, catById(c)?.name]),
      ...brandsSel.map((b) => ["brand", b, b]),
      ...(min ? [["min", "", "From " + money(min)]] : []),
      ...(max ? [["max", "", "Up to " + money(max)]] : []),
      ...(minRating ? [["rating", "", minRating + "★ & up"]] : []),
      ...(inStock ? [["stock", "", "In stock"]] : []),
      ...(!dealsOnly && sale ? [["sale", "", "On sale"]] : []),
      ...(q ? [["q", "", `“${q}”`]] : []),
    ];

    app.innerHTML = `
      ${crumbs([dealsOnly ? "Deals" : "Shop", dealsOnly ? null : "#/shop"], ...(cats.length === 1 ? [[catById(cats[0])?.name]] : []))}
      <div class="shop">
        <aside class="filters" id="filters">
          <div class="row between" style="margin-bottom:12px"><h3 style="margin:0">Filters</h3><button class="icon-btn filters-btn" id="closeFilters" aria-label="Close">${icon("x")}</button></div>
          <div class="fgroup"><h4>Category</h4>
            ${CATEGORIES.map((c) => `<label class="check"><input type="checkbox" data-f="cat" value="${c.id}" ${cats.includes(c.id) ? "checked" : ""}> ${esc(c.name)}<span class="n">${base.filter((p) => p.category === c.id).length}</span></label>`).join("")}
          </div>
          <div class="fgroup"><h4>Brand</h4>
            ${brandNames.map((b) => `<label class="check"><input type="checkbox" data-f="brand" value="${esc(b)}" ${brandsSel.includes(b) ? "checked" : ""}> ${esc(b)}<span class="n">${base.filter((p) => p.brand === b && (!cats.length || cats.includes(p.category))).length}</span></label>`).join("")}
          </div>
          <div class="fgroup"><h4>Price (€)</h4>
            <div class="price-range"><input type="number" min="0" placeholder="Min" id="fMin" value="${min || ""}" aria-label="Minimum price"><span class="muted">–</span><input type="number" min="0" placeholder="Max" id="fMax" value="${max || ""}" aria-label="Maximum price"></div>
            <button class="btn btn-sm btn-block" style="margin-top:10px" id="fPrice">Apply price</button>
          </div>
          <div class="fgroup"><h4>Rating</h4>
            ${[4.5, 4, 3.5].map((r) => `<label class="check"><input type="radio" name="rating" data-f="rating" value="${r}" ${minRating === r ? "checked" : ""}> ${starsHtml(r)} <span class="small">${r} & up</span></label>`).join("")}
            <label class="check"><input type="radio" name="rating" data-f="rating" value="" ${!minRating ? "checked" : ""}> Any rating</label>
          </div>
          <div class="fgroup"><h4>Availability</h4>
            <label class="check"><input type="checkbox" data-f="stock" ${inStock ? "checked" : ""}> In stock only</label>
            ${dealsOnly ? "" : `<label class="check"><input type="checkbox" data-f="sale" ${sale ? "checked" : ""}> On sale</label>`}
          </div>
          <div class="fgroup filters-btn" style="display:none"></div>
          <button class="btn btn-primary btn-block filters-btn" id="doneFilters" style="margin-top:16px">Show ${list.length} results</button>
        </aside>
        <section>
          <div class="toolbar">
            <div><h1 style="margin:0">${esc(heading)}</h1><span class="muted small">${list.length} product${list.length === 1 ? "" : "s"}</span></div>
            <div class="row">
              <button class="btn btn-sm filters-btn" id="openFilters">${icon("filter", "ico-sm")} Filters</button>
              <select id="sort" aria-label="Sort by">${SORTS.map(([v, l]) => `<option value="${v}" ${v === sort ? "selected" : ""}>${l}</option>`).join("")}</select>
              <div class="view-toggle"><button data-view="grid" class="${state.view === "grid" ? "on" : ""}" aria-label="Grid view">${icon("grid", "ico-sm")}</button><button data-view="list" class="${state.view === "list" ? "on" : ""}" aria-label="List view">${icon("list", "ico-sm")}</button></div>
            </div>
          </div>
          ${chips.length ? `<div class="chips">${chips.map(([k, v, l]) => `<button class="chip" data-chip="${k}" data-v="${esc(v)}">${esc(l)} ${icon("x", "ico-sm")}</button>`).join("")}<a class="chip" href="#${path}">Clear all</a></div>` : ""}
          ${shown.length ? `<div class="grid cols-3 ${state.view === "list" ? "list" : ""}">${shown.map(card).join("")}</div>` :
            `<div class="empty">${icon("search")}<h3>No products match</h3><p>Try removing a filter or searching for something else.</p><a class="btn btn-primary" href="#${path}">Clear filters</a></div>`}
          ${pages > 1 ? `<div class="pager">
            <button data-page="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="Previous">${icon("left", "ico-sm")}</button>
            ${Array.from({ length: pages }, (_, i) => `<button data-page="${i + 1}" class="${i + 1 === page ? "on" : ""}">${i + 1}</button>`).join("")}
            <button data-page="${page + 1}" ${page === pages ? "disabled" : ""} aria-label="Next">${icon("right", "ico-sm")}</button></div>` : ""}
        </section>
      </div>`;

    const go = (changes) => {
      const p = new URLSearchParams(route().params);
      for (const [k, v] of Object.entries(changes)) { if (!v) p.delete(k); else p.set(k, v); }
      if (!("page" in changes)) p.delete("page");
      const s = p.toString();
      location.hash = "#" + path + (s ? "?" + s : "");
    };
    $("#sort").onchange = (e) => go({ sort: e.target.value });
    $$("[data-view]").forEach((b) => b.onclick = () => { state.view = b.dataset.view; save("view"); render(); });
    $$("[data-page]").forEach((b) => b.onclick = () => go({ page: b.dataset.page }));
    $$("#filters [data-f]").forEach((i) => i.onchange = () => {
      const f = i.dataset.f;
      if (f === "cat" || f === "brand") go({ [f]: $$(`#filters [data-f="${f}"]:checked`).map((x) => x.value).join(","), ...(f === "cat" ? { brand: "" } : {}) });
      else if (f === "rating") go({ rating: i.value });
      else go({ [f]: i.checked ? "1" : "" });
    });
    $("#fPrice").onclick = () => go({ min: $("#fMin").value, max: $("#fMax").value });
    $$("[data-chip]").forEach((b) => b.onclick = () => {
      const k = b.dataset.chip, v = b.dataset.v;
      if (k === "cat" || k === "brand") go({ [k]: (k === "cat" ? cats : brandsSel).filter((x) => x !== v).join(",") });
      else go({ [k]: "" });
    });
    $("#openFilters").onclick = () => $("#filters").classList.add("open");
    $("#closeFilters").onclick = $("#doneFilters").onclick = () => $("#filters").classList.remove("open");
  }

  function viewBrands() {
    title("Brands");
    const brands = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
    app.innerHTML = `${crumbs(["Brands"])}<h1>Our brands</h1><p class="muted">${brands.length} brands across ${CATEGORIES.length} categories.</p>
      <div class="cats" style="margin-top:24px">${brands.map((b) => { const ps = PRODUCTS.filter((p) => p.brand === b); return `<a class="cat" href="#/shop?brand=${encodeURIComponent(b)}"><span class="cat-ico" style="${tint(ps[0], 16)};font-weight:800;font-size:20px">${esc(b[0])}</span><span><b>${esc(b)}</b><span>${ps.length} products · ${esc(catById(ps[0].category).name)}</span></span></a>`; }).join("")}</div>`;
  }

  // ───────────────────────── Product page ─────────────────────────
  async function viewProduct(id, rid) {
    rid = renderId;
    const p = byId(id);
    if (!p) return view404();
    title(p.name);
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 12); save("recent");
    const cat = catById(p.category), opts = productOptions(p), chosen = defaultOpts(p);
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).sort((a, b) => b.rating - a.rating).slice(0, 8);
    const bundleWith = PRODUCTS.filter((x) => x.category !== p.category && x.price < p.price * 1.2).sort((a, b) => seeded(p.id + b.id)() - seeded(p.id + a.id)())[0] || related[0];
    const bundlePrice = +((p.price + bundleWith.price) * 0.9).toFixed(2);
    const deliver = new Date(Date.now() + 3 * 864e5);
    const angles = [0, 1, 2, 3];

    app.innerHTML = `
      ${crumbs(["Shop", "#/shop"], [cat.name, "#/shop?cat=" + cat.id], [p.name])}
      <div class="pdp">
        <div class="gallery">
          <div class="thumbs">${angles.map((a) => `<button data-angle="${a}" class="${a === 0 ? "on" : ""}" style="${tint(p, 10 + a * 6)}" aria-label="Image ${a + 1}"><span style="transform:rotate(${a * 12 - 12}deg)">${p.emoji}</span></button>`).join("")}</div>
          <div class="main" id="mainImg" style="${tint(p, 14)}"><span class="em">${p.emoji}</span>${off ? `<span class="badges"><span class="badge sale">−${off}%</span></span>` : ""}</div>
        </div>
        <div class="pdp-info">
          <a class="brand-link" href="#/shop?brand=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a>
          <h1>${esc(p.name)}</h1>
          <a href="#reviews" class="rating" id="toReviews">${starsHtml(p.rating)} <b style="color:var(--text)">${p.rating}</b> · <span style="text-decoration:underline">${p.reviews.toLocaleString("en")} reviews</span></a>
          <div class="price ${p.oldPrice ? "sale" : ""}"><span class="now">${money(p.price)}</span>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</div>
          ${p.oldPrice ? `<span class="save">You save ${money(p.oldPrice - p.price)} (${off}%)</span>` : `<span class="muted small">Price includes VAT</span>`}
          <p style="margin-top:18px;color:var(--text-2)">${esc(p.description)}</p>
          ${opts.color ? `<div class="opt-label"><span>Colour: <span class="muted" id="colorName">${chosen.color}</span></span></div><div class="opts">${opts.color.map(([n, c]) => `<button class="swatch ${n === chosen.color ? "on" : ""}" data-color="${n}" title="${n}" aria-label="${n}" style="background:${c}"></button>`).join("")}</div>` : ""}
          ${opts.size ? `<div class="opt-label"><span>Size</span><button class="link small" id="sizeGuide">Size guide</button></div><div class="opts">${opts.size.map((s) => `<button class="opt ${s === chosen.size ? "on" : ""}" data-size="${s}">${s}</button>`).join("")}</div>` : ""}
          <div class="buy">
            <div class="qty"><button id="qm" aria-label="Less">${icon("minus", "ico-sm")}</button><input id="qi" type="number" value="1" min="1" max="${p.stock}" aria-label="Quantity"><button id="qp" aria-label="More">${icon("plus", "ico-sm")}</button></div>
            <button class="btn btn-primary btn-lg" id="add" ${p.stock ? "" : "disabled"}>${p.stock ? "Add to cart" : "Out of stock"}</button>
            <button class="btn btn-lg ${state.wish.includes(p.id) ? "on" : ""}" data-wish="${p.id}" aria-label="Wishlist" style="padding:0 16px">${icon("heart")}</button>
          </div>
          <button class="btn btn-accent btn-lg btn-block" id="buyNow" style="margin-top:10px" ${p.stock ? "" : "disabled"}>${icon("zap", "ico-sm")} Buy it now</button>
          <div class="row wrap" style="margin-top:14px;gap:16px">
            <button class="link small" id="share">${icon("link", "ico-sm")}</button>
            <button class="link small" data-compare="${p.id}">${state.compare.includes(p.id) ? "✓ In compare list" : "+ Add to compare"}</button>
          </div>
          <div class="perks">
            <div>${icon("truck")}<div><b>${p.stock ? `Get it by ${fmtDate(deliver, { weekday: "long", day: "numeric", month: "long" })}` : "Currently unavailable"}</b><span>${p.price >= FREE_SHIP ? "Free standard delivery" : `Free delivery on orders over ${money(FREE_SHIP)}`}</span></div></div>
            <div>${icon("package")}<div><b>${p.stock > 10 ? "In stock" : p.stock > 0 ? `Low stock: only ${p.stock} left` : "Out of stock"}</b><span>Ships from our warehouse within 24 hours</span></div></div>
            <div>${icon("returns")}<div><b>Free 30-day returns</b><span>Not right? Send it back for free</span></div></div>
          </div>
          <div class="accordion" style="margin-top:12px">
            <details open><summary>Details ${icon("down", "ico-sm")}</summary><div class="body"><table class="specs">${specsFor(p).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table></div></details>
            <details><summary>Delivery & returns ${icon("down", "ico-sm")}</summary><div class="body"><p>Standard delivery ${money(4.99)} (free over ${money(FREE_SHIP)}), 3–5 business days. Express ${money(9.99)}, 1–2 days. Click & collect is always free.</p><p style="margin:0">Return any unused item within 30 days for a full refund.</p></div></details>
            <details><summary>Warranty ${icon("down", "ico-sm")}</summary><div class="body">Covered by a 2-year manufacturer warranty from ${esc(p.brand)}.</div></details>
          </div>
        </div>
      </div>

      <section class="section">
        <h2>Frequently bought together</h2>
        <div class="panel bundle">
          <div class="item"><span class="thumb-sm" style="${tint(p)}">${p.emoji}</span><div><b class="small">${esc(p.name)}</b><div class="small muted">${money(p.price)}</div></div></div>
          <span class="plus">+</span>
          <a class="item" href="#/product/${bundleWith.id}"><span class="thumb-sm" style="${tint(bundleWith)}">${bundleWith.emoji}</span><div><b class="small">${esc(bundleWith.name)}</b><div class="small muted">${money(bundleWith.price)}</div></div></a>
          <div style="margin-left:auto;text-align:right"><div class="muted small">Total for both</div><div class="price sale" style="justify-content:flex-end"><span class="now">${money(bundlePrice)}</span><del>${money(p.price + bundleWith.price)}</del></div><button class="btn btn-primary btn-sm" id="bundle" style="margin-top:8px">Add both to cart</button></div>
        </div>
      </section>

      <section class="section" id="reviews">
        <h2>Customer reviews</h2>
        <div class="reviews"><div id="revSummary"></div><div id="revList"><div class="spinner"></div></div></div>
      </section>

      <section class="section">
        <div class="section-head"><h2>You may also like</h2><a class="see-all" href="#/shop?cat=${cat.id}">More in ${esc(cat.name)} ${icon("arrow", "ico-sm")}</a></div>
        <div class="hscroll">${related.map(card).join("")}</div>
      </section>`;

    $("#share").insertAdjacentText("beforeend", " Copy link");
    $$("[data-angle]").forEach((b) => b.onclick = () => {
      $$("[data-angle]").forEach((x) => x.classList.toggle("on", x === b));
      $("#mainImg").style.cssText = tint(p, 10 + b.dataset.angle * 6);
      $("#mainImg .em").style.transform = `rotate(${b.dataset.angle * 12 - 12}deg)`;
    });
    $("#mainImg").onclick = () => $("#mainImg").classList.toggle("zoom");
    $$("[data-size]").forEach((b) => b.onclick = () => { chosen.size = b.dataset.size; $$("[data-size]").forEach((x) => x.classList.toggle("on", x === b)); });
    $$("[data-color]").forEach((b) => b.onclick = () => { chosen.color = b.dataset.color; $("#colorName").textContent = chosen.color; $$("[data-color]").forEach((x) => x.classList.toggle("on", x === b)); });
    const qi = $("#qi"); const clamp = () => { qi.value = Math.max(1, Math.min(p.stock || 1, parseInt(qi.value) || 1)); };
    $("#qm").onclick = () => { qi.value--; clamp(); }; $("#qp").onclick = () => { qi.value++; clamp(); }; qi.onchange = clamp;
    $("#add").onclick = () => addToCart(p.id, +qi.value, { ...chosen });
    $("#buyNow").onclick = () => { addToCart(p.id, +qi.value, { ...chosen }, true); location.hash = "#/checkout"; };
    $("#bundle").onclick = () => { addToCart(p.id, 1, { ...chosen }, true); addToCart(bundleWith.id, 1, null, true); state.coupon = state.coupon || null; openCart(true); };
    $("#share").onclick = () => { navigator.clipboard?.writeText(location.href).then(() => toast("Link copied"), () => toast("Couldn't copy the link", "err")); };
    $("#toReviews").onclick = (e) => { e.preventDefault(); $("#reviews").scrollIntoView({ behavior: "smooth" }); };
    const sg = $("#sizeGuide");
    if (sg) sg.onclick = () => openModal(`<div style="padding:32px"><h2>Size guide</h2><table class="specs"><tr><td>Size</td><td>Chest (cm)</td><td>Waist (cm)</td></tr>${["XS 82–87 68–73", "S 88–93 74–79", "M 94–99 80–85", "L 100–105 86–91", "XL 106–111 92–97"].map((r) => `<tr>${r.split(" ").map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table><p class="muted small" style="margin-top:12px">Shoes use EU sizes.</p></div>`);

    await renderReviews(p, rid);
    if (!stale(rid) && route().params.get("review")) $("#reviews").scrollIntoView({ behavior: "smooth" });
  }

  async function renderReviews(p, rid) {
    const real = await DBX().getReviews(p.id);
    if (stale(rid) || !$("#revList")) return;
    const all = [...real.map((r) => ({ ...r, verified: r.verified })), ...fakeReviews(p)];
    const dist = [5, 4, 3, 2, 1].map((s) => { const b = { 5: p.rating >= 4.5 ? 68 : 52, 4: 22, 3: 7, 2: 2, 1: 1 }[s]; return [s, Math.round(b * (0.8 + seeded(p.id + s)() * 0.4))]; });
    const dt = dist.reduce((s, [, n]) => s + n, 0);
    $("#revSummary").innerHTML = `
      <div class="score">${p.rating}</div>${starsHtml(p.rating)}<div class="muted small" style="margin-top:6px">Based on ${(p.reviews + real.length).toLocaleString("en")} reviews</div>
      <div class="bars">${dist.map(([s, n]) => `<div class="bar"><span>${s}★</span><div><i style="width:${Math.round(n / dt * 100)}%"></i></div><span>${Math.round(n / dt * 100)}%</span></div>`).join("")}</div>
      ${user ? `<button class="btn btn-block" id="writeRev">Write a review</button>` : `<a class="btn btn-block" href="#/login?next=${encodeURIComponent("/product/" + p.id)}">Sign in to write a review</a>`}`;
    $("#revList").innerHTML = all.map((r) => `
      <div class="review">
        <div class="who"><span class="avatar">${esc((r.name || "?")[0])}</span><div><b class="small">${esc(r.name)}</b>${r.verified ? ` <span class="pill success" style="height:20px">${icon("check", "ico-sm")} Verified buyer</span>` : ""}<div class="muted small">${fmtDate(r.createdAt)}</div></div></div>
        ${starsHtml(r.rating)}<h4 style="margin:8px 0 4px">${esc(r.title || "")}</h4><p style="margin:0;color:var(--text-2)">${esc(r.text)}</p>
      </div>`).join("");
    const w = $("#writeRev");
    if (w) w.onclick = () => {
      let rating = 5;
      openModal(`<form class="form" id="revForm" style="padding:32px;max-width:560px">
        <h2 style="margin:0">Review ${esc(p.name)}</h2>
        <div class="star-pick">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-r="${i}" aria-label="${i} stars">${icon("star", "on")}</button>`).join("")}</div>
        <div class="field"><label>Title</label><input type="text" name="title" maxlength="80" required placeholder="Sum it up in a few words"></div>
        <div class="field"><label>Your review</label><textarea name="text" rows="4" maxlength="1000" required placeholder="What did you like or dislike?"></textarea></div>
        <button class="btn btn-primary">Post review</button></form>`);
      $$("[data-r]").forEach((b) => b.onclick = () => { rating = +b.dataset.r; $$("[data-r] .ico").forEach((s, i) => s.classList.toggle("on", i < rating)); });
      $("#revForm").onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const orders = await DBX().myOrders().catch(() => []);
        const verified = orders.some((o) => o.items.some((i) => i.id === p.id));
        try {
          await DBX().addReview(p.id, { name: user.name, rating: Math.round(rating), title: f.title.value.trim(), text: f.text.value.trim(), verified });
          closeAll(); toast("Thanks! Your review is live"); renderReviews(p, renderId);
        } catch (err) { toast(err.message, "err"); }
      };
    };
  }

  // ───────────────────────── Cart page ─────────────────────────
  function viewCart() {
    title("Cart");
    const t = totals();
    if (!t.items.length) {
      app.innerHTML = `<div class="empty" style="margin-top:20px">${icon("bag")}<h2>Your cart is empty</h2><p>Have a look around. We think you'll find something you love.</p><a class="btn btn-primary" href="#/shop">Start shopping</a></div>`;
      return;
    }
    const c = state.coupon && COUPONS[state.coupon];
    const left = FREE_SHIP - t.subtotal;
    app.innerHTML = `
      ${crumbs(["Cart"])}
      <h1>Your cart <span class="muted" style="font-weight:500">(${t.count})</span></h1>
      <div class="cart">
        <div>
          <div class="ship-meter" style="margin-bottom:12px">${left > 0 ? `Add <b>${money(left)}</b> more to get <b>free delivery</b>` : `${icon("check", "ico-sm")} Your order qualifies for <b>free delivery</b>`}<div class="track-bar"><i style="width:${Math.min(100, t.subtotal / FREE_SHIP * 100)}%"></i></div></div>
          <div class="cart-table">
            ${t.items.map((l) => `
              <div class="line">
                <a href="#/product/${l.id}" class="thumb-sm" style="${tint(l.p)}">${l.p.emoji}</a>
                <div>
                  <span class="muted small">${esc(l.p.brand)}</span>
                  <a class="name" href="#/product/${l.id}" style="display:block">${esc(l.p.name)}</a>
                  <div class="meta">${optsText(l.opts)}</div>
                  <div class="row wrap" style="margin-top:10px;gap:14px">
                    <div class="qty sm"><button data-q="${esc(l.key)}" data-d="-1" aria-label="Less">${icon("minus", "ico-sm")}</button><input value="${l.qty}" readonly aria-label="Quantity"><button data-q="${esc(l.key)}" data-d="1" aria-label="More">${icon("plus", "ico-sm")}</button></div>
                    <button class="link small" data-later="${esc(l.key)}">Save for later</button>
                    <button class="link small" style="color:var(--muted)" data-q="${esc(l.key)}" data-d="-999">Remove</button>
                  </div>
                </div>
                <div style="text-align:right"><b>${money(l.p.price * l.qty)}</b>${l.qty > 1 ? `<div class="muted small">${money(l.p.price)} each</div>` : ""}${l.p.oldPrice ? `<div class="save small">Save ${money((l.p.oldPrice - l.p.price) * l.qty)}</div>` : ""}</div>
              </div>`).join("")}
          </div>
          <a class="btn" href="#/shop" style="margin-top:20px">${icon("left", "ico-sm")} Continue shopping</a>
        </div>
        <aside class="summary">
          <h3>Order summary</h3>
          <div class="r"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          ${t.discount ? `<div class="r discount"><span>Discount (${esc(state.coupon)})</span><span>−${money(t.discount)}</span></div>` : ""}
          <div class="r"><span>Delivery</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
          <div class="r total"><span>Total</span><span>${money(t.total)}</span></div>
          ${t.savings ? `<div class="save small" style="margin-bottom:12px">You're saving ${money(t.savings + t.discount)} on this order</div>` : ""}
          <form class="coupon" id="couponForm" style="margin:14px 0"><input id="couponIn" placeholder="Discount code" value="${esc(state.coupon || "")}" aria-label="Discount code"><button class="btn">Apply</button></form>
          ${c ? `<div class="row between small" style="margin:-4px 0 14px"><span class="pill success">${icon("tag", "ico-sm")} ${esc(c.label)}</span><button class="link small" id="rmCoupon">Remove</button></div>` : ""}
          <a class="btn btn-primary btn-lg btn-block" href="#/checkout">${icon("lock", "ico-sm")} Secure checkout</a>
          <div class="pay-icons"><span>VISA</span><span>MASTERCARD</span><span>PAYPAL</span><span>APPLE PAY</span></div>
        </aside>
      </div>`;
    $$("[data-q]").forEach((b) => b.onclick = () => { const l = state.cart.find((x) => x.key === b.dataset.q); setQty(l.key, +b.dataset.d === -999 ? 0 : l.qty + +b.dataset.d); viewCart(); });
    $$("[data-later]").forEach((b) => b.onclick = () => { const l = state.cart.find((x) => x.key === b.dataset.later); if (!state.wish.includes(l.id)) { state.wish.push(l.id); save("wish"); } setQty(l.key, 0); toast("Moved to your wishlist"); viewCart(); });
    $("#couponForm").onsubmit = (e) => {
      e.preventDefault(); const code = $("#couponIn").value.trim().toUpperCase(); if (!code) return;
      if (COUPONS[code]) { state.coupon = code; save("coupon"); toast(`Code applied: ${COUPONS[code].label}`); viewCart(); } else toast("That code isn't valid", "err");
    };
    const rc = $("#rmCoupon"); if (rc) rc.onclick = () => { state.coupon = null; save("coupon"); viewCart(); };
  }

  // ───────────────────────── Checkout ─────────────────────────
  const COUNTRIES = ["Bulgaria", "Austria", "Germany", "Greece", "Romania", "Italy", "Spain", "France", "United Kingdom", "United States"];
  function viewCheckout() {
    title("Checkout");
    if (!state.cart.length) { location.hash = "#/cart"; return; }
    const addrs = (user && user.addresses) || [];
    const a0 = addrs[0] || {};
    const o = { ship: "standard", pay: "card", points: 0, giftWrap: false };

    app.innerHTML = `
      <div class="steps"><span class="done"><b>${icon("check", "ico-sm")}</b>Cart</span><i class="sep"></i><span class="on"><b>2</b>Checkout</span><i class="sep"></i><span><b>3</b>Confirmation</span></div>
      <div class="checkout">
        <form id="co" novalidate>
          ${user ? "" : `<div class="panel row between wrap" style="margin-bottom:20px;gap:12px"><span>Have an account? Sign in to use saved addresses and earn points.</span><a class="btn btn-sm" href="#/login?next=%2Fcheckout">Sign in</a></div>`}
          <section class="co-section">
            <h3><span class="num">1</span>Contact</h3>
            <div class="form-row">
              <div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" value="${esc(user ? user.email : "")}" required></div>
              <div class="field"><label for="phone">Phone</label><input type="tel" id="phone" name="phone" autocomplete="tel" value="${esc(a0.phone || (user && user.phone) || "")}" placeholder="+359 88 123 4567" required></div>
            </div>
          </section>
          <section class="co-section">
            <h3><span class="num">2</span>Delivery address</h3>
            ${addrs.length ? `<div class="addr-pick">${addrs.map((a, i) => `<label class="choice"><input type="radio" name="addrPick" value="${i}" ${i === 0 ? "checked" : ""}><span class="grow"><b>${esc(a.name)}</b><span>${esc(a.street)}, ${esc(a.city)}</span></span></label>`).join("")}<label class="choice"><input type="radio" name="addrPick" value="new"><span class="grow"><b>New address</b><span>Enter a different one</span></span></label></div>` : ""}
            <div class="form" id="addrFields">
              <div class="form-row">
                <div class="field"><label for="name">Full name</label><input type="text" id="name" name="name" autocomplete="name" value="${esc(a0.name || (user ? user.name : ""))}" required></div>
                <div class="field"><label for="country">Country</label><select id="country" name="country" autocomplete="country-name">${COUNTRIES.map((c) => `<option ${c === (a0.country || "Bulgaria") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
              </div>
              <div class="field"><label for="street">Street address</label><input type="text" id="street" name="street" autocomplete="street-address" value="${esc(a0.street || "")}" placeholder="12 Vitosha Blvd, apt 4" required></div>
              <div class="form-row">
                <div class="field"><label for="city">City</label><input type="text" id="city" name="city" autocomplete="address-level2" value="${esc(a0.city || "")}" required></div>
                <div class="field"><label for="zip">Postcode</label><input type="text" id="zip" name="zip" autocomplete="postal-code" value="${esc(a0.zip || "")}" required></div>
              </div>
              ${user ? `<label class="check"><input type="checkbox" name="saveAddr" ${addrs.length ? "" : "checked"}> Save this address to my account</label>` : ""}
            </div>
          </section>
          <section class="co-section">
            <h3><span class="num">3</span>Delivery method</h3>
            ${Object.entries(SHIPPING).map(([k, m]) => `<label class="choice"><input type="radio" name="ship" value="${k}" ${k === o.ship ? "checked" : ""}><span class="grow"><b>${m.label}</b><span>${m.eta}</span></span><b data-sp="${k}"></b></label>`).join("")}
            <label class="check" style="margin-top:16px"><input type="checkbox" name="giftWrap"> ${icon("gift", "ico-sm")} Add gift wrapping (+${money(3)})</label>
          </section>
          <section class="co-section">
            <h3><span class="num">4</span>Payment</h3>
            <label class="choice"><input type="radio" name="pay" value="card" checked><span class="grow"><b>Credit or debit card</b><span>Visa, Mastercard, Amex</span></span>${icon("card")}</label>
            <label class="choice"><input type="radio" name="pay" value="paypal"><span class="grow"><b>PayPal</b><span>You'll confirm in a pop-up (simulated)</span></span></label>
            <label class="choice"><input type="radio" name="pay" value="cod"><span class="grow"><b>Cash on delivery</b><span>Pay the courier when it arrives</span></span></label>
            <div id="cardBox" class="form" style="margin-top:18px">
              <div class="cc"><div class="row between"><span class="chip-ic"></span><span>SLAPABABA</span></div><div class="num" id="ccNum">•••• •••• •••• ••••</div><div class="row"><span id="ccName">CARDHOLDER</span><span id="ccExp">MM/YY</span></div></div>
              <div class="field"><label for="card">Card number</label><input type="text" id="card" name="card" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" maxlength="19"></div>
              <div class="form-row">
                <div class="field"><label for="exp">Expiry date</label><input type="text" id="exp" name="exp" inputmode="numeric" autocomplete="off" placeholder="MM/YY" maxlength="5"></div>
                <div class="field"><label for="cvc">Security code</label><input type="text" id="cvc" name="cvc" inputmode="numeric" autocomplete="off" placeholder="CVC" maxlength="4"></div>
              </div>
              <div class="field"><label for="cardName">Name on card</label><input type="text" id="cardName" name="cardName" autocomplete="off"></div>
              <div class="mode-note">${icon("info", "ico-sm")}<span>This is a demo store, so no money is taken. Use a made-up number like 4242 4242 4242 4242 and never enter a real card.</span></div>
            </div>
          </section>
          <div class="field"><label for="note">Delivery note (optional)</label><textarea id="note" name="note" rows="2" maxlength="300" placeholder="e.g. Leave with the neighbour at no. 14"></textarea></div>
        </form>
        <aside class="summary" id="coSummary"></aside>
      </div>`;

    const form = $("#co");
    const fillAddr = (a) => { ["name", "street", "city", "zip", "phone"].forEach((k) => { if (a[k] != null) form[k].value = a[k]; }); if (a.country) form.country.value = a.country; };
    $$("[name=addrPick]").forEach((r) => r.onchange = () => { const v = r.value; $("#addrFields").style.display = ""; if (v !== "new") fillAddr(addrs[+v]); else fillAddr({ name: user.name, street: "", city: "", zip: "" }); });

    function summary() {
      const t = totals(o);
      $$("[data-sp]").forEach((el) => { const s = totals({ ...o, ship: el.dataset.sp }).shipping; el.textContent = s ? money(s) : "Free"; });
      $("#coSummary").innerHTML = `
        <h3>Order summary</h3>
        <div style="max-height:300px;overflow:auto;margin-bottom:8px">${t.items.map((l) => `<div class="order-item" style="margin-bottom:10px"><span class="thumb-sm" style="${tint(l.p)};position:relative">${l.p.emoji}<span class="count" style="top:-6px;right:-6px" data-n="${l.qty}">${l.qty}</span></span><span class="grow"><b class="small">${esc(l.p.name)}</b><div class="muted small">${optsText(l.opts)}</div></span><b class="small">${money(l.p.price * l.qty)}</b></div>`).join("")}</div>
        ${user && user.points >= 100 ? `<label class="check" style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;margin:8px 0"><input type="checkbox" id="usePts" ${o.points ? "checked" : ""}> ${icon("award", "ico-sm")} <span>Use my points (${user.points.toLocaleString("en")} = ${money(user.points / 100)})</span></label>` : ""}
        <div class="r"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.discount ? `<div class="r discount"><span>Discount (${esc(state.coupon)})</span><span>−${money(t.discount)}</span></div>` : ""}
        ${t.pointsValue ? `<div class="r discount"><span>Points (${t.usedPoints})</span><span>−${money(t.pointsValue)}</span></div>` : ""}
        <div class="r"><span>Delivery</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
        ${t.wrap ? `<div class="r"><span>Gift wrapping</span><span>${money(t.wrap)}</span></div>` : ""}
        <div class="r total"><span>Total</span><span>${money(t.total)}</span></div>
        ${user ? `<div class="muted small" style="margin:6px 0 0">You'll earn <b>${Math.floor(t.total)}</b> points with this order</div>` : ""}
        <button class="btn btn-primary btn-lg btn-block" id="place" style="margin-top:16px">${icon("lock", "ico-sm")} Place order · ${money(t.total)}</button>
        <div class="secure-note">${icon("shield", "ico-sm")} Demo checkout, no real payment</div>`;
      $("#place").onclick = place;
      const up = $("#usePts"); if (up) up.onchange = () => { o.points = up.checked ? user.points : 0; summary(); };
    }
    summary();

    form.addEventListener("change", (e) => {
      if (e.target.name === "ship") { o.ship = e.target.value; summary(); }
      if (e.target.name === "giftWrap") { o.giftWrap = e.target.checked; summary(); }
      if (e.target.name === "pay") { o.pay = e.target.value; $("#cardBox").classList.toggle("hidden", o.pay !== "card"); }
    });
    form.addEventListener("input", (e) => { const f = e.target.closest(".field.error"); if (f) { f.classList.remove("error"); $$(".error-msg", f).forEach((m) => m.remove()); } });
    form.card.oninput = () => { const v = form.card.value.replace(/\D/g, "").slice(0, 16); form.card.value = v.replace(/(.{4})/g, "$1 ").trim(); $("#ccNum").textContent = (v + "•".repeat(16 - v.length)).replace(/(.{4})/g, "$1 ").trim(); };
    form.exp.oninput = () => { let v = form.exp.value.replace(/\D/g, "").slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2); form.exp.value = v; $("#ccExp").textContent = v || "MM/YY"; };
    form.cvc.oninput = () => { form.cvc.value = form.cvc.value.replace(/\D/g, ""); };
    form.cardName.oninput = () => { $("#ccName").textContent = form.cardName.value.toUpperCase() || "CARDHOLDER"; };

    function luhn(num) { let s = 0, alt = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; }
    function validate() {
      let ok = true;
      $$(".field", form).forEach((f) => f.classList.remove("error")); $$(".error-msg", form).forEach((m) => m.remove());
      const fail = (el, msg) => { ok = false; const f = el.closest(".field"); f.classList.add("error"); f.insertAdjacentHTML("beforeend", `<span class="error-msg">${msg}</span>`); };
      if (!/^\S+@\S+\.\S+$/.test(form.email.value.trim())) fail(form.email, "Enter a valid email address");
      if (form.phone.value.replace(/\D/g, "").length < 7) fail(form.phone, "Enter a valid phone number");
      ["name", "street", "city", "zip"].forEach((k) => { if (!form[k].value.trim()) fail(form[k], "Required"); });
      if (o.pay === "card") {
        const n = form.card.value.replace(/\D/g, "");
        if (n.length < 13 || !luhn(n)) fail(form.card, "That card number doesn't look right. Try 4242 4242 4242 4242");
        const m = form.exp.value.match(/^(\d\d)\/(\d\d)$/);
        if (!m || +m[1] < 1 || +m[1] > 12) fail(form.exp, "Use MM/YY");
        else if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) fail(form.exp, "This card has expired");
        if (!/^\d{3,4}$/.test(form.cvc.value)) fail(form.cvc, "3 or 4 digits");
        if (!form.cardName.value.trim()) fail(form.cardName, "Required");
      }
      if (!ok) { toast("Please check the highlighted fields", "err"); $(".field.error", form).scrollIntoView({ behavior: "smooth", block: "center" }); }
      return ok;
    }

    async function place() {
      if (!validate()) return;
      const t = totals(o);
      const fd = Object.fromEntries(new FormData(form));
      const address = { name: fd.name.trim(), street: fd.street.trim(), city: fd.city.trim(), zip: fd.zip.trim(), country: fd.country, phone: fd.phone.trim() };
      const order = {
        id: "SB" + Date.now().toString().slice(-7) + Math.floor(Math.random() * 90 + 10),
        items: t.items.map((l) => ({ id: l.id, name: l.p.name, brand: l.p.brand, emoji: l.p.emoji, price: l.p.price, qty: l.qty, opts: l.opts })),
        subtotal: t.subtotal, discount: t.discount, pointsUsed: t.usedPoints, pointsValue: t.pointsValue, shipping: t.shipping, giftWrap: t.wrap, total: t.total,
        coupon: state.coupon || null, shipMethod: o.ship,
        payment: o.pay === "card" ? "Card ending " + fd.card.replace(/\D/g, "").slice(-4) : o.pay === "paypal" ? "PayPal" : "Cash on delivery",
        address, email: fd.email.trim(), note: (fd.note || "").trim(), status: "processing", customerName: address.name,
      };
      app.innerHTML = `<div class="processing"><div class="spinner"></div><h2>Processing your order</h2><p class="muted">Please don't close this page.</p></div>`;
      window.scrollTo(0, 0);
      try {
        await new Promise((r) => setTimeout(r, 1400));
        const saved = await DBX().createOrder(order);
        if (user) {
          if (t.usedPoints) await DBX().addPoints(-t.usedPoints);
          await DBX().addPoints(Math.floor(t.total));
          if (fd.saveAddr) await DBX().updateProfile({ addresses: [address, ...(user.addresses || []).filter((a) => a.street !== address.street)].slice(0, 6) });
        }
        order.items.forEach((i) => { const p = byId(i.id); if (p) { p.stock = Math.max(0, p.stock - i.qty); state.stock[p.id] = p.stock; } });
        save("stock");
        sessionStorage.setItem("slapshop_last", JSON.stringify(saved));
        state.cart = []; state.coupon = null; save("cart"); save("coupon");
        location.hash = "#/order/" + saved.id;
      } catch (err) {
        toast(err.message || "We couldn't place your order", "err");
        viewCheckout();
      }
    }
  }

  // ───────────────────────── Order status / tracking ─────────────────────────
  const STEPS = [["processing", "Order placed"], ["shipped", "Shipped"], ["out", "Out for delivery"], ["delivered", "Delivered"]];
  function statusOf(o) {
    if (o.status === "cancelled") return { key: "cancelled", label: "Cancelled", step: -1, cls: "danger" };
    let step;
    if (o.statusManual) step = Math.max(0, STEPS.findIndex(([k]) => k === o.status));
    else { const m = (Date.now() - o.createdAt) / 60000; step = m < 2 ? 0 : m < 10 ? 1 : m < 30 ? 2 : 3; }
    return { key: STEPS[step][0], label: step === 0 ? "Processing" : STEPS[step][1], step, cls: ["info", "warning", "warning", "success"][step] };
  }
  function trackHtml(o) {
    const s = statusOf(o);
    if (s.step < 0) return `<span class="pill danger">Cancelled</span>`;
    return `<div class="track"><span class="fill" style="width:${s.step * 25}%"></span>${STEPS.map(([, l], i) => `<div class="pt ${i <= s.step ? "on" : ""}"><i>${i <= s.step ? icon("check") : ""}</i>${l}</div>`).join("")}</div>`;
  }
  function orderSummaryHtml(o) {
    const sm = SHIPPING[o.shipMethod] || SHIPPING.standard;
    return `
      <div class="order-items">${o.items.map((i) => `<div class="order-item"><a class="thumb-sm" href="#/product/${i.id}" style="${byId(i.id) ? tint(byId(i.id)) : ""}">${i.emoji}</a><span class="grow"><a href="#/product/${i.id}"><b>${esc(i.name)}</b></a><div class="muted small">${optsText(i.opts)}${i.opts && Object.keys(i.opts).length ? " · " : ""}Qty ${i.qty}</div></span><b>${money(i.price * i.qty)}</b></div>`).join("")}</div>
      <hr>
      <div class="form-row">
        <div class="small"><b>Delivery address</b><div class="muted" style="margin-top:6px">${esc(o.address.name)}<br>${esc(o.address.street)}<br>${esc(o.address.zip)} ${esc(o.address.city)}<br>${esc(o.address.country)}<br>${esc(o.address.phone)}</div>
          <div style="margin-top:12px"><b>${sm.label}</b><div class="muted">${sm.eta}</div></div>
          <div style="margin-top:12px"><b>Payment</b><div class="muted">${esc(o.payment)}</div></div>
          ${o.note ? `<div style="margin-top:12px"><b>Note</b><div class="muted">${esc(o.note)}</div></div>` : ""}
        </div>
        <div class="summary" style="position:static;padding:18px">
          <div class="r"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
          ${o.discount ? `<div class="r discount"><span>Discount${o.coupon ? " (" + esc(o.coupon) + ")" : ""}</span><span>−${money(o.discount)}</span></div>` : ""}
          ${o.pointsValue ? `<div class="r discount"><span>Points</span><span>−${money(o.pointsValue)}</span></div>` : ""}
          <div class="r"><span>Delivery</span><span>${o.shipping ? money(o.shipping) : "Free"}</span></div>
          ${o.giftWrap ? `<div class="r"><span>Gift wrapping</span><span>${money(o.giftWrap)}</span></div>` : ""}
          <div class="r total"><span>Total</span><span>${money(o.total)}</span></div>
        </div>
      </div>`;
  }
  async function findOrder(id) {
    try { const last = JSON.parse(sessionStorage.getItem("slapshop_last")); if (last && last.id === id) return last; } catch (e) { /* ignore */ }
    return DBX().getOrder(id);
  }

  async function viewOrderDone(id, rid) {
    rid = renderId;
    loading();
    const o = await findOrder(id);
    if (stale(rid)) return;
    if (!o) return view404();
    title("Order confirmed");
    app.innerHTML = `
      <div class="steps"><span class="done"><b>${icon("check", "ico-sm")}</b>Cart</span><i class="sep"></i><span class="done"><b>${icon("check", "ico-sm")}</b>Checkout</span><i class="sep"></i><span class="on"><b>3</b>Confirmation</span></div>
      <div class="success">
        <div class="check-circle">${icon("check")}</div>
        <h1>Thank you, ${esc(o.address.name.split(" ")[0])}!</h1>
        <p class="muted">Your order <b style="color:var(--text)">#${esc(o.id)}</b> has been placed. We've sent a confirmation to <b style="color:var(--text)">${esc(o.email)}</b> (not really, it's a demo).</p>
        <div class="row wrap" style="justify-content:center;gap:10px">
          ${o.uid ? `<a class="btn btn-primary" href="#/account/orders">View my orders</a>` : `<a class="btn btn-primary" href="#/signup">Create an account</a>`}
          <a class="btn" href="#/invoice/${esc(o.id)}">${icon("printer", "ico-sm")} Invoice</a>
          <a class="btn" href="#/shop">Continue shopping</a>
        </div>
      </div>
      <div class="panel" style="max-width:860px;margin:0 auto">
        <div class="row between wrap" style="margin-bottom:16px"><h3 style="margin:0">Order #${esc(o.id)}</h3><span class="muted small">${fmtDate(o.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
        ${trackHtml(o)}<hr>${orderSummaryHtml(o)}
      </div>`;
  }

  async function viewInvoice(id, rid) {
    rid = renderId;
    loading();
    const o = await findOrder(id);
    if (stale(rid)) return;
    if (!o) return view404();
    title("Invoice " + o.id);
    app.innerHTML = `
      <div class="invoice panel">
        <div class="row between wrap no-print" style="margin-bottom:24px"><a class="link" href="javascript:history.back()">← Back</a><button class="btn btn-primary btn-sm" onclick="window.print()">${icon("printer", "ico-sm")} Print / save as PDF</button></div>
        <div class="row between wrap" style="align-items:flex-start">
          <div><div class="logo"><span class="logo-mark">S</span>Slapababa</div><p class="muted small" style="margin-top:10px">Slapababa Ltd. (demo)<br>1 Pretend Street, Sofia 1000<br>support@slapababa.example</p></div>
          <div style="text-align:right"><h2 style="margin:0">Invoice</h2><p class="muted small">No. INV-${esc(o.id)}<br>Date: ${fmtDate(o.createdAt)}<br>Order: #${esc(o.id)}</p></div>
        </div>
        <div class="small" style="margin:20px 0"><b>Bill to</b><br>${esc(o.address.name)}<br>${esc(o.address.street)}<br>${esc(o.address.zip)} ${esc(o.address.city)}, ${esc(o.address.country)}<br>${esc(o.email)}</div>
        <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>
          ${o.items.map((i) => `<tr><td>${esc(i.name)}<div class="muted small">${optsText(i.opts)}</div></td><td class="r">${i.qty}</td><td class="r">${money(i.price)}</td><td class="r">${money(i.price * i.qty)}</td></tr>`).join("")}
          <tr><td colspan="3" class="r">Subtotal</td><td class="r">${money(o.subtotal)}</td></tr>
          ${o.discount ? `<tr><td colspan="3" class="r">Discount</td><td class="r">−${money(o.discount)}</td></tr>` : ""}
          ${o.pointsValue ? `<tr><td colspan="3" class="r">Points</td><td class="r">−${money(o.pointsValue)}</td></tr>` : ""}
          <tr><td colspan="3" class="r">Delivery</td><td class="r">${money(o.shipping)}</td></tr>
          ${o.giftWrap ? `<tr><td colspan="3" class="r">Gift wrapping</td><td class="r">${money(o.giftWrap)}</td></tr>` : ""}
          <tr><td colspan="3" class="r"><b>Total (incl. VAT ${money(o.total - o.total / 1.2)})</b></td><td class="r"><b>${money(o.total)}</b></td></tr>
        </tbody></table>
        <p class="muted small" style="margin-top:24px">Paid by: ${esc(o.payment)}. This is a demo invoice and is not a real tax document.</p>
      </div>`;
  }

  async function viewTrack() {
    title("Track your order");
    app.innerHTML = `${crumbs(["Track order"])}
      <div style="max-width:560px;margin:0 auto">
        <h1>Track your order</h1><p class="muted">Enter your order number to see where it is.</p>
        <form class="row" id="trackForm" style="margin:20px 0"><input type="text" id="trackId" placeholder="e.g. SB1234567" required><button class="btn btn-primary">Track</button></form>
        <div id="trackOut"></div>
        <p class="muted small">Signed in? Your orders are all in <a class="link" href="#/account/orders">My orders</a>.</p>
      </div>`;
    $("#trackForm").onsubmit = async (e) => {
      e.preventDefault();
      const id = $("#trackId").value.trim().replace(/^#/, "").toUpperCase();
      const o = await findOrder(id);
      $("#trackOut").innerHTML = o ? `<div class="panel"><div class="row between"><b>#${esc(o.id)}</b><span class="pill ${statusOf(o).cls}">${statusOf(o).label}</span></div><div style="margin-top:18px">${trackHtml(o)}</div></div>` :
        `<div class="mode-note">${icon("info", "ico-sm")}<span>We couldn't find that order. ${DBX().mode === "firebase" ? "Sign in with the account you ordered with to see it." : "Check the number and try again."}</span></div>`;
    };
  }

  // ───────────────────────── Auth ─────────────────────────
  function modeNote() {
    return DBX().mode === "firebase"
      ? `<div class="mode-note ok">${icon("shield", "ico-sm")}<span>Your account is stored securely online and works on any device.</span></div>`
      : `<div class="mode-note">${icon("info", "ico-sm")}<span>Demo mode: accounts are saved only in this browser. Please don't reuse a real password.</span></div>`;
  }
  function viewAuth(mode) {
    const next = route().params.get("next") || "/account";
    if (user && mode !== "forgot") { location.hash = "#" + next; return; }
    title(mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password");
    const nq = encodeURIComponent(next);
    app.innerHTML = `
      <div class="auth">
        <div class="auth-side">
          <div class="logo" style="color:#fff"><span class="logo-mark" style="background:#fff;color:#0f172a">S</span>Slapababa</div>
          <div>
            <h2 style="font-size:32px;color:#fff">${mode === "signup" ? "Join Slapababa" : "Welcome back"}</h2>
            <p style="color:#cbd5e1">${mode === "signup" ? "Create a free account and get 100 bonus points." : "Sign in to see your orders and check out faster."}</p>
            <ul>
              <li>${icon("check")} Track every order in one place</li>
              <li>${icon("check")} Earn 1 point for every €1 you spend</li>
              <li>${icon("check")} Save addresses for 1-click checkout</li>
              <li>${icon("check")} Wishlist and reviews</li>
            </ul>
          </div>
          <span class="small" style="color:#94a3b8">© Slapababa</span>
        </div>
        <div class="auth-form">
          ${mode === "forgot" ? `
            <h1>Reset your password</h1><p class="muted">Enter your email and we'll send you a reset link.</p>
            <form class="form" id="authForm" novalidate>
              <div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" required></div>
              <button class="btn btn-primary btn-lg btn-block">Send reset link</button>
            </form>
            <p class="small" style="margin-top:20px"><a class="link" href="#/login">← Back to sign in</a></p>` : `
            <h1>${mode === "login" ? "Sign in" : "Create your account"}</h1>
            <p class="muted">${mode === "login" ? `New to Slapababa? <a class="link" href="#/signup?next=${nq}">Create an account</a>` : `Already have an account? <a class="link" href="#/login?next=${nq}">Sign in</a>`}</p>
            <form class="form" id="authForm" novalidate>
              ${mode === "signup" ? `<div class="field"><label for="name">Full name</label><input type="text" id="name" name="name" autocomplete="name" required></div>` : ""}
              <div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" required></div>
              <div class="field"><label for="password" class="row between">Password ${mode === "login" ? `<a class="link small" href="#/forgot">Forgot password?</a>` : ""}</label>
                <div class="pw-wrap"><input type="password" id="password" name="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required><button type="button" class="btn btn-ghost btn-sm" id="pwShow">Show</button></div>
                ${mode === "signup" ? `<div class="strength"><i id="pwBar"></i></div><span class="muted small" id="pwHint">At least 8 characters, with a number</span>` : ""}
              </div>
              ${mode === "signup" ? `<label class="check"><input type="checkbox" name="newsletter" checked> Send me offers and news</label><label class="check"><input type="checkbox" name="terms"> I agree to the <a class="link" href="#/terms" target="_blank">terms</a> and <a class="link" href="#/privacy" target="_blank">privacy policy</a></label>` : ""}
              <button class="btn btn-primary btn-lg btn-block" id="authBtn">${mode === "login" ? "Sign in" : "Create account"}</button>
              ${modeNote()}
            </form>`}
        </div>
      </div>`;

    const form = $("#authForm");
    const show = $("#pwShow");
    if (show) show.onclick = () => { const p = form.password; p.type = p.type === "password" ? "text" : "password"; show.textContent = p.type === "password" ? "Show" : "Hide"; };
    if (mode === "signup") form.password.oninput = () => {
      const v = form.password.value; let s = 0;
      if (v.length >= 8) s++; if (/\d/.test(v)) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      $("#pwBar").style.width = (s / 4 * 100) + "%"; $("#pwBar").style.background = ["#dc2626", "#f59e0b", "#eab308", "#22c55e", "#15803d"][s];
      $("#pwHint").textContent = ["Too short", "Weak", "Okay", "Strong", "Very strong"][s];
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      $$(".field", form).forEach((f) => f.classList.remove("error")); $$(".error-msg", form).forEach((m) => m.remove());
      const fail = (n, msg) => { const f = form[n].closest(".field"); f.classList.add("error"); f.insertAdjacentHTML("beforeend", `<span class="error-msg">${msg}</span>`); return false; };
      const email = form.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail("email", "Enter a valid email address");
      const btn = form.querySelector("button.btn-primary"); btn.disabled = true;
      try {
        if (mode === "forgot") {
          await DBX().resetPassword(email);
          app.querySelector(".auth-form").innerHTML = `<h1>Check your email</h1><p class="muted">If an account exists for ${esc(email)}, we've sent a link to reset the password.</p><a class="btn btn-primary" href="#/login">Back to sign in</a>`;
          return;
        }
        if (mode === "signup") {
          let ok = true;
          if (form.name.value.trim().length < 2) ok = fail("name", "Please enter your name");
          if (form.password.value.length < 8 || !/\d/.test(form.password.value)) ok = fail("password", "Use at least 8 characters, including a number");
          if (!form.terms.checked) { toast("Please accept the terms to continue", "err"); ok = false; }
          if (!ok) { btn.disabled = false; return; }
          const u = await DBX().signUp({ name: form.name.value.trim(), email, password: form.password.value });
          if (form.newsletter.checked) await DBX().updateProfile({ newsletter: true });
          toast(`Welcome, ${u.name.split(" ")[0]}! You've got 100 bonus points`);
          if (u.role === "admin") setTimeout(() => toast("You're the first account here, so you're the shop admin"), 400);
        } else {
          const u = await DBX().logIn(email, form.password.value);
          toast(`Welcome back, ${u.name.split(" ")[0]}`);
        }
        location.hash = "#" + next;
      } catch (err) {
        btn.disabled = false;
        if (/email/i.test(err.message) && !/password/i.test(err.message)) fail("email", esc(err.message));
        else fail("password", esc(err.message));
      }
    };
  }

  // ───────────────────────── Account ─────────────────────────
  function requireUser() {
    if (user) return true;
    location.hash = "#/login?next=" + encodeURIComponent(route().path);
    return false;
  }
  const TIERS = [["Bronze", 0], ["Silver", 500], ["Gold", 1500], ["Platinum", 4000]];
  function tierOf(spent) {
    let i = 0; TIERS.forEach(([, min], j) => { if (spent >= min) i = j; });
    return { name: TIERS[i][0], next: TIERS[i + 1], pct: TIERS[i + 1] ? Math.min(100, (spent - TIERS[i][1]) / (TIERS[i + 1][1] - TIERS[i][1]) * 100) : 100 };
  }
  async function viewAccount(tab, rid) {
    rid = renderId;
    if (!requireUser()) return;
    title("My account");
    loading();
    const orders = await DBX().myOrders();
    if (stale(rid)) return;
    const live = orders.filter((o) => o.status !== "cancelled");
    const spent = live.reduce((s, o) => s + o.total, 0);
    const tier = tierOf(spent);
    const nav = [["overview", "#/account", "home", "Overview"], ["orders", "#/account/orders", "package", "Orders"], ["addresses", "#/account/addresses", "pin", "Addresses"], ["profile", "#/account/profile", "user", "Profile"], ["security", "#/account/security", "lock", "Password & security"]];

    const orderCard = (o) => {
      const s = statusOf(o);
      return `<div class="order">
        <div class="order-head">
          <div><span>Order placed</span><b>${fmtDate(o.createdAt)}</b></div>
          <div><span>Total</span><b>${money(o.total)}</b></div>
          <div><span>Ship to</span><b>${esc(o.address.name)}</b></div>
          <div style="margin-left:auto;text-align:right"><span>Order #${esc(o.id)}</span><span class="pill ${s.cls}">${s.label}</span></div>
        </div>
        <div class="order-body">
          ${trackHtml(o)}
          <div class="order-items">${o.items.map((i) => `<div class="order-item"><a class="thumb-sm" href="#/product/${i.id}" style="${byId(i.id) ? tint(byId(i.id)) : ""}">${i.emoji}</a><span class="grow"><a href="#/product/${i.id}"><b>${esc(i.name)}</b></a><div class="muted small">${optsText(i.opts)}${i.opts && Object.keys(i.opts).length ? " · " : ""}Qty ${i.qty}</div></span><b>${money(i.price * i.qty)}</b></div>`).join("")}</div>
          <div class="row wrap">
            <button class="btn btn-sm" data-again="${esc(o.id)}">${icon("refresh", "ico-sm")} Buy again</button>
            <a class="btn btn-sm" href="#/invoice/${esc(o.id)}">${icon("printer", "ico-sm")} Invoice</a>
            ${s.step === 0 ? `<button class="btn btn-sm btn-danger" data-cancel="${esc(o.id)}">Cancel order</button>` : ""}
            ${s.step === 3 ? `<a class="btn btn-sm" href="#/product/${o.items[0].id}?review=1">${icon("star", "ico-sm")} Write a review</a>` : ""}
          </div>
        </div></div>`;
    };

    const tabs = {
      overview: () => `
        <h1>Hi, ${esc(user.name.split(" ")[0])}</h1>
        <p class="muted">Here's what's happening with your account.</p>
        <div class="tier">
          <div><span class="small" style="color:#cbd5e1">Membership</span><h2 style="margin:4px 0 0;color:#fff">${icon("award", "ico-lg")}</h2><b style="font-size:20px">${tier.name} member</b>
            ${tier.next ? `<div class="meter"><i style="width:${tier.pct}%"></i></div><div class="small" style="color:#cbd5e1;margin-top:6px">Spend ${money(tier.next[1] - spent)} more to reach ${tier.next[0]}</div>` : `<div class="small" style="color:#cbd5e1">You've reached the top tier!</div>`}
          </div>
          <div style="text-align:right"><span class="small" style="color:#cbd5e1">Points balance</span><div style="font-size:36px;font-weight:800">${(user.points || 0).toLocaleString("en")}</div><span class="small" style="color:#cbd5e1">Worth ${money((user.points || 0) / 100)} at checkout</span></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Orders</span><b>${orders.length}</b></div>
          <div class="stat"><span>Total spent</span><b>${money(spent)}</b></div>
          <div class="stat"><span>Wishlist</span><b>${state.wish.length}</b></div>
          <div class="stat"><span>Member since</span><b style="font-size:18px">${fmtDate(user.created, { month: "short", year: "numeric" })}</b></div>
        </div>
        <div class="row between"><h3 style="margin:0">Recent orders</h3>${orders.length ? `<a class="see-all" href="#/account/orders">All orders ${icon("arrow", "ico-sm")}</a>` : ""}</div>
        <div style="margin-top:14px">${orders.length ? orders.slice(0, 2).map(orderCard).join("") : `<div class="empty">${icon("package")}<h3>No orders yet</h3><p>When you place an order, it will show up here.</p><a class="btn btn-primary" href="#/shop">Start shopping</a></div>`}</div>`,
      orders: () => `<h1>Orders</h1>${orders.length ? `<p class="muted">${orders.length} order${orders.length > 1 ? "s" : ""}</p>` + orders.map(orderCard).join("") : `<div class="empty">${icon("package")}<h3>No orders yet</h3><a class="btn btn-primary" href="#/shop">Start shopping</a></div>`}`,
      addresses: () => `
        <h1>Addresses</h1>
        <div class="grid cols-3" style="gap:16px;margin:20px 0 32px">
          ${(user.addresses || []).map((a, i) => `<div class="addr-card">${i === 0 ? `<span class="pill dark" style="align-self:flex-start">Default</span>` : ""}<div><b>${esc(a.name)}</b><div class="muted">${esc(a.street)}<br>${esc(a.zip)} ${esc(a.city)}<br>${esc(a.country)}<br>${esc(a.phone)}</div></div><div class="row" style="margin-top:auto">${i ? `<button class="link small" data-def="${i}">Make default</button>` : ""}<button class="link small" style="color:var(--sale)" data-del="${i}">Delete</button></div></div>`).join("") || `<p class="muted">No saved addresses yet.</p>`}
        </div>
        <h3>Add a new address</h3>
        <form class="form" id="addrForm" style="max-width:640px">
          <div class="form-row"><div class="field"><label>Full name</label><input type="text" name="name" required value="${esc(user.name)}"></div><div class="field"><label>Phone</label><input type="tel" name="phone" required></div></div>
          <div class="field"><label>Street address</label><input type="text" name="street" required></div>
          <div class="form-row-3"><div class="field"><label>City</label><input type="text" name="city" required></div><div class="field"><label>Postcode</label><input type="text" name="zip" required></div><div class="field"><label>Country</label><select name="country">${COUNTRIES.map((c) => `<option>${c}</option>`).join("")}</select></div></div>
          <button class="btn btn-primary" style="justify-self:start">Save address</button>
        </form>`,
      profile: () => `
        <h1>Profile</h1>
        <form class="form" id="profForm" style="max-width:640px">
          <div class="form-row"><div class="field"><label>Full name</label><input type="text" name="name" value="${esc(user.name)}" required></div><div class="field"><label>Phone</label><input type="tel" name="phone" value="${esc(user.phone)}"></div></div>
          <div class="form-row"><div class="field"><label>Email</label><input type="email" value="${esc(user.email)}" disabled></div><div class="field"><label>Birthday (we'll send a treat)</label><input type="text" name="birthday" placeholder="DD/MM" value="${esc(user.birthday)}"></div></div>
          <label class="check"><input type="checkbox" name="newsletter" ${user.newsletter ? "checked" : ""}> Email me about offers and new arrivals</label>
          <button class="btn btn-primary" style="justify-self:start">Save changes</button>
        </form>`,
      security: () => `
        <h1>Password & security</h1>
        ${modeNote()}
        <form class="form" id="pwForm" style="max-width:420px;margin-top:20px">
          <div class="field"><label>Current password</label><input type="password" name="old" autocomplete="current-password" required></div>
          <div class="field"><label>New password</label><input type="password" name="n1" autocomplete="new-password" required></div>
          <div class="field"><label>Confirm new password</label><input type="password" name="n2" autocomplete="new-password" required></div>
          <button class="btn btn-primary" style="justify-self:start">Update password</button>
        </form>
        <hr style="margin:40px 0 24px">
        <h3>Delete account</h3><p class="muted">This permanently deletes your account${DBX().mode === "local" ? " and its orders" : ""}. It can't be undone.</p>
        <button class="btn btn-danger" id="delAcc">Delete my account</button>`,
    };

    app.innerHTML = `
      ${crumbs(["My account", tab === "overview" ? null : "#/account"], ...(tab === "overview" ? [] : [[nav.find((n) => n[0] === tab)[3]]]))}
      <div class="account">
        <nav class="side-nav">
          <div class="user"><span class="avatar lg">${esc(user.name[0].toUpperCase())}</span><div><b>${esc(user.name)}</b><div class="muted small">${esc(user.email)}</div></div></div>
          ${nav.map(([k, h, ic, l]) => `<a href="${h}" class="${k === tab ? "on" : ""}">${icon(ic, "ico-sm")} ${l}</a>`).join("")}
          <a href="#/wishlist">${icon("heart", "ico-sm")} Wishlist</a>
          ${user.role === "admin" ? `<a href="#/admin">${icon("chart", "ico-sm")} Admin dashboard</a>` : ""}
          <button data-logout>${icon("logout", "ico-sm")} Sign out</button>
        </nav>
        <section>${tabs[tab]()}</section>
      </div>`;

    $$("[data-again]").forEach((b) => b.onclick = () => { const o = orders.find((x) => x.id === b.dataset.again); o.items.forEach((i) => byId(i.id) && addToCart(i.id, i.qty, i.opts, true)); openCart(true); });
    $$("[data-cancel]").forEach((b) => b.onclick = async () => {
      if (!confirm("Cancel this order?")) return;
      try { await DBX().updateOrder(b.dataset.cancel, { status: "cancelled", cancelledAt: Date.now() }); toast("Your order was cancelled"); render(); } catch (err) { toast(err.message, "err"); }
    });
    const af = $("#addrForm");
    if (af) {
      af.onsubmit = async (e) => { e.preventDefault(); const a = Object.fromEntries(new FormData(af)); if (Object.values(a).some((v) => !String(v).trim())) return toast("Please fill in every field", "err"); await DBX().updateProfile({ addresses: [...(user.addresses || []), a] }); toast("Address saved"); render(); };
      $$("[data-del]").forEach((b) => b.onclick = async () => { const list = [...user.addresses]; list.splice(+b.dataset.del, 1); await DBX().updateProfile({ addresses: list }); render(); });
      $$("[data-def]").forEach((b) => b.onclick = async () => { const list = [...user.addresses]; const [a] = list.splice(+b.dataset.def, 1); list.unshift(a); await DBX().updateProfile({ addresses: list }); render(); });
    }
    const pf = $("#profForm");
    if (pf) pf.onsubmit = async (e) => { e.preventDefault(); if (pf.name.value.trim().length < 2) return toast("Name is too short", "err"); await DBX().updateProfile({ name: pf.name.value.trim(), phone: pf.phone.value.trim(), birthday: pf.birthday.value.trim(), newsletter: pf.newsletter.checked }); toast("Profile updated"); render(); };
    const pw = $("#pwForm");
    if (pw) pw.onsubmit = async (e) => {
      e.preventDefault();
      if (pw.n1.value.length < 8 || !/\d/.test(pw.n1.value)) return toast("New password needs 8+ characters and a number", "err");
      if (pw.n1.value !== pw.n2.value) return toast("New passwords don't match", "err");
      try { await DBX().changePassword(pw.old.value, pw.n1.value); pw.reset(); toast("Password updated"); } catch (err) { toast(err.message, "err"); }
    };
    const del = $("#delAcc");
    if (del) del.onclick = async () => {
      if (!confirm("Delete your account permanently?")) return;
      try { await DBX().deleteAccount(); toast("Your account was deleted"); location.hash = "#/"; } catch (err) { toast(err.message, "err"); }
    };
  }

  // ───────────────────────── Wishlist & compare pages ─────────────────────────
  function viewWishlist() {
    title("Wishlist");
    const items = state.wish.map(byId).filter(Boolean);
    app.innerHTML = `${crumbs(["Wishlist"])}
      <div class="toolbar"><div><h1 style="margin:0">Wishlist</h1><span class="muted small">${items.length} saved item${items.length === 1 ? "" : "s"}</span></div>${items.length ? `<div class="row"><button class="btn" id="shareWish">${icon("share", "ico-sm")} Share</button><button class="btn btn-primary" id="allToCart">Add all to cart</button></div>` : ""}</div>
      ${items.length ? `<div class="grid">${items.map(card).join("")}</div>` : `<div class="empty">${icon("heart")}<h3>Your wishlist is empty</h3><p>Tap the heart on any product to save it for later.</p><a class="btn btn-primary" href="#/shop">Discover products</a></div>`}`;
    const all = $("#allToCart"); if (all) all.onclick = () => { items.forEach((p) => p.stock && addToCart(p.id, 1, null, true)); openCart(true); };
    const sh = $("#shareWish"); if (sh) sh.onclick = () => { const url = location.href.split("#")[0] + "#/shop?q=" + encodeURIComponent(items.map((p) => p.name.split(" ")[0]).join(" ")); navigator.clipboard?.writeText(url); toast("Link copied"); };
  }

  function viewCompare() {
    title("Compare");
    const items = state.compare.map(byId).filter(Boolean);
    if (!items.length) {
      app.innerHTML = `${crumbs(["Compare"])}<div class="empty">${icon("compare")}<h3>Nothing to compare yet</h3><p>Use the compare button on products to add up to 4 here.</p><a class="btn btn-primary" href="#/shop">Browse products</a></div>`;
      return;
    }
    const keys = [...new Set(items.flatMap((p) => specsFor(p).map(([k]) => k)))];
    const val = (p, k) => (specsFor(p).find(([kk]) => kk === k) || [, "—"])[1];
    app.innerHTML = `${crumbs(["Compare"])}<div class="toolbar"><h1 style="margin:0">Compare products</h1><button class="btn btn-sm" id="clearCmp">Clear all</button></div>
      <div class="table-wrap"><table class="data compare-table">
        <tr><th></th>${items.map((p) => `<td><div style="position:relative"><a class="thumb-sm" href="#/product/${p.id}" style="${tint(p)};width:100%;height:auto;aspect-ratio:1;font-size:64px">${p.emoji}</a><button class="tool" style="position:absolute;top:6px;right:6px" data-compare="${p.id}" aria-label="Remove">${icon("x", "ico-sm")}</button></div><a href="#/product/${p.id}"><b>${esc(p.name)}</b></a></td>`).join("")}</tr>
        <tr><th>Price</th>${items.map((p) => `<td><b>${money(p.price)}</b>${p.oldPrice ? ` <del class="muted small">${money(p.oldPrice)}</del>` : ""}</td>`).join("")}</tr>
        <tr><th>Rating</th>${items.map((p) => `<td>${starsHtml(p.rating)} ${p.rating}</td>`).join("")}</tr>
        <tr><th>Reviews</th>${items.map((p) => `<td>${p.reviews.toLocaleString("en")}</td>`).join("")}</tr>
        <tr><th>Availability</th>${items.map((p) => `<td>${p.stock ? `<span class="pill success">In stock</span>` : `<span class="pill danger">Sold out</span>`}</td>`).join("")}</tr>
        ${keys.map((k) => `<tr><th>${esc(k)}</th>${items.map((p) => `<td>${esc(val(p, k))}</td>`).join("")}</tr>`).join("")}
        <tr><th></th>${items.map((p) => `<td><button class="btn btn-primary btn-sm" data-add="${p.id}">Add to cart</button></td>`).join("")}</tr>
      </table></div>`;
    $("#clearCmp").onclick = () => { state.compare = []; save("compare"); render(); };
    $$(".compare-table [data-compare]").forEach((b) => b.addEventListener("click", () => setTimeout(render, 0)));
  }

  // ───────────────────────── Admin dashboard ─────────────────────────
  async function viewAdmin(tab, rid) {
    rid = renderId;
    if (!requireUser()) return;
    if (user.role !== "admin") { app.innerHTML = `<div class="empty">${icon("lock")}<h2>Admins only</h2><p>You need an admin account to see this page.</p><a class="btn btn-primary" href="#/account">Back to my account</a></div>`; return; }
    title("Admin");
    loading();
    let orders = [], users = [];
    try { [orders, users] = await Promise.all([DBX().allOrders(), DBX().allUsers()]); }
    catch (err) { if (!stale(rid)) app.innerHTML = `<div class="empty">${icon("alert")}<h2>Couldn't load admin data</h2><p>${esc(err.message)}</p></div>`; return; }
    if (stale(rid)) return;
    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((s, o) => s + o.total, 0);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
    const perDay = days.map((d) => live.filter((o) => o.createdAt >= +d && o.createdAt < +d + 864e5).reduce((s, o) => s + o.total, 0));
    const maxDay = Math.max(1, ...perDay);
    const sold = {}; live.forEach((o) => o.items.forEach((i) => { sold[i.id] = (sold[i.id] || 0) + i.qty; }));
    const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const tabs = [["overview", "Overview"], ["orders", `Orders (${orders.length})`], ["customers", `Customers (${users.length})`], ["products", `Products (${PRODUCTS.length})`]];

    const body = {
      overview: () => `
        <div class="stats">
          <div class="stat"><span>Revenue</span><b>${money(revenue)}</b></div>
          <div class="stat"><span>Orders</span><b>${orders.length}</b></div>
          <div class="stat"><span>Customers</span><b>${users.length}</b></div>
          <div class="stat"><span>Average order</span><b>${money(live.length ? revenue / live.length : 0)}</b></div>
        </div>
        <div class="form-row" style="align-items:start">
          <div class="panel"><div class="panel-title">${icon("chart", "ico-sm")} Revenue, last 7 days</div>
            <div class="chart">${perDay.map((v, i) => `<div class="col" title="${money(v)}"><span>${v ? money(v).replace(/[.,]\d\d(?=\D*$)/, "") : ""}</span><i style="height:${v / maxDay * 100}%"></i><span>${fmtDate(days[i], { weekday: "short" })}</span></div>`).join("")}</div>
          </div>
          <div class="panel"><div class="panel-title">${icon("award", "ico-sm")} Top products</div>
            ${top.length ? top.map(([id, n]) => { const p = byId(id); return p ? `<div class="order-item" style="margin-bottom:10px"><span class="thumb-sm" style="${tint(p)};width:44px;height:44px;font-size:22px">${p.emoji}</span><span class="grow small"><b>${esc(p.name)}</b></span><span class="pill">${n} sold</span></div>` : ""; }).join("") : `<p class="muted">No sales yet.</p>`}
          </div>
        </div>
        <div class="panel" style="margin-top:20px"><div class="panel-title">${icon("alert", "ico-sm")} Low stock</div>
          ${PRODUCTS.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock).slice(0, 8).map((p) => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--border)"><span>${p.emoji} ${esc(p.name)}</span><span class="pill ${p.stock ? "warning" : "danger"}">${p.stock} left</span></div>`).join("")}
        </div>`,
      orders: () => orders.length ? `<div class="table-wrap"><table class="data">
          <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
          ${orders.map((o) => { const s = statusOf(o); return `<tr><td><b>#${esc(o.id)}</b></td><td>${fmtDate(o.createdAt)}</td><td>${esc(o.customerName || o.address.name)}<div class="muted small">${esc(o.email)}</div></td><td>${o.items.reduce((n, i) => n + i.qty, 0)}</td><td><b>${money(o.total)}</b></td>
            <td><select data-status="${esc(o.id)}">${[...STEPS.map(([k, l]) => [k, l]), ["cancelled", "Cancelled"]].map(([k, l]) => `<option value="${k}" ${s.key === k ? "selected" : ""}>${l}</option>`).join("")}</select></td>
            <td><a class="link small" href="#/invoice/${esc(o.id)}">Invoice</a></td></tr>`; }).join("")}
        </table></div>` : `<div class="empty">${icon("package")}<h3>No orders yet</h3></div>`,
      customers: () => `<div class="table-wrap"><table class="data">
          <tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Spent</th><th>Points</th><th>Role</th></tr>
          ${users.map((u) => { const uo = live.filter((o) => o.uid === u.uid); return `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${u.created ? fmtDate(u.created) : "—"}</td><td>${uo.length}</td><td>${money(uo.reduce((s, o) => s + o.total, 0))}</td><td>${(u.points || 0).toLocaleString("en")}</td>
            <td>${u.uid === user.uid ? `<span class="pill dark">Admin (you)</span>` : `<select data-role="${esc(u.uid)}"><option value="customer" ${u.role !== "admin" ? "selected" : ""}>Customer</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option></select>`}</td></tr>`; }).join("")}
        </table></div>`,
      products: () => `<p class="muted small">Stock changes are saved in this browser.</p><div class="table-wrap"><table class="data">
          <tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Rating</th><th>Stock</th></tr>
          ${PRODUCTS.map((p) => `<tr><td><a href="#/product/${p.id}">${p.emoji} <b>${esc(p.name)}</b></a></td><td>${esc(p.brand)}</td><td>${esc(catById(p.category).name)}</td><td>${money(p.price)}</td><td>${p.rating}</td><td><input type="number" min="0" value="${p.stock}" data-stock="${p.id}" style="width:90px;height:34px"></td></tr>`).join("")}
        </table></div>`,
    };

    app.innerHTML = `${crumbs(["Admin"])}
      <div class="toolbar"><div><h1 style="margin:0">Admin dashboard</h1><span class="muted small">${DBX().mode === "firebase" ? "Live data from Firebase" : "Data from this browser (demo mode)"}</span></div><a class="btn btn-sm" href="#/account">Back to account</a></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
      ${body[tab]()}`;
    $$("[data-tab]").forEach((b) => b.onclick = () => { location.hash = b.dataset.tab === "overview" ? "#/admin" : "#/admin/" + b.dataset.tab; });
    $$("[data-status]").forEach((s) => s.onchange = async () => {
      try { await DBX().updateOrder(s.dataset.status, s.value === "cancelled" ? { status: "cancelled", cancelledAt: Date.now() } : { status: s.value, statusManual: true }); toast("Order status updated"); } catch (err) { toast(err.message, "err"); }
    });
    $$("[data-role]").forEach((s) => s.onchange = async () => { try { await DBX().setRole(s.dataset.role, s.value); toast("Role updated"); } catch (err) { toast(err.message, "err"); } });
    $$("[data-stock]").forEach((i) => i.onchange = () => { const p = byId(i.dataset.stock); p.stock = Math.max(0, parseInt(i.value) || 0); state.stock[p.id] = p.stock; save("stock"); toast("Stock updated"); });
  }

  // ───────────────────────── Info pages ─────────────────────────
  function viewHelp() {
    title("Help centre");
    const faqs = [
      ["How much does delivery cost?", `Standard delivery is ${money(4.99)} and free on orders over ${money(FREE_SHIP)}. Express delivery is ${money(9.99)}. Click & collect is always free.`],
      ["How long will my order take?", "Standard: 3–5 business days. Express: 1–2 business days. You can follow every step in My orders."],
      ["Can I cancel my order?", "Yes, while it's still Processing. Go to My orders and press Cancel order."],
      ["How do returns work?", "You can return any unused item within 30 days for a full refund. (In this demo, nothing is really shipped.)"],
      ["How do points work?", "You earn 1 point for every €1 you spend. 100 points are worth €1 off. You can use them at checkout."],
      ["Which discount codes can I use?", "Try WELCOME15, SLAP10, POLQ20, NIKI5 or FREESHIP."],
      ["Is my payment safe?", "This is a demo store and no payment is ever taken. Never enter real card details. Use 4242 4242 4242 4242."],
      ["Where is my account stored?", DBX().mode === "firebase" ? "Your account is stored securely with Firebase and works on every device." : "In demo mode, accounts are saved only in this browser. The owners can turn on real online accounts."],
    ];
    app.innerHTML = `${crumbs(["Help centre"])}<div class="prose" style="margin:0 auto"><h1>Help centre</h1><p class="muted">Answers to the most common questions.</p>
      <div class="faq">${faqs.map(([q, a]) => `<details><summary>${q} ${icon("down", "ico-sm")}</summary><p>${a}</p></details>`).join("")}</div>
      <div class="panel row between wrap" style="margin-top:32px;gap:12px"><div><b>Still need help?</b><div class="muted small">Our team usually replies within a day.</div></div><a class="btn btn-primary" href="#/contact">Contact us</a></div></div>`;
  }
  function viewContact() {
    title("Contact us");
    app.innerHTML = `${crumbs(["Contact"])}<div class="form-row" style="gap:48px;align-items:start">
      <div><h1>Contact us</h1><p class="muted">Questions about an order or a product? We're here to help.</p>
        <div class="perks"><div>${icon("mail")}<div><b>Email</b><span>support@slapababa.example</span></div></div><div>${icon("clock")}<div><b>Hours</b><span>Mon–Sun, 9:00–20:00</span></div></div><div>${icon("pin")}<div><b>Address</b><span>1 Pretend Street, Sofia 1000</span></div></div></div></div>
      <form class="panel form" id="contactForm">
        <div class="form-row"><div class="field"><label>Name</label><input type="text" name="n" required value="${esc(user ? user.name : "")}"></div><div class="field"><label>Email</label><input type="email" name="e" required value="${esc(user ? user.email : "")}"></div></div>
        <div class="field"><label>Topic</label><select><option>Order question</option><option>Returns</option><option>Product question</option><option>Something else</option></select></div>
        <div class="field"><label>Message</label><textarea rows="5" required></textarea></div>
        <button class="btn btn-primary">Send message</button>
      </form></div>`;
    $("#contactForm").onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast("Thanks! We'll get back to you soon"); };
  }
  function viewAbout() {
    title("About");
    app.innerHTML = `${crumbs(["About"])}<div class="prose" style="margin:0 auto">
      <h1>About Slapababa</h1>
      <p>Slapababa is a demo online store built by <b>Niki</b> and <b>Polq</b>. It has ${PRODUCTS.length} products from ${new Set(PRODUCTS.map((p) => p.brand)).size} brands in ${CATEGORIES.length} categories, with search, filters, a cart, discount codes, checkout, accounts, order tracking, reviews, a wishlist, product comparison and an admin dashboard.</p>
      <p>No real products are sold and no payments are taken.</p>
      <h3>How it's built</h3>
      <ul><li><code>products.js</code>: products, categories, brands and discount codes</li><li><code>app.js</code>: all the pages and what happens when you click</li><li><code>db.js</code>: accounts, orders and reviews (browser mode or Firebase)</li><li><code>styles.css</code>: the design</li></ul>
      <p>Accounts are currently in <b>${DBX().mode === "firebase" ? "Firebase (online) mode" : "browser mode"}</b>.</p>
      <a class="btn btn-primary" href="../">Play our Snake game</a></div>`;
  }
  function viewGiftCards() {
    title("Gift cards");
    app.innerHTML = `${crumbs(["Gift cards"])}<div class="hero" style="grid-template-columns:1fr 1fr"><div><span class="eyebrow">${icon("gift", "ico-sm")} The perfect present</span><h1>Slapababa gift cards</h1><p>Let them choose. Gift cards are delivered by email and never expire.</p>
      <div class="opts" id="gcAmounts">${[25, 50, 100, 200].map((a, i) => `<button class="opt ${i === 1 ? "on" : ""}" data-gc="${a}">${money(a)}</button>`).join("")}</div>
      <button class="btn btn-primary btn-lg" id="gcBuy" style="margin-top:20px">Send a gift card</button></div>
      <div class="cc" style="max-width:420px;width:100%;background:linear-gradient(135deg,#4f46e5,#0f172a)"><div class="row between"><b style="font-family:Inter">Slapababa</b>${icon("gift")}</div><div class="num" id="gcVal" style="font-family:Inter;font-size:36px;font-weight:800">${money(50)}</div><div class="row"><span>Gift card</span><span>Never expires</span></div></div></div>`;
    $$("[data-gc]").forEach((b) => b.onclick = () => { $$("[data-gc]").forEach((x) => x.classList.toggle("on", x === b)); $("#gcVal").textContent = money(+b.dataset.gc); });
    $("#gcBuy").onclick = () => toast("Gift cards are coming soon!");
  }
  function viewLegal(kind) {
    title(kind === "terms" ? "Terms" : "Privacy");
    app.innerHTML = `${crumbs([kind === "terms" ? "Terms" : "Privacy"])}<div class="prose" style="margin:0 auto">${kind === "terms" ? `
      <h1>Terms of use</h1><p>Slapababa is a demonstration website. No goods are sold, no contracts are formed and no payments are processed. Product names, brands, prices and reviews are made up.</p><p>Please don't enter real payment details or reuse an important password.</p>` : `
      <h1>Privacy policy</h1><p>${DBX().mode === "firebase" ? "Account details (name, email, addresses) and orders are stored in Google Firebase so you can sign in on any device. Passwords are handled by Firebase Authentication and are never visible to the shop owners." : "In demo mode, everything you enter (account, cart, orders) is stored only in your own browser's local storage and is never sent anywhere."}</p><p>The shop remembers your cart, wishlist, theme and currency in your browser. You can clear this at any time by clearing your browser data.</p>`}</div>`;
  }
  function view404() {
    title("Not found");
    app.innerHTML = `<div class="empty" style="margin-top:20px">${icon("search")}<h2>We can't find that page</h2><p>It may have moved, or the link might be wrong.</p><a class="btn btn-primary" href="#/">Back to home</a></div>`;
  }

  // ───────────────────────── Cookie notice ─────────────────────────
  function cookieNotice() {
    if (ls.get("cookieOk", false)) return;
    $("#cookie").innerHTML = `<div class="cookie no-print"><b>We use local storage</b><p class="muted" style="margin:6px 0 14px">We save your cart, wishlist and settings in your browser so they're here next time.</p><div class="row"><button class="btn btn-primary btn-sm" id="cookieOk">Got it</button><a class="btn btn-sm btn-ghost" href="#/privacy">Learn more</a></div></div>`;
    $("#cookieOk").onclick = () => { ls.set("cookieOk", true); $("#cookie").innerHTML = ""; };
  }

  // Keep tabs in sync
  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith("slapshop_")) return;
    const k = e.key.slice(9);
    if (k === "cart2") state.cart = ls.get("cart2", []);
    else if (k in state) state[k] = ls.get(k, state[k]);
    updateHeader();
  });

  // ───────────────────────── Start ─────────────────────────
  buildChrome();
  updateHeader();
  loading();
  window.DB.ready.then(() => {
    $("#modeLabel").textContent = DBX().mode === "firebase" ? "Accounts: online (Firebase)" : "Accounts: browser mode";
    let first = true;
    DBX().onAuthChange((u) => {
      const was = user && user.uid;
      user = u;
      updateHeader();
      if (first) { first = false; render(); cookieNotice(); }
      else if ((u && u.uid) !== was && /^\/(account|admin)/.test(route().path)) render();
    });
  });
})();
