'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Note {
  id: number
  content: string
  pageNumber: number | null
  createdAt: string
}

interface BookNotesProps {
  bookId: number
}

export function BookNotes({ bookId }: BookNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newPageNumber, setNewPageNumber] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchNotes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/notes`, {
        credentials: 'include',
      })
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [bookId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newNote,
          pageNumber: newPageNumber ? Number(newPageNumber) : undefined,
        }),
      })

      if (response.ok) {
        setNewNote('')
        setNewPageNumber('')
        setShowForm(false)
        fetchNotes()
      }
    } catch (err) {
      console.error('Failed to add note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    try {
      await fetch(`${API_URL}/api/books/${bookId}/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <MessageSquare className="h-5 w-5" />
          Notlar ({notes.length})
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Not Ekle
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Notunuzu yazın..."
            rows={3}
          />
          <div className="flex items-end gap-3">
            <div className="w-32">
              <Label htmlFor="notePageNumber">Sayfa No</Label>
              <Input
                id="notePageNumber"
                type="number"
                min="1"
                value={newPageNumber}
                onChange={(e) => setNewPageNumber(e.target.value)}
                placeholder="opsiyonel"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAddNote} disabled={isSaving || !newNote.trim()}>
                {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Kaydet
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setNewNote('')
                  setNewPageNumber('')
                }}
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Henüz not eklenmemiş
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="group rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Notu sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(note.createdAt)}</span>
                {note.pageNumber && (
                  <span>Sayfa {note.pageNumber}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
