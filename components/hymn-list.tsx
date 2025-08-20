"use client"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp, Music, Heart } from "lucide-react"
import type { Hymn } from "@/types/hymn"
import { useToast } from "@/hooks/use-toast"

interface HymnListProps {
  hymns: Hymn[]
  selectedHymn: number | string | null
  onHymnSelect: (hymnNumber: number | string) => void
  favorites: (number | string)[]
  onToggleFavorite: (hymnNumber: number | string) => void
  isAdmin?: boolean
  onEdit?: (hymnNumber: number | string) => void
}

export default function HymnList({ hymns, selectedHymn, onHymnSelect, favorites, onToggleFavorite, isAdmin = false, onEdit }: HymnListProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState<number | string | null>(null)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedLyrics, setEditedLyrics] = useState("")
  const [editedCategory, setEditedCategory] = useState("")
  const [editedAuthor, setEditedAuthor] = useState<{ name: string }>({ name: "" })
  const [isSaving, setIsSaving] = useState(false)

  const startEdit = (hymn: Hymn) => {
    setEditing(hymn.hymnNumber)
    setEditedTitle(hymn.title || "")
    setEditedLyrics(hymn.lyrics || "")
    setEditedCategory(hymn.category || "")
    setEditedAuthor({ name: hymn.author?.name || "" })
  }

  const cancelEdit = () => {
    setEditing(null)
  }

  const saveEdit = async (hymnNumber: number | string) => {
    try {
      if (!editedTitle.trim() || !editedLyrics.trim()) {
        toast({ title: "Missing fields", description: "Title and lyrics are required", variant: "destructive" })
        return
      }
      setIsSaving(true)
      const res = await fetch(`/api/hymns/${hymnNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          lyrics: editedLyrics,
          category: editedCategory,
          author: editedAuthor,
        }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      toast({ title: "Saved", description: "Hymn updated" })
      try { window.dispatchEvent(new CustomEvent('hymns-updated')) } catch {}
      setEditing(null)
    } catch (e) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }
  // Generate a unique key for each hymn
  const getHymnKey = (hymn: Hymn): string => {
    // Use filename if available as it's guaranteed to be unique
    if (hymn.fileName) {
      return hymn.fileName;
    }
    
    // Otherwise create a composite key from number and title
    return `${String(hymn.hymnNumber)}-${hymn.title.replace(/\s+/g, '-').toLowerCase()}`;
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto p-2 sm:p-4">
        {hymns.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <Music className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            <p className="mt-3 sm:mt-4 text-base sm:text-lg font-medium">No hymns found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {hymns.map((hymn) => (
              <li key={getHymnKey(hymn)} className="border rounded-lg overflow-hidden">
                <div className={`flex items-center ${selectedHymn === hymn.hymnNumber ? 'sticky top-0 z-10 bg-background border-b' : ''}`}>
                  <Button
                    variant="ghost"
                    className="flex-1 flex items-center justify-between p-2 sm:p-4 h-auto"
                    onClick={(e) => {
                      onHymnSelect(hymn.hymnNumber)
                      const li = (e.currentTarget as HTMLElement).closest('li')
                      try { li && li.scrollIntoView({ block: 'start', behavior: 'smooth' }) } catch {}
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="bg-primary/10 text-primary font-medium rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm">
                        {hymn.hymnNumber}
                      </span>
                      <div className="text-left">
                        <div className="font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-xs">{hymn.title}</div>
                        {hymn.category && <div className="text-xs text-muted-foreground">{hymn.category}</div>}
                      </div>
                    </div>
                    {selectedHymn === hymn.hymnNumber ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 sm:mr-2"
                    onClick={() => onToggleFavorite(hymn.hymnNumber)}
                    aria-label={favorites.includes(hymn.hymnNumber) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${favorites.some(f => f === hymn.hymnNumber) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  </Button>
                </div>
                {selectedHymn === hymn.hymnNumber && (
                  <div className="p-3 sm:p-4 pt-0 bg-muted/50">
                    {isAdmin && editing !== hymn.hymnNumber && (
                      <div className="mb-3 flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => startEdit(hymn)}>
                          Edit
                        </Button>
                      </div>
                    )}
                    {isAdmin && editing === hymn.hymnNumber ? (
                      <div className="space-y-2">
                        <div>
                          <Label>Title</Label>
                          <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Input value={editedCategory} onChange={(e) => setEditedCategory(e.target.value)} />
                        </div>
                        <div>
                          <Label>Lyrics</Label>
                          <Textarea className="min-h-[150px] text-sm" value={editedLyrics} onChange={(e) => setEditedLyrics(e.target.value)} />
                        </div>
                        <div>
                          <Label>Author</Label>
                          <Input value={editedAuthor.name} onChange={(e) => setEditedAuthor({ name: e.target.value })} placeholder="Author name" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                          <Button size="sm" onClick={() => saveEdit(hymn.hymnNumber)} disabled={isSaving}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-line text-xs sm:text-sm">{hymn.lyrics}</div>
                        {hymn.author && (
                          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                            <p>
                              Author: {hymn.author.name}{" "}
                              {hymn.author.birthYear &&
                                hymn.author.deathYear &&
                                `(${hymn.author.birthYear}-${hymn.author.deathYear})`}
                            </p>
                          </div>
                        )}
                        {isAdmin && null}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScrollArea>
  )
}
