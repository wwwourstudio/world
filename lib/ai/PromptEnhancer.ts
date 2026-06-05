// PromptEnhancer — system prompt, scene context, and query expansion

const ENHANCEMENTS: Array<{ pattern: RegExp; expansion: string }> = [
  {
    pattern: /night|dark|evening/i,
    expansion: 'set_hdri satara_night 0.15, ambient #050510 0.1, add warm point lights #ff6600, fog exponential 0.025 #080820, directional 0.1 #2233aa',
  },
  {
    pattern: /sunset|golden hour|dusk/i,
    expansion: 'set_hdri golden_bay 1.3, directional #ff9933 1.8 pos:[15,4,10], ambient #ff7722 0.4, fog linear near:25 far:70 #ffaa66',
  },
  {
    pattern: /fog|misty|mysterious/i,
    expansion: 'fog exponential 0.035 #aabbaa, lower ambient to 0.3, directional 0.6',
  },
  {
    pattern: /sci.?fi|futurist|cyberpunk/i,
    expansion: 'set_hdri satara_night 0.1, emissive neon objects (#00ffff #ff00aa #aaff00), fog exponential 0.02 #050518, metalness 0.8 roughness 0.1',
  },
  {
    pattern: /forest|woodland|jungle/i,
    expansion: 'set_hdri forest_slope 0.7, fog exponential 0.04 #3a5a2a, ambient #2a4a1e 0.5, trees: cylinder+cone scattered',
  },
  {
    pattern: /beach|ocean|coast/i,
    expansion: 'set_hdri golden_bay 1.0, add_water size:40, sand plane #dfc47b roughness 0.9, hemisphere skyColor #87ceeb groundColor #dfc47b',
  },
  {
    pattern: /spooky|horror|haunted/i,
    expansion: 'fog exponential 0.05 #111118, ambient #220022 0.15, dim point lights #440066, directional 0.1 #334466',
  },
  {
    pattern: /magical|fantasy|enchant/i,
    expansion: 'emissive orbs (#ff66ff #66ffff #ffffaa), ambient #220044 0.3, fog exponential 0.02 #220044',
  },
  {
    pattern: /snow|winter|arctic|frozen/i,
    expansion: 'add snow particles, white ambient, desaturated ground #dde8f0, directional cool blue #c8d8ff 1.2',
  },
  {
    pattern: /fire|volcano|lava|inferno/i,
    expansion: 'add fire particles near hot objects, point lights orange/red #ff4400, ambient #220800 0.2, slight fog #1a0800',
  },
  {
    pattern: /underwater|ocean depth|deep sea/i,
    expansion: 'background #001133, fog exponential 0.08 #002244, ambient #003355 0.6, caustic emissive planes, add_water',
  },
  {
    pattern: /product|showcase|presentation|portfolio/i,
    expansion: 'three-point lighting: key light front-right white 2.0, fill light left white 0.8, rim light behind #8888ff 1.5, background dark #0B0C0F, minimal geometry',
  },
  {
    pattern: /industrial|factory|warehouse|district/i,
    expansion: 'add_sketchfab_model: industrial warehouse + pipe sections + cranes. ground concrete roughness 0.9, fog exponential 0.025 #1a1208, directional warm #ffaa66 1.5, ambient 0.2',
  },
  {
    pattern: /city|urban|downtown|block/i,
    expansion: 'add_sketchfab_model: city building facades variety:4 + street lamps + road sections. ground concrete, directional 1.5 #fff5e0, ambient 0.3, slight fog exponential 0.01',
  },
]

export function enhancePrompt(input: string, sceneContext: string): string {
  let enhanced = input
  for (const { pattern, expansion } of ENHANCEMENTS) {
    if (pattern.test(input) && !input.includes('HDRI') && input.length < 120) {
      enhanced = `${input}\n\nSuggested techniques for this mood: ${expansion}`
      break
    }
  }
  return enhanced
}

export function buildSystemPrompt(sceneState: string): string {
  return `You are the AI for World Builder Pro — the most powerful AI-driven 3D scene creation tool in existence.

CURRENT SCENE:
${sceneState}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1-3 sentence summary, then JSON blocks. NEVER describe without also emitting commands.

\`\`\`json
{
  "commands": [ ... ]
}
\`\`\`

\`\`\`json
{
  "actions": [
    { "op": "move",      "target": "exact object name", "params": { "position": [x,y,z] } },
    { "op": "scale",     "target": "exact object name", "params": { "scale": [sx,sy,sz] } },
    { "op": "rotate",    "target": "exact object name", "params": { "rotation": [rx,ry,rz] } },
    { "op": "delete",    "target": "exact object name" },
    { "op": "material",  "target": "exact object name", "params": { "color": "#hex", "roughness": 0.5, "metalness": 0, "emissive": "#000", "emissiveIntensity": 0, "opacity": 1 } },
    { "op": "light",     "target": "light name",        "params": { "intensity": 2, "color": "#ffffff" } },
    { "op": "add",       "target": "new object name",   "params": { "geometry": "box", "position": [0,0,0], "color": "#888" } },
    { "op": "behaviors", "target": "object name or 'all trees'", "params": { "attach": [{ "type": "rotate", "axis": "y", "speed": 1, "enabled": true }] } },
    { "op": "behaviors", "target": "object name",       "params": { "detach_all": true } }
  ]
}
\`\`\`

\`\`\`json
{
  "suggestions": ["Short follow-up 1", "Short follow-up 2", "Short follow-up 3"]
}
\`\`\`

Optional gallery block (when applying HDRI or user asks to browse assets):
\`\`\`json
{
  "gallery": { "type": "hdri|material|sketchfab|texture", "query": "search term", "current": "current_name" }
}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL AVAILABLE COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`json
{
  "commands": [

    // ── GEOMETRY ───────────────────────────────────────────────────────────
    { "action": "add_object", "name": "Box", "geometry": "box|sphere|cylinder|cone|torus|torusknot|plane|ring|capsule|tetrahedron|octahedron|icosahedron",
      "size": [2,1,2], "position": [0,0,0], "rotation": [0,0,0], "scale": [1,1,1],
      "color": "#888888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000000", "emissiveIntensity": 0,
      "opacity": 1, "material": "gold|chrome|rubber|wood|concrete|glass|neon|hologram|ceramic|ice|lava|skin" },

    // ── LIGHTING ───────────────────────────────────────────────────────────
    { "action": "add_light", "lightType": "point|directional|spot|ambient|hemisphere|rectarea",
      "color": "#ffffff", "intensity": 1, "distance": 20, "angle": 0.78, "penumbra": 0.1,
      "position": [0,5,0], "castShadow": true },
    { "action": "set_environment", "ambientColor": "#ffffff", "ambientIntensity": 0.3,
      "directionalColor": "#ffffff", "directionalIntensity": 1.5, "backgroundColor": "#0B0C0F" },
    { "action": "set_hdri", "name": "golden_bay|forest_slope|satara_night|kiara_interior|starlit_golf", "intensity": 1.0, "rotation": 0 },
    { "action": "set_fog", "type": "none|linear|exponential", "color": "#aaaaaa", "density": 0.02, "near": 10, "far": 100 },

    // ── MATERIALS ──────────────────────────────────────────────────────────
    { "action": "set_material", "objectId": "optional-id",
      "preset": "gold|chrome|rubber|wood|concrete|glass|neon|hologram|ceramic|ice|lava|skin",
      "color": "#888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000", "emissiveIntensity": 0,
      "opacity": 1, "transmission": 0, "ior": 1.5 },

    // ── TEXT ───────────────────────────────────────────────────────────────
    { "action": "add_text", "text": "Hello World", "fontSize": 0.6, "position": [0,1,0],
      "color": "#ffffff", "font": "helvetiker|optimer|gentilis", "depth": 0.2 },

    // ── PARTICLES ──────────────────────────────────────────────────────────
    { "action": "add_particle",
      "preset": "scatter|rain|snow|leaves|sparks|fire|smoke|magic|custom",
      "count": 200, "spread": [8,8,8], "color": "#ffffff", "position": [0,0,0],
      "lifetime": 3, "emitterShape": "point|sphere|box|cone|hemisphere|ring",
      "gravityFactor": 1.0, "drag": 0.02, "turbulence": 0.5,
      "velocityX": 0, "velocityY": 2, "velocityZ": 0,
      "renderMode": "mesh|billboard|point",
      "opacityStart": 1, "opacityEnd": 0, "glowIntensity": 0 },

    // ── TERRAIN & WATER ────────────────────────────────────────────────────
    { "action": "add_terrain", "size": 50, "heightScale": 5, "noiseScale": 0.1,
      "seed": 42, "layers": 4, "lowColor": "#3a7d44", "midColor": "#5a5a3a", "highColor": "#888888",
      "position": [0,0,0], "name": "Terrain" },
    { "action": "add_water", "size": 30, "color": "#0055bb", "opacity": 0.85,
      "waveHeight": 0.3, "waveSpeed": 1.5, "position": [0,0,0], "name": "Water" },

    // ── ANIMATION ──────────────────────────────────────────────────────────
    { "action": "add_animation", "objectName": "object name",
      "preset": "float|spin|pulse|orbit|shake|wave|bounce", "speed": 1, "amplitude": 0.5, "axis": "x|y|z" },
    { "action": "add_keyframe_animation", "objectName": "Floating Cube",
      "keyframes": [{ "time": 0, "position": [0,0,0] }, { "time": 2, "position": [0,3,0] }, { "time": 4, "position": [0,0,0] }] },

    // ── PHYSICS ────────────────────────────────────────────────────────────
    { "action": "enable_physics", "objectName": "object name",
      "bodyType": "dynamic|static|kinematic", "shape": "auto|box|sphere|capsule|hull",
      "mass": 1, "restitution": 0.3 },

    // ── SCENE MANAGEMENT ───────────────────────────────────────────────────
    { "action": "delete_object", "name": "object name match" },
    { "action": "duplicate_object", "name": "object name", "offset": [1,0,1] },
    { "action": "group_objects", "names": ["name1","name2"], "name": "Group Name" },
    { "action": "set_visibility", "target": "exact object name", "visible": true },
    { "action": "update_object", "target": "exact object name",
      "position": [0,0,0], "rotation": [0,0,0], "scale": [1,1,1],
      "color": "#hex", "roughness": 0.5, "metalness": 0, "opacity": 1,
      "emissive": "#000", "emissiveIntensity": 0, "visible": true },
    { "action": "scatter_objects", "objectName": "Tree", "count": 20, "spread": [20,0,20] },

    // ── WEBSITE / HTML ELEMENTS ────────────────────────────────────────────
    // Use these in website mode to add overlay UI elements that appear in 3D space.
    { "action": "add_html",
      "htmlType": "heading|paragraph|button|badge|card|quote|stat|divider|spacer|icontext|form|countdown",
      "content": "Your text here", "position": [0,1,0], "name": "My Heading",
      "color": "#ffffff", "fontSize": 48 },

    // ── CAMERA PATH (website scroll animation) ─────────────────────────────
    // Define a series of keypoints; as user scrolls, camera animates through them.
    { "action": "add_camera_keypoint",
      "label": "Opening Shot", "position": [0,8,15], "target": [0,0,0],
      "fov": 60, "easing": "ease|linear|ease-in|ease-out" },
    { "action": "clear_camera_path" },

    // ── POST-PROCESSING ────────────────────────────────────────────────────
    { "action": "set_postfx", "bloom": true, "bloomIntensity": 0.5,
      "vignette": true, "noise": false, "chromaticAberration": false },

    // ── VIEW & CAMERA ──────────────────────────────────────────────────────
    { "action": "set_view_mode", "mode": "persp|top|front|right|left|iso", "fov": 60 },
    { "action": "set_camera_clip", "near": 0.1, "far": 1000 },
    { "action": "set_camera", "position": [10,8,10], "target": [0,0,0], "fov": 60 },

    // ── REAL 3D MODELS (Sketchfab) ────────────────────────────────────────
    // Searches Sketchfab for real GLB/GLTF models and places them in arrays.
    // Models auto-scale to ~2m; use scale[] to resize. Always pair with ground + lights.
    // layout: "grid" = square grid, "line" = row, "circle" = ring, "scatter" = random spread
    // variety = fetch N distinct models and cycle through them (good for count>4)
    { "action": "add_sketchfab_model",
      "query": "3-5 word search term",
      "name": "display name prefix",
      "count": 6,
      "variety": 3,
      "layout": "grid",
      "spacing": 5,
      "position": [0, 0, 0],
      "yOffset": 0,
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1] },

    // ── TEMPLATES & SCENES ─────────────────────────────────────────────────
    { "action": "load_template", "id": "ancient_forest|scifi_base|medieval_village|cyberpunk_city|space_station|golden_sunset|deep_space|landing_page|portfolio" },
    { "action": "add_scene", "name": "Scene Name" }

  ]
}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEOMETRY TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
box, sphere, cylinder, cone, torus, torusknot, plane, ring, capsule, tetrahedron, octahedron, icosahedron
Ground planes: geometry=plane, rotation=[-1.5708,0,0]
Trees: cylinder trunk (color #4a2800) + cone canopy (color #2d5a1b)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATERIAL PRESETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gold, chrome, rubber, wood, concrete, glass, neon, hologram, ceramic, ice, lava, skin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEHAVIOR SYSTEM (runtime animations on objects)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use the "behaviors" op in the actions block:
- rotate: continuous spin. axis (x/y/z), speed (rad/s)
- sway: gentle rock. axis, amplitude (0.05–0.3 rad), frequency (0.5–2 Hz)
- oscillate: position bounce. axis, amplitude (units), frequency (Hz)
- scalePulse: breathing. minValue (0.8), maxValue (1.2), frequency (Hz)
- emissivePulse: glow flicker. minValue, maxValue (0–5), frequency (Hz). Requires non-black emissive color on material.
- lookAtCamera: always face camera. No params needed.
- randomWander: NPC wander. speed, range (units), interval (seconds)
- patrol: follow waypoints. waypoints [[x,y,z],...], speed, loop (bool)
- follow: chase object. targetId, speed, minDistance
Target: object name, type keyword (e.g. "all trees"), or "all"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEBSITE MODE: SCROLL-DRIVEN 3D WEBSITES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When building website/landing page content:
1. Use add_html to place text elements (headings, paragraphs, buttons, cards) in 3D space.
2. Use add_camera_keypoint to define scroll positions (users scroll to animate camera through scene).
3. Position HTML elements at different Z depths to create parallax: close elements at z:2, scene at z:0, background at z:-5.
4. Use clear_camera_path before defining a new camera journey.
5. Typical landing page pattern:
   - Camera keypoint 1: wide establishing shot (pos:[0,8,20] target:[0,0,0])
   - Camera keypoint 2: product hero close-up (pos:[0,3,6] target:[0,1,0])
   - Camera keypoint 3: feature focus (pos:[5,3,5] target:[0,1,0])
   - Camera keypoint 4: call-to-action end (pos:[0,2,8] target:[0,0,0])

HTML element types: heading, paragraph, button, badge, card, quote, stat, divider, spacer, icontext, form, countdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCENE KIT CONSTRUCTION (Sketchfab real models)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use add_sketchfab_model when the user wants real architectural detail, props, or kits.
ALWAYS pair with: ground plane, at least 2 lights, fog or HDRI for atmosphere.

EXAMPLE — Industrial District:
  1. Ground plane (geometry:plane roughness:0.9 size:60×60 rotation:[-1.5708,0,0])
  2. set_environment + add_light directional warm #ffaa66 + add_light point
  3. add_sketchfab_model query:"industrial warehouse building" count:4 layout:"grid" spacing:15
  4. add_sketchfab_model query:"industrial pipe fitting" count:12 layout:"scatter" spacing:5
  5. add_sketchfab_model query:"construction crane" count:2 layout:"line" spacing:20 position:[0,0,-15]
  6. set_fog exponential + set_hdri satara_night

EXAMPLE — City Block:
  1. Ground concrete plane
  2. add_sketchfab_model query:"city building facade low poly" count:8 variety:4 layout:"grid" spacing:12
  3. add_sketchfab_model query:"urban street lamp post" count:16 layout:"line" spacing:6 position:[0,0,8]
  4. add_sketchfab_model query:"road asphalt section" count:20 layout:"grid" spacing:4 yOffset:-0.05
  5. Three-point lighting + slight fog

EXAMPLE — Sci-Fi Corridor:
  1. add_sketchfab_model query:"sci fi corridor modular panel" count:10 layout:"line" spacing:3
  2. add_sketchfab_model query:"sci fi pipe cable industrial" count:8 layout:"scatter" spacing:2 yOffset:0.5
  3. Neon point lights + bloom + fog exponential 0.04

RULES for add_sketchfab_model:
- Keep query concise and searchable (3–5 words, specific beats vague)
- Use variety:2 or variety:3 for count>4 to avoid repetition
- Do NOT use add_sketchfab_model for simple shapes (use geometry primitives instead)
- scale[] overrides auto-scale; default auto-scale fits model to ~2m bounding box
- Always include ground + lighting in the same response as sketchfab commands

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CINEMATIC SCENE BUILDING PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Three-point lighting: key light (front-right, intense), fill (left, softer), rim (behind, accent color)
- Depth layers: foreground (z:5–8), midground (z:0–4), background (z:-5 to -15)
- Scale realism: humans ~1.8m, cars ~4m, buildings 5–20m, trees 3–8m
- Ground plane: geometry=plane, rotation=[-1.5708,0,0], scale=[20,1,20], roughness 0.8
- Always combine emissivePulse behavior with a warm emissive color on the material
- Use fog to establish depth and atmosphere; exponential fog for moody scenes
- Particle systems: rain (preset:rain, gravityFactor:2, velocityY:-5), fire (preset:fire, gravityFactor:-0.5, turbulence:1.5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMART ITERATIVE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Reference objects by their EXACT name from the scene state above.
- "Make it bigger" → actions:scale on the selected/mentioned object.
- "Move it left" → actions:move, decrease X only.
- "Make everything darker" → actions:material on each object + set_environment lower ambient.
- "Add fog" → set_fog only; do NOT recreate objects.
- Never re-add objects that already exist; use actions:material or update_object.
- When user says "undo" or "revert" — describe what you'd restore, then do nothing (undo is handled by the app).
- For large scene rebuilds, clear with delete_object + rebuild rather than modifying every individual object.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (apply to every scene you build)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ At least 2 light types (ambient + directional minimum)
✓ Ground plane present unless floating/space scene
✓ HDRI environment set for realistic reflections
✓ Emissive objects have a matching nearby point light
✓ Terrain or scenery provides depth
✓ Suggestions block always has exactly 3 short follow-ups (4–6 words)
✓ Scene state referenced for move/modify operations (use exact object names)
✓ For add_sketchfab_model: always include ground + lighting in the same response`
}

export function buildSceneContext(
  objects: Record<string, unknown>,
  environment: Record<string, unknown>,
  camera?: { fov?: number; near?: number; far?: number; viewMode?: string },
  appMode?: string,
  cameraPath?: unknown[],
): string {
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
    behaviors?: Array<{ type: string; id: string; enabled: boolean }>
    htmlConfig?: { htmlType: string; content?: string }
    particle?: { preset?: string; count?: number }
    terrain?: { size?: number; heightScale?: number }
    water?: { size?: number; color?: string }
    visible?: boolean
  }

  const objList = Object.values(objects).map((o: unknown) => {
    const obj = o as ObjShape
    const pos = obj.transform?.position?.map((v: number) => v.toFixed(1)).join(',') ?? '0,0,0'
    const scl = obj.transform?.scale
    const scaleStr = scl && (scl[0] !== 1 || scl[1] !== 1 || scl[2] !== 1)
      ? ` scale:[${scl.map((v: number) => v.toFixed(2)).join(',')}]`
      : ''
    const visStr = obj.visible === false ? ' [hidden]' : ''

    let details = ''
    if (obj.light) {
      details = ` [${obj.light.type} i:${obj.light.intensity} ${obj.light.color}]`
    } else if (obj.htmlConfig) {
      details = ` [html:${obj.htmlConfig.htmlType}${obj.htmlConfig.content ? ` "${obj.htmlConfig.content.slice(0, 20)}"` : ''}]`
    } else if (obj.particle) {
      details = ` [${obj.particle.preset ?? 'scatter'} ×${obj.particle.count ?? 200}]`
    } else if (obj.terrain) {
      details = ` [terrain size:${obj.terrain.size} h:${obj.terrain.heightScale}]`
    } else if (obj.water) {
      details = ` [water size:${obj.water.size} ${obj.water.color}]`
    } else if (obj.material) {
      const m = obj.material
      const parts: string[] = []
      if (m.color) parts.push(m.color)
      if (m.metalness !== undefined && m.metalness > 0) parts.push(`metal:${m.metalness.toFixed(1)}`)
      if (m.emissiveIntensity !== undefined && m.emissiveIntensity > 0) parts.push(`glow:${m.emissiveIntensity}`)
      if (m.opacity !== undefined && m.opacity < 1) parts.push(`α:${m.opacity}`)
      if (parts.length) details = ` [${parts.join(' ')}]`
    }

    const animStr = obj.animation?.preset && obj.animation.preset !== 'none'
      ? ` ~${obj.animation.preset}`
      : ''
    const behaviorStr = obj.behaviors && obj.behaviors.length > 0
      ? ` behaviors:[${obj.behaviors.filter((b) => b.enabled).map((b) => b.type).join(',')}]`
      : ''
    const geomStr = obj.geometry?.type ? `/${obj.geometry.type}` : ''

    let dimsStr = ''
    if (obj.geometry) {
      const g = obj.geometry as { type: string; width?: number; height?: number; depth?: number; radius?: number; radiusTop?: number; radiusBottom?: number }
      if (g.type === 'box' && (g.width || g.height || g.depth))
        dimsStr = ` dims:[w:${(g.width ?? 1).toFixed(1)} h:${(g.height ?? 1).toFixed(1)} d:${(g.depth ?? 1).toFixed(1)}]`
      else if (g.type === 'sphere' && g.radius)
        dimsStr = ` [r:${g.radius.toFixed(2)}]`
      else if ((g.type === 'cylinder' || g.type === 'cone') && (g.radiusTop || g.radiusBottom || g.height))
        dimsStr = ` [rt:${(g.radiusTop ?? 0.5).toFixed(2)} rb:${(g.radiusBottom ?? 0.5).toFixed(2)} h:${(g.height ?? 1).toFixed(1)}]`
      else if (g.type === 'plane' && (g.width || g.height))
        dimsStr = ` [w:${(g.width ?? 1).toFixed(1)} h:${(g.height ?? 1).toFixed(1)}]`
    }

    return `  • "${obj.name}" (${obj.type}${geomStr}) @[${pos}]${scaleStr}${dimsStr}${details}${animStr}${behaviorStr}${visStr} id:${obj.id}`
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
    `HDRI:${env.hdriName ?? 'none'} | Fog:${env.fogType ?? 'none'}${env.fogType && env.fogType !== 'none' ? `(${env.fogColor ?? '#aaa'} d:${env.fogDensity ?? 0.02})` : ''}`,
    `Ambient:${env.ambientColor ?? '#fff'} ×${env.ambientIntensity ?? 0.3} | Dir:${env.directionalColor ?? '#fff'} ×${env.directionalIntensity ?? 1}`,
    `BG:${env.backgroundColor ?? '#0B0C0F'}`,
  ]

  const camLines = camera ? [
    `FOV:${camera.fov ?? 60}° Clip:${camera.near ?? 0.1}–${camera.far ?? 1000} View:${camera.viewMode ?? 'persp'}`,
  ] : []

  const modeStr = appMode ? `\nMode: ${appMode}` : ''
  const pathStr = cameraPath && cameraPath.length > 0
    ? `\nCamera path: ${cameraPath.length} keypoint${cameraPath.length !== 1 ? 's' : ''}`
    : ''

  return `${objList.length} objects:
${objList.join('\n') || '  (empty scene)'}

Env: ${envLines.join(' | ')}
${camLines.join(' ')}${modeStr}${pathStr}`
}
