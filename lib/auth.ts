import crypto from "crypto"
import { cookies } from "next/headers"

export function getAdminToken(): string | null {
  const secret = process.env.APP_ADMIN_SECRET
  if (!secret) return null
  return crypto.createHmac("sha256", secret).update("admin-ok").digest("hex")
}

export function isAdmin(): boolean {
  const token = getAdminToken()
  if (!token) return false
  const cookieVal = cookies().get("admin")?.value
  return cookieVal === token
}



