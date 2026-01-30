'use client'

import { Input } from '@/components/ui/input'
import { X, Plus, GripVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Entity {
  id: number
  name: string
}

interface EntityComboboxProps {
  selected: Entity[]
  onSelectionChange: (entities: Entity[]) => void
  searchEndpoint: string // e.g. '/api/authors'
  createEndpoint: string // e.g. '/api/authors'
  entityKey: string // 'author' or 'publisher' — used to extract from API response
  placeholder: string
  createNewLabel: (name: string) => string
  noResultsLabel: string
  orderable?: boolean // only for authors
}

export function EntityCombobox({
  selected,
  onSelectionChange,
  searchEndpoint,
  createEndpoint,
  entityKey,
  placeholder,
  createNewLabel,
  noResultsLabel,
  orderable = false,
}: EntityComboboxProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Entity[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${API_URL}${searchEndpoint}?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          const entities: Entity[] = data[`${entityKey}s`] || []
          // Filter out already selected
          setResults(entities.filter((e) => !selected.some((s) => s.id === e.id)))
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, selected, API_URL, searchEndpoint, entityKey])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (entity: Entity) => {
    onSelectionChange([...selected, entity])
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleCreate = async () => {
    if (!query.trim()) return
    try {
      const response = await fetch(`${API_URL}${createEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: query.trim() }),
      })
      if (response.ok) {
        const data = await response.json()
        const newEntity = data[entityKey]
        if (newEntity) {
          handleSelect(newEntity)
        }
      }
    } catch {
      // Silently fail
    }
  }

  const handleRemove = (id: number) => {
    onSelectionChange(selected.filter((e) => e.id !== id))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newList = [...selected]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    onSelectionChange(newList)
  }

  const showCreateOption =
    query.trim() &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selected.some((s) => s.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="space-y-2">
      {/* Selected entities */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((entity, index) => (
            <div
              key={entity.id}
              className="flex items-center gap-1 rounded-md border bg-secondary/50 px-2 py-1 text-sm"
            >
              {orderable && selected.length > 1 && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={index === 0}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
              )}
              <span>{entity.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(entity.id)}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
        />

        {/* Dropdown */}
        {isOpen && (query.trim() || results.length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
          >
            {isLoading && <div className="px-3 py-2 text-sm text-muted-foreground">...</div>}

            {!isLoading && results.length === 0 && !showCreateOption && query.trim() && (
              <div className="px-3 py-2 text-sm text-muted-foreground">{noResultsLabel}</div>
            )}

            {results.map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => handleSelect(entity)}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent"
              >
                {entity.name}
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                {createNewLabel(query.trim())}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
