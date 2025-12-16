import { NextResponse } from "next/server";
import { deleteSessionByToken, getCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * 退出登录：
 * - POST /api/auth/logout
 */
export async function POST(req: Request) {
  const token = getCookie(req, SESSION_COOKIE_NAME);
  if (token) await deleteSessionByToken(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  return res;
}


