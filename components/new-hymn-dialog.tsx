"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Hymn } from "@/types/hymn"

interface NewHymnDialogProps {
  open: boolean
  type: 'hymn' | 'chorus'
  onOpenChange: (open: boolean) => void
  onHymnCreated: () => void
  existingHymns: Hymn[]
}

export default function NewHymnDialog({
  open,
  type,
  onOpenChange,
  onHymnCreated,
  existingHymns,
}: NewHymnDialogProps) {
  const [title, setTitle] = useState("")
  const [hymnNumber, setHymnNumber] = useState("")
  const [category, setCategory] = useState("")
  const [lyrics, setLyrics] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const resetForm = () => {
    setTitle("")
    setHymnNumber("")
    setCategory("")
    setLyrics("")
    setAuthorName("")
    setIsSubmitting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const validateHymnNumber = (value: string): boolean => {
    // For regular hymns, check if it's a number or alphanumeric (like 355a)
    if (type === 'hymn') {
      // Allow digits followed optionally by a letter
      return /^\d+[a-z]?$/i.test(value);
    } 
    // For choruses, check if it starts with 's' followed by numbers
    else {
      return /^s\d+$/i.test(value);
    }
  }

  const handleSubmit = async () => {
    // Validate form
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" })
      return
    }

    if (!hymnNumber.trim()) {
      toast({ title: "Error", description: "Please enter a hymn number", variant: "destructive" })
      return
    }

    if (!validateHymnNumber(hymnNumber)) {
      toast({ 
        title: "Error", 
        description: type === 'hymn' 
          ? "Hymn number should be a number, optionally followed by a letter (e.g., 123 or 123a)" 
          : "Chorus number should start with 's' followed by numbers (e.g., s123)",
        variant: "destructive" 
      })
      return
    }

    // Check if the hymn number already exists
    if (existingHymns.some(h => String(h.hymnNumber).toLowerCase() === hymnNumber.toLowerCase())) {
      toast({ 
        title: "Error", 
        description: `A ${type} with this number already exists`, 
        variant: "destructive" 
      })
      return
    }

    if (!lyrics.trim()) {
      toast({ title: "Error", description: "Please enter lyrics", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/hymns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hymnNumber,
          title,
          lyrics,
          category: category || undefined,
          author: authorName ? { name: authorName } : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to create ${type}`)
      }

      // Success
      onHymnCreated()
      resetForm()
    } catch (error) {
      console.error(`Error creating ${type}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to create ${type}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {type === 'hymn' ? 'Hymn' : 'Chorus'}</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new {type === 'hymn' ? 'hymn' : 'chorus'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number" className="text-right">
              Number
            </Label>
            <Input
              id="number"
              value={hymnNumber}
              onChange={(e) => setHymnNumber(e.target.value)}
              className="col-span-3"
              placeholder={type === 'hymn' ? "e.g., 123 or 123a" : "e.g., s123"}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Enter title"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Praise, Worship, Communion"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="col-span-3"
              placeholder="Author name (optional)"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Label htmlFor="lyrics" className="text-right pt-2">
              Lyrics
            </Label>
            <Textarea
              id="lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="col-span-3 min-h-[150px]"
              placeholder="Enter lyrics here"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 