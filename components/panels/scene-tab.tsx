'use client'

import { useState } from 'react'
import { useWorldBuilder, type WorldObject } from '@/lib/store'
import { Eye, EyeOff, Lock, LockOpen, Trash2, Copy, Plus, ChevronDown, Box, Circle, Cylinder, Package } from 'lucide-react'

function typeIcon(type: WorldObject['type']) {
  switch (type) {
    case 'sphere': return <Circle size={12} />
    case 'cylinder': return <Cylinder size={12} />
    case 'gltf': return <Package size={12} />
    default: return <Box size={12} />
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
      className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs select-none border-l-2 ${
        isSelected
          ? 'bg-blue-600/15 text-blue-300 border-blue-500'
          : 'hover:bg-[#333] text-gray-400 border-transparent hover:text-gray-200'
      }`}
    >
      <span className={isSelected ? 'text-blue-400' : 'text-gray-600'}>{typeIcon(obj.type)}</span>
      <span className="flex-1 truncate">{obj.name}</span>
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); duplicateObject(obj.id) }}
          title="Duplicate"
          className="p-0.5 hover:text-white"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
          title={obj.visible ? 'Hide' : 'Show'}
          className="p-0.5 hover:text-white"
        >
          {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { locked: !obj.locked }) }}
          title={obj.locked ? 'Unlock' : 'Lock'}
          className="p-0.5 hover:text-white"
        >
          {obj.locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeObject(obj.id) }}
          title="Delete"
          className="p-0.5 hover:text-red-400"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

export function SceneTab() {
  const objects = useWorldBuilder((s) => s.objects)
  const addPrimitive = useWorldBuilder((s) => s.addPrimitive)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3a3a3a] shrink-0">
        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
          Objects ({objects.length})
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus size={13} />
            Add
            <ChevronDown size={11} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] border border-[#444] rounded shadow-2xl z-50 w-32 py-1">
                {(['cube', 'sphere', 'cylinder'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { addPrimitive(type); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#3a3a3a] capitalize"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {objects.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-10 px-4 leading-relaxed">
            No objects in scene.
            <br />
            Click Add to create one.
          </div>
        ) : (
          objects.map((obj) => <ObjectRow key={obj.id} obj={obj} />)
        )}
      </div>
    </div>
  )
}
