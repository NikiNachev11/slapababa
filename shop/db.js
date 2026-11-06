// Data layer for accounts, orders and reviews.
//
// Two backends with the same functions:
//   • Firebase (real accounts, works on every device) when firebase-config.js is filled in
//   • Browser mode (localStorage, this device only) otherwise
//
// The rest of the shop only talks to window.DB, so it never needs to know which one is used.

(function () {
  "use strict";

  const FB_VERSION = "10.12.2";
  const LS = "slapshop_";

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  function friendlyError(e) {
    const code = (e && e.code) || "";
    const map = {
      "auth/email-already-in-use": "This email already has an account. Try logging in.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/weak-password": "Use at least 6 characters.",
      "auth/wrong-password": "Wrong email or password.",
      "auth/user-not-found": "Wrong email or password.",
      "auth/invalid-credential": "Wrong email or password.",
      "auth/invalid-login-credentials": "Wrong email or password.",
      "auth/too-many-requests": "Too many tries. Please wait a minute and try again.",
      "auth/network-request-failed": "No internet connection.",
      "auth/requires-recent-login": "Please log out and log in again, then retry.",
      "permission-denied": "You don't have permission to do that.",
    };
    const err = new Error(map[code] || (e && e.message) || "Something went wrong.");
    err.code = code;
    return err;
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  // ───────────────────────── Browser (localStorage) backend ─────────────────────────
  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0; for (const b of data) h = (h * 31 + b) >>> 0; return "x" + h.toString(16);
  }
  const salt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const publicUser = (u) => u && ({ uid: u.uid, name: u.name, email: u.email, phone: u.phone || "", birthday: u.birthday || "", addresses: u.addresses || [], points: u.points || 0, role: u.role || "customer", created: u.created, newsletter: !!u.newsletter });

  const LocalBackend = {
    mode: "local",
    _listeners: [],
    async init() {},
    _users() { return ls.get("users", {}); },
    _saveUsers(u) { ls.set("users", u); },
    _me() { const s = ls.get("session", null); return s ? this._users()[s] : null; },
    _emit() { const u = publicUser(this._me()); this._listeners.forEach((cb) => cb(u)); },
    onAuthChange(cb) { this._listeners.push(cb); cb(publicUser(this._me())); },
    currentUser() { return publicUser(this._me()); },

    async signUp({ name, email, password }) {
      email = email.trim().toLowerCase();
      const users = this._users();
      if (users[email]) throw new Error("This email already has an account. Try logging in.");
      const s = salt();
      // The very first account created in this browser becomes the shop admin.
      const role = Object.keys(users).length === 0 ? "admin" : "customer";
      users[email] = { uid: "u_" + salt(), name, email, salt: s, hash: await sha256(s + ":" + password), created: Date.now(), addresses: [], phone: "", points: 100, role };
      this._saveUsers(users);
      ls.set("session", email);
      this._emit();
      return publicUser(users[email]);
    },
    async logIn(email, password) {
      email = email.trim().toLowerCase();
      const u = this._users()[email];
      if (!u || u.hash !== (await sha256(u.salt + ":" + password))) throw new Error("Wrong email or password.");
      ls.set("session", email);
      this._emit();
      return publicUser(u);
    },
    async logOut() { ls.set("session", null); this._emit(); },
    async resetPassword() { throw new Error("Password reset emails only work when real accounts (Firebase) are turned on."); },
    async updateProfile(patch) {
      const users = this._users(); const me = this._me(); if (!me) throw new Error("Not logged in");
      const allowed = ["name", "phone", "birthday", "addresses", "newsletter"];
      for (const k of allowed) if (k in patch) users[me.email][k] = patch[k];
      this._saveUsers(users); this._emit();
    },
    async addPoints(delta) {
      const users = this._users(); const me = this._me(); if (!me) return;
      users[me.email].points = Math.max(0, (users[me.email].points || 0) + delta);
      this._saveUsers(users); this._emit();
    },
    async changePassword(oldPw, newPw) {
      const users = this._users(); const me = this._me();
      if (me.hash !== (await sha256(me.salt + ":" + oldPw))) throw new Error("Current password is wrong.");
      const s = salt(); users[me.email].salt = s; users[me.email].hash = await sha256(s + ":" + newPw);
      this._saveUsers(users);
    },
    async deleteAccount() {
      const users = this._users(); const me = this._me();
      delete users[me.email]; this._saveUsers(users);
      const orders = ls.get("orders2", []).filter((o) => o.uid !== me.uid); ls.set("orders2", orders);
      ls.set("session", null); this._emit();
    },

    async createOrder(order) {
      const me = this._me();
      const o = { ...order, uid: me ? me.uid : null, createdAt: Date.now() };
      const all = ls.get("orders2", []); all.unshift(o); ls.set("orders2", all);
      return o;
    },
    async getOrder(id) { return ls.get("orders2", []).find((o) => o.id === id) || null; },
    async myOrders() { const me = this._me(); if (!me) return []; return ls.get("orders2", []).filter((o) => o.uid === me.uid); },
    async updateOrder(id, patch) {
      const all = ls.get("orders2", []); const o = all.find((x) => x.id === id);
      if (o) Object.assign(o, patch); ls.set("orders2", all);
    },
    async allOrders() { return ls.get("orders2", []); },
    async allUsers() { return Object.values(this._users()).map(publicUser); },
    async setRole(uid, role) {
      const users = this._users(); const u = Object.values(users).find((x) => x.uid === uid);
      if (u) { u.role = role; this._saveUsers(users); this._emit(); }
    },

    async getReviews(pid) { return (ls.get("reviews2", {})[pid] || []); },
    async addReview(pid, review) {
      const all = ls.get("reviews2", {}); (all[pid] = all[pid] || []).unshift({ ...review, createdAt: Date.now() }); ls.set("reviews2", all);
    },
  };

  // ───────────────────────── Firebase backend ─────────────────────────
  const FirebaseBackend = {
    mode: "firebase",
    _user: null,
    _profile: null,
    _listeners: [],
    async init(config) {
      const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
      await loadScript(base + "firebase-app-compat.js");
      await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
      firebase.initializeApp(config);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      await new Promise((resolve) => {
        let first = true;
        this.auth.onAuthStateChanged(async (u) => {
          this._user = u;
          if (this._signingUp) { if (first) { first = false; resolve(); } return; }
          this._profile = u ? await this._loadProfile(u) : null;
          this._emit();
          if (first) { first = false; resolve(); }
        });
      });
    },
    async _loadProfile(u) {
      const ref = this.db.collection("users").doc(u.uid);
      const snap = await ref.get();
      if (snap.exists) return { uid: u.uid, email: u.email, ...snap.data() };
      // Profile is missing (e.g. created in the Firebase console): make a basic one.
      const p = { name: u.displayName || u.email.split("@")[0], email: u.email, phone: "", addresses: [], points: 100, role: "customer", created: Date.now() };
      await ref.set(p);
      return { uid: u.uid, ...p };
    },
    _emit() { const u = this.currentUser(); this._listeners.forEach((cb) => cb(u)); },
    onAuthChange(cb) { this._listeners.push(cb); cb(this.currentUser()); },
    currentUser() { return this._profile ? publicUser(this._profile) : null; },

    async signUp({ name, email, password }) {
      this._signingUp = true;
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(email.trim(), password);
        this._user = cred.user;
        await cred.user.updateProfile({ displayName: name });
        const p = { name, email: cred.user.email, phone: "", addresses: [], points: 100, role: "customer", created: Date.now() };
        await this.db.collection("users").doc(cred.user.uid).set(p);
        this._profile = { uid: cred.user.uid, ...p };
        this._emit();
        return this.currentUser();
      } catch (e) { throw friendlyError(e); } finally { this._signingUp = false; }
    },
    async logIn(email, password) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(email.trim(), password);
        this._user = cred.user;
        this._profile = await this._loadProfile(cred.user);
        this._emit();
        return this.currentUser();
      } catch (e) { throw friendlyError(e); }
    },
    async logOut() { await this.auth.signOut(); },
    async resetPassword(email) { try { await this.auth.sendPasswordResetEmail(email.trim()); } catch (e) { throw friendlyError(e); } },
    async updateProfile(patch) {
      const allowed = {};
      for (const k of ["name", "phone", "birthday", "addresses", "newsletter"]) if (k in patch) allowed[k] = patch[k];
      try { await this.db.collection("users").doc(this._user.uid).update(allowed); } catch (e) { throw friendlyError(e); }
      Object.assign(this._profile, allowed); this._emit();
    },
    async addPoints(delta) {
      if (!this._user) return;
      const points = Math.max(0, (this._profile.points || 0) + delta);
      await this.db.collection("users").doc(this._user.uid).update({ points });
      this._profile.points = points; this._emit();
    },
    async changePassword(oldPw, newPw) {
      try {
        const cred = firebase.auth.EmailAuthProvider.credential(this._user.email, oldPw);
        await this._user.reauthenticateWithCredential(cred);
        await this._user.updatePassword(newPw);
      } catch (e) {
        if (["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"].includes(e.code)) throw new Error("Current password is wrong.");
        throw friendlyError(e);
      }
    },
    async deleteAccount() {
      try {
        await this.db.collection("users").doc(this._user.uid).delete();
        await this._user.delete();
      } catch (e) { throw friendlyError(e); }
    },

    async createOrder(order) {
      const o = { ...order, uid: this._user ? this._user.uid : null, createdAt: Date.now() };
      try { await this.db.collection("orders").doc(o.id).set(o); } catch (e) { throw friendlyError(e); }
      return o;
    },
    async getOrder(id) {
      try { const s = await this.db.collection("orders").doc(id).get(); return s.exists ? s.data() : null; }
      catch (e) { return null; }
    },
    async myOrders() {
      if (!this._user) return [];
      const s = await this.db.collection("orders").where("uid", "==", this._user.uid).get();
      return s.docs.map((d) => d.data()).sort((a, b) => b.createdAt - a.createdAt);
    },
    async updateOrder(id, patch) {
      try { await this.db.collection("orders").doc(id).update(patch); } catch (e) { throw friendlyError(e); }
    },
    async allOrders() {
      const s = await this.db.collection("orders").orderBy("createdAt", "desc").limit(500).get();
      return s.docs.map((d) => d.data());
    },
    async allUsers() {
      const s = await this.db.collection("users").limit(500).get();
      return s.docs.map((d) => publicUser({ uid: d.id, ...d.data() }));
    },
    async setRole(uid, role) {
      try { await this.db.collection("users").doc(uid).update({ role }); } catch (e) { throw friendlyError(e); }
    },

    async getReviews(pid) {
      try {
        const s = await this.db.collection("reviews").where("pid", "==", pid).limit(100).get();
        return s.docs.map((d) => d.data()).sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) { return []; }
    },
    async addReview(pid, review) {
      try { await this.db.collection("reviews").add({ ...review, pid, uid: this._user.uid, createdAt: Date.now() }); }
      catch (e) { throw friendlyError(e); }
    },
  };

  // ───────────────────────── Pick a backend ─────────────────────────
  window.DB = {
    backend: LocalBackend,
    ready: (async () => {
      if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
        try {
          await FirebaseBackend.init(window.FIREBASE_CONFIG);
          window.DB.backend = FirebaseBackend;
          return;
        } catch (e) {
          console.error("Firebase failed to start, using browser mode instead.", e);
        }
      }
      await LocalBackend.init();
    })(),
  };
})();
