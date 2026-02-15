"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function createSession(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn,
  });

  const cookieStore = await cookies();

  cookieStore.set("__session", sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: expiresIn / 1000,
    path: "/",
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
}
