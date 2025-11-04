"use client"

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('ui:commandk' as any, onOpen)
    return () => window.removeEventListener('ui:commandk' as any, onOpen)
  }, [])

  React.useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-24 -translate-x-1/2 w-full max-w-2xl rounded-2xl glass-card border shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              placeholder="Search patients, modules, actions…"
              className="flex-1 bg-transparent outline-none py-2"
            />
            <kbd className="px-2 py-1 text-xs rounded bg-gray-100">Esc</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">Quick links</div>
            <ul className="p-1">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Patients', href: '/dashboard/manager/patients' },
                { label: 'Appointments', href: '/dashboard/reception/appointments' },
                { label: 'Reports', href: '/dashboard/admin/reports' },
              ].map((i) => (
                <li key={i.href}>
                  <a
                    href={i.href}
                    className={clsx('block px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors')}
                    onClick={() => setOpen(false)}
                  >
                    {i.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
