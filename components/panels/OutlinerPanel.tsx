'use client'

import { useState, useRef } from 'react'
import {
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown,
  Box, Lightbulb, Users, Search, Trash2, Copy, Group,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { SceneObject, ObjectType } from '@/lib/scene/SceneStore'
import { ContextMenu } from '@/components/toolbar/ContextMenu'

function ObjectTypeIcon({ type }: { type: ObjectType }) {
  const cls = 'shrink-0'
  if (type === 'light') return <Lightbulb size={11} className={cls} style={{ color: '#d4b400' }} strokeWidth={1.75} />
  if (type === 'group') return <Group size={11} className={cls} style={{ color: '#7A7E92' }} strokeWidth={1.75} />
  return <Box size={11} className={cls} style={{ color: '#5B6CFF' }} strokeWidth={1.75} />
}

function ObjectRow({
  id,
  depth,
  onContextMenu,
}: {
  id: string
  depth: number
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const obj = useScene((s) => s.objects[id])
  const selectedIds = useScene((s) => s.selectedIds)
  const selectObject = useScene((s) => s.selectObject)
  const updateObject = useScene((s) => s.updateObject)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!obj) return null
  const isSelected = selectedIds.includes(id)
  const hasChildren = obj.children.length > 0
  const typeColor = obj.type === 'light' ? '#d4b400' : obj.type === 'group' ? '#7A7E92' : '#5B6CFF'

  function startEdit() {
    setDraft(obj.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  function commitEdit() {
    if (draft.trim()) updateObject(id, { name: draft.trim() })
    setEditing(false)
  }

  return (
    <div>
      <div
        className="flex items-center h-7 px-2 cursor-pointer group transition-colors"
        style={{
          paddingLeft: `${depth * 14 + 8}px`,
          background: isSelected ? `${typeColor}15` : undefined,
          borderLeft: isSelected ? `2px solid ${typeColor}` : '2px solid transparent',
        }}
        onClick={(e) => selectObject(id, e.ctrlKey || e.metaKey)}
        onDoubleClick={startEdit}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, id) }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#1E2028' }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '' }}
      >
        {/* Expand arrow */}
        <span
          className="w-4 flex items-center justify-center shrink-0"
          onClick={(e) => { e.stopPropagation(); updateObject(id, { expanded: !obj.expanded }) }}
        >
          {hasChildren
            ? obj.expanded
              ? <ChevronDown size={10} style={{ color: '#7A7E92' }} />
              : <ChevronRight size={10} style={{ color: '#7A7E92' }} />
            : null}
        </span>

        <ObjectTypeIcon type={obj.type} />

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            className="ml-1.5 flex-1 bg-transparent border-b text-[12px] outline-none"
            style={{ borderColor: '#5B6CFF', color: '#E8E9F0' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="ml-1.5 flex-1 text-[12px] truncate"
            style={{ color: isSelected ? '#E8E9F0' : '#7A7E92' }}
          >
            {obj.name}
          </span>
        )}

        {/* Visibility + lock */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); updateObject(id, { visible: !obj.visible }) }}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-zinc-700"
          >
            {obj.visible
              ? <Eye size={10} style={{ color: '#7A7E92' }} />
              : <EyeOff size={10} style={{ color: '#555' }} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); updateObject(id, { locked: !obj.locked }) }}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-zinc-700"
          >
            {obj.locked
              ? <Lock size={10} style={{ color: '#FF5C8A' }} />
              : <Unlock size={10} style={{ color: '#7A7E92' }} />}
          </button>
        </div>
      </div>

      {hasChildren && obj.expanded &&
        obj.children.map((cid) => (
          <ObjectRow key={cid} id={cid} depth={depth + 1} onContextMenu={onContextMenu} />
        ))
      }
    </div>
  )
}

export function OutlinerPanel() {
  const rootIds = useScene((s) => s.rootIds)
  const objects = useScene((s) => s.objects)
  const selectedIds = useScene((s) => s.selectedIds)
  const removeObject = useScene((s) => s.removeObject)
  const duplicateObject = useScene((s) => s.duplicateObject)
  const groupObjects = useScene((s) => s.groupObjects)
  const updateObject = useScene((s) => s.updateObject)
  const deselectAll = useScene((s) => s.deselectAll)
  const selectAll = useScene((s) => s.selectAll)

  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null)

  const filtered = search
    ? rootIds.filter((id) => objects[id]?.name.toLowerCase().includes(search.toLowerCase()))
    : rootIds

  function handleContextMenu(e: React.MouseEvent, id: string) {
    setCtx({ x: e.clientX, y: e.clientY, id })
  }

  const ctxItems = ctx ? [
    {
      label: 'Duplicate',
      icon: <Copy size={11} />,
      onClick: () => duplicateObject(ctx.id),
    },
    {
      label: 'Group Selected',
      icon: <Group size={11} />,
      onClick: () => {
        if (selectedIds.length > 1) groupObjects(selectedIds, 'Group')
        else groupObjects([ctx.id], 'Group')
      },
    },
    {
      label: objects[ctx.id]?.visible ? 'Hide' : 'Show',
      icon: objects[ctx.id]?.visible ? <EyeOff size={11} /> : <Eye size={11} />,
      onClick: () => updateObject(ctx.id, { visible: !objects[ctx.id]?.visible }),
    },
    { label: '', divider: true, onClick: () => {} },
    {
      label: 'Delete',
      icon: <Trash2 size={11} />,
      danger: true,
      onClick: () => removeObject(ctx.id),
    },
  ] : []

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111318' }}>
      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <div className="flex items-center gap-2 px-2 h-7 rounded-md" style={{ background: '#0B0C0F', border: '1px solid #1E2028' }}>
          <Search size={11} style={{ color: '#7A7E92' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter objects…"
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: '#E8E9F0' }}
          />
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center px-3 h-7 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0d0f14' }}>
        <span className="flex-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#5B6CFF' }}>
          Scene
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#1E2028', color: '#7A7E92' }}>
          {Object.keys(objects).length}
        </span>
        <button
          onClick={selectAll}
          className="ml-2 text-[10px] px-1.5 h-5 rounded transition-colors"
          style={{ color: '#7A7E92' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#E8E9F0'; (e.currentTarget as HTMLButtonElement).style.background = '#1E2028' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#7A7E92'; (e.currentTarget as HTMLButtonElement).style.background = '' }}
        >All</button>
        <button
          onClick={deselectAll}
          className="text-[10px] px-1.5 h-5 rounded transition-colors"
          style={{ color: '#7A7E92' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#E8E9F0'; (e.currentTarget as HTMLButtonElement).style.background = '#1E2028' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#7A7E92'; (e.currentTarget as HTMLButtonElement).style.background = '' }}
        >None</button>
      </div>

      {/* Object tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 py-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
              <Box size={18} style={{ color: '#2a2d3a' }} />
            </div>
            <span className="text-[11px]" style={{ color: '#4a4e5e' }}>
              {search ? 'No matches' : 'Scene is empty'}
            </span>
          </div>
        ) : (
          filtered.map((id) => (
            <ObjectRow key={id} id={id} depth={0} onContextMenu={handleContextMenu} />
          ))
        )}
      </div>

      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          items={ctxItems}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  )
}
