'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  MapPin,
  Home,
  Armchair,
  BookOpen,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type LocationType = 'room' | 'furniture' | 'shelf'

interface Location {
  id: number
  name: string
  type: LocationType
  parentId: number | null
  children?: Location[]
}

const typeConfig = {
  room: { icon: Home, next: 'furniture' as LocationType },
  furniture: { icon: Armchair, next: 'shelf' as LocationType },
  shelf: { icon: BookOpen, next: null },
}

export default function LocationsPage() {
  const t = useTranslations('locations')
  const tc = useTranslations('common')
  const [isLoading, setIsLoading] = useState(true)
  const [locations, setLocations] = useState<Location[]>([])
  const [flatLocations, setFlatLocations] = useState<Location[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingToParent, setAddingToParent] = useState<Location | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<LocationType>('room')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/locations`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations)
        setFlatLocations(data.flat)
        setExpandedIds(new Set(data.flat.map((l: Location) => l.id)))
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startAddingChild = (parent: Location) => {
    const config = typeConfig[parent.type]
    if (!config.next) return

    setAddingToParent(parent)
    setNewType(config.next)
    setNewName('')
    setShowAddForm(true)
  }

  const startAddingRoom = () => {
    setAddingToParent(null)
    setNewType('room')
    setNewName('')
    setShowAddForm(true)
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setAddingToParent(null)
    setNewName('')
  }

  const handleAdd = async () => {
    if (!newName.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          parentId: addingToParent?.id,
        }),
      })

      if (response.ok) {
        await fetchLocations()
        cancelAdd()
      }
    } catch (error) {
      console.error('Failed to add location:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t('confirmDeleteLocation'))) return

    try {
      await fetch(`${API_URL}/api/locations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      await fetchLocations()
    } catch (error) {
      console.error('Failed to delete location:', error)
    }
  }

  const renderLocation = (location: Location, level = 0) => {
    const config = typeConfig[location.type]
    const Icon = config.icon
    const hasChildren = location.children && location.children.length > 0
    const isExpanded = expandedIds.has(location.id)
    const canAddChild = config.next !== null

    return (
      <div key={location.id}>
        <div
          className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent/50"
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => hasChildren && toggleExpand(location.id)}
        >
          {/* Expand/collapse button */}
          <div className="w-5 shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : null}
          </div>

          {/* Icon */}
          <div className="rounded bg-muted p-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Name */}
          <span className="flex-1 font-medium">{location.name}</span>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canAddChild && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  startAddingChild(location)
                }}
                title={t('addChild', { type: t(config.next!) })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleDelete(location.id, e)}
              title={tc('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && location.children?.map((child) => renderLocation(child, level + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')}>
        <Button onClick={startAddingRoom}>
          <Plus className="h-4 w-4" />
          {t('addRoom')}
        </Button>
      </PageHeader>

      {/* Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => !open && cancelAdd()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addingToParent ? (
                <>
                  <span className="text-muted-foreground">{addingToParent.name}</span>
                  <span className="mx-2">→</span>
                  {t('addChild', { type: t(newType) })}
                </>
              ) : (
                t('addRoom')
              )}
            </DialogTitle>
            <DialogDescription>{t('noLocationsHint')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type selector (only when adding to root) */}
            {!addingToParent && (
              <div className="flex gap-2">
                {(['room', 'furniture', 'shelf'] as LocationType[]).map((type) => {
                  const cfg = typeConfig[type]
                  const TypeIcon = cfg.icon
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={`flex-1 rounded-lg border-2 p-3 transition-colors ${
                        newType === type
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="mx-auto mb-2 w-fit rounded bg-muted p-2">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-center text-sm font-medium">{t(type)}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Name input */}
            <div>
              <Label htmlFor="location-name">{t('nameLabel')}</Label>
              <Input
                id="location-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  newType === 'room'
                    ? t('roomPlaceholder')
                    : newType === 'furniture'
                      ? t('furniturePlaceholder')
                      : t('shelfPlaceholder')
                }
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleAdd()
                }}
              />
            </div>

            {/* Parent selector (only when adding to root and type is not room) */}
            {!addingToParent && newType !== 'room' && (
              <div>
                <Label>{t('parentLocation')}</Label>
                <Select
                  onValueChange={(value) => {
                    const parent = flatLocations.find((l) => l.id === Number(value))
                    setAddingToParent(parent || null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectParent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {flatLocations
                      .filter((l) => {
                        if (newType === 'furniture') return l.type === 'room'
                        if (newType === 'shelf') return l.type === 'furniture'
                        return false
                      })
                      .map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelAdd}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={isSaving || !newName.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{ marginLeft: `${(i % 3) * 20}px` }}
              >
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('noLocations')}
          description={t('noLocationsHint')}
          action={
            <Button onClick={startAddingRoom}>
              <Plus className="h-4 w-4" />
              {t('addFirstRoom')}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent>{locations.map((location) => renderLocation(location))}</CardContent>
        </Card>
      )}

      {/* Quick guide */}
      {!isLoading && locations.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="rounded bg-muted p-1">
              <Home className="h-3 w-3 text-muted-foreground" />
            </div>
            <span>{t('room')}</span>
          </div>
          <span>→</span>
          <div className="flex items-center gap-2">
            <div className="rounded bg-muted p-1">
              <Armchair className="h-3 w-3 text-muted-foreground" />
            </div>
            <span>{t('furniture')}</span>
          </div>
          <span>→</span>
          <div className="flex items-center gap-2">
            <div className="rounded bg-muted p-1">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
            </div>
            <span>{t('shelf')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
