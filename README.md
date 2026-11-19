# VOVA Educational — private sandbox shop

## What this project does
- User sign-in / account creation with Firebase Authentication.
- Creates demo orders in Firebase Realtime Database through the Express backend.
- Admin dashboard lists orders and updates order status.
- Sandbox checkout simulates approved/declined results; it does not collect card data.
- No card number, CVV, expiry date, OTP, or banking credentials are requested or stored.

## 1) Firebase setup
1. Open Firebase Console for project `vova-733e8`.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Authentication → Users → create your own account. This account will be the admin.
4. Project settings → General → Your apps → create/select a Web App and copy its Firebase web config into `public/firebase-config.js`.
5. Realtime Database → Rules: publish the contents of `firebase.rules.json`. The Admin SDK backend accesses the database; direct client database access is denied.
6. Project settings → Service accounts → generate a NEW private key only if needed. Keep it secret; never commit it to GitHub or place it in frontend files.

## 2) Get your Admin UID
After creating your account, open Firebase Console → Authentication → Users and copy the UID for your account. Put it in Render's `ADMIN_UIDS` environment variable. Only that UID can open admin APIs. Multiple admin UIDs can be comma-separated.

## 3) Run locally in Termux
Install Node.js in Termux, unzip this project, then:
```sh
cd vova-educational
npm install
```
Set environment variables in the same Termux session:
```sh
export FIREBASE_DATABASE_URL="https://vova-733e8-default-rtdb.firebaseio.com"
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ...paste the COMPLETE JSON on one line...}'
export ADMIN_UIDS="PASTE_YOUR_FIREBASE_AUTH_UID"
npm start
```
Open `http://127.0.0.1:3000`.

For convenience, use a local `.env` only if you separately install/configure dotenv; this project intentionally does not load `.env` by default. Never share the service account JSON.

## 4) Deploy to Render
- Push project files to a private GitHub repository. Do NOT commit service-account JSON or secrets.
- Create a Render Web Service connected to that repo.
- Build Command: `npm install`
- Start Command: `npm start`
- Add Environment Variables:
  - `FIREBASE_DATABASE_URL` = your Realtime Database URL
  - `FIREBASE_SERVICE_ACCOUNT_JSON` = the entire new service-account JSON, as one-line JSON
  - `ADMIN_UIDS` = your Firebase Authentication UID
- Deploy. Visit `/` for user panel and `/admin.html` for admin panel.

## 5) Important security notes
- The Firebase Web API key in `firebase-config.js` is a public client identifier; security comes from Authentication, backend authorization, and database rules.
- Service account JSON is a server secret. If it was ever pasted into chat, a public repo, or shared, revoke that key in Google Cloud/Firebase and create a new one.
- Rotate/revoke any Telegram bot token previously exposed. This project does not need a Telegram bot.
- Never change Realtime Database rules to public `true`.
- This is a demo order workflow, not a real payment gateway. For real payments, use a regulated payment provider's hosted checkout; never collect or forward raw card details yourself.
