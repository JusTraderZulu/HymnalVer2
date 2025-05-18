import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Hymn } from "@/types/hymn"
import { hymns as fallbackHymns } from "@/data/hymns"

// Define the directory where hymn JSON files are stored
const hymnsDirectory = path.join(process.cwd(), "hymns")

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
    // Check if the directory exists
    if (!fs.existsSync(hymnsDirectory)) {
      console.log("Hymns directory not found, using fallback data")
      // Return the fallback hymns from our static data, sorted by hymn number
      return NextResponse.json(sortHymns(fallbackHymns))
    }

    // Read all files in the directory
    const files = fs.readdirSync(hymnsDirectory)
    const hymnFiles = files.filter((file) => file.endsWith(".json"))

    // If no JSON files found, use fallback data
    if (hymnFiles.length === 0) {
      console.log("No hymn files found, using fallback data")
      return NextResponse.json(sortHymns(fallbackHymns))
    }

    const hymns: Hymn[] = []

    // Process each JSON file
    for (const file of hymnFiles) {
      const filePath = path.join(hymnsDirectory, file)
      const fileContent = fs.readFileSync(filePath, "utf8")

      try {
        const hymn = JSON.parse(fileContent)

        // Add the filename to the hymn object
        hymn.fileName = file

        // Extract first line for search if not already present
        if (!hymn.firstLine && hymn.lyrics) {
          const lines = hymn.lyrics.split("\n")
          for (const line of lines) {
            if (line.trim() && !line.trim().match(/^\d+\./)) {
              hymn.firstLine = line.trim()
              break
            }
          }
        }

        // Ensure all fields are properly typed
        if (hymn.author && typeof hymn.author === 'object') {
          // Make sure author is properly formatted
          if (typeof hymn.author.name !== 'string') {
            hymn.author.name = String(hymn.author.name || '');
          }
          if (hymn.author.bio && typeof hymn.author.bio !== 'string') {
            hymn.author.bio = String(hymn.author.bio);
          }
        }
        
        // Ensure lyrics is a string
        if (typeof hymn.lyrics !== 'string') {
          hymn.lyrics = String(hymn.lyrics || '');
        }
        
        // Ensure category is a string
        if (hymn.category && typeof hymn.category !== 'string') {
          hymn.category = String(hymn.category);
        }

        // Ensure hymnNumber is preserved as it was in the file
        // (important for alphanumeric hymn numbers like "355a")
        if (hymn.hymnNumber === undefined) {
          // Try to extract from filename if missing
          const match = file.match(/hymn_([^.]+)\.json/i);
          if (match && match[1]) {
            hymn.hymnNumber = match[1];
          }
        }

        hymns.push(hymn)
      } catch (error) {
        console.error(`Error parsing ${file}:`, error)
        // Continue with other files even if one fails
      }
    }

    // Sort hymns by hymn number before returning
    const sortedHymns = sortHymns(hymns)

    return NextResponse.json(sortedHymns)
  } catch (error) {
    console.error("Error reading hymns directory:", error)
    // Return fallback data in case of any error
    return NextResponse.json(sortHymns(fallbackHymns))
  }
}

// Add POST method to create a new hymn
export async function POST(request: Request) {
  try {
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
    
    // Ensure the hymns directory exists
    if (!fs.existsSync(hymnsDirectory)) {
      try {
        fs.mkdirSync(hymnsDirectory, { recursive: true });
        console.log(`Created hymns directory at ${hymnsDirectory}`);
      } catch (err) {
        console.error("Failed to create hymns directory:", err);
        return NextResponse.json(
          { error: "Hymns directory doesn't exist and couldn't be created" },
          { status: 500 }
        );
      }
    }
    
    // Format hymn number for filename
    const hymnNumber = String(data.hymnNumber);
    const fileName = `hymn_${hymnNumber}.json`;
    const filePath = path.join(hymnsDirectory, fileName);
    
    // Check if a hymn with this number already exists
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `A hymn with number ${hymnNumber} already exists` },
        { status: 409 }
      );
    }
    
    // Prepare the hymn object
    const newHymn: Hymn = {
      hymnNumber: data.hymnNumber,
      title: data.title,
      lyrics: data.lyrics,
      category: data.category || "",
      author: data.author || { name: "" }
    };
    
    // Write the hymn to the file
    fs.writeFileSync(filePath, JSON.stringify(newHymn, null, 2), "utf8");
    
    return NextResponse.json(newHymn, { status: 201 });
  } catch (error) {
    console.error("Error creating hymn:", error);
    return NextResponse.json({ error: "Failed to create hymn" }, { status: 500 });
  }
}
