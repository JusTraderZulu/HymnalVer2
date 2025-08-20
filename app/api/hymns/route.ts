import { NextResponse } from "next/server"
import type { Hymn } from "@/types/hymn"
import { supabaseAdmin, hasSupabaseEnv } from "@/lib/supabase"
import { isAdmin } from "@/lib/auth"

const READ_ONLY = process.env.READ_ONLY === 'true'

// Helper function to sort hymns with alphanumeric numbers
function sortHymns(hymns: Hymn[]): Hymn[] {
  return [...hymns].sort((a, b) => {
    // Extract numeric and alphabetic parts
    const aNumStr = String(a.hymnNumber).replace(/[^0-9]/g, '');
    const bNumStr = String(b.hymnNumber).replace(/[^0-9]/g, '');
    
    // Compare numeric parts first
    const aNum = aNumStr ? parseInt(aNumStr, 10) : 0;
    const bNum = bNumStr ? parseInt(bNumStr, 10) : 0;
    
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    
    // If numeric parts are equal, compare the full strings
    return String(a.hymnNumber).localeCompare(String(b.hymnNumber));
  });
}

export async function GET() {
  try {
    if (!(hasSupabaseEnv && supabaseAdmin)) {
      return NextResponse.json([], { status: 200 })
    }
    // Select all columns to be resilient to casing differences (hymnnumber vs "hymnNumber")
    const { data, error } = await supabaseAdmin
      .from("hymns")
      .select("*")
    if (error) throw error
    const mapped = (data ?? []).map((row: any) => ({
      hymnNumber: row.hymnnumber ?? row.hymnNumber,
      title: row.title,
      lyrics: row.lyrics,
      category: row.category ?? "",
      author: row.author ?? { name: "" },
    })) as Hymn[]
    return NextResponse.json(sortHymns(mapped))
  } catch (error) {
    console.error("Error fetching hymns:", error)
    return NextResponse.json([], { status: 200 })
  }
}

// Add POST method to create a new hymn
export async function POST(request: Request) {
  try {
    if (READ_ONLY) {
      return NextResponse.json({ error: "Read-only mode" }, { status: 403 })
    }
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const data = await request.json();
    
    // Validate required fields
    if (!data.hymnNumber) {
      return NextResponse.json({ error: "Hymn number is required" }, { status: 400 });
    }
    
    if (!data.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    if (!data.lyrics) {
      return NextResponse.json({ error: "Lyrics are required" }, { status: 400 });
    }
    
    const hymnNumber = String(data.hymnNumber);

    if (!(hasSupabaseEnv && supabaseAdmin)) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }
    // Try insert using lowercase column; if that fails due to column name, retry with camelCase
    let inserted: any | null = null
    let insertError: any | null = null
    {
      const { data: ins, error: err } = await supabaseAdmin
        .from("hymns")
        .insert({
          hymnnumber: hymnNumber,
          title: data.title,
          lyrics: data.lyrics,
          category: data.category || "",
          author: data.author || { name: "" },
        })
        .select("*")
        .single()
      inserted = ins
      insertError = err
    }
    if (insertError) {
      // Retry with camelCase id if the table was created with quoted identifiers
      const { data: ins2, error: err2 } = await supabaseAdmin
        .from("hymns")
        .insert({
          hymnNumber: hymnNumber,
          title: data.title,
          lyrics: data.lyrics,
          category: data.category || "",
          author: data.author || { name: "" },
        })
        .select("*")
        .single()
      inserted = ins2
      insertError = err2
    }
    if (insertError || !inserted) {
      console.error("Supabase insert error", insertError)
      return NextResponse.json({ error: "Failed to create hymn" }, { status: 500 })
    }
    const mapped = {
      hymnNumber: (inserted as any).hymnnumber ?? (inserted as any).hymnNumber,
      title: (inserted as any).title,
      lyrics: (inserted as any).lyrics,
      category: (inserted as any).category ?? "",
      author: (inserted as any).author ?? { name: "" },
    }
    return NextResponse.json(mapped, { status: 201 })
  } catch (error) {
    console.error("Error creating hymn:", error);
    return NextResponse.json({ error: "Failed to create hymn" }, { status: 500 });
  }
}
