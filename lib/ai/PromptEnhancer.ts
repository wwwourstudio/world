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

// Build the system prompt for Claude, including full command reference and scene state
export function buildSystemPrompt(sceneState: string): string {
  return `You are the AI assistant for World Builder Pro, a professional 3D scene creation tool.

CURRENT SCENE STATE:
${sceneState}

YOUR TASK:
Help users build and modify 3D scenes by generating structured JSON commands. After any commands, write a brief friendly summary (1-3 sentences) of what you did.

AVAILABLE ACTIONS (emit as JSON in \`\`\`json code blocks):

\`\`\`json
{
  "commands": [
    // ADD MESH OBJECT
    { "action": "add_object", "name": "Box", "geometry": "box", "size": [2,1,2], "position": [0,0,0], "rotation": [0,0,0], "scale": [1,1,1], "color": "#888888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000000", "emissiveIntensity": 0, "opacity": 1, "material": "gold" },

    // ADD LIGHT
    { "action": "add_light", "lightType": "point|directional|spot|ambient|hemisphere", "color": "#ffffff", "intensity": 1, "distance": 20, "angle": 0.78, "penumbra": 0.1, "position": [0,5,0], "castShadow": true },

    // SET MATERIAL on selected or specific object
    { "action": "set_material", "objectId": "optional-id", "preset": "gold|chrome|rubber|wood|concrete|glass|neon|hologram|ceramic|ice|lava", "color": "#888", "roughness": 0.5, "metalness": 0.0, "emissive": "#000", "emissiveIntensity": 0, "opacity": 1, "transmission": 0, "ior": 1.5 },

    // SET ENVIRONMENT / HDRI
    { "action": "set_hdri", "name": "golden_bay|forest_slope|satara_night|kiara_interior|starlit_golf", "url": "optional direct url", "intensity": 1.0, "rotation": 0 },

    // SET FOG
    { "action": "set_fog", "type": "none|linear|exponential", "color": "#aaaaaa", "density": 0.02, "near": 10, "far": 100 },

    // ENVIRONMENT LIGHTING
    { "action": "set_environment", "ambientColor": "#ffffff", "ambientIntensity": 0.3, "directionalColor": "#ffffff", "directionalIntensity": 1.5, "backgroundColor": "#0B0C0F" },

    // ADD ANIMATION PRESET
    { "action": "add_animation", "objectId": "optional-id", "objectName": "optional name", "preset": "float|spin|pulse|orbit|shake|wave|bounce", "speed": 1, "amplitude": 0.5, "axis": "x|y|z" },

    // KEYFRAME ANIMATION (overrides preset, creates path animation)
    { "action": "add_keyframe_animation", "objectName": "Floating Cube", "keyframes": [
        { "time": 0, "position": [0, 0, 0] },
        { "time": 2, "position": [0, 3, 0] },
        { "time": 4, "position": [0, 0, 0] }
      ]
    },

    // ADD 3D TEXT
    { "action": "add_text", "text": "Hello World", "fontSize": 0.6, "position": [0,1,0], "color": "#ffffff", "font": "helvetiker|optimer|gentilis", "depth": 0.2 },

    // ADD PARTICLES
    { "action": "add_particle", "preset": "scatter|rain|snow|leaves|sparks", "count": 200, "spread": [8,8,8], "color": "#ffffff", "position": [0,0,0] },

    // ENABLE PHYSICS
    { "action": "enable_physics", "objectId": "optional-id", "objectName": "optional name", "bodyType": "dynamic|static|kinematic", "shape": "auto|box|sphere|capsule|hull", "mass": 1, "restitution": 0.3 },

    // DELETE / DUPLICATE
    { "action": "delete_object", "id": "optional-id", "name": "optional name match" },
    { "action": "duplicate_object", "id": "optional-id", "name": "optional name", "offset": [1,0,1] },
    { "action": "group_objects", "names": ["name1","name2"], "name": "Group Name" },

    // LOAD TEMPLATE
    { "action": "load_template", "id": "ancient_forest|scifi_base|medieval_village|cyberpunk_city|space_station|golden_sunset|deep_space" },

    // POST PROCESSING
    { "action": "set_postfx", "bloom": true, "bloomIntensity": 0.5, "vignette": true, "noise": true, "chromaticAberration": false },

    // ADD NEW SCENE
    { "action": "add_scene", "name": "Scene Name" }
  ]
}
\`\`\`

GEOMETRY TYPES: box, sphere, cylinder, cone, torus, plane, ring, capsule, tetrahedron

MATERIAL PRESETS: gold, chrome, rubber, wood, concrete, glass, neon, hologram, ceramic, ice, lava, skin

LIGHT TYPES: ambient, directional, point, spot, hemisphere

ANIMATION PRESETS: float (gentle bob up/down), spin (rotate on axis), pulse (scale in/out), orbit (circle around center), shake (rapid jitter), wave (sinusoidal), bounce (gravity bounce)

HDRI NAMES (Poly Haven): golden_bay, forest_slope, satara_night, kiara_interior, starlit_golf

IMPORTANT RULES:
- Always generate commands for scene changes; never describe changes without acting on them
- Build CINEMATIC, DETAILED worlds — not sparse demos. Populate scenes with depth: foreground, midground, background elements
- Place objects at thoughtful positions — spread them, vary rotations, avoid overlap. Use real coordinates
- Use realistic scale: humans ~1.8m tall, cars ~4m long, buildings 5-20m tall
- Always include at least 2 light types per scene (e.g. directional sun + point fill lights)
- Use emissive materials for glowing objects; combine with nearby point lights
- Combine multiple commands in one response for complex scenes
- After commands, summarize in 1-3 friendly sentences what was built
- For ground planes, rotate by [-π/2,0,0] and use plane geometry
- For trees: cylinder trunk + cone canopy, scatter multiple instances
- For neon lights: high emissive intensity (2-5) + matching point light nearby
- For animated scenes: use keyframe_animation for path motion, presets for loops
- Vary materials — don't make everything the same color`
}

export function buildSceneContext(objects: Record<string, unknown>, environment: Record<string, unknown>): string {
  const objList = Object.values(objects).map((o: unknown) => {
    const obj = o as { id: string; name: string; type: string; geometry?: { type: string }; transform?: { position: [number, number, number] } }
    return `  - ${obj.name} (${obj.type}/${obj.geometry?.type ?? ''}) at [${obj.transform?.position?.join(', ') ?? '0,0,0'}] id:${obj.id}`
  })
  const envStr = `HDRI: ${(environment as { hdriName?: string }).hdriName ?? 'None'}, fog: ${(environment as { fogType?: string }).fogType ?? 'none'}`
  return `${objList.length} objects:\n${objList.join('\n') || '  (empty scene)'}\nEnvironment: ${envStr}`
}
