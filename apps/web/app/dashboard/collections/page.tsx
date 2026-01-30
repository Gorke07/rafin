'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Plus, Library, Loader2, MoreVertical, Trash2, Edit, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Collection {
  id: number
  name: string
  description: string | null
  color: string | null
  icon: string | null
  isSmart: boolean
  bookCount: number
  createdAt: string
}

function CollectionsContent() {
  const t = useTranslations('collections')
  const tc = useTranslations('common')
  const { addToast } = useToast()

  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

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

  useEffect(() => {
    fetchCollections()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          color: newColor,
        }),
      })

      if (response.ok) {
        addToast(t('created'), 'success')
        setNewName('')
        setNewDescription('')
        setNewColor('#3b82f6')
        setShowForm(false)
        fetchCollections()
      }
    } catch {
      addToast(t('createFailed'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      addToast(t('deleted'), 'success')
      setCollections((prev) => prev.filter((c) => c.id !== id))
    } catch {
      addToast(t('deleteFailed'), 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addCollection')}
        </Button>
      </div>

      {/* New Collection Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('newCollection')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="col-name">{t('collectionName')}</Label>
              <Input
                id="col-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="col-color">{t('color')}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="col-color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="col-desc">{t('descriptionOptional')}</Label>
            <Input
              id="col-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tc('create')}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {tc('cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Collection Grid */}
      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Library className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-lg font-semibold">{t('noCollections')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('organizeBooks')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <Link href={`/dashboard/collections/${col.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-1 h-8 w-8 shrink-0 rounded-lg"
                    style={{ backgroundColor: col.color || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {col.name}
                      {col.isSmart && (
                        <Sparkles className="ml-1.5 inline h-4 w-4 text-yellow-500" />
                      )}
                    </h3>
                    {col.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {col.description}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('booksCount', { count: col.bookCount })}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  href={`/dashboard/collections/${col.id}`}
                  className="rounded-md p-1.5 hover:bg-accent"
                  title={tc('edit')}
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(col.id)
                  }}
                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                  title={tc('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CollectionsPage() {
  return <CollectionsContent />
}
