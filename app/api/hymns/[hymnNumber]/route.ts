import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Hymn } from "@/types/hymn"

// Define the directory where hymn JSON files are stored
const hymnsDirectory = path.join(process.cwd(), "hymns")

export async function PUT(
  request: Request,
  { params }: { params: { hymnNumber: string } }
) {
  try {
    const hymnNumber = params.hymnNumber
    const data = await request.json()

    // Validate required fields
    if (!data.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!data.lyrics) {
      return NextResponse.json({ error: "Lyrics are required" }, { status: 400 })
    }

    // Ensure the hymns directory exists
    if (!fs.existsSync(hymnsDirectory)) {
      return NextResponse.json(
        { error: "Hymns directory doesn't exist" },
        { status: 500 }
      )
    }

    // Find the hymn file
    const files = fs.readdirSync(hymnsDirectory)
    const hymnFile = files.find(
      (file) =>
        file.startsWith(`hymn_${hymnNumber}.`) ||
        file.startsWith(`hymn_${hymnNumber.toLowerCase()}.`) ||
        file.startsWith(`hymn_${hymnNumber.toUpperCase()}.`)
    )

    if (!hymnFile) {
      return NextResponse.json(
        { error: `Hymn with number ${hymnNumber} not found` },
        { status: 404 }
      )
    }

    const filePath = path.join(hymnsDirectory, hymnFile)
    
    // Read the existing hymn
    const existingHymnContent = fs.readFileSync(filePath, "utf8")
    const existingHymn = JSON.parse(existingHymnContent)

    // Update the hymn
    const updatedHymn: Hymn = {
      ...existingHymn,
      title: data.title,
      lyrics: data.lyrics,
      category: data.category || "",
      author: data.author || existingHymn.author || { name: "" }
    }

    // Create lowercase versions for search
    if (updatedHymn.title) {
      updatedHymn.lowercaseTitle = updatedHymn.title.toLowerCase()
    }
    
    if (updatedHymn.lyrics) {
      updatedHymn.lowercaseLyrics = updatedHymn.lyrics.toLowerCase()
    }

    // Write the updated hymn to the file
    fs.writeFileSync(filePath, JSON.stringify(updatedHymn, null, 4), "utf8")

    return NextResponse.json(updatedHymn)
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
  { params }: { params: { hymnNumber: string } }
) {
  try {
    const hymnNumber = params.hymnNumber

    // Ensure the hymns directory exists
    if (!fs.existsSync(hymnsDirectory)) {
      return NextResponse.json(
        { error: "Hymns directory doesn't exist" },
        { status: 500 }
      )
    }

    // Find the hymn file
    const files = fs.readdirSync(hymnsDirectory)
    const hymnFile = files.find(
      (file) =>
        file.startsWith(`hymn_${hymnNumber}.`) ||
        file.startsWith(`hymn_${hymnNumber.toLowerCase()}.`) ||
        file.startsWith(`hymn_${hymnNumber.toUpperCase()}.`)
    )

    if (!hymnFile) {
      return NextResponse.json(
        { error: `Hymn with number ${hymnNumber} not found` },
        { status: 404 }
      )
    }

    const filePath = path.join(hymnsDirectory, hymnFile)
    const hymnContent = fs.readFileSync(filePath, "utf8")
    const hymn = JSON.parse(hymnContent)

    return NextResponse.json(hymn)
  } catch (error) {
    console.error("Error fetching hymn:", error)
    return NextResponse.json(
      { error: "Failed to fetch hymn" },
      { status: 500 }
    )
  }
} 