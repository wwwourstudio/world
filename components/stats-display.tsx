'use client'

import { useEffect, useState } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { formatTriangles } from '@/lib/utils'

const BASE_TRIANGLE_COUNT = 30_988
const TRIANGLES_PER_OBJECT = 1_000
const FIXED_OBJECT_COUNT = 3

export function StatsDisplay() {
  const fps = useWorldBuilder((s) => s.fps)
  const objects = useWorldBuilder((s) => s.objects)
  const [triangles, setTriangles] = useState(BASE_TRIANGLE_COUNT)

  useEffect(() => {
    setTriangles(BASE_TRIANGLE_COUNT + TRIANGLES_PER_OBJECT * objects.length)
  }, [objects])

  const fpsColor =
    fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="pointer-events-none absolute top-4 left-4 z-20">
      <div className="px-4 py-2 rounded-xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${fpsColor}`}>{Math.round(fps)}</span>
            <span className="text-xs text-gray-400">FPS</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-blue-400">
              {objects.length + FIXED_OBJECT_COUNT}
            </span>
            <span className="text-xs text-gray-400">Objects</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-purple-400">{formatTriangles(triangles)}</span>
            <span className="text-xs text-gray-400">Tris</span>
          </div>
        </div>
      </div>
    </div>
  )
}
