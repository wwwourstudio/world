'use client'

import { useWorldBuilder } from '@/lib/store'

type Vec3 = [number, number, number]

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.1,
  dp = 3,
}: {
  label: string
  value: Vec3
  onChange: (v: Vec3) => void
  step?: number
  dp?: number
}) {
  return (
    <div className="mb-3">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis}>
            <div className="text-[9px] text-gray-600 mb-0.5 text-center">{axis}</div>
            <input
              type="number"
              step={step}
              value={parseFloat(value[i].toFixed(dp))}
              onChange={(e) => {
                const copy: Vec3 = [...value] as Vec3
                copy[i] = parseFloat(e.target.value) || 0
                onChange(copy)
              }}
              className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-gray-200 text-center focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const DEG = 180 / Math.PI
const RAD = Math.PI / 180

export function ObjectTab() {
  const objects = useWorldBuilder((s) => s.objects)
  const selectedObjectId = useWorldBuilder((s) => s.selectedObjectId)
  const updateObject = useWorldBuilder((s) => s.updateObject)
  const obj = objects.find((o) => o.id === selectedObjectId)

  if (!obj) {
    return (
      <div className="text-center text-gray-600 text-xs py-10 px-4 leading-relaxed">
        Select an object to edit its transform.
      </div>
    )
  }

  const rotDeg: Vec3 = [obj.rotation[0] * DEG, obj.rotation[1] * DEG, obj.rotation[2] * DEG]

  return (
    <div className="p-3 overflow-y-auto custom-scrollbar">
      <div className="mb-4 pb-3 border-b border-[#3a3a3a]">
        <div className="text-sm text-gray-200 font-medium truncate">{obj.name}</div>
        <div className="text-[10px] text-gray-600 mt-0.5 capitalize">{obj.type}</div>
      </div>

      <Vec3Input
        label="Position"
        value={obj.position}
        onChange={(v) => updateObject(obj.id, { position: v })}
        step={0.5}
        dp={3}
      />
      <Vec3Input
        label="Rotation (°)"
        value={rotDeg}
        onChange={(v) => updateObject(obj.id, { rotation: [v[0] * RAD, v[1] * RAD, v[2] * RAD] })}
        step={15}
        dp={1}
      />
      <Vec3Input
        label="Scale"
        value={obj.scale}
        onChange={(v) => updateObject(obj.id, { scale: v })}
        step={0.1}
        dp={3}
      />

      <div className="flex gap-4 pt-3 border-t border-[#3a3a3a] mt-1">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={obj.visible}
            onChange={(e) => updateObject(obj.id, { visible: e.target.checked })}
            className="accent-blue-500"
          />
          Visible
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={obj.locked}
            onChange={(e) => updateObject(obj.id, { locked: e.target.checked })}
            className="accent-blue-500"
          />
          Locked
        </label>
      </div>
    </div>
  )
}
