import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const $ = id => document.getElementById(id);
let currentUser = null;

function message(text, error = false) {
  $("message").textContent = text;
  $("message").className = error ? "message error" : "message";
}
function token() { return currentUser.getIdToken(); }

onAuthStateChanged(auth, user => {
  currentUser = user;
  $("authState").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
  $("authForms").hidden = !!user;
  $("shop").hidden = !user;
  $("logout").hidden = !user;
});

$("register").addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    message("Account created. You can now place a demo order.");
  } catch (e) { message(e.message, true); }
});
$("login").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    message("Signed in successfully.");
  } catch (e) { message(e.message, true); }
});
$("logout").addEventListener("click", () => signOut(auth));

$("orderForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return message("Please sign in first.", true);
  const payload = {
    customerName: $("customerName").value.trim(),
    productId: $("product").value,
    quantity: Number($("quantity").value),
    paymentResult: $("paymentResult").value
  };
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${await token()}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Order failed.");
    message(`Demo order created: ${data.orderId} (${data.status}).`);
    $("orderForm").reset();
  } catch (e) { message(e.message, true); }
});