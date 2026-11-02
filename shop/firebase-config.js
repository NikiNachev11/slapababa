// ─────────────────────────────────────────────────────────────────────────────
// Real accounts (optional)
//
// While this is null, the shop runs in "browser mode": accounts and orders are
// saved only in the browser you are using.
//
// To make accounts work on every device, create a free Firebase project and
// paste its web config here. Step-by-step guide: SETUP-ACCOUNTS.md
//
// These values are safe to publish: Firebase protects your data with the
// security rules in firestore.rules, not by keeping this config secret.
// ─────────────────────────────────────────────────────────────────────────────

window.FIREBASE_CONFIG = null;

// Example of what it looks like when filled in:
// window.FIREBASE_CONFIG = {
//   apiKey: "AIza...",
//   authDomain: "slapababa-shop.firebaseapp.com",
//   projectId: "slapababa-shop",
//   storageBucket: "slapababa-shop.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abc123",
// };
