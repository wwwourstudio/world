import type { SceneObject } from '@/lib/scene/SceneStore'

const TYPE_KEYWORDS: Record<string, string[]> = {
  tree: ['tree', 'pine', 'oak', 'forest', 'fir', 'trunk', 'canopy', 'bush', 'shrub', 'plant'],
  rock: ['rock', 'stone', 'boulder', 'pebble'],
  building: ['building', 'house', 'tower', 'castle', 'structure', 'wall', 'roof', 'hut', 'cabin'],
  light: ['light', 'lamp', 'lantern', 'torch', 'fire', 'glow', 'candle', 'flame'],
  character: ['character', 'npc', 'person', 'human', 'guard', 'villager', 'player', 'soldier', 'wanderer'],
  water: ['water', 'ocean', 'river', 'lake', 'pond', 'wave', 'sea'],
  ground: ['ground', 'floor', 'terrain', 'earth', 'grass', 'dirt', 'sand', 'road'],
  flag: ['flag', 'banner', 'sail', 'pennant'],
}

// Resolve a natural-language query to a list of SceneObject ids.
// Priority: exact name → partial name → type keyword → object type → "selected" → positional → "all"
export function resolveObjectQuery(
  query: string,
  objects: Record<string, SceneObject>,
  selectedIds: string[],
): string[] {
  const q = query.toLowerCase().trim()
  const all = Object.values(objects)

  if (!q || /^all$|^everything$|^all objects$|^all meshes$/.test(q)) {
    return all.map((o) => o.id)
  }

  // Exact name match
  const exact = all.filter((o) => o.name.toLowerCase() === q)
  if (exact.length > 0) return exact.map((o) => o.id)

  // Partial name match
  const partial = all.filter((o) => o.name.toLowerCase().includes(q))
  if (partial.length > 0) return partial.map((o) => o.id)

  // Type keyword match (check query words against name keywords)
  for (const [, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some((k) => q.includes(k))) {
      const matches = all.filter((o) =>
        keywords.some((k) => o.name.toLowerCase().includes(k))
      )
      if (matches.length > 0) return matches.map((o) => o.id)
    }
  }

  // Object type match (mesh, light, terrain, etc.)
  const typeMatch = all.filter((o) => o.type === q)
  if (typeMatch.length > 0) return typeMatch.map((o) => o.id)

  // "selected" / "selection"
  if (/selected|selection|current/.test(q) && selectedIds.length > 0) {
    return selectedIds
  }

  return []
}
