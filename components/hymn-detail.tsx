"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { X, Heart, Edit, Save, Trash } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Hymn, Author } from "@/types/hymn"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HymnDetailProps {
  hymn: Hymn
  onClose: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
  isOffline?: boolean
  onHymnUpdated?: (updated?: Hymn) => void
}

export default function HymnDetail({ 
  hymn, 
  onClose, 
  isFavorite, 
  onToggleFavorite, 
  isOffline = false,
  onHymnUpdated 
}: HymnDetailProps) {
  const readOnly = process.env.NEXT_PUBLIC_READ_ONLY === 'true'
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(hymn.title)
  const [editedLyrics, setEditedLyrics] = useState(hymn.lyrics)
  const [editedCategory, setEditedCategory] = useState(hymn.category || "")
  const [editedAuthor, setEditedAuthor] = useState<Author>({
    name: hymn.author?.name || "",
    birthYear: hymn.author?.birthYear || "",
    deathYear: hymn.author?.deathYear || "",
    bio: hymn.author?.bio || ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!editedLyrics.trim()) {
      toast({
        title: "Error",
        description: "Lyrics cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!editedTitle.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch(`/api/hymns/${hymn.hymnNumber}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedTitle,
          lyrics: editedLyrics,
          category: editedCategory,
          author: editedAuthor
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      // Update was successful
      const updated: Hymn = {
        ...hymn,
        title: editedTitle,
        lyrics: editedLyrics,
        category: editedCategory,
        author: editedAuthor,
      }

      Object.assign(hymn, updated)
      setIsEditing(false)

      if (onHymnUpdated) onHymnUpdated(updated)

      toast({
        title: "Success",
        description: "Hymn updated successfully",
      })
      try { window.dispatchEvent(new CustomEvent('hymns-updated')) } catch {}
    } catch (error) {
      console.error("Remote save failed, falling back to local Dexie save", error)
      // Fall back to local save
      await performLocalSave()
    } finally {
      setIsSaving(false)
    }
  }

  const handleAuthorChange = (field: keyof Author, value: string) => {
    setEditedAuthor({
      ...editedAuthor,
      [field]: value
    });
  };

  // Allow saving locally when offline
  const performLocalSave = async () => {
    try {
      const updated: Hymn = {
        ...hymn,
        title: editedTitle,
        lyrics: editedLyrics,
        category: editedCategory,
        author: editedAuthor,
        pendingSync: true,
      }
      const { db } = await import("@/lib/db")
      await db.hymns.put(updated)

      const updatedHymn: Hymn = {
        ...hymn,
        title: editedTitle,
        lyrics: editedLyrics,
        category: editedCategory,
        author: editedAuthor,
        pendingSync: true,
      }

      Object.assign(hymn, updatedHymn)
      setIsEditing(false)

      if (onHymnUpdated) onHymnUpdated(updatedHymn)

      toast({ title: "Saved locally", description: "Your changes are stored on this device." })
      // When back online, parent already syncs and refetches. Also signal listeners now.
      try { window.dispatchEvent(new CustomEvent('hymns-updated')) } catch {}
    } catch (err) {
      console.error("Local save error", err)
      toast({ title: "Error", description: "Failed to save locally.", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this hymn?")) return
    try {
      const response = await fetch(`/api/hymns/${hymn.hymnNumber}`, { method: "DELETE" })
      if (!response.ok) throw new Error("remote delete failed")
    } catch {
      const { db } = await import("@/lib/db")
      await db.hymns.delete(hymn.hymnNumber as any)
      // mark pending delete for later sync
      try { await (db as any).pendingDeletes.put({ hymnNumber: hymn.hymnNumber }) } catch {}
    }

    if (onHymnUpdated) onHymnUpdated(undefined)
    toast({ title: "Deleted", description: "Hymn removed." })
    onClose()
  }

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full max-h-[100dvh] overflow-hidden">
        <SheetHeader className="flex flex-row items-center justify-between p-2 sm:p-4 pt-12 sm:pt-4 pb-2 border-b shrink-0">
          <SheetTitle className="text-left">
            <span className="mr-1 sm:mr-2 inline-block bg-primary/10 text-primary font-medium rounded-full w-7 h-7 sm:w-8 sm:h-8 text-center leading-7 sm:leading-8 text-sm sm:text-base">
              {hymn.hymnNumber}
            </span>
            {isEditing ? (
              <Input 
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="inline-block ml-1 sm:ml-2 w-[calc(100%-2.5rem)]"
                placeholder="Hymn Title"
              />
            ) : (
              <span className="text-base sm:text-lg">{hymn.title}</span>
            )}
          </SheetTitle>
          <div className="flex items-center gap-1 sm:gap-2 mt-8 sm:mt-0">
            {!readOnly && !isEditing ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)} 
                aria-label="Edit hymn"
              >
                <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            ) : !readOnly && (
              <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving} aria-label="Save changes">
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </Button>
            {!readOnly && (
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4">
            {isEditing ? (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    placeholder="Category (e.g., Praise, Worship, Communion)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lyrics">Lyrics</Label>
                  <Textarea
                    id="lyrics"
                    value={editedLyrics}
                    onChange={(e) => setEditedLyrics(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Enter hymn lyrics..."
                    disabled={isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Author Information</Label>
                  <div className="space-y-2">
                    <Input
                      value={editedAuthor.name}
                      onChange={(e) => handleAuthorChange('name', e.target.value)}
                      placeholder="Author Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editedAuthor.birthYear || ''}
                        onChange={(e) => handleAuthorChange('birthYear', e.target.value)}
                        placeholder="Birth Year"
                      />
                      <Input
                        value={editedAuthor.deathYear || ''}
                        onChange={(e) => handleAuthorChange('deathYear', e.target.value)}
                        placeholder="Death Year"
                      />
                    </div>
                    <Textarea
                      value={editedAuthor.bio || ''}
                      onChange={(e) => handleAuthorChange('bio', e.target.value)}
                      placeholder="Author Biography"
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-line text-sm sm:text-base">{hymn.lyrics}</div>

                {hymn.author && (
                  <div className="mt-4 sm:mt-6 border-t pt-3 sm:pt-4">
                    <h3 className="font-medium text-sm sm:text-base">About the Author</h3>
                    <p className="text-xs sm:text-sm mt-1">
                      {hymn.author.name}{" "}
                      {hymn.author.birthYear &&
                        hymn.author.deathYear &&
                        `(${hymn.author.birthYear}-${hymn.author.deathYear})`}
                    </p>
                    {hymn.author.bio && <p className="text-xs sm:text-sm mt-2 text-muted-foreground">{hymn.author.bio}</p>}
                  </div>
                )}

                {hymn.category && (
                  <div className="mt-3 sm:mt-4">
                    <span className="inline-block bg-muted px-2 py-1 rounded text-xs">{hymn.category}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
