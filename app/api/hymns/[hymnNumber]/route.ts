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
    const data = await request.json()

    // Validate required fields
    if (!data.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!data.lyrics) {
      return NextResponse.json({ error: "Lyrics are required" }, { status: 400 })
    }

    // If Supabase available, update in DB
    if (hasSupabaseEnv && supabaseAdmin) {
      const { data: updated, error } = await supabaseAdmin
        .from("hymns")
        .update({
          title: data.title,
          lyrics: data.lyrics,
          category: typeof data.category === "string" && data.category.trim() !== "" ? data.category : undefined,
          author: data.author
        })
        .eq("hymnnumber", hymnNumber)
        .select("hymnnumber,title,lyrics,category,author")
        .single()
      if (!error && updated) {
        return NextResponse.json({
          hymnNumber: (updated as any).hymnnumber,
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

    // Try Supabase first
    if (hasSupabaseEnv && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("hymns")
        .select("hymnnumber,title,lyrics,category,author")
        .eq("hymnnumber", hymnNumber)
        .maybeSingle()
      if (!error && data) {
        const mapped = {
          hymnNumber: (data as any).hymnnumber,
          title: (data as any).title,
          lyrics: (data as any).lyrics,
          category: (data as any).category ?? "",
          author: (data as any).author ?? { name: "" },
        }
        return NextResponse.json(mapped)
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
    const { error } = await supabaseAdmin
      .from("hymns")
      .delete()
      .eq("hymnnumber", hymnNumber)
    if (error) {
      console.error("Supabase delete error", error)
      return NextResponse.json({ error: "Failed to delete hymn" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting hymn:", error)
    return NextResponse.json({ error: "Failed to delete hymn" }, { status: 500 })
  }
}