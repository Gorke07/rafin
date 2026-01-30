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
  X,
} from 'lucide-react'

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
  room: { icon: Home, label: 'Oda', color: 'bg-blue-500', next: 'furniture' as LocationType },
  furniture: {
    icon: Armchair,
    label: 'Mobilya',
    color: 'bg-green-500',
    next: 'shelf' as LocationType,
  },
  shelf: { icon: BookOpen, label: 'Raf', color: 'bg-orange-500', next: null },
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
        // Expand all by default
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
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 group cursor-pointer`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => hasChildren && toggleExpand(location.id)}
        >
          {/* Expand/collapse button */}
          <div className="w-5 flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : null}
          </div>

          {/* Icon */}
          <div className={`${config.color} p-1.5 rounded`}>
            <Icon className="h-4 w-4 text-white" />
          </div>

          {/* Name */}
          <span className="font-medium flex-1">{location.name}</span>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canAddChild && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startAddingChild(location)
                }}
                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title={t('addChild', { type: t(config.next!) })}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => handleDelete(location.id, e)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title={tc('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && location.children?.map((child) => renderLocation(child, level + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={startAddingRoom}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          {t('addRoom')}
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={cancelAdd}
        >
          <div
            className="bg-card rounded-lg p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {addingToParent ? (
                  <>
                    <span className="text-muted-foreground">{addingToParent.name}</span>
                    <span className="mx-2">→</span>
                    {t('addChild', { type: t(newType) })}
                  </>
                ) : (
                  t('addRoom')
                )}
              </h2>
              <button onClick={cancelAdd} className="p-1 hover:bg-accent rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

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
                        onClick={() => setNewType(type)}
                        className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                          newType === type
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <div className={`${cfg.color} p-2 rounded mx-auto w-fit mb-2`}>
                          <TypeIcon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-medium text-center">{t(type)}</p>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Name input */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('nameLabel')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={
                    newType === 'room'
                      ? t('roomPlaceholder')
                      : newType === 'furniture'
                        ? t('furniturePlaceholder')
                        : t('shelfPlaceholder')
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) handleAdd()
                    if (e.key === 'Escape') cancelAdd()
                  }}
                />
              </div>

              {/* Parent selector (only when adding to root and type is not room) */}
              {!addingToParent && newType !== 'room' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('parentLocation')}</label>
                  <select
                    onChange={(e) => {
                      const parent = flatLocations.find((l) => l.id === Number(e.target.value))
                      setAddingToParent(parent || null)
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">{t('selectParent')}</option>
                    {flatLocations
                      .filter((l) => {
                        if (newType === 'furniture') return l.type === 'room'
                        if (newType === 'shelf') return l.type === 'furniture'
                        return false
                      })
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelAdd}
                  className="flex-1 rounded-md border px-4 py-2 hover:bg-accent"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSaving || !newName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tc('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t('noLocations')}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {t('noLocationsHint')}
          </p>
          <button
            onClick={startAddingRoom}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            {t('addFirstRoom')}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4">
          {locations.map((location) => renderLocation(location))}
        </div>
      )}

      {/* Quick guide */}
      {locations.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-1 rounded">
              <Home className="h-3 w-3 text-white" />
            </div>
            <span>{t('room')}</span>
          </div>
          <span>→</span>
          <div className="flex items-center gap-2">
            <div className="bg-green-500 p-1 rounded">
              <Armchair className="h-3 w-3 text-white" />
            </div>
            <span>{t('furniture')}</span>
          </div>
          <span>→</span>
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1 rounded">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span>{t('shelf')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
