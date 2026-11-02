# Turning on real accounts (Firebase)

Right now the shop runs in **browser mode**. Accounts and orders are saved only in the
browser you are using, so your account won't be there on another computer or phone.

GitHub Pages can only host files. It can't save anything that visitors type in, so a
`.json` file in the repo can't store new accounts. To get real accounts, the shop
uses **Firebase**, a free database from Google. Once it's set up:

- you can sign up once and log in on any device
- orders are saved online, and you see everyone's orders in the admin dashboard
- reviews are shared, so everyone sees them
- passwords are handled by Google and nobody can read them (not even you)

It takes about 5 minutes. You only need a Google account.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with Google.
2. Click **Create a project** (or **Add project**).
3. Name it `slapababa-shop`, click **Continue**.
4. Turn **Google Analytics** off (you don't need it), then click **Create project**.

## 2. Turn on email and password sign-in

1. In the left menu, open **Build → Authentication** and click **Get started**.
2. Under **Sign-in method**, click **Email/Password**, switch on the first toggle, and click **Save**.
3. Open the **Settings** tab, then **Authorized domains**. Click **Add domain** and enter
   `nikinachev11.github.io`. Click **Add**.

## 3. Create the database

1. In the left menu, open **Build → Firestore Database** and click **Create database**.
2. Pick a location in Europe (for example `eur3`), click **Next**.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab. Delete everything there, then paste in everything from
   [`firestore.rules`](firestore.rules) (in this same folder). Click **Publish**.

## 4. Connect the shop

1. Click the ⚙️ gear next to **Project overview** → **Project settings**.
2. Scroll down to **Your apps** and click the **`</>`** (Web) button.
3. Give it a nickname like `shop` and click **Register app**. You don't need Firebase Hosting.
4. You'll see some code with `const firebaseConfig = { ... }`. Copy just the part in `{ ... }`.
5. On GitHub, open [`shop/firebase-config.js`](firebase-config.js) and click the ✏️ pencil to edit.
6. Replace `window.FIREBASE_CONFIG = null;` with:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "…",
     authDomain: "…",
     projectId: "…",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "…",
   };
   ```

   (paste your own values in place of the `…`)
7. Click **Commit changes**.

It's fine that this config is public. Firebase protects your data with the rules from step 3,
not by keeping this code secret.

You can also just send the config to Claude in the project chat and it will add it for you.

## 5. Check it works

Wait a minute or two for GitHub Pages to update, then open
<https://nikinachev11.github.io/slapababa/shop/>. The bottom of the page should say
**Accounts: online (Firebase)**. Create an account, and it now works everywhere.

## 6. Make yourself the admin

1. In Firebase, open **Firestore Database → Data**.
2. Click the **users** collection, then click through the documents until you find the one with your email.
3. Find the field **role**, click it, change `customer` to `admin`, and click **Update**.
4. Refresh the shop. Your account menu now has **Admin dashboard**.

Do the same for Polq if you want them to be an admin too.

## Good to know

- Firebase's free plan is far more than this shop needs.
- Cart, wishlist and settings (theme, currency) still live in each browser, like in most real shops.
- In browser mode, the first account made in a browser becomes the admin for that browser, so you can try the dashboard without Firebase.
- This is still a demo shop: no real payments happen.
