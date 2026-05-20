'use client'

import { useEffect, useRef } from 'react'

interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  divider?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  // Clamp to viewport
  const safeX = Math.min(x, window.innerWidth - 200)
  const safeY = Math.min(y, window.innerHeight - items.length * 30 - 20)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded-lg border py-1 shadow-2xl"
      style={{ left: safeX, top: safeY, background: '#111318', borderColor: '#1E2028' }}
    >
      {items.map((item, i) => (
        item.divider ? (
          <div key={i} className="my-1 h-px" style={{ background: '#1E2028' }} />
        ) : (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-left transition-colors"
            style={{ color: item.danger ? '#FF5C8A' : '#7A7E92' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1E2028'
              e.currentTarget.style.color = item.danger ? '#ff8aaa' : '#E8E9F0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = item.danger ? '#FF5C8A' : '#7A7E92'
            }}
          >
            {item.icon && <span className="w-4 flex items-center justify-center">{item.icon}</span>}
            {item.label}
          </button>
        )
      ))}
    </div>
  )
}
