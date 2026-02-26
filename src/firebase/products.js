import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Estructura del documento products:
 * {
 *  name: string,
 *  description: string,
 *  category: string,
 *  image: string,
 *  inStock: boolean,
 *  price: number, // precio unitario base
 *  promos: { "2": number|null, "3": number|null, "4": number|null }, // precio unitario por tramo (2+, 3+, 4+)
 *  createdAt, updatedAt
 * }
 */

const productsCol = collection(db, "products");

export function subscribeProducts(callback) {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (err) => {
      console.error("Firestore subscribeProducts error:", err);
      callback([]);
    }
  );
}

export async function createProduct(payload) {
  const now = serverTimestamp();
  await addDoc(productsCol, {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateProduct(productId, payload) {
  const ref = doc(db, "products", productId);
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(productId) {
  const ref = doc(db, "products", productId);
  await deleteDoc(ref);
}