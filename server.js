const express = require("express");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const required = ["FIREBASE_DATABASE_URL", "FIREBASE_SERVICE_ACCOUNT_JSON", "ADMIN_UIDS"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON must contain the complete service-account JSON.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const adminUids = new Set(
  process.env.ADMIN_UIDS.split(",").map(v => v.trim()).filter(Boolean)
);

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Please sign in first." });
    }
    req.user = await admin.auth().verifyIdToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
  }
}

function requireAdmin(req, res, next) {
  if (!adminUids.has(req.user.uid)) {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "VOVA Educational" }));

// Deliberately accepts no payment-card fields. Only a sandbox outcome is stored.
app.post("/api/orders", authenticate, async (req, res) => {
  try {
    const { customerName, productId, quantity, paymentResult } = req.body || {};
    const products = {
      notebook: { name: "Study Notebook", price: 99 },
      backpack: { name: "School Backpack", price: 599 },
      calculator: { name: "Basic Calculator", price: 249 }
    };

    if (typeof customerName !== "string" || customerName.trim().length < 2 || customerName.trim().length > 80) {
      return res.status(400).json({ error: "Enter a name between 2 and 80 characters." });
    }
    if (!products[productId]) return res.status(400).json({ error: "Choose a valid product." });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
      return res.status(400).json({ error: "Quantity must be between 1 and 5." });
    }
    if (!["approved", "declined"].includes(paymentResult)) {
      return res.status(400).json({ error: "Choose a sandbox payment result." });
    }

    const product = products[productId];
    const order = {
      customerName: customerName.trim(),
      productId,
      productName: product.name,
      quantity,
      amount: product.price * quantity,
      currency: "INR",
      paymentMode: "SANDBOX_DEMO",
      paymentResult,
      status: paymentResult === "approved" ? "demo-paid" : "payment-declined",
      userUid: req.user.uid,
      createdAt: admin.database.ServerValue.TIMESTAMP
    };

    const ref = db.ref("orders").push();
    await ref.set(order);
    res.status(201).json({ ok: true, orderId: ref.key, status: order.status });
  } catch (error) {
    console.error("Create order failed:", error.message);
    res.status(500).json({ error: "Could not create order. Please try again." });
  }
});

app.get("/api/admin/orders", authenticate, requireAdmin, async (_req, res) => {
  try {
    const snapshot = await db.ref("orders").orderByChild("createdAt").limitToLast(100).once("value");
    const orders = [];
    snapshot.forEach(child => orders.push({ id: child.key, ...child.val() }));
    orders.reverse();
    res.json({ orders });
  } catch (error) {
    console.error("Read orders failed:", error.message);
    res.status(500).json({ error: "Could not load orders." });
  }
});

app.patch("/api/admin/orders/:id/status", authenticate, requireAdmin, async (req, res) => {
  const allowed = ["processing", "completed", "cancelled"];
  const { status } = req.body || {};
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid order status." });
  try {
    const ref = db.ref(`orders/${req.params.id}`);
    const snap = await ref.once("value");
    if (!snap.exists()) return res.status(404).json({ error: "Order not found." });
    await ref.update({ status, updatedAt: admin.database.ServerValue.TIMESTAMP });
    res.json({ ok: true });
  } catch (error) {
    console.error("Update order failed:", error.message);
    res.status(500).json({ error: "Could not update order." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`VOVA Educational running on port ${port}`));
