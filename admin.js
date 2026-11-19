import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const $ = id => document.getElementById(id);
let user = null;

function show(text, error = false) {
  $("message").textContent = text;
  $("message").className = error ? "message error" : "message";
}
onAuthStateChanged(auth, u => {
  user = u;
  $("loginBox").hidden = !!u;
  $("dashboard").hidden = !u;
  if (u) loadOrders();
});

$("login").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    show("Signed in. Checking admin permission…");
  } catch (e) { show(e.message, true); }
});
$("logout").addEventListener("click", () => signOut(auth));
$("refresh").addEventListener("click", loadOrders);

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), "Authorization": `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
async function loadOrders() {
  try {
    const data = await api("/api/admin/orders");
    $("orders").innerHTML = "";
    if (!data.orders.length) {
      $("orders").textContent = "No orders yet.";
      return;
    }
    for (const order of data.orders) {
      const article = document.createElement("article");
      article.className = "order";
      const title = document.createElement("h3");
      title.textContent = `${order.productName} × ${order.quantity}`;
      const detail = document.createElement("p");
      detail.textContent = `${order.customerName} · ₹${order.amount} · ${order.paymentMode} · ${order.paymentResult} · ${order.status}`;
      const id = document.createElement("small");
      id.textContent = `Order ID: ${order.id}`;
      const select = document.createElement("select");
      for (const status of ["processing", "completed", "cancelled"]) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        select.append(option);
      }
      if (["processing", "completed", "cancelled"].includes(order.status)) select.value = order.status;
      const button = document.createElement("button");
      button.textContent = "Update status";
      button.addEventListener("click", async () => {
        try {
          await api(`/api/admin/orders/${encodeURIComponent(order.id)}/status`, {
            method: "PATCH", body: JSON.stringify({ status: select.value })
          });
          show("Order status updated.");
          loadOrders();
        } catch (e) { show(e.message, true); }
      });
      article.append(title, detail, id, document.createElement("br"), select, button);
      $("orders").append(article);
    }
  } catch (e) { show(e.message, true); }
}