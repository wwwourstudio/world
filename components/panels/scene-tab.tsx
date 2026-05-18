'use client'

import { useState } from 'react'
import { useWorldBuilder, type WorldObject } from '@/lib/store'
import { Eye, EyeOff, Lock, LockOpen, Trash2, Copy, Plus, Box, Circle, Cylinder, Package, Boxes } from 'lucide-react'

function typeIcon(type: WorldObject['type']) {
  const props = { size: 11, strokeWidth: 1.75 }
  switch (type) {
    case 'sphere': return <Circle {...props} />
    case 'cylinder': return <Cylinder {...props} />
    case 'gltf': return <Package {...props} />
    default: return <Box {...props} />
  }
}

function ObjectRow({ obj }: { obj: WorldObject }) {
  const selectedObjectId = useWorldBuilder((s) => s.selectedObjectId)
  const setSelectedObject = useWorldBuilder((s) => s.setSelectedObject)
  const updateObject = useWorldBuilder((s) => s.updateObject)
  const removeObject = useWorldBuilder((s) => s.removeObject)
  const duplicateObject = useWorldBuilder((s) => s.duplicateObject)
  const isSelected = selectedObjectId === obj.id

  return (
    <div
      onClick={() => setSelectedObject(isSelected ? null : obj.id)}
      className={`group flex items-center gap-2 pl-3 pr-2 py-1.5 cursor-pointer text-[12px] select-none border-l-2 transition-colors ${
        isSelected
          ? 'bg-orange-500/10 text-zinc-100 border-orange-500'
          : 'hover:bg-zinc-800/50 text-zinc-400 border-transparent hover:text-zinc-200'
      }`}
    >
      <span className={isSelected ? 'text-orange-400' : 'text-zinc-600'}>{typeIcon(obj.type)}</span>
      <span className="flex-1 truncate">{obj.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); duplicateObject(obj.id) }}
          title="Duplicate"
          className="p-1 rounded hover:bg-zinc-700 hover:text-zinc-100"
        >
          <Copy size={10} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
          title={obj.visible ? 'Hide' : 'Show'}
          className="p-1 rounded hover:bg-zinc-700 hover:text-zinc-100"
        >
          {obj.visible ? <Eye size={10} strokeWidth={1.75} /> : <EyeOff size={10} strokeWidth={1.75} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { locked: !obj.locked }) }}
          title={obj.locked ? 'Unlock' : 'Lock'}
          className="p-1 rounded hover:bg-zinc-700 hover:text-zinc-100"
        >
          {obj.locked ? <Lock size={10} strokeWidth={1.75} /> : <LockOpen size={10} strokeWidth={1.75} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeObject(obj.id) }}
          title="Delete"
          className="p-1 rounded hover:bg-red-950 hover:text-red-300"
        >
          <Trash2 size={10} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

export function SceneTab() {
  const objects = useWorldBuilder((s) => s.objects)
  const addPrimitive = useWorldBuilder((s) => s.addPrimitive)
  const [showMenu, setShowMenu] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = objects.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
            Objects · {objects.length}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            >
              <Plus size={11} strokeWidth={1.75} />
              Add
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl z-50 w-32 py-1">
                  {(['cube', 'sphere', 'cylinder'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => { addPrimitive(type); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800 capitalize"
                    >
                      {typeIcon(type)}
                      {type}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {objects.length > 4 && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {objects.length === 0 ? (
          <EmptyState
            icon={<Boxes size={28} strokeWidth={1.25} className="text-zinc-700" />}
            title="No objects yet"
            hint="Ask Claude to build a scene, or use Add above."
          />
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 text-[11px] py-8">No matches.</div>
        ) : (
          filtered.map((obj) => <ObjectRow key={obj.id} obj={obj} />)
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="mb-3">{icon}</div>
      <div className="text-[12px] text-zinc-300 font-medium mb-1">{title}</div>
      <div className="text-[11px] text-zinc-600 leading-relaxed max-w-[200px]">{hint}</div>
    </div>
  )
}
