'use client'

import { useWorldBuilder } from '@/lib/store'
import { MousePointer } from 'lucide-react'

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
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 font-medium">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => {
          const axisColor = i === 0 ? 'text-red-400' : i === 1 ? 'text-emerald-400' : 'text-sky-400'
          return (
            <div key={axis} className="relative">
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold pointer-events-none ${axisColor}`}>
                {axis}
              </span>
              <input
                type="number"
                step={step}
                value={parseFloat(value[i].toFixed(dp))}
                onChange={(e) => {
                  const copy: Vec3 = [...value] as Vec3
                  copy[i] = parseFloat(e.target.value) || 0
                  onChange(copy)
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-6 pr-2 py-1.5 text-[11px] text-zinc-200 text-right font-mono tabular-nums focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          )
        })}
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
      <div className="flex flex-col items-center text-center py-10 px-6">
        <MousePointer size={28} strokeWidth={1.25} className="text-zinc-700 mb-3" />
        <div className="text-[12px] text-zinc-300 font-medium mb-1">No selection</div>
        <div className="text-[11px] text-zinc-600 leading-relaxed max-w-[200px]">
          Click an object in the scene or pick one from the Scene tab.
        </div>
      </div>
    )
  }

  const rotDeg: Vec3 = [obj.rotation[0] * DEG, obj.rotation[1] * DEG, obj.rotation[2] * DEG]

  return (
    <div className="overflow-y-auto custom-scrollbar h-full">
      <div className="px-4 py-3 border-b border-zinc-800">
        <input
          value={obj.name}
          onChange={(e) => updateObject(obj.id, { name: e.target.value })}
          className="w-full bg-transparent text-[13px] text-zinc-100 font-medium focus:outline-none border-b border-transparent focus:border-zinc-700 transition-colors"
        />
        <div className="text-[10px] text-zinc-600 mt-1 capitalize tracking-wide">{obj.type}</div>
      </div>

      <div className="p-4">
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

        <div className="flex gap-4 pt-3 border-t border-zinc-800 mt-2">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer select-none hover:text-zinc-200">
            <input
              type="checkbox"
              checked={obj.visible}
              onChange={(e) => updateObject(obj.id, { visible: e.target.checked })}
              className="accent-orange-500"
            />
            Visible
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer select-none hover:text-zinc-200">
            <input
              type="checkbox"
              checked={obj.locked}
              onChange={(e) => updateObject(obj.id, { locked: e.target.checked })}
              className="accent-orange-500"
            />
            Locked
          </label>
        </div>
      </div>
    </div>
  )
}
