import {
  MousePointer2,
  Move,
  RotateCw,
  Maximize2,
  Mountain,
  Paintbrush,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'terrain' | 'paint'
export type HDRI = 'forest' | 'sunset' | 'studio' | 'night' | 'urban' | 'beach'
export type Weather = 'clear' | 'rain' | 'fog'

export interface ToolDefinition {
  id: Tool
  label: string
  shortcut: string
  icon: LucideIcon
}

export const TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { id: 'move', label: 'Move', shortcut: 'G', icon: Move },
  { id: 'rotate', label: 'Rotate', shortcut: 'R', icon: RotateCw },
  { id: 'scale', label: 'Scale', shortcut: 'S', icon: Maximize2 },
  { id: 'terrain', label: 'Terrain Sculpt', shortcut: 'T', icon: Mountain },
  { id: 'paint', label: 'Paint', shortcut: 'P', icon: Paintbrush },
]

export const HDRI_PRESETS = [
  { id: 'forest' as HDRI, name: 'Forest', image: 'https://placehold.co/200x120/2d5016/white?text=Forest' },
  { id: 'sunset' as HDRI, name: 'Sunset', image: 'https://placehold.co/200x120/ff6b35/white?text=Sunset' },
  { id: 'studio' as HDRI, name: 'Studio', image: 'https://placehold.co/200x120/888888/white?text=Studio' },
  { id: 'night' as HDRI, name: 'Night', image: 'https://placehold.co/200x120/000022/white?text=Night' },
  { id: 'urban' as HDRI, name: 'Urban', image: 'https://placehold.co/200x120/666666/white?text=Urban' },
  { id: 'beach' as HDRI, name: 'Beach', image: 'https://placehold.co/200x120/87ceeb/white?text=Beach' },
]

export const ASSET_PRESETS = [
  { id: 'tree', name: 'Tree', image: 'https://placehold.co/150x150/2d5016/white?text=Tree' },
  { id: 'rock', name: 'Rock', image: 'https://placehold.co/150x150/6a6a6a/white?text=Rock' },
  { id: 'building', name: 'Building', image: 'https://placehold.co/150x150/8b7355/white?text=Building' },
  { id: 'car', name: 'Car', image: 'https://placehold.co/150x150/c0c0c0/white?text=Car' },
  { id: 'character', name: 'Character', image: 'https://placehold.co/150x150/ffb366/white?text=Character' },
  { id: 'castle', name: 'Castle', image: 'https://placehold.co/150x150/696969/white?text=Castle' },
]

export const AI_PROMPTS = [
  { id: 'forest', label: 'Generate Forest', icon: '🌲' },
  { id: 'city', label: 'Generate City', icon: '🏙️' },
  { id: 'desert', label: 'Generate Desert', icon: '🏜️' },
  { id: 'ocean', label: 'Generate Ocean', icon: '🌊' },
]

export const WEATHER_OPTIONS: Weather[] = ['clear', 'rain', 'fog']

export const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: 'select',
  g: 'move',
  r: 'rotate',
  s: 'scale',
  t: 'terrain',
  p: 'paint',
}
