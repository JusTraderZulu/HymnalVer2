import { NextResponse } from "next/server"
import type { Hymn } from "@/types/hymn"
import { supabaseAdmin, hasSupabaseEnv } from "@/lib/supabase"
import { isAdmin } from "@/lib/auth"

// Supabase-only implementation

// Force recompilation - params fix applied
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ hymnNumber: string }> }
) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { hymnNumber } = await params
    const payload = await request.json()

    // Validate required fields
    if (!payload.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!payload.lyrics) {
      return NextResponse.json({ error: "Lyrics are required" }, { status: 400 })
    }

    // If Supabase available, update in DB (handle both hymnnumber and "hymnNumber")
    if (hasSupabaseEnv && supabaseAdmin) {
      // Try lowercase column first
      let updated: any | null = null
      let upErr: any | null = null
      {
        const { data: upd1, error } = await supabaseAdmin
          .from("hymns")
          .update({
            title: payload.title,
            lyrics: payload.lyrics,
            category:
              typeof payload.category === "string" && payload.category.trim() !== ""
                ? payload.category
                : undefined,
            author: payload.author,
          })
          .eq("hymnnumber", hymnNumber)
          .select("*")
          .single()
        updated = upd1
        upErr = error
      }
      if (upErr) {
        // Retry with camelCase identifier
        const { data: upd2, error } = await supabaseAdmin
          .from("hymns")
          .update({
            title: payload.title,
            lyrics: payload.lyrics,
            category:
              typeof payload.category === "string" && payload.category.trim() !== ""
                ? payload.category
                : undefined,
            author: payload.author,
          })
          .eq("hymnNumber", hymnNumber)
          .select("*")
          .single()
        updated = upd2
        upErr = error
      }
      if (!upErr && updated) {
        return NextResponse.json({
          hymnNumber: (updated as any).hymnnumber ?? (updated as any).hymnNumber,
          title: (updated as any).title,
          lyrics: (updated as any).lyrics,
          category: (updated as any).category ?? "",
          author: (updated as any).author ?? { name: "" },
        })
      }
    }

    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  } catch (error) {
    console.error("Error updating hymn:", error)
    return NextResponse.json(
      { error: "Failed to update hymn" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hymnNumber: string }> }
) {
  try {
    const { hymnNumber } = await params

    // Try Supabase first (handle both hymnnumber and "hymnNumber")
    if (hasSupabaseEnv && supabaseAdmin) {
      // Lowercase attempt
      {
        const { data, error } = await supabaseAdmin
          .from("hymns")
          .select("*")
          .eq("hymnnumber", hymnNumber)
          .maybeSingle()
        if (!error && data) {
          const mapped = {
            hymnNumber: (data as any).hymnnumber ?? (data as any).hymnNumber,
            title: (data as any).title,
            lyrics: (data as any).lyrics,
            category: (data as any).category ?? "",
            author: (data as any).author ?? { name: "" },
          }
          return NextResponse.json(mapped)
        }
      }
      // CamelCase fallback
      {
        const { data, error } = await supabaseAdmin
          .from("hymns")
          .select("*")
          .eq("hymnNumber", hymnNumber)
          .maybeSingle()
        if (!error && data) {
          const mapped = {
            hymnNumber: (data as any).hymnnumber ?? (data as any).hymnNumber,
            title: (data as any).title,
            lyrics: (data as any).lyrics,
            category: (data as any).category ?? "",
            author: (data as any).author ?? { name: "" },
          }
          return NextResponse.json(mapped)
        }
      }
    }

    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  } catch (error) {
    console.error("Error fetching hymn:", error)
    return NextResponse.json(
      { error: "Failed to fetch hymn" },
      { status: 500 }
    )
  }
} 

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ hymnNumber: string }> }
) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { hymnNumber } = await params
    if (!(hasSupabaseEnv && supabaseAdmin)) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }
    // Try delete with lowercase column first, then camelCase
    let delErr: any | null = null
    {
      const { error } = await supabaseAdmin
        .from("hymns")
        .delete()
        .eq("hymnnumber", hymnNumber)
      delErr = error
    }
    if (delErr) {
      const { error } = await supabaseAdmin
        .from("hymns")
        .delete()
        .eq("hymnNumber", hymnNumber)
      delErr = error
    }
    if (delErr) {
      console.error("Supabase delete error", delErr)
      return NextResponse.json({ error: "Failed to delete hymn" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting hymn:", error)
    return NextResponse.json({ error: "Failed to delete hymn" }, { status: 500 })
  }
}