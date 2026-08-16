// Data Access Layer (DAL)

import "server-only";

import { cookies } from "next/headers";
import db from "@/lib/db";

export type SessionRow = {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: string;
};

export type UserRow = {
  id: number;
  username: string | null;
  email: string;
};

export function isSessionExpired(session: SessionRow) {
  return new Date(session.expires_at) <= new Date();
}

export function getSessionByToken(token: string) {
  if (!token) return null;

  return db
    .query(
      "SELECT id, user_id, session_token, expires_at FROM sessions WHERE session_token = ?",
    )
    .get(token) as SessionRow | null;
}

export function getUserById(userId: number) {
  return db
    .query("SELECT id, username, email FROM users WHERE id = ?")
    .get(userId) as UserRow | null;
}

export function getUserForSessionToken(token: string) {
  const session = getSessionByToken(token);
  if (!session || isSessionExpired(session)) return null;

  return getUserById(session.user_id);
}

export async function getSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("session_token")?.value ?? null;
}

export async function getCurrentUserFromCookies() {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;

  return getUserForSessionToken(token);
}
