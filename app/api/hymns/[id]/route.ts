import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { hymns as fallbackHymns } from "@/data/hymns"

// Define the directory where hymn JSON files are stored
const hymnsDirectory = path.join(process.cwd(), "hymns")

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hymnId = params.id
    const data = await request.json()

    // Check if the directory exists
    if (!fs.existsSync(hymnsDirectory)) {
      // Create the directory if it doesn't exist
      try {
        fs.mkdirSync(hymnsDirectory, { recursive: true })
        console.log(`Created hymns directory at ${hymnsDirectory}`)
      } catch (err) {
        console.error("Failed to create hymns directory:", err)
        return NextResponse.json({ error: "Hymns directory doesn't exist and couldn't be created" }, { status: 500 })
      }
    }

    // Create a new file name based on the hymn number
    const fileName = `hymn_${hymnId}.json`
    const filePath = path.join(hymnsDirectory, fileName)
    
    let existingHymn;
    
    // First check if the file exists
    if (fs.existsSync(filePath)) {
      try {
        const existingContent = fs.readFileSync(filePath, "utf8")
        existingHymn = JSON.parse(existingContent)
      } catch (err) {
        console.error(`Error reading existing hymn file ${fileName}:`, err)
        // Continue and try to use fallback data
      }
    }
    
    // If file doesn't exist or couldn't be read, try to find the hymn in our fallback data
    if (!existingHymn) {
      // Try to find hymn in fallback data by comparing string representations of hymn numbers
      existingHymn = fallbackHymns.find((h) => String(h.hymnNumber) === String(hymnId))
      
      // If it's not in the fallback data, create a minimal hymn object with just the ID
      if (!existingHymn) {
        // Preserve the exact format of the hymnId
        existingHymn = {
          hymnNumber: hymnId,
          title: data.title || `Hymn ${hymnId}`,
          lyrics: data.lyrics || "",
          category: data.category || "",
          author: data.author || { name: "" }
        }
      }
    }

    // Update the hymn with the new data
    const updatedHymn = { ...existingHymn, ...data }

    // Write the updated hymn to the file
    fs.writeFileSync(filePath, JSON.stringify(updatedHymn, null, 2), "utf8")

    return NextResponse.json(updatedHymn)
  } catch (error) {
    console.error("Error updating hymn:", error)
    return NextResponse.json({ error: "Failed to update hymn" }, { status: 500 })
  }
}
