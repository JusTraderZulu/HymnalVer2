import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminToken } from "@/lib/auth"

const READ_ONLY = process.env.READ_ONLY === 'true'

export async function POST(req: Request) {
  if (READ_ONLY) {
    return NextResponse.json({ error: "Read-only mode" }, { status: 403 })
  }
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
      // 1 year in seconds
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return res
}



