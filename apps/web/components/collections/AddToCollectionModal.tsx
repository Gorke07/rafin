'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Collection {
  id: number
  name: string
  color: string | null
  bookCount: number
}

interface AddToCollectionModalProps {
  bookId: number
  isOpen: boolean
  onClose: () => void
  onAdded?: () => void
  currentCollections?: number[]
}

export function AddToCollectionModal({
  bookId,
  isOpen,
  onClose,
  onAdded,
  currentCollections = [],
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCollections()
    }
  }, [isOpen])

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/collections`, {
        credentials: 'include',
      })
      const data = await response.json()
      setCollections(data.collections || [])
    } catch (err) {
      console.error('Failed to fetch collections:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async (collectionId: number) => {
    setAddingTo(collectionId)
    try {
      const response = await fetch(`${API_URL}/api/collections/${collectionId}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookId }),
      })

      if (response.ok) {
        onAdded?.()
        fetchCollections()
      }
    } catch (err) {
      console.error('Failed to add to collection:', err)
    } finally {
      setAddingTo(null)
    }
  }

  const handleRemove = async (collectionId: number) => {
    setAddingTo(collectionId)
    try {
      await fetch(`${API_URL}/api/collections/${collectionId}/books/${bookId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      onAdded?.()
      fetchCollections()
    } catch (err) {
      console.error('Failed to remove from collection:', err)
    } finally {
      setAddingTo(null)
    }
  }

  const handleCreateCollection = async () => {
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName }),
      })

      if (response.ok) {
        const data = await response.json()
        // Add the book to the newly created collection
        await handleAdd(data.collection.id)
        setNewName('')
        setShowNewForm(false)
        fetchCollections()
      }
    } catch (err) {
      console.error('Failed to create collection:', err)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Koleksiyona Ekle</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((col) => {
                const isInCollection = currentCollections.includes(col.id)
                const isProcessing = addingTo === col.id

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => (isInCollection ? handleRemove(col.id) : handleAdd(col.id))}
                    disabled={isProcessing}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
                      isInCollection
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-accent',
                    )}
                  >
                    {col.color && (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{col.name}</p>
                      <p className="text-xs text-muted-foreground">{col.bookCount} kitap</p>
                    </div>
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isInCollection ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}

              {collections.length === 0 && !showNewForm && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Henüz koleksiyon yok
                </p>
              )}
            </div>
          )}

          {showNewForm ? (
            <div className="mt-4 flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Koleksiyon adı"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCollection}
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ekle'}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Koleksiyon Oluştur
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
