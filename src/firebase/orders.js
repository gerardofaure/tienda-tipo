import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").trim();
}

export async function placeOrder({
  customerName,
  customerPhone,
  customerAddress,
  deliveryReference,
  paymentMethod,
  items, // [{ productId, variantKey, variants, quantity }]
  total,
}) {
  const phone = normalizePhone(customerPhone);
  const now = serverTimestamp();

  const ordersCol = collection(db, "orders");
  const orderRef = doc(ordersCol);

  const customerKey = phone || "sin-telefono";
  const customerRef = doc(db, "customers", customerKey);
  const customerOrderRef = doc(customerRef, "orders", orderRef.id);

  await runTransaction(db, async (tx) => {
    // 1) Validar y rebajar stock (si existe stockQty)
    for (const it of items || []) {
      const productRef = doc(db, "products", it.productId);
      const snap = await tx.get(productRef);
      if (!snap.exists()) continue;

      const data = snap.data() || {};
      const current = data.stockQty;

      // Si no hay stockQty, no controlamos stock (compatibilidad)
      if (typeof current !== "number" || Number.isNaN(current)) continue;

      const qty = Math.max(0, Math.trunc(Number(it.quantity || 0)));

      // No permitir sobregiro
      if (qty > current) {
        throw new Error(
          `Stock insuficiente para "${data.name || "producto"}". Stock: ${current}, solicitado: ${qty}`
        );
      }

      const next = Math.max(0, Math.trunc(current) - qty);

      tx.update(productRef, {
        stockQty: next,
        inStock: next > 0,
        updatedAt: now,
      });
    }

    // 2) Upsert cliente
    tx.set(
      customerRef,
      {
        name: String(customerName || "").trim(),
        phone: phone,
        address: String(customerAddress || "").trim(),
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    // 3) Orden
    const orderData = {
      customer: {
        name: String(customerName || "").trim(),
        phone: phone,
        address: String(customerAddress || "").trim(),
      },
      deliveryReference: String(deliveryReference || "").trim(),
      paymentMethod: String(paymentMethod || "").trim(),
      items: (items || []).map((it) => ({
        productId: it.productId,
        variantKey: it.variantKey || "__default",
        variants: it.variants || {},
        quantity: Math.trunc(Number(it.quantity || 0)),
      })),
      total: Number(total || 0),
      createdAt: now,
    };

    tx.set(orderRef, orderData);
    tx.set(customerOrderRef, orderData);
  });

  return { orderId: orderRef.id };
}