'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Edit, Library, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface QuickActionsProps {
  bookId: number
  onCollectionClick?: () => void
}

export function QuickActions({ bookId, onCollectionClick }: QuickActionsProps) {
  const router = useRouter()
  const t = useTranslations('quickActions')
  const tc = useTranslations('common')
  const [isDeleting, setIsDeleting] = useState(false)

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
        {t('edit')}
      </Button>

      <Button variant="outline" size="sm" onClick={onCollectionClick}>
        <Library className="mr-1 h-4 w-4" />
        {t('addToCollection')}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1 h-4 w-4" />
            {t('deleteBook')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc('confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t('yesDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
