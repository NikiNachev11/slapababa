// Slapababa Shop – a demo online store that runs fully in the browser.
// All data (accounts, cart, orders) is saved in localStorage on this device only.
// This is NOT secure and no real payments happen. It's for fun and learning.

(function () {
  "use strict";

  // ---------- Small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const app = $("#app");

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "€" + Number(n).toFixed(2);
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const catById = (id) => CATEGORIES.find((c) => c.id === id);
  const grad = (colors, angle = 135) => `background: linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`;
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  function stars(r) {
    const full = Math.round(r);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  // Seeded random so fake reviews look the same every time
  function seeded(seed) {
    let s = 0;
    for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ---------- Storage ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("slapshop_" + key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem("slapshop_" + key, JSON.stringify(val)); } catch (e) { /* storage full or blocked */ }
    },
  };

  const state = {
    users: store.get("users", {}),
    session: store.get("session", null), // email of logged in user
    cart: store.get("cart", []), // [{key, id, qty, opts}]
    wish: store.get("wish", []),
    orders: store.get("orders", {}), // { email|"guest": [order] }
    reviews: store.get("reviews", {}), // { productId: [review] }
    recent: store.get("recent", []),
    coupon: store.get("coupon", null),
  };
  const save = (key) => store.set(key, state[key]);

  const currentUser = () => (state.session ? state.users[state.session] : null);

  // ---------- Toasts ----------
  function toast(msg, type = "ok") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ---------- Password hashing (demo only!) ----------
  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + ":" + password);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback for very old browsers / non-https pages
    let h = 0;
    for (const b of data) h = (h * 31 + b) >>> 0;
    return "x" + h.toString(16);
  }

  // ---------- Cart ----------
  const cartKey = (id, opts) => id + "|" + JSON.stringify(opts || {});

  function addToCart(id, qty = 1, opts = {}) {
    const p = byId(id);
    if (!p) return;
    const key = cartKey(id, opts);
    const line = state.cart.find((l) => l.key === key);
    const already = state.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
    if (already + qty > p.stock) { toast(`Sorry, only ${p.stock} in stock`, "err"); return; }
    if (line) line.qty += qty;
    else state.cart.push({ key, id, qty, opts });
    save("cart");
    updateHeader();
    toast(`🛒 Added "${p.name}" to cart`);
  }

  function setQty(key, qty) {
    const line = state.cart.find((l) => l.key === key);
    if (!line) return;
    const p = byId(line.id);
    line.qty = Math.max(1, Math.min(p.stock, qty));
    save("cart");
  }

  function removeLine(key) {
    state.cart = state.cart.filter((l) => l.key !== key);
    save("cart");
  }

  const FREE_SHIPPING_FROM = 50;
  const SHIPPING_METHODS = {
    standard: { label: "Standard delivery", days: "3–5 days", price: 4.99 },
    express: { label: "Express delivery", days: "1–2 days", price: 9.99 },
    pickup: { label: "Pick up at store", days: "Tomorrow", price: 0 },
  };

  function cartTotals(shipMethod = "standard") {
    const items = state.cart.map((l) => ({ ...l, product: byId(l.id) })).filter((l) => l.product);
    const subtotal = items.reduce((s, l) => s + l.product.price * l.qty, 0);
    const count = items.reduce((s, l) => s + l.qty, 0);
    let discount = 0;
    let shipping = SHIPPING_METHODS[shipMethod].price;
    if (subtotal >= FREE_SHIPPING_FROM && shipMethod === "standard") shipping = 0;
    const c = state.coupon && COUPONS[state.coupon];
    if (c) {
      if (c.type === "percent") discount = subtotal * c.value / 100;
      if (c.type === "fixed") discount = Math.min(subtotal, c.value);
      if (c.type === "shipping") shipping = 0;
    }
    if (!items.length) shipping = 0;
    const total = Math.max(0, subtotal - discount + shipping);
    return { items, subtotal, discount, shipping, total, count };
  }

  // ---------- Wishlist ----------
  function toggleWish(id) {
    const p = byId(id);
    if (state.wish.includes(id)) {
      state.wish = state.wish.filter((x) => x !== id);
      toast(`Removed "${p.name}" from wishlist`);
    } else {
      state.wish.push(id);
      toast(`❤️ Saved "${p.name}" to wishlist`);
    }
    save("wish");
    updateHeader();
  }

  // ---------- Reviews ----------
  const REVIEW_NAMES = ["Maria", "Georgi", "Elena", "Ivan", "Polq", "Niki", "Alex", "Sofia", "Dimitar", "Anna", "Peter", "Viki"];
  const REVIEW_TEXTS = {
    5: ["Absolutely love it! Would buy again.", "Perfect, exactly as described.", "Best purchase this year 🔥", "Super quality, fast delivery."],
    4: ["Very good, just a small thing I'd change.", "Great value for the money.", "Works well, happy with it.", "Nice! Delivery took a bit longer."],
    3: ["It's okay. Does the job.", "Average quality, but fine for the price.", "Not bad, not amazing."],
    2: ["Expected more, to be honest.", "Arrived a little scratched."],
  };

  function getReviews(p) {
    const rnd = seeded(p.id);
    const fake = [];
    for (let i = 0; i < 5; i++) {
      let r = Math.round(p.rating + (rnd() - 0.6) * 2);
      r = Math.max(2, Math.min(5, r));
      const texts = REVIEW_TEXTS[r];
      fake.push({
        name: REVIEW_NAMES[Math.floor(rnd() * REVIEW_NAMES.length)],
        rating: r,
        text: texts[Math.floor(rnd() * texts.length)],
        date: Date.now() - Math.floor(rnd() * 200 + 2) * 86400000,
        verified: rnd() > 0.3,
      });
    }
    return [...(state.reviews[p.id] || []), ...fake];
  }

  // ---------- Header / nav ----------
  function updateHeader() {
    const count = state.cart.reduce((s, l) => s + l.qty, 0);
    const cc = $("#cartCount");
    cc.textContent = count;
    cc.classList.toggle("zero", count === 0);
    const wc = $("#wishCount");
    wc.textContent = state.wish.length;
    wc.classList.toggle("zero", state.wish.length === 0);
    const u = currentUser();
    $("#accountName").textContent = u ? u.name.split(" ")[0] : "Log in";
  }

  function buildNav() {
    $("#catbar").innerHTML =
      `<a href="#/shop">🛍️ All</a><a href="#/deals">🔥 Deals</a>` +
      CATEGORIES.map((c) => `<a href="#/shop?cat=${c.id}" data-cat="${c.id}">${c.emoji} ${esc(c.name)}</a>`).join("");
    $("#searchCat").innerHTML = `<option value="">All</option>` + CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    $("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#searchInput").value.trim();
      const cat = $("#searchCat").value;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("cat", cat);
      location.hash = "#/shop" + (params.toString() ? "?" + params : "");
    });
    $("#year").textContent = new Date().getFullYear();

    // Theme
    const theme = store.get("theme", window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(theme);
    $("#themeBtn").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  }

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    $("#themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
    store.set("theme", t);
  }

  // ---------- Product card ----------
  function productCard(p) {
    const sale = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const wished = state.wish.includes(p.id);
    return `
      <article class="card">
        <a href="#/product/${p.id}" class="thumb" style="${grad(p.colors)}">
          <span class="em">${p.emoji}</span>
          ${sale ? `<span class="tag-sale">-${sale}%</span>` : ""}
        </a>
        <button class="wish-btn" data-wish="${p.id}" title="Wishlist">${wished ? "❤️" : "🤍"}</button>
        <div class="card-body">
          <span class="card-cat">${esc(catById(p.category).name)}</span>
          <a href="#/product/${p.id}" class="card-title">${esc(p.name)}</a>
          <span class="stars">${stars(p.rating)}<small>(${p.reviews.toLocaleString()})</small></span>
          <span class="price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</span>
          ${p.stock <= 10 ? `<span class="low-stock">Only ${p.stock} left!</span>` : ""}
          <button class="btn btn-primary btn-sm" data-add="${p.id}">Add to cart</button>
        </div>
      </article>`;
  }

  // Event delegation for buttons that appear on many pages
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { e.preventDefault(); addToCart(add.dataset.add, 1, defaultOpts(byId(add.dataset.add))); return; }
    const wish = e.target.closest("[data-wish]");
    if (wish) {
      e.preventDefault();
      toggleWish(wish.dataset.wish);
      if (route().path === "/wishlist") render();
      else wish.textContent = state.wish.includes(wish.dataset.wish) ? "❤️" : "🤍";
    }
  });

  // Products in fashion get sizes, some categories get colours
  const SIZES = ["XS", "S", "M", "L", "XL"];
  const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44"];
  const COLORS = [["Black", "#1f2937"], ["White", "#f3f4f6"], ["Blue", "#2563eb"], ["Red", "#dc2626"], ["Green", "#16a34a"]];
  function productOptions(p) {
    const o = {};
    if (p.category === "fashion") {
      if (p.tags.includes("shoes")) o.size = SHOE_SIZES;
      else if (!p.tags.includes("glasses") && !p.tags.includes("bag")) o.size = SIZES;
      o.color = COLORS;
    } else if (["electronics", "sports"].includes(p.category) && p.price > 40) {
      o.color = COLORS.slice(0, 3);
    }
    return o;
  }
  function defaultOpts(p) {
    const o = productOptions(p);
    const d = {};
    if (o.size) d.size = o.size[Math.floor(o.size.length / 2)];
    if (o.color) d.color = o.color[0][0];
    return d;
  }
  const optsText = (opts) => Object.entries(opts || {}).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${esc(v)}`).join(" · ");

  // ---------- Router ----------
  function route() {
    const h = location.hash.slice(1) || "/";
    const [path, query] = h.split("?");
    return { path: path || "/", params: new URLSearchParams(query || "") };
  }

  const routes = [
    [/^\/$/, renderHome],
    [/^\/shop$/, renderShop],
    [/^\/deals$/, () => renderShop(true)],
    [/^\/product\/(\w+)$/, renderProduct],
    [/^\/cart$/, renderCart],
    [/^\/checkout$/, renderCheckout],
    [/^\/order\/([\w-]+)$/, renderOrderDone],
    [/^\/login$/, () => renderAuth("login")],
    [/^\/signup$/, () => renderAuth("signup")],
    [/^\/account$/, () => renderAccount("profile")],
    [/^\/account\/orders$/, () => renderAccount("orders")],
    [/^\/account\/addresses$/, () => renderAccount("addresses")],
    [/^\/account\/security$/, () => renderAccount("security")],
    [/^\/wishlist$/, renderWishlist],
    [/^\/help$/, renderHelp],
    [/^\/about$/, renderAbout],
  ];

  let heroTimer = null;
  function render() {
    clearInterval(heroTimer);
    const { path } = route();
    const hit = routes.find(([re]) => re.test(path));
    if (hit) hit[1](...path.match(hit[0]).slice(1));
    else renderNotFound();
    if (path !== "/shop" && path !== "/deals") { $("#searchInput").value = ""; $("#searchCat").value = ""; }
    $$("#catbar a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === location.hash));
    updateHeader();
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  function setTitle(t) { document.title = t ? `${t} · Slapababa Shop` : "Slapababa Shop"; }

  // ---------- Home ----------
  const SLIDES = [
    { title: "Mega Autumn Sale 🍂", text: "Up to 30% off on hundreds of products. Use code SLAP10 for an extra 10%!", art: ["🛍️", "🎁", "💸"], link: "#/deals", cta: "Shop deals", bg: "linear-gradient(120deg, #6d28d9, #db2777 60%, #f59e0b)" },
    { title: "New tech is here 💻", text: "Phones, laptops, headphones and more. Free delivery over €50.", art: ["📱", "🎧", "⌚"], link: "#/shop?cat=electronics", cta: "See electronics", bg: "linear-gradient(120deg, #1e3a8a, #4f46e5 50%, #06b6d4)" },
    { title: "Play time! 🎮", text: "Toys, games and puzzles for the whole family.", art: ["🧸", "🎲", "🤖"], link: "#/shop?cat=toys", cta: "Shop toys", bg: "linear-gradient(120deg, #9333ea, #ec4899 60%, #fb7185)" },
  ];

  function renderHome() {
    setTitle("");
    const deals = PRODUCTS.filter((p) => p.oldPrice).sort((a, b) => (b.oldPrice - b.price) / b.oldPrice - (a.oldPrice - a.price) / a.oldPrice).slice(0, 8);
    const top = [...PRODUCTS].sort((a, b) => b.rating * Math.log(b.reviews) - a.rating * Math.log(a.reviews)).slice(0, 8);
    const fresh = [...PRODUCTS].sort((a, b) => b.added - a.added).slice(0, 8);
    const recent = state.recent.map(byId).filter(Boolean);

    app.innerHTML = `
      <section class="hero" id="hero"></section>
      <section class="perks">
        <div class="perk"><span class="ico">🚚</span><div><b>Free delivery</b><small>On orders over €${FREE_SHIPPING_FROM}</small></div></div>
        <div class="perk"><span class="ico">↩️</span><div><b>30 day returns</b><small>Changed your mind? No problem</small></div></div>
        <div class="perk"><span class="ico">🔒</span><div><b>Pretend-secure</b><small>Demo payments only</small></div></div>
        <div class="perk"><span class="ico">💬</span><div><b>Support 24/7</b><small>Niki &amp; Polq are on it</small></div></div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Shop by category</h2><a href="#/shop" class="link-btn">See all →</a></div>
        <div class="cat-grid">
          ${CATEGORIES.map((c) => `
            <a class="cat-tile" href="#/shop?cat=${c.id}" style="${grad(c.colors)}">
              <span class="ico">${c.emoji}</span>${esc(c.name)}
              <small>${PRODUCTS.filter((p) => p.category === c.id).length} products</small>
            </a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>🔥 Deals of the day <span class="countdown" id="countdown"></span></h2><a href="#/deals" class="link-btn">All deals →</a></div>
        <div class="grid">${deals.map(productCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>⭐ Best sellers</h2><a href="#/shop?sort=rating" class="link-btn">More →</a></div>
        <div class="grid">${top.map(productCard).join("")}</div>
      </section>

      <section class="section newsletter">
        <div><h2>Get 10% off your first order</h2><p style="margin:0">Join our newsletter for secret deals (we won't actually send anything 😉)</p></div>
        <form id="newsForm"><input type="email" required placeholder="your@email.com"><button class="btn btn-accent">Subscribe</button></form>
      </section>

      <section class="section">
        <div class="section-head"><h2>🆕 New arrivals</h2><a href="#/shop?sort=new" class="link-btn">More →</a></div>
        <div class="grid">${fresh.map(productCard).join("")}</div>
      </section>

      ${recent.length ? `
      <section class="section">
        <div class="section-head"><h2>👀 Recently viewed</h2></div>
        <div class="scroll-row">${recent.map(productCard).join("")}</div>
      </section>` : ""}
    `;

    // Hero slider
    let slide = 0;
    const hero = $("#hero");
    function showSlide(i) {
      slide = (i + SLIDES.length) % SLIDES.length;
      const s = SLIDES[slide];
      hero.style.background = s.bg;
      hero.innerHTML = `
        <div><h1>${s.title}</h1><p>${s.text}</p><a class="btn" href="${s.link}">${s.cta} →</a></div>
        <div class="hero-art">${s.art.map((a) => `<span>${a}</span>`).join("")}</div>
        <div class="hero-dots">${SLIDES.map((_, j) => `<button data-slide="${j}" class="${j === slide ? "active" : ""}" aria-label="Slide ${j + 1}"></button>`).join("")}</div>`;
    }
    showSlide(0);
    hero.addEventListener("click", (e) => { const b = e.target.closest("[data-slide]"); if (b) showSlide(+b.dataset.slide); });

    // Countdown to midnight
    const cd = $("#countdown");
    function tick() {
      if (!document.body.contains(cd)) return;
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0);
      const s = Math.floor((end - now) / 1000);
      cd.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
    }
    tick();
    let ticks = 0;
    heroTimer = setInterval(() => { tick(); if (++ticks % 6 === 0) showSlide(slide + 1); }, 1000);

    $("#newsForm").addEventListener("submit", (e) => { e.preventDefault(); toast("🎉 Subscribed! Your code is SLAP10"); e.target.reset(); });
  }

  // ---------- Shop / catalog ----------
  const PAGE_SIZE = 12;
  function renderShop(dealsOnly = false) {
    const { params } = route();
    const q = (params.get("q") || "").toLowerCase();
    const cats = (params.get("cat") || "").split(",").filter(Boolean);
    const sort = params.get("sort") || "popular";
    const min = parseFloat(params.get("min")) || 0;
    const max = parseFloat(params.get("max")) || Infinity;
    const minRating = parseFloat(params.get("rating")) || 0;
    const inStock = params.get("stock") === "1";
    const onSale = dealsOnly || params.get("sale") === "1";
    const page = Math.max(1, parseInt(params.get("page")) || 1);

    let list = PRODUCTS.filter((p) => {
      if (cats.length && !cats.includes(p.category)) return false;
      if (q) {
        const hay = (p.name + " " + p.tags.join(" ") + " " + p.description + " " + catById(p.category).name).toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (p.price < min || p.price > max) return false;
      if (p.rating < minRating) return false;
      if (inStock && p.stock <= 0) return false;
      if (onSale && !p.oldPrice) return false;
      return true;
    });

    const sorters = {
      popular: (a, b) => b.reviews - a.reviews,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      new: (a, b) => b.added - a.added,
      name: (a, b) => a.name.localeCompare(b.name),
      discount: (a, b) => ((b.oldPrice || b.price) - b.price) / (b.oldPrice || b.price) - ((a.oldPrice || a.price) - a.price) / (a.oldPrice || a.price),
    };
    list.sort(sorters[sort] || sorters.popular);

    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const pageList = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    let title = dealsOnly ? "🔥 Deals" : "All products";
    if (cats.length === 1) title = `${catById(cats[0])?.emoji || ""} ${catById(cats[0])?.name || "Products"}`;
    if (q) title = `Results for "${esc(params.get("q"))}"`;
    setTitle(dealsOnly ? "Deals" : "Shop");

    $("#searchInput").value = params.get("q") || "";
    $("#searchCat").value = cats.length === 1 ? cats[0] : "";

    app.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a> › ${dealsOnly ? "Deals" : "Shop"}</div>
      <div class="shop-layout">
        <aside class="filters collapsed" id="filters">
          <div class="filter-group">
            <h3>Category</h3>
            ${CATEGORIES.map((c) => `<label><input type="checkbox" name="cat" value="${c.id}" ${cats.includes(c.id) ? "checked" : ""}> ${c.emoji} ${esc(c.name)}</label>`).join("")}
          </div>
          <div class="filter-group">
            <h3>Price (€)</h3>
            <div class="price-inputs">
              <input type="number" id="fMin" placeholder="Min" min="0" value="${min || ""}">
              <input type="number" id="fMax" placeholder="Max" min="0" value="${isFinite(max) ? max : ""}">
            </div>
          </div>
          <div class="filter-group">
            <h3>Rating</h3>
            ${[4.5, 4, 3].map((r) => `<label><input type="radio" name="rating" value="${r}" ${minRating === r ? "checked" : ""}> <span class="stars">${stars(r)}</span> ${r}+</label>`).join("")}
            <label><input type="radio" name="rating" value="0" ${!minRating ? "checked" : ""}> Any</label>
          </div>
          <div class="filter-group">
            <label><input type="checkbox" id="fSale" ${onSale ? "checked" : ""} ${dealsOnly ? "disabled" : ""}> On sale only</label>
            <label><input type="checkbox" id="fStock" ${inStock ? "checked" : ""}> In stock only</label>
          </div>
          <div class="filter-group" style="display:grid;gap:8px">
            <button class="btn btn-primary" id="applyFilters">Apply filters</button>
            <a class="btn" href="${dealsOnly ? "#/deals" : "#/shop"}">Clear all</a>
          </div>
        </aside>
        <section>
          <div class="toolbar">
            <div>
              <h1>${title}</h1>
              <span class="muted">${list.length} product${list.length === 1 ? "" : "s"}</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn filters-toggle" id="toggleFilters">⚙️ Filters</button>
              <select id="sortSel" aria-label="Sort">
                ${[["popular", "Most popular"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["rating", "Top rated"], ["new", "Newest"], ["discount", "Biggest discount"], ["name", "Name A–Z"]]
                  .map(([v, l]) => `<option value="${v}" ${sort === v ? "selected" : ""}>${l}</option>`).join("")}
              </select>
            </div>
          </div>
          ${pageList.length ? `<div class="grid">${pageList.map(productCard).join("")}</div>` : `
            <div class="empty"><div class="ico">🔍</div><h2>No products found</h2><p class="muted">Try a different search or clear the filters.</p><a class="btn btn-primary" href="#/shop">See all products</a></div>`}
          ${pages > 1 ? `<div class="pagination">
            <button class="btn btn-sm" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>‹</button>
            ${Array.from({ length: pages }, (_, i) => `<button class="btn btn-sm ${i + 1 === page ? "active" : ""}" data-page="${i + 1}">${i + 1}</button>`).join("")}
            <button class="btn btn-sm" data-page="${page + 1}" ${page === pages ? "disabled" : ""}>›</button>
          </div>` : ""}
        </section>
      </div>`;

    if (window.innerWidth > 900) $("#filters").classList.remove("collapsed");

    function go(changes) {
      const p = new URLSearchParams(route().params);
      for (const [k, v] of Object.entries(changes)) { if (v === "" || v == null) p.delete(k); else p.set(k, v); }
      if (!("page" in changes)) p.delete("page");
      location.hash = "#" + route().path + (p.toString() ? "?" + p : "");
    }

    $("#sortSel").addEventListener("change", (e) => go({ sort: e.target.value }));
    $("#toggleFilters").addEventListener("click", () => $("#filters").classList.toggle("collapsed"));
    $$("[data-page]").forEach((b) => b.addEventListener("click", () => go({ page: b.dataset.page })));
    $("#applyFilters").addEventListener("click", () => {
      go({
        cat: $$("input[name=cat]:checked").map((i) => i.value).join(","),
        min: $("#fMin").value,
        max: $("#fMax").value,
        rating: ($("input[name=rating]:checked") || {}).value === "0" ? "" : ($("input[name=rating]:checked") || {}).value,
        sale: !dealsOnly && $("#fSale").checked ? "1" : "",
        stock: $("#fStock").checked ? "1" : "",
      });
    });
    // Instant filtering for checkboxes on desktop
    $$("#filters input[type=checkbox], #filters input[type=radio]").forEach((i) => i.addEventListener("change", () => {
      if (window.innerWidth > 900) $("#applyFilters").click();
    }));
  }

  // ---------- Product page ----------
  function renderProduct(id) {
    const p = byId(id);
    if (!p) return renderNotFound();
    setTitle(p.name);
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 10);
    save("recent");

    const cat = catById(p.category);
    const opts = productOptions(p);
    const chosen = defaultOpts(p);
    const reviews = getReviews(p);
    const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
    const sale = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const angles = [135, 45, 200, 300];
    const delivery = new Date(Date.now() + 3 * 86400000);

    // rating distribution
    const dist = [5, 4, 3, 2, 1].map((s) => {
      const r = seeded(p.id + s)();
      const base = { 5: p.rating >= 4.5 ? 70 : 50, 4: 25, 3: 10, 2: 4, 1: 2 }[s];
      return [s, Math.round(base * (0.7 + r * 0.6))];
    });
    const distTotal = dist.reduce((s, [, n]) => s + n, 0);

    app.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a> › <a href="#/shop?cat=${cat.id}">${esc(cat.name)}</a> › ${esc(p.name)}</div>
      <div class="product-page">
        <div>
          <div class="gallery-main" id="galleryMain" style="${grad(p.colors)}">
            <span class="em">${p.emoji}</span>
            ${sale ? `<span class="tag-sale" style="font-size:16px">-${sale}%</span>` : ""}
          </div>
          <div class="gallery-thumbs">
            ${angles.map((a, i) => `<button data-angle="${a}" class="${i === 0 ? "active" : ""}" style="${grad(p.colors, a)}">${p.emoji}</button>`).join("")}
          </div>
        </div>
        <div class="product-info">
          <span class="card-cat">${cat.emoji} ${esc(cat.name)}</span>
          <h1>${esc(p.name)}</h1>
          <a href="#reviews" class="stars" id="toReviews">${stars(p.rating)} <small>${p.rating} · ${p.reviews.toLocaleString()} reviews</small></a>
          <div class="price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del><span class="save-pill">Save ${money(p.oldPrice - p.price)}</span>` : ""}</div>
          <p>${esc(p.description)}</p>

          ${opts.size ? `<strong>Size</strong><div class="options" id="sizeOpts">${opts.size.map((s) => `<button class="option ${chosen.size === s ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}</div>` : ""}
          ${opts.color ? `<strong>Colour: <span id="colorName">${chosen.color}</span></strong><div class="options" id="colorOpts">${opts.color.map(([n, c]) => `<button class="swatch ${chosen.color === n ? "active" : ""}" data-color="${n}" title="${n}" style="background:${c}"></button>`).join("")}</div>` : ""}

          <div class="buy-row">
            <div class="qty"><button id="qMinus" aria-label="Less">−</button><input id="qInput" type="number" value="1" min="1" max="${p.stock}"><button id="qPlus" aria-label="More">+</button></div>
            <button class="btn btn-primary" id="addBtn" ${p.stock ? "" : "disabled"}>🛒 Add to cart</button>
            <button class="btn btn-accent" id="buyNow" ${p.stock ? "" : "disabled"}>⚡ Buy now</button>
            <button class="btn" data-wish="${p.id}" id="wishBtn">${state.wish.includes(p.id) ? "❤️" : "🤍"}</button>
          </div>
          <ul class="info-list">
            <li>${p.stock > 10 ? "✅ In stock" : p.stock > 0 ? `⚠️ Only ${p.stock} left in stock` : "❌ Out of stock"}</li>
            <li>🚚 Get it by <b>${delivery.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</b>${p.price >= FREE_SHIPPING_FROM ? " · Free delivery" : ""}</li>
            <li>↩️ Free 30-day returns</li>
            <li>🛡️ 2 year warranty</li>
            <li>🏷️ ${p.tags.map((t) => `<a href="#/shop?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(" ")}</li>
          </ul>
        </div>
      </div>

      <div class="tabs" id="tabs">
        <button class="active" data-tab="desc">Description</button>
        <button data-tab="specs">Details</button>
        <button data-tab="reviews" id="reviewsTab">Reviews (${reviews.length})</button>
      </div>
      <div class="tab-panel" id="tabPanel"></div>

      <section class="section">
        <div class="section-head"><h2>You might also like</h2><a class="link-btn" href="#/shop?cat=${cat.id}">More ${esc(cat.name)} →</a></div>
        <div class="grid">${related.map(productCard).join("")}</div>
      </section>`;

    // Gallery
    $$(".gallery-thumbs button").forEach((b) => b.addEventListener("click", () => {
      $$(".gallery-thumbs button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $("#galleryMain").style.background = `linear-gradient(${b.dataset.angle}deg, ${p.colors[0]}, ${p.colors[1]})`;
      $("#galleryMain .em").style.transform = `rotate(${(+b.dataset.angle % 40) - 20}deg) scale(1.05)`;
    }));

    // Options
    $$("[data-size]").forEach((b) => b.addEventListener("click", () => {
      chosen.size = b.dataset.size;
      $$("[data-size]").forEach((x) => x.classList.toggle("active", x === b));
    }));
    $$("[data-color]").forEach((b) => b.addEventListener("click", () => {
      chosen.color = b.dataset.color;
      $("#colorName").textContent = chosen.color;
      $$("[data-color]").forEach((x) => x.classList.toggle("active", x === b));
    }));

    // Quantity
    const qInput = $("#qInput");
    const clampQ = () => { qInput.value = Math.max(1, Math.min(p.stock, parseInt(qInput.value) || 1)); };
    $("#qMinus").addEventListener("click", () => { qInput.value = +qInput.value - 1; clampQ(); });
    $("#qPlus").addEventListener("click", () => { qInput.value = +qInput.value + 1; clampQ(); });
    qInput.addEventListener("change", clampQ);
    $("#addBtn").addEventListener("click", () => addToCart(p.id, +qInput.value, { ...chosen }));
    $("#buyNow").addEventListener("click", () => { addToCart(p.id, +qInput.value, { ...chosen }); location.hash = "#/checkout"; });

    // Tabs
    const panels = {
      desc: () => `
        <h3>About this product</h3>
        <p>${esc(p.description)}</p>
        <p>This ${esc(p.name)} is one of our customers' favourites in ${esc(cat.name)}. It is carefully packed and shipped from our (imaginary) warehouse in Sofia. If you don't love it, send it back within 30 days.</p>
        <ul><li>High quality materials</li><li>Tested by Niki &amp; Polq</li><li>Comes in eco-friendly packaging</li></ul>`,
      specs: () => `
        <table style="width:100%;border-collapse:collapse">
          ${[["Product ID", p.id.toUpperCase()], ["Category", cat.name], ["Brand", "Slapababa " + cat.name.split(" ")[0]], ["Weight", (seeded(p.id)() * 3 + 0.2).toFixed(1) + " kg"],
             ["In stock", p.stock + " pcs"], ["Warranty", "2 years"], ["Tags", p.tags.join(", ")]]
            .map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid var(--border);color:var(--muted);width:40%">${k}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(v)}</td></tr>`).join("")}
        </table>`,
      reviews: () => {
        const u = currentUser();
        return `
          <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start">
            <div>
              <div style="font-size:44px;font-weight:800">${p.rating}</div>
              <div class="stars">${stars(p.rating)}</div>
              <div class="muted">${p.reviews.toLocaleString()} ratings</div>
            </div>
            <div class="rating-bars" style="flex:1">
              ${dist.map(([s, n]) => `<div class="rating-bar"><span>${s} ★</span><div><i style="width:${Math.round(n / distTotal * 100)}%"></i></div><span>${Math.round(n / distTotal * 100)}%</span></div>`).join("")}
            </div>
          </div>
          <h3>Write a review</h3>
          ${u ? `
            <form class="form" id="reviewForm">
              <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((i) => `<span data-star="${i}" class="on">★</span>`).join("")}</div>
              <textarea id="reviewText" rows="3" placeholder="What did you think?" required maxlength="500"></textarea>
              <button class="btn btn-primary" style="justify-self:start">Post review</button>
            </form>` : `<p class="muted"><a class="link-btn" href="#/login?next=${encodeURIComponent("/product/" + p.id)}">Log in</a> to write a review.</p>`}
          <h3>What customers say</h3>
          ${getReviews(p).map((r) => `
            <div class="review">
              <div class="review-head"><b>${esc(r.name)} ${r.verified ? `<span class="status delivered">Verified buyer</span>` : ""}</b><span class="muted">${fmtDate(r.date)}</span></div>
              <div class="stars">${stars(r.rating)}</div>
              <div>${esc(r.text)}</div>
            </div>`).join("")}`;
      },
    };
    function showTab(t) {
      $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
      $("#tabPanel").innerHTML = panels[t]();
      if (t === "reviews") bindReviewForm();
    }
    function bindReviewForm() {
      const form = $("#reviewForm");
      if (!form) return;
      let rating = 5;
      $$("[data-star]").forEach((s) => s.addEventListener("click", () => {
        rating = +s.dataset.star;
        $$("[data-star]").forEach((x) => x.classList.toggle("on", +x.dataset.star <= rating));
      }));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = $("#reviewText").value.trim();
        if (!text) return;
        const u = currentUser();
        const bought = (state.orders[u.email] || []).some((o) => o.items.some((i) => i.id === p.id));
        (state.reviews[p.id] = state.reviews[p.id] || []).unshift({ name: u.name, rating, text, date: Date.now(), verified: bought });
        save("reviews");
        toast("⭐ Thanks for your review!");
        $("#reviewsTab").textContent = `Reviews (${getReviews(p).length})`;
        showTab("reviews");
      });
    }
    $$("#tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
    $("#toReviews").addEventListener("click", (e) => { e.preventDefault(); showTab("reviews"); $("#tabs").scrollIntoView({ behavior: "smooth" }); });
    showTab("desc");
  }

  // ---------- Cart ----------
  function renderCart() {
    setTitle("Cart");
    const t = cartTotals();
    if (!t.items.length) {
      app.innerHTML = `<div class="empty"><div class="ico">🛒</div><h1>Your cart is empty</h1><p class="muted">Looks like you haven't added anything yet.</p><a class="btn btn-primary" href="#/shop">Start shopping</a></div>`;
      return;
    }
    const left = FREE_SHIPPING_FROM - t.subtotal;
    const coupon = state.coupon && COUPONS[state.coupon];
    app.innerHTML = `
      <h1>Shopping cart (${t.count})</h1>
      <div class="cart-layout">
        <div class="panel">
          ${t.items.map((l) => `
            <div class="cart-item">
              <a href="#/product/${l.id}" class="mini-thumb" style="${grad(l.product.colors)}">${l.product.emoji}</a>
              <div>
                <a href="#/product/${l.id}"><b>${esc(l.product.name)}</b></a>
                <div class="opts">${optsText(l.opts)}</div>
                <div>${money(l.product.price)} each</div>
                <button class="link-btn" data-save="${esc(l.key)}" style="font-size:13px">❤️ Save for later</button>
              </div>
              <div style="display:grid;gap:8px;justify-items:end">
                <div class="qty"><button data-dec="${esc(l.key)}">−</button><input type="number" value="${l.qty}" data-qty="${esc(l.key)}"><button data-inc="${esc(l.key)}">+</button></div>
                <b>${money(l.product.price * l.qty)}</b>
                <button class="btn btn-sm btn-danger" data-remove="${esc(l.key)}">🗑 Remove</button>
              </div>
            </div>`).join("")}
          <div style="display:flex;justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:8px">
            <a class="btn" href="#/shop">← Continue shopping</a>
            <button class="btn btn-danger" id="clearCart">Empty cart</button>
          </div>
        </div>
        <aside class="panel">
          <h3>Order summary</h3>
          <div class="free-ship-bar">
            ${left > 0 ? `Add <b>${money(left)}</b> more for <b>free delivery</b> 🚚` : `🎉 You get <b>free standard delivery</b>!`}
            <div class="bar"><i style="width:${Math.min(100, t.subtotal / FREE_SHIPPING_FROM * 100)}%"></i></div>
          </div>
          <div class="summary-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          ${t.discount ? `<div class="summary-row" style="color:var(--success)"><span>Discount (${esc(state.coupon)})</span><span>−${money(t.discount)}</span></div>` : ""}
          <div class="summary-row"><span>Delivery</span><span>${t.shipping ? money(t.shipping) : "FREE"}</span></div>
          <div class="summary-row total"><span>Total</span><span>${money(t.total)}</span></div>
          <form class="coupon" id="couponForm">
            <input id="couponInput" placeholder="Coupon code" value="${esc(state.coupon || "")}">
            <button class="btn">${coupon ? "Change" : "Apply"}</button>
          </form>
          ${coupon ? `<p style="margin-top:0;color:var(--success)">✅ ${esc(coupon.label)} <button class="link-btn" id="removeCoupon">remove</button></p>` : `<p class="muted" style="margin-top:0;font-size:13px">Try: SLAP10, POLQ20, NIKI5, FREESHIP</p>`}
          <a class="btn btn-primary btn-block" href="#/checkout">Go to checkout →</a>
          <p class="muted" style="font-size:13px;text-align:center">🔒 Pretend-secure checkout</p>
        </aside>
      </div>`;

    const rerender = () => { updateHeader(); renderCart(); };
    $$("[data-dec]").forEach((b) => b.addEventListener("click", () => { const l = state.cart.find((x) => x.key === b.dataset.dec); setQty(l.key, l.qty - 1); rerender(); }));
    $$("[data-inc]").forEach((b) => b.addEventListener("click", () => { const l = state.cart.find((x) => x.key === b.dataset.inc); setQty(l.key, l.qty + 1); rerender(); }));
    $$("[data-qty]").forEach((i) => i.addEventListener("change", () => { setQty(i.dataset.qty, parseInt(i.value) || 1); rerender(); }));
    $$("[data-remove]").forEach((b) => b.addEventListener("click", () => { removeLine(b.dataset.remove); toast("Removed from cart"); rerender(); }));
    $$("[data-save]").forEach((b) => b.addEventListener("click", () => {
      const l = state.cart.find((x) => x.key === b.dataset.save);
      if (!state.wish.includes(l.id)) { state.wish.push(l.id); save("wish"); }
      removeLine(l.key);
      toast("Moved to wishlist ❤️");
      rerender();
    }));
    $("#clearCart").addEventListener("click", () => { if (confirm("Remove everything from the cart?")) { state.cart = []; save("cart"); rerender(); } });
    $("#couponForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = $("#couponInput").value.trim().toUpperCase();
      if (!code) return;
      if (COUPONS[code]) { state.coupon = code; save("coupon"); toast(`🏷️ Coupon applied: ${COUPONS[code].label}`); rerender(); }
      else toast("That coupon code doesn't exist", "err");
    });
    const rc = $("#removeCoupon");
    if (rc) rc.addEventListener("click", () => { state.coupon = null; save("coupon"); rerender(); });
  }

  // ---------- Checkout ----------
  function renderCheckout() {
    setTitle("Checkout");
    if (!state.cart.length) { location.hash = "#/cart"; return; }
    const u = currentUser();
    const addr = (u && u.addresses && u.addresses[0]) || {};
    let ship = "standard";

    app.innerHTML = `
      <h1>Checkout</h1>
      <div class="steps"><span class="step done"><b>1</b>Cart</span><span class="step active"><b>2</b>Details &amp; payment</span><span class="step"><b>3</b>Done</span></div>
      ${u ? "" : `<div class="panel" style="margin-bottom:16px">👋 Have an account? <a class="link-btn" href="#/login?next=%2Fcheckout">Log in</a> to save this order to your order history. Or just continue as a guest.</div>`}
      <div class="cart-layout">
        <form class="form" id="checkoutForm" novalidate>
          <div class="panel form">
            <h3>📦 Delivery address</h3>
            <div class="form-row">
              <div class="field"><label>Full name</label><input type="text" name="name" required value="${esc(addr.name || (u ? u.name : ""))}"></div>
              <div class="field"><label>Email</label><input type="email" name="email" required value="${esc(u ? u.email : "")}"></div>
            </div>
            <div class="field"><label>Street address</label><input type="text" name="street" required value="${esc(addr.street || "")}" placeholder="ul. Vitosha 1"></div>
            <div class="form-row">
              <div class="field"><label>City</label><input type="text" name="city" required value="${esc(addr.city || "")}" placeholder="Sofia"></div>
              <div class="field"><label>Postal code</label><input type="text" name="zip" required value="${esc(addr.zip || "")}" placeholder="1000"></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Country</label>
                <select name="country">${["Bulgaria", "Germany", "Austria", "Greece", "Romania", "United Kingdom", "Other"].map((c) => `<option ${addr.country === c ? "selected" : ""}>${c}</option>`).join("")}</select>
              </div>
              <div class="field"><label>Phone</label><input type="tel" name="phone" required value="${esc(addr.phone || (u && u.phone) || "")}" placeholder="+359 88 123 4567"></div>
            </div>
            ${u ? `<label style="font-size:14px"><input type="checkbox" name="saveAddr" checked> Save this address to my account</label>` : ""}
          </div>

          <div class="panel form">
            <h3>🚚 Delivery method</h3>
            ${Object.entries(SHIPPING_METHODS).map(([k, m]) => `
              <label class="radio-card"><input type="radio" name="ship" value="${k}" ${k === ship ? "checked" : ""}>
                <span class="grow"><b>${m.label}</b><br><small class="muted">${m.days}</small></span>
                <b data-shipprice="${k}"></b>
              </label>`).join("")}
          </div>

          <div class="panel form">
            <h3>💳 Payment <small class="muted">(pretend – use any numbers, nothing is charged)</small></h3>
            <label class="radio-card"><input type="radio" name="pay" value="card" checked><span class="grow"><b>Credit / debit card</b></span>💳</label>
            <label class="radio-card"><input type="radio" name="pay" value="paypal"><span class="grow"><b>PayPal (fake)</b></span>🅿️</label>
            <label class="radio-card"><input type="radio" name="pay" value="cod"><span class="grow"><b>Cash on delivery</b></span>💶</label>
            <div id="cardFields" class="form">
              <div class="card-preview">
                <div style="display:flex;justify-content:space-between"><span>SLAPABABA BANK</span><span>💳</span></div>
                <div class="num" id="cpNum">•••• •••• •••• ••••</div>
                <div class="row"><span id="cpName">YOUR NAME</span><span id="cpExp">MM/YY</span></div>
              </div>
              <div class="field"><label>Card number</label><input type="text" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"></div>
              <div class="form-row">
                <div class="field"><label>Expiry (MM/YY)</label><input type="text" name="exp" placeholder="12/28" maxlength="5"></div>
                <div class="field"><label>CVC</label><input type="text" name="cvc" placeholder="123" maxlength="4" inputmode="numeric"></div>
              </div>
              <div class="field"><label>Name on card</label><input type="text" name="cardName"></div>
            </div>
          </div>
          <div class="field"><label>Order note (optional)</label><textarea name="note" rows="2" maxlength="300" placeholder="Leave it at the door, please!"></textarea></div>
        </form>
        <aside class="panel" id="checkoutSummary"></aside>
      </div>`;

    const form = $("#checkoutForm");
    form.addEventListener("input", (e) => {
      const f = e.target.closest(".field.error");
      if (f) { f.classList.remove("error"); $$(".error-msg", f).forEach((m) => m.remove()); }
    });

    function summary() {
      const t = cartTotals(ship);
      $$("[data-shipprice]").forEach((el) => {
        const k = el.dataset.shipprice;
        const price = cartTotals(k).shipping;
        el.textContent = price ? money(price) : "FREE";
      });
      $("#checkoutSummary").innerHTML = `
        <h3>Your order</h3>
        ${t.items.map((l) => `<div class="order-line"><span class="em">${l.product.emoji}</span><span style="flex:1">${l.qty} × ${esc(l.product.name)}<br><small class="muted">${optsText(l.opts)}</small></span><b>${money(l.product.price * l.qty)}</b></div>`).join("")}
        <hr style="border:none;border-top:1px solid var(--border)">
        <div class="summary-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.discount ? `<div class="summary-row" style="color:var(--success)"><span>Discount (${esc(state.coupon)})</span><span>−${money(t.discount)}</span></div>` : ""}
        <div class="summary-row"><span>Delivery</span><span>${t.shipping ? money(t.shipping) : "FREE"}</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(t.total)}</span></div>
        <button class="btn btn-primary btn-block" id="placeOrder" style="margin-top:12px">✅ Place order · ${money(t.total)}</button>
        <p class="muted" style="font-size:12px;text-align:center">This is a demo. No money will be taken.</p>`;
      $("#placeOrder").addEventListener("click", placeOrder);
    }
    summary();

    form.addEventListener("change", (e) => {
      if (e.target.name === "ship") { ship = e.target.value; summary(); }
      if (e.target.name === "pay") $("#cardFields").classList.toggle("hidden", e.target.value !== "card");
    });
    form.card.addEventListener("input", () => {
      const v = form.card.value.replace(/\D/g, "").slice(0, 16);
      form.card.value = v.replace(/(.{4})/g, "$1 ").trim();
      $("#cpNum").textContent = (v + "•".repeat(16 - v.length)).replace(/(.{4})/g, "$1 ").trim();
    });
    form.exp.addEventListener("input", () => {
      let v = form.exp.value.replace(/\D/g, "").slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      form.exp.value = v;
      $("#cpExp").textContent = v || "MM/YY";
    });
    form.cardName.addEventListener("input", () => { $("#cpName").textContent = form.cardName.value.toUpperCase() || "YOUR NAME"; });

    function validate() {
      let ok = true;
      $$(".field", form).forEach((f) => f.classList.remove("error"));
      $$(".error-msg", form).forEach((m) => m.remove());
      const fail = (input, msg) => {
        ok = false;
        const f = input.closest(".field");
        f.classList.add("error");
        f.insertAdjacentHTML("beforeend", `<span class="error-msg">${msg}</span>`);
      };
      ["name", "street", "city", "zip", "phone"].forEach((n) => { if (!form[n].value.trim()) fail(form[n], "Please fill this in"); });
      if (!/^\S+@\S+\.\S+$/.test(form.email.value.trim())) fail(form.email, "Enter a valid email");
      if (form.pay.value === "card") {
        if (form.card.value.replace(/\D/g, "").length < 12) fail(form.card, "Card number is too short");
        const m = form.exp.value.match(/^(\d\d)\/(\d\d)$/);
        if (!m || +m[1] < 1 || +m[1] > 12) fail(form.exp, "Use MM/YY");
        else {
          const expDate = new Date(2000 + +m[2], +m[1], 1);
          if (expDate < new Date()) fail(form.exp, "This card has expired");
        }
        if (!/^\d{3,4}$/.test(form.cvc.value)) fail(form.cvc, "3 or 4 digits");
        if (!form.cardName.value.trim()) fail(form.cardName, "Please fill this in");
      }
      if (!ok) {
        toast("Please check the highlighted fields", "err");
        $(".field.error", form).scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return ok;
    }

    function placeOrder() {
      if (!validate()) return;
      const t = cartTotals(ship);
      const fd = Object.fromEntries(new FormData(form));
      const order = {
        id: "SB-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100),
        date: Date.now(),
        items: t.items.map((l) => ({ id: l.id, name: l.product.name, emoji: l.product.emoji, price: l.product.price, qty: l.qty, opts: l.opts })),
        subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total,
        coupon: state.coupon,
        shipMethod: ship,
        payment: fd.pay === "card" ? "Card ending " + fd.card.replace(/\D/g, "").slice(-4) : fd.pay === "paypal" ? "PayPal" : "Cash on delivery",
        address: { name: fd.name, street: fd.street, city: fd.city, zip: fd.zip, country: fd.country, phone: fd.phone },
        email: fd.email,
        note: fd.note || "",
        cancelled: false,
      };

      app.innerHTML = `<div class="panel processing"><div class="spinner"></div><h2>Processing your payment…</h2><p class="muted">Talking to the pretend bank 🏦</p></div>`;
      setTimeout(() => {
        const owner = u ? u.email : "guest";
        (state.orders[owner] = state.orders[owner] || []).unshift(order);
        save("orders");
        // reduce stock (only for this browser session view)
        order.items.forEach((i) => { const p = byId(i.id); if (p) p.stock = Math.max(0, p.stock - i.qty); });
        if (u && fd.saveAddr) {
          u.addresses = [order.address, ...(u.addresses || []).filter((a) => a.street !== order.address.street)].slice(0, 5);
          save("users");
        }
        state.cart = [];
        state.coupon = null;
        save("cart"); save("coupon");
        location.hash = "#/order/" + order.id;
      }, 1800);
    }
  }

  function findOrder(id) {
    for (const [owner, list] of Object.entries(state.orders)) {
      const o = list.find((x) => x.id === id);
      if (o) return { order: o, owner };
    }
    return null;
  }

  function orderStatus(o) {
    if (o.cancelled) return { key: "cancelled", label: "Cancelled", step: -1 };
    const mins = (Date.now() - o.date) / 60000;
    // Speeded-up pretend timeline so you can watch it change
    if (mins < 2) return { key: "processing", label: "Processing", step: 0 };
    if (mins < 10) return { key: "shipped", label: "Shipped", step: 1 };
    if (mins < 30) return { key: "shipped", label: "Out for delivery", step: 2 };
    return { key: "delivered", label: "Delivered", step: 3 };
  }

  function trackBar(o) {
    const s = orderStatus(o);
    if (s.step < 0) return "";
    return `<div class="track">${["Ordered", "Shipped", "Out for delivery", "Delivered"].map((l, i) => `<div class="pt ${i <= s.step ? "on" : ""}"><i></i>${l}</div>`).join("")}</div>`;
  }

  function renderOrderDone(id) {
    const found = findOrder(id);
    if (!found) return renderNotFound();
    const o = found.order;
    setTitle("Order confirmed");
    app.innerHTML = `
      <div class="steps"><span class="step done"><b>1</b>Cart</span><span class="step done"><b>2</b>Details &amp; payment</span><span class="step active"><b>3</b>Done</span></div>
      <div class="panel success-hero">
        <div class="ico">🎉</div>
        <h1>Thank you for your order!</h1>
        <p>Order <b>${esc(o.id)}</b> was placed on ${fmtDate(o.date)}. A pretend confirmation email was sent to <b>${esc(o.email)}</b>.</p>
        ${trackBar(o)}
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">
          ${found.owner !== "guest" ? `<a class="btn btn-primary" href="#/account/orders">View my orders</a>` : `<a class="btn btn-primary" href="#/signup">Create an account</a>`}
          <a class="btn" href="#/shop">Keep shopping</a>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">${orderDetails(o)}</div>`;
    confetti();
  }

  function orderDetails(o) {
    const sm = SHIPPING_METHODS[o.shipMethod] || SHIPPING_METHODS.standard;
    return `
      <div class="order-items" style="padding:0">
        ${o.items.map((i) => `<div class="order-line"><a class="em" href="#/product/${i.id}">${i.emoji}</a><span style="flex:1"><a href="#/product/${i.id}">${esc(i.name)}</a> × ${i.qty}<br><small class="muted">${optsText(i.opts)}</small></span><b>${money(i.price * i.qty)}</b></div>`).join("")}
      </div>
      <hr style="border:none;border-top:1px solid var(--border)">
      <div class="form-row">
        <div>
          <b>Delivery to</b><br>${esc(o.address.name)}<br>${esc(o.address.street)}<br>${esc(o.address.zip)} ${esc(o.address.city)}, ${esc(o.address.country)}<br>${esc(o.address.phone)}
          <p><b>Method:</b> ${sm.label} (${sm.days})<br><b>Payment:</b> ${esc(o.payment)}${o.note ? `<br><b>Note:</b> ${esc(o.note)}` : ""}</p>
        </div>
        <div>
          <div class="summary-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
          ${o.discount ? `<div class="summary-row"><span>Discount${o.coupon ? " (" + esc(o.coupon) + ")" : ""}</span><span>−${money(o.discount)}</span></div>` : ""}
          <div class="summary-row"><span>Delivery</span><span>${o.shipping ? money(o.shipping) : "FREE"}</span></div>
          <div class="summary-row total"><span>Total</span><span>${money(o.total)}</span></div>
        </div>
      </div>`;
  }

  function confetti() {
    const emojis = ["🎉", "🎊", "✨", "🛍️", "💜"];
    for (let i = 0; i < 30; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[i % emojis.length];
      s.style.cssText = `position:fixed;top:-30px;left:${Math.random() * 100}vw;font-size:${20 + Math.random() * 18}px;z-index:200;pointer-events:none;transition:transform ${1.5 + Math.random() * 1.5}s ease-in, opacity 3s;`;
      document.body.appendChild(s);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        s.style.transform = `translateY(${window.innerHeight + 60}px) rotate(${Math.random() * 720 - 360}deg)`;
        s.style.opacity = "0.6";
      }));
      setTimeout(() => s.remove(), 3200);
    }
  }

  // ---------- Auth ----------
  function renderAuth(mode) {
    const next = route().params.get("next") || "/account";
    if (currentUser()) { location.hash = "#" + next; return; }
    setTitle(mode === "login" ? "Log in" : "Sign up");
    const nextQ = encodeURIComponent(next);
    app.innerHTML = `
      <div class="auth-box panel">
        <h1>${mode === "login" ? "👋 Welcome back" : "✨ Create your account"}</h1>
        <form class="form" id="authForm" novalidate>
          ${mode === "signup" ? `<div class="field"><label>Your name</label><input type="text" name="name" autocomplete="name" required></div>` : ""}
          <div class="field"><label>Email</label><input type="email" name="email" autocomplete="email" required></div>
          <div class="field"><label>Password</label><input type="password" name="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required></div>
          ${mode === "signup" ? `
            <div class="field"><label>Repeat password</label><input type="password" name="password2" autocomplete="new-password" required></div>
            <label style="font-size:14px"><input type="checkbox" name="terms"> I agree that this is a demo and my account is only saved in this browser</label>` : ""}
          <button class="btn btn-primary btn-block">${mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <p style="text-align:center">
          ${mode === "login"
            ? `New here? <a class="link-btn" href="#/signup?next=${nextQ}">Create an account</a>`
            : `Already have an account? <a class="link-btn" href="#/login?next=${nextQ}">Log in</a>`}
        </p>
        <p class="muted" style="font-size:12px;text-align:center">⚠️ Demo: please don't use a real password. Accounts live only in this browser's storage.</p>
      </div>`;

    const form = $("#authForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      $$(".error-msg", form).forEach((m) => m.remove());
      $$(".field", form).forEach((f) => f.classList.remove("error"));
      const fail = (name, msg) => {
        const f = form[name].closest(".field");
        f.classList.add("error");
        f.insertAdjacentHTML("beforeend", `<span class="error-msg">${msg}</span>`);
        return false;
      };
      const email = form.email.value.trim().toLowerCase();
      const pw = form.password.value;

      if (mode === "signup") {
        let ok = true;
        const name = form.name.value.trim();
        if (name.length < 2) ok = fail("name", "Please enter your name");
        if (!/^\S+@\S+\.\S+$/.test(email)) ok = fail("email", "Enter a valid email");
        else if (state.users[email]) ok = fail("email", "This email already has an account. Try logging in.");
        if (pw.length < 6) ok = fail("password", "Use at least 6 characters");
        if (pw !== form.password2.value) ok = fail("password2", "Passwords don't match");
        if (!form.terms.checked) { toast("Please tick the checkbox", "err"); ok = false; }
        if (!ok) return;
        const salt = Math.random().toString(36).slice(2);
        state.users[email] = { name, email, salt, hash: await hashPassword(pw, salt), created: Date.now(), addresses: [], phone: "", points: 100 };
        save("users");
        // Move guest wishlist/cart stay as-is; log in
        state.session = email; save("session");
        toast(`🎉 Welcome, ${name}! You got 100 bonus points.`);
      } else {
        const user = state.users[email];
        if (!user || user.hash !== (await hashPassword(pw, user.salt))) {
          fail("password", "Wrong email or password");
          return;
        }
        state.session = email; save("session");
        toast(`👋 Welcome back, ${user.name}!`);
      }
      location.hash = "#" + next;
    });
  }

  function logout() {
    state.session = null;
    save("session");
    toast("You are logged out. See you soon!");
    location.hash = "#/";
  }

  // ---------- Account ----------
  function renderAccount(tab) {
    const u = currentUser();
    if (!u) { location.hash = "#/login?next=" + encodeURIComponent(route().path); return; }
    setTitle("My account");
    const orders = state.orders[u.email] || [];
    const spent = orders.filter((o) => !o.cancelled).reduce((s, o) => s + o.total, 0);
    const points = (u.points || 0) + Math.floor(spent);
    const level = points >= 1000 ? "🥇 Gold" : points >= 300 ? "🥈 Silver" : "🥉 Bronze";
    const nav = [["profile", "#/account", "👤 Profile"], ["orders", "#/account/orders", `📦 Orders (${orders.length})`], ["addresses", "#/account/addresses", "🏠 Addresses"], ["security", "#/account/security", "🔐 Password"]];

    const tabs = {
      profile: () => `
        <h2>Hello, ${esc(u.name)} 👋</h2>
        <div class="stats">
          <div class="stat"><small class="muted">Orders</small><b>${orders.length}</b></div>
          <div class="stat"><small class="muted">Total spent</small><b>${money(spent)}</b></div>
          <div class="stat"><small class="muted">Points · ${level}</small><b>${points}</b></div>
        </div>
        <form class="form" id="profileForm">
          <div class="form-row">
            <div class="field"><label>Name</label><input type="text" name="name" value="${esc(u.name)}" required></div>
            <div class="field"><label>Phone</label><input type="tel" name="phone" value="${esc(u.phone || "")}"></div>
          </div>
          <div class="field"><label>Email</label><input type="email" value="${esc(u.email)}" disabled></div>
          <div class="field"><label>Birthday (for a birthday surprise 🎂)</label><input type="text" name="birthday" placeholder="DD.MM" value="${esc(u.birthday || "")}"></div>
          <button class="btn btn-primary" style="justify-self:start">Save changes</button>
        </form>
        <p class="muted" style="font-size:13px">Member since ${fmtDate(u.created)}</p>
        <hr style="border:none;border-top:1px solid var(--border)">
        <button class="btn btn-danger btn-sm" id="deleteAcc">Delete my account</button>`,
      orders: () => orders.length ? `
        <h2>My orders</h2>
        ${orders.map((o) => {
          const s = orderStatus(o);
          return `
          <div class="order">
            <div class="order-head">
              <div><small>Order placed</small>${fmtDate(o.date)}</div>
              <div><small>Total</small>${money(o.total)}</div>
              <div><small>Order #</small>${esc(o.id)}</div>
              <div><span class="status ${s.key}">${s.label}</span></div>
            </div>
            <div class="order-items">
              ${trackBar(o)}
              ${o.items.map((i) => `<div class="order-line"><span class="em">${i.emoji}</span><span style="flex:1"><a href="#/product/${i.id}">${esc(i.name)}</a> × ${i.qty} <small class="muted">${optsText(i.opts)}</small></span><b>${money(i.price * i.qty)}</b></div>`).join("")}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-sm" data-reorder="${esc(o.id)}">🔁 Buy again</button>
                <button class="btn btn-sm" data-details="${esc(o.id)}">📄 Details</button>
                ${s.step === 0 ? `<button class="btn btn-sm btn-danger" data-cancel="${esc(o.id)}">Cancel order</button>` : ""}
              </div>
              <div class="hidden" id="det-${esc(o.id)}" style="border-top:1px solid var(--border);padding-top:10px">${orderDetails(o)}</div>
            </div>
          </div>`;
        }).join("")}` : `<div class="empty" style="box-shadow:none"><div class="ico">📦</div><h2>No orders yet</h2><a class="btn btn-primary" href="#/shop">Start shopping</a></div>`,
      addresses: () => `
        <h2>Saved addresses</h2>
        ${(u.addresses || []).length ? u.addresses.map((a, i) => `
          <div class="order" style="padding:14px 16px;display:flex;justify-content:space-between;gap:10px">
            <div>${i === 0 ? `<span class="status">Default</span><br>` : ""}<b>${esc(a.name)}</b><br>${esc(a.street)}, ${esc(a.zip)} ${esc(a.city)}, ${esc(a.country)}<br>${esc(a.phone)}</div>
            <div style="display:grid;gap:6px;align-content:start">
              ${i ? `<button class="btn btn-sm" data-default="${i}">Make default</button>` : ""}
              <button class="btn btn-sm btn-danger" data-deladdr="${i}">Delete</button>
            </div>
          </div>`).join("") : `<p class="muted">No addresses yet. Add one below, or it will be saved when you check out.</p>`}
        <h3>Add a new address</h3>
        <form class="form" id="addrForm">
          <div class="form-row">
            <div class="field"><label>Full name</label><input type="text" name="name" required value="${esc(u.name)}"></div>
            <div class="field"><label>Phone</label><input type="tel" name="phone" required></div>
          </div>
          <div class="field"><label>Street</label><input type="text" name="street" required></div>
          <div class="form-row">
            <div class="field"><label>City</label><input type="text" name="city" required></div>
            <div class="field"><label>Postal code</label><input type="text" name="zip" required></div>
          </div>
          <div class="field"><label>Country</label><select name="country">${["Bulgaria", "Germany", "Austria", "Greece", "Romania", "United Kingdom", "Other"].map((c) => `<option>${c}</option>`).join("")}</select></div>
          <button class="btn btn-primary" style="justify-self:start">Add address</button>
        </form>`,
      security: () => `
        <h2>Change password</h2>
        <form class="form" id="pwForm" style="max-width:400px">
          <div class="field"><label>Current password</label><input type="password" name="old" required autocomplete="current-password"></div>
          <div class="field"><label>New password</label><input type="password" name="new1" required minlength="6" autocomplete="new-password"></div>
          <div class="field"><label>Repeat new password</label><input type="password" name="new2" required autocomplete="new-password"></div>
          <button class="btn btn-primary" style="justify-self:start">Change password</button>
        </form>`,
    };

    app.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a> › My account</div>
      <div class="account-layout">
        <aside class="panel">
          <div class="avatar">${esc(u.name[0].toUpperCase())}</div>
          <b>${esc(u.name)}</b><div class="muted" style="font-size:13px;margin-bottom:12px">${esc(u.email)}</div>
          <nav class="account-nav">
            ${nav.map(([k, href, label]) => `<a href="${href}" class="${k === tab ? "active" : ""}">${label}</a>`).join("")}
            <a href="#/wishlist">❤️ Wishlist (${state.wish.length})</a>
            <button id="logoutBtn">🚪 Log out</button>
          </nav>
        </aside>
        <section class="panel">${tabs[tab]()}</section>
      </div>`;

    $("#logoutBtn").addEventListener("click", logout);

    if (tab === "profile") {
      $("#profileForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.name.value.trim().length < 2) return toast("Name is too short", "err");
        u.name = f.name.value.trim(); u.phone = f.phone.value.trim(); u.birthday = f.birthday.value.trim();
        save("users"); toast("✅ Profile saved"); render();
      });
      $("#deleteAcc").addEventListener("click", () => {
        if (!confirm("Really delete your account and all its orders? This cannot be undone.")) return;
        delete state.users[u.email]; delete state.orders[u.email];
        save("users"); save("orders");
        state.session = null; save("session");
        toast("Account deleted");
        location.hash = "#/";
      });
    }
    if (tab === "orders") {
      $$("[data-details]").forEach((b) => b.addEventListener("click", () => $("#det-" + CSS.escape(b.dataset.details)).classList.toggle("hidden")));
      $$("[data-reorder]").forEach((b) => b.addEventListener("click", () => {
        const o = orders.find((x) => x.id === b.dataset.reorder);
        o.items.forEach((i) => byId(i.id) && addToCart(i.id, i.qty, i.opts));
        location.hash = "#/cart";
      }));
      $$("[data-cancel]").forEach((b) => b.addEventListener("click", () => {
        if (!confirm("Cancel this order?")) return;
        orders.find((x) => x.id === b.dataset.cancel).cancelled = true;
        save("orders"); toast("Order cancelled. Pretend refund is on its way 💸"); render();
      }));
    }
    if (tab === "addresses") {
      $("#addrForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const a = Object.fromEntries(new FormData(e.target));
        if (Object.values(a).some((v) => !String(v).trim())) return toast("Please fill in all fields", "err");
        u.addresses = [...(u.addresses || []), a]; save("users"); toast("🏠 Address added"); render();
      });
      $$("[data-deladdr]").forEach((b) => b.addEventListener("click", () => { u.addresses.splice(+b.dataset.deladdr, 1); save("users"); render(); }));
      $$("[data-default]").forEach((b) => b.addEventListener("click", () => { const [a] = u.addresses.splice(+b.dataset.default, 1); u.addresses.unshift(a); save("users"); render(); }));
    }
    if (tab === "security") {
      $("#pwForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        if (u.hash !== (await hashPassword(f.old.value, u.salt))) return toast("Current password is wrong", "err");
        if (f.new1.value.length < 6) return toast("New password must be at least 6 characters", "err");
        if (f.new1.value !== f.new2.value) return toast("New passwords don't match", "err");
        u.salt = Math.random().toString(36).slice(2);
        u.hash = await hashPassword(f.new1.value, u.salt);
        save("users"); f.reset(); toast("🔐 Password changed");
      });
    }
  }

  // ---------- Wishlist ----------
  function renderWishlist() {
    setTitle("Wishlist");
    const items = state.wish.map(byId).filter(Boolean);
    app.innerHTML = `
      <div class="toolbar"><h1>❤️ My wishlist</h1>${items.length ? `<button class="btn btn-primary" id="addAll">Add all to cart</button>` : ""}</div>
      ${items.length ? `<div class="grid">${items.map(productCard).join("")}</div>`
        : `<div class="empty"><div class="ico">🤍</div><h2>Your wishlist is empty</h2><p class="muted">Tap the heart on any product to save it here.</p><a class="btn btn-primary" href="#/shop">Browse products</a></div>`}`;
    const all = $("#addAll");
    if (all) all.addEventListener("click", () => items.forEach((p) => addToCart(p.id, 1, defaultOpts(p))));
  }

  // ---------- Info pages ----------
  function renderHelp() {
    setTitle("Help");
    const faqs = [
      ["Is this a real shop?", "No! Slapababa Shop is a demo made by Niki and Polq for fun. Nothing is sold, nothing is delivered and no money is taken."],
      ["Where is my account saved?", "Only in your browser (localStorage). If you clear your browser data or use another device, the account won't be there."],
      ["How much is delivery?", `Standard delivery is €4.99 and free for orders over €${FREE_SHIPPING_FROM}. Express is €9.99. Pick up in store is free.`],
      ["Which coupon codes work?", "Try SLAP10 (10% off), POLQ20 (20% off), NIKI5 (€5 off) and FREESHIP (free delivery)."],
      ["Can I cancel my order?", "Yes, while it says “Processing” (the first 2 minutes) you can cancel it from My orders."],
      ["How does order tracking work?", "It's a fast pretend timeline: Shipped after 2 minutes, Out for delivery after 10, Delivered after 30."],
      ["What card number should I use?", "Any made-up number like 4242 4242 4242 4242 with a future date. Never type a real card into a demo site."],
    ];
    app.innerHTML = `
      <h1>Help &amp; FAQ</h1>
      <div class="faq">${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
  }

  function renderAbout() {
    setTitle("About");
    app.innerHTML = `
      <div class="panel" style="max-width:760px;margin:0 auto">
        <h1>About Slapababa 🛍️</h1>
        <p>Slapababa Shop was built by <b>Niki</b> and <b>Polq</b> as a practice project. It has ${PRODUCTS.length} products in ${CATEGORIES.length} categories, a cart, coupons, checkout, accounts, order history, a wishlist and reviews.</p>
        <p>It's a "static" website: there is no server, so everything is stored in your own browser. That's why it can be hosted for free on GitHub Pages.</p>
        <h3>How it's made</h3>
        <ul>
          <li><code>index.html</code> – the page skeleton (header, footer)</li>
          <li><code>styles.css</code> – all the colours and layout</li>
          <li><code>products.js</code> – the list of products, categories and coupons. Add your own here!</li>
          <li><code>app.js</code> – everything that happens when you click</li>
        </ul>
        <p><a class="btn btn-primary" href="../">🐍 Play our Snake game</a></p>
      </div>`;
  }

  function renderNotFound() {
    setTitle("Not found");
    app.innerHTML = `<div class="empty"><div class="ico">🤷</div><h1>Page not found</h1><a class="btn btn-primary" href="#/">Go home</a></div>`;
  }

  // Keep tabs in sync if the shop is open in two tabs
  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith("slapshop_")) return;
    const k = e.key.slice(9);
    if (k in state) { state[k] = store.get(k, state[k]); render(); }
  });

  // ---------- Start ----------
  buildNav();
  render();
})();
