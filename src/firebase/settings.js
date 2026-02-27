import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const storeSettingsRef = doc(db, "settings", "store");

export function subscribeStoreSettings(callback) {
  return onSnapshot(
    storeSettingsRef,
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      callback({
        freeShippingMin: Number(data.freeShippingMin ?? 0) || 0,
        bannerSlides: Array.isArray(data.bannerSlides) ? data.bannerSlides : [],
        updatedAt: data.updatedAt || null,
      });
    },
    (err) => {
      console.error("Firestore subscribeStoreSettings error:", err);
      callback({ freeShippingMin: 0, bannerSlides: [], updatedAt: null });
    }
  );
}

export async function updateStoreSettings(partial) {
  const payload = {
    ...partial,
    updatedAt: serverTimestamp(),
  };
  await setDoc(storeSettingsRef, payload, { merge: true });
}