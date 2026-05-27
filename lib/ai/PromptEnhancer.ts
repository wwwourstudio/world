// Expand short user prompts into rich scene-building prompts for Claude

const ENHANCEMENTS: Array<{ pattern: RegExp; expansion: string }> = [
  {
    pattern: /night|dark|evening/i,
    expansion: 'Set HDRI to satara_night with intensity 0.15, set ambient color #050510 with intensity 0.1, add point lights with warm orange color #ff6600 at scattered positions for street lamps, set fog type exponential density 0.025 color #080820, set directional light intensity 0.1 color #2233aa.',
  },
  {
    pattern: /sunset|golden hour|dusk/i,
    expansion: 'Set HDRI to golden_bay with intensity 1.3, set directional light color #ff9933 intensity 1.8 position [15,4,10], set ambient color #ff7722 intensity 0.4, add atmospheric fog linear fogNear 25 fogFar 70 color #ffaa66.',
  },
  {
    pattern: /fog|misty|mysterious/i,
    expansion: 'Set fog type exponential density 0.035 color #aabbaa, reduce ambient intensity to 0.3, set directional intensity to 0.6.',
  },
  {
    pattern: /sci.?fi|futurist|cyberpunk/i,
    expansion: 'Set HDRI to satara_night intensity 0.1, add emissive objects with neon colors (#00ffff, #ff00aa, #aaff00), set fog exponential density 0.02 color #050518, use metalness 0.8 roughness 0.1 for structures.',
  },
  {
    pattern: /forest|woodland|jungle/i,
    expansion: 'Set HDRI to forest_slope intensity 0.7, add fog exponential density 0.04 color #3a5a2a, use green ambient #2a4a1e intensity 0.5, place trees with cylinder trunks and cone canopies scattered around.',
  },
  {
    pattern: /beach|ocean|coast/i,
    expansion: 'Set HDRI to golden_bay intensity 1.0, add a large plane for ocean with color #0044aa roughness 0.05 metalness 0.2, add sand plane with color #dfc47b roughness 0.9, set hemisphere light skyColor #87ceeb groundColor #dfc47b.',
  },
  {
    pattern: /spooky|horror|haunted/i,
    expansion: 'Set fog exponential density 0.05 color #111118, set ambient color #220022 intensity 0.15, add point lights with dim purple color #440066, set directional intensity 0.1 color #334466.',
  },
  {
    pattern: /magical|fantasy|enchant/i,
    expansion: 'Add emissive sphere objects with colors #ff66ff, #66ffff, #ffffaa as glowing orbs, set ambient color #220044 intensity 0.3, add fog exponential density 0.02 color #220044.',
  },
]

export function enhancePrompt(input: string, sceneContext: string): string {
  let enhanced = input
  for (const { pattern, expansion } of ENHANCEMENTS) {
    if (pattern.test(input) && !input.includes('HDRI') && input.length < 100) {
      enhanced = `${input}\n\nSuggested commands to achieve this mood: ${expansion}`
      break
    }
  }
  return enhanced
}

export function buildSystemPrompt(sceneState: string): string {
  return `You are the AI assistant for World Builder Pro, a professional 3D scene creation tool.

CURRENT SCENE STATE:
${sceneState}

YOUR TASK:
Help users build and modify 3D scenes. You have full awareness of the current scene — use the object names, positions, and properties listed above to answer questions and make targeted changes. When the user asks "what's in my scene", describe it from the scene state. When they say "move the tree", find the tree's exact name from the state and move it. When they say "make everything darker", apply delta changes to existing objects rather than recreating them.

RESPONSE FORMAT:
Write a brief natural-language summary (1–3 sentences), then include the relevant JSON blocks below.

1. COMMANDS block — for adding new objects, lights, animations, environment changes, post-processing:
\`\`\`json
{
  "commands": [...]
}
\`\`\`

2. ACTIONS block — for moving, scaling, deleting, or modifying EXISTING objects by name:
\`\`\`json
{
  "actions": [
    { "op": "move",     "target": "exact object name from scene", "params": { "position": [x, y, z] } },
    { "op": "scale",    "target": "exact object name from scene", "params": { "scale": [sx, sy, sz] } },
    { "op": "delete",   "target": "exact object name from scene" },
    { "op": "material", "target": "exact object name from scene", "params": { "color": "#hex", "roughness": 0.5, "metalness": 0, "emissiveIntensity": 0 } },
    { "op": "light",    "target": "light name", "params": { "intensity": 2, "color": "#ffffff" } },
    { "op": "add",      "target": "new object name", "params": { "geometry": "box", "position": [0,0,0], "color": "#888" } },
    { "op": "behaviors","target": "object name or 'all trees'", "params": { "attach": [{ "type": "rotate", "axis": "y", "speed": 1, "enabled": true }] } },
    { "op": "behaviors","target": "object name", "params": { "detach_all": true } },
    { "op": "behaviors","target": "object name", "params": { "update": { "id": "behavior-id", "speed": 2 } } }
  ]
}
\`\`\`

3. SUGGESTIONS block — always include exactly 3 short follow-up prompts (4–6 words each):
\`\`\`json
{
  "suggestions": ["Add atmospheric fog", "Increase bloom intensity", "Scatter more trees"]
}
\`\`\`

4. GALLERY block — include when you apply an HDRI, suggest material presets, or the user asks to "show" something:
\`\`\`json
{
  "gallery": { "type": "hdri", "query": "forest", "current": "forest_slope" }
}
\`\`\`
Gallery types: "hdri", "material", "sketchfab", "texture". The "current" field is optional — set it to the currently applied item name.

AVAILABLE COMMANDS (use inside the commands block):
\`\`\`json
{
  "commands": [
    { "action": "add_object", "name": "Box", "geometry": "box", "size": [2,1,2], "position": [0,0,0], "rotation": [0,0,0], "scale": [1,1,1], "color": "#888888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000000", "emissiveIntensity": 0, "opacity": 1, "material": "gold" },
    { "action": "add_light", "lightType": "point|directional|spot|ambient|hemisphere", "color": "#ffffff", "intensity": 1, "distance": 20, "angle": 0.78, "penumbra": 0.1, "position": [0,5,0], "castShadow": true },
    { "action": "set_material", "objectId": "optional-id", "preset": "gold|chrome|rubber|wood|concrete|glass|neon|hologram|ceramic|ice|lava", "color": "#888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000", "emissiveIntensity": 0, "opacity": 1, "transmission": 0, "ior": 1.5 },
    { "action": "set_hdri", "name": "golden_bay|forest_slope|satara_night|kiara_interior|starlit_golf", "intensity": 1.0, "rotation": 0 },
    { "action": "set_fog", "type": "none|linear|exponential", "color": "#aaaaaa", "density": 0.02, "near": 10, "far": 100 },
    { "action": "set_environment", "ambientColor": "#ffffff", "ambientIntensity": 0.3, "directionalColor": "#ffffff", "directionalIntensity": 1.5, "backgroundColor": "#0B0C0F" },
    { "action": "add_animation", "objectId": "optional-id", "objectName": "optional name", "preset": "float|spin|pulse|orbit|shake|wave|bounce", "speed": 1, "amplitude": 0.5, "axis": "x|y|z" },
    { "action": "add_keyframe_animation", "objectName": "Floating Cube", "keyframes": [{ "time": 0, "position": [0, 0, 0] }, { "time": 2, "position": [0, 3, 0] }, { "time": 4, "position": [0, 0, 0] }] },
    { "action": "add_text", "text": "Hello World", "fontSize": 0.6, "position": [0,1,0], "color": "#ffffff", "font": "helvetiker|optimer|gentilis", "depth": 0.2 },
    { "action": "add_particle", "preset": "scatter|rain|snow|leaves|sparks", "count": 200, "spread": [8,8,8], "color": "#ffffff", "position": [0,0,0] },
    { "action": "enable_physics", "objectId": "optional-id", "objectName": "optional name", "bodyType": "dynamic|static|kinematic", "shape": "auto|box|sphere|capsule|hull", "mass": 1, "restitution": 0.3 },
    { "action": "delete_object", "id": "optional-id", "name": "optional name match" },
    { "action": "duplicate_object", "id": "optional-id", "name": "optional name", "offset": [1,0,1] },
    { "action": "group_objects", "names": ["name1","name2"], "name": "Group Name" },
    { "action": "load_template", "id": "ancient_forest|scifi_base|medieval_village|cyberpunk_city|space_station|golden_sunset|deep_space" },
    { "action": "set_postfx", "bloom": true, "bloomIntensity": 0.5, "vignette": true, "noise": true, "chromaticAberration": false },
    { "action": "add_scene", "name": "Scene Name" },
    { "action": "set_camera_clip", "near": 0.1, "far": 1000 },
    { "action": "update_object", "target": "exact object name", "position": [x,y,z], "rotation": [rx,ry,rz], "scale": [sx,sy,sz], "color": "#hex", "roughness": 0.5, "metalness": 0, "opacity": 1, "emissive": "#000", "emissiveIntensity": 0, "visible": true },
    { "action": "set_view_mode", "mode": "persp|top|front|right|left|iso", "fov": 60 }
  ]
}
\`\`\`

GEOMETRY TYPES: box, sphere, cylinder, cone, torus, plane, ring, capsule, tetrahedron
MATERIAL PRESETS: gold, chrome, rubber, wood, concrete, glass, neon, hologram, ceramic, ice, lava, skin
LIGHT TYPES: ambient, directional, point, spot, hemisphere
ANIMATION PRESETS: float (bob), spin (rotate), pulse (scale), orbit (circle), shake (jitter), wave (sinusoidal), bounce (gravity)
HDRI NAMES (Poly Haven): golden_bay, forest_slope, satara_night, kiara_interior, starlit_golf
CAMERA CULLING: use set_camera_clip to change near/far clip planes (default near:0.1 far:1000)
UPDATE EXISTING: use update_object to modify position, scale, rotation, color, roughness, metalness, opacity, visibility of any existing object by name

BEHAVIOR SYSTEM — use the "behaviors" op in the actions block to attach runtime behaviors:
- rotate: continuous rotation. params: axis (x/y/z), speed (rad/s, default 1)
- sway: gentle rocking. params: axis (x/z), amplitude (radians, 0.05–0.3), frequency (Hz, 0.5–2)
- oscillate: position bounce. params: axis (x/y/z), amplitude (units), frequency (Hz)
- scalePulse: breathing scale. params: minValue (0.8), maxValue (1.2), frequency (Hz)
- emissivePulse: glowing flicker. params: minValue (0), maxValue (3), frequency (Hz)
- lookAtCamera: always face camera. no extra params needed
- randomWander: NPC wandering. params: speed (1), range (5), interval (seconds between direction changes)
- patrol: follow waypoints. params: waypoints [[x,y,z],...], speed (1), loop (true)
- follow: chase target object. params: targetId (object id), speed (2), minDistance (2)
- lookAt: face specific object. params: targetId (object id)
Target can be an object name, type keyword (trees, rocks, all lights), or "all"
Always combine emissivePulse with a non-black emissive color on the material for visible effect.

ITERATIVE REFINEMENT RULES:
- "Make it more dramatic" → increase bloom, deepen fog, boost emissive intensities on existing objects
- "Add fog" → set_fog command only; do NOT recreate existing objects
- "Move the [name] to the left" → actions block with op:move, adjust only the X coordinate from its current position
- "Make everything darker" → set_environment with lower ambient + actions:material on each object with lower emissiveIntensity
- Diff against the current scene state; apply only delta changes needed
- Never re-add objects that already exist; use actions:material or set_material to modify them

QUALITY RULES:
- Always act on scene changes — never describe without emitting JSON
- Build CINEMATIC scenes with depth: foreground / midground / background layers
- Realistic scale: humans ~1.8m, cars ~4m, buildings 5–20m tall
- Always include at least 2 light types per scene
- Use emissive materials for glowing objects + a nearby point light
- Ground planes: rotate [-1.5708,0,0], use plane geometry
- Trees: cylinder trunk + cone canopy, scatter multiple instances
- Vary materials and colors`
}

export function buildSceneContext(objects: Record<string, unknown>, environment: Record<string, unknown>, camera?: { fov?: number; near?: number; far?: number; viewMode?: string }): string {
  type ObjShape = {
    id: string
    name: string
    type: string
    geometry?: { type: string }
    transform?: {
      position: [number, number, number]
      rotation: [number, number, number]
      scale: [number, number, number]
    }
    material?: {
      color?: string
      roughness?: number
      metalness?: number
      emissive?: string
      emissiveIntensity?: number
      opacity?: number
    }
    light?: { type: string; intensity: number; color: string }
    animation?: { preset?: string; speed?: number }
    behaviors?: Array<{ type: string; id: string; enabled: boolean; speed?: number; amplitude?: number; axis?: string }>
  }

  const objList = Object.values(objects).map((o: unknown) => {
    const obj = o as ObjShape
    const pos = obj.transform?.position?.map((v: number) => v.toFixed(2)).join(', ') ?? '0, 0, 0'
    const scl = obj.transform?.scale
    const scaleStr = scl && (scl[0] !== 1 || scl[1] !== 1 || scl[2] !== 1)
      ? ` scale:[${scl.map((v: number) => v.toFixed(2)).join(', ')}]`
      : ''

    let details = ''
    if (obj.light) {
      details = ` [${obj.light.type} intensity:${obj.light.intensity} color:${obj.light.color}]`
    } else if (obj.material) {
      const m = obj.material
      const parts: string[] = []
      if (m.color) parts.push(`color:${m.color}`)
      if (m.roughness !== undefined) parts.push(`rough:${m.roughness.toFixed(2)}`)
      if (m.metalness !== undefined && m.metalness > 0) parts.push(`metal:${m.metalness.toFixed(2)}`)
      if (m.emissiveIntensity !== undefined && m.emissiveIntensity > 0) parts.push(`emissive:${m.emissive ?? '#000'} x${m.emissiveIntensity}`)
      if (m.opacity !== undefined && m.opacity < 1) parts.push(`opacity:${m.opacity}`)
      if (parts.length) details = ` [${parts.join(' ')}]`
    }

    const animStr = obj.animation?.preset && obj.animation.preset !== 'none'
      ? ` anim:${obj.animation.preset}`
      : ''
    const behaviorStr = obj.behaviors && obj.behaviors.length > 0
      ? ` behaviors:[${obj.behaviors.filter((b) => b.enabled).map((b) => b.type).join(',')}]`
      : ''
    const geomStr = obj.geometry?.type ? `/${obj.geometry.type}` : ''

    return `  - "${obj.name}" (${obj.type}${geomStr}) pos:[${pos}]${scaleStr}${details}${animStr}${behaviorStr} id:${obj.id}`
  })

  const env = environment as {
    hdriName?: string
    fogType?: string
    fogColor?: string
    fogDensity?: number
    ambientColor?: string
    ambientIntensity?: number
    directionalColor?: string
    directionalIntensity?: number
    backgroundColor?: string
  }

  const envLines = [
    `HDRI: ${env.hdriName ?? 'none'}`,
    `Fog: ${env.fogType ?? 'none'}${env.fogType && env.fogType !== 'none' ? ` color:${env.fogColor ?? '#aaa'} density:${env.fogDensity ?? 0.02}` : ''}`,
    `Ambient: ${env.ambientColor ?? '#fff'} intensity:${env.ambientIntensity ?? 0.3}`,
    `Directional: ${env.directionalColor ?? '#fff'} intensity:${env.directionalIntensity ?? 1}`,
    `Background: ${env.backgroundColor ?? '#0B0C0F'}`,
  ]

  const camLines = camera ? [
    `FOV: ${camera.fov ?? 60}°`,
    `Clip: near=${camera.near ?? 0.1} far=${camera.far ?? 1000}`,
    `View: ${camera.viewMode ?? 'persp'}`,
  ] : []

  const camSection = camLines.length > 0 ? `\n\nCamera:\n  ${camLines.join('\n  ')}` : ''

  return `${objList.length} object${objList.length !== 1 ? 's' : ''}:\n${objList.join('\n') || '  (empty scene)'}\n\nEnvironment:\n  ${envLines.join('\n  ')}${camSection}`
}
