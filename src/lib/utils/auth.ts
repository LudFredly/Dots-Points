import { browser } from "$app/environment";
import { signInAnonymously, signInWithEmailAndPassword, type User } from "firebase/auth";
import { auth } from "$lib/utils/firestore";

/** Gives team members an anonymous session without requiring accounts. */
export async function ensureMemberSession(): Promise<User | null> {
  if (!browser) return null;
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

export async function signInAsAdmin(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
}