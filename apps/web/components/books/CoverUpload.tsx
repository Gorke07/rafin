'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Image as ImageIcon, Link as LinkIcon, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CoverUploadProps {
  coverPath?: string | null
  coverUrl?: string | null
  onCoverChange: (data: { coverPath?: string; coverUrl?: string }) => void
  onError?: (error: string) => void
}

export function CoverUpload({ coverPath, coverUrl, onCoverChange, onError }: CoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState(coverUrl || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentCover = coverPath ? `${API_URL}${coverPath}` : coverUrl || null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onError?.('Geçersiz dosya türü. JPEG, PNG veya WebP yükleyin.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('Dosya çok büyük. Maksimum 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/api/upload/cover`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        onError?.(data.error || 'Yükleme başarısız')
        return
      }

      onCoverChange({ coverPath: data.coverPath })
    } catch {
      onError?.('Yükleme sırasında hata oluştu')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      try {
        new URL(urlInput)
        onCoverChange({ coverUrl: urlInput })
        setShowUrlInput(false)
      } catch {
        onError?.('Geçersiz URL')
      }
    }
  }

  const handleRemove = () => {
    onCoverChange({ coverPath: undefined, coverUrl: undefined })
    setUrlInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative aspect-[2/3] w-full max-w-[200px] rounded-lg border-2 border-dashed',
          'flex items-center justify-center bg-muted/50',
          isUploading && 'opacity-50',
        )}
      >
        {currentCover ? (
          <>
            <img
              src={currentCover}
              alt="Kitap kapağı"
              className="h-full w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90"
              aria-label="Kapağı kaldır"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <span className="text-sm">Kapak resmi yok</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id="cover-upload"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-1 h-4 w-4" />
          {isUploading ? 'Yükleniyor...' : 'Yükle'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          <LinkIcon className="mr-1 h-4 w-4" />
          URL
        </Button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            Kaydet
          </Button>
        </div>
      )}
    </div>
  )
}
