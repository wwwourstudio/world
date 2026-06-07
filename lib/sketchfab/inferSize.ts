export function inferTargetSize(query: string): number | undefined {
  const q = query.toLowerCase()
  if (/\b(skyscraper|tower|high.?rise)\b/.test(q)) return 45
  if (/\b(building|warehouse|factory|hangar|facade|house|cabin|barn|temple|castle)\b/.test(q)) return 22
  if (/\b(crane|silo|windmill)\b/.test(q)) return 18
  if (/\b(truck|bus|train|boat|ship)\b/.test(q)) return 9
  if (/\b(tree|car|vehicle|tank)\b/.test(q)) return 5
  if (/\b(lamp|post|pillar|column|statue|door|fence)\b/.test(q)) return 4
  if (/\b(pipe|barrel|crate|rock|boulder|bush|cart|stall)\b/.test(q)) return 2.5
  if (/\b(prop|debris|tool|box|plant|flower|lantern)\b/.test(q)) return 1
  return undefined
}
