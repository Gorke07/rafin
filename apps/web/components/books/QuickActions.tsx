'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Library, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface QuickActionsProps {
  bookId: number
  onCollectionClick?: () => void
}

export function QuickActions({ bookId, onCollectionClick }: QuickActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        router.push('/dashboard/books')
      }
    } catch (err) {
      console.error('Failed to delete book:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/dashboard/books/${bookId}/edit`)}
      >
        <Edit className="mr-1 h-4 w-4" />
        Düzenle
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onCollectionClick}
      >
        <Library className="mr-1 h-4 w-4" />
        Koleksiyona Ekle
      </Button>

      {showConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Emin misiniz?</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Evet, Sil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(false)}
          >
            İptal
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Sil
        </Button>
      )}
    </div>
  )
}
