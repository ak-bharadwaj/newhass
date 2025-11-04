'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface CommandItem {
  id: string
  label: string
  href: string
  icon?: string
  group?: string
  keywords?: string[]
  parentMenuName?: string
}

interface NavCommandPaletteProps {
  isOpen: boolean
  items: CommandItem[]
  onClose: () => void
  onSelect: (item: CommandItem) => void
}

export function NavCommandPalette({ isOpen, items, onClose, onSelect }: NavCommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items
    }
    const normalized = query.trim().toLowerCase()
    return items.filter((item) => {
      const haystack = [item.label, item.group, ...(item.keywords || [])]
        .filter(Boolean)
        .join(' ') // ASCII by default
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [items, query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      const timeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  useEffect(() => {
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(filteredItems.length ? filteredItems.length - 1 : 0)
    }
  }, [filteredItems, activeIndex])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredItems.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = filteredItems[activeIndex]
      if (item) {
        onSelect(item)
      }
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/30 px-4 py-24"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search navigation..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
                aria-label="Search navigation"
              />
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                  No matches found.
                </div>
              ) : (
                <ul role="list" aria-label="Navigation results">
                  {filteredItems.map((item, index) => {
                    const isActive = index === activeIndex
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon && <span className="text-lg" aria-hidden>{item.icon}</span>}
                            <div>
                              <div className="font-medium leading-tight">{item.label}</div>
                              {item.group && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">{item.group}</div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">Enter</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Press Esc to close • Navigate with ↑ ↓
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
