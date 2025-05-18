"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { X, Heart, Edit, Save } from "lucide-react"
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
  onHymnUpdated?: () => void
}

export default function HymnDetail({ 
  hymn, 
  onClose, 
  isFavorite, 
  onToggleFavorite, 
  isOffline = false,
  onHymnUpdated 
}: HymnDetailProps) {
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
    if (isOffline) {
      toast({
        title: "Offline Mode",
        description: "Cannot save changes while offline. Please connect to the internet.",
        variant: "destructive",
      })
      return;
    }

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
      hymn.title = editedTitle
      hymn.lyrics = editedLyrics
      hymn.category = editedCategory
      hymn.author = editedAuthor
      setIsEditing(false)

      // Call the update callback if provided
      if (onHymnUpdated) {
        onHymnUpdated()
      }

      toast({
        title: "Success",
        description: "Hymn updated successfully",
      })
    } catch (error) {
      console.error("Error saving hymn:", error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
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

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b">
          <SheetTitle className="text-left">
            <span className="mr-2 inline-block bg-primary/10 text-primary font-medium rounded-full w-8 h-8 text-center leading-8">
              {hymn.hymnNumber}
            </span>
            {isEditing ? (
              <Input 
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="inline-block ml-2 w-[calc(100%-3rem)]"
                placeholder="Hymn Title"
              />
            ) : (
              hymn.title
            )}
          </SheetTitle>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)} 
                aria-label="Edit hymn"
                disabled={isOffline}
              >
                <Edit className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving} aria-label="Save changes">
                <Save className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4">
            {isEditing ? (
              <div className="space-y-4">
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
                <div className="whitespace-pre-line">{hymn.lyrics}</div>

                {hymn.author && (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-medium">About the Author</h3>
                    <p className="text-sm mt-1">
                      {hymn.author.name}{" "}
                      {hymn.author.birthYear &&
                        hymn.author.deathYear &&
                        `(${hymn.author.birthYear}-${hymn.author.deathYear})`}
                    </p>
                    {hymn.author.bio && <p className="text-sm mt-2 text-muted-foreground">{hymn.author.bio}</p>}
                  </div>
                )}

                {hymn.category && (
                  <div className="mt-4">
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
