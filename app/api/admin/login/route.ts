import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminToken } from "@/lib/auth"

export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({ secret: "" }))
  const appSecret = process.env.APP_ADMIN_SECRET
  if (!appSecret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }
  if (secret !== appSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = getAdminToken()
  const res = NextResponse.json({ success: true })
  if (token) {
    cookies().set("admin", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  }
  return res
}



