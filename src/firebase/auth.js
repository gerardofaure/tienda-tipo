import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase.js";

export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}