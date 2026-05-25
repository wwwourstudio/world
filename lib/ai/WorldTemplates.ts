import type { SceneObject, MaterialConfig, GeometryConfig, LightConfig, EnvironmentState, CameraKeypoint } from '@/lib/scene/SceneStore'

interface WorldTemplate {
  id: string
  name: string
  icon: string
  description: string
  objects: Omit<SceneObject, 'id'>[]
  environment: Partial<EnvironmentState>
  cameraPath?: Omit<CameraKeypoint, 'id'>[]
  appMode?: 'world' | 'website'
}

function mesh(
  name: string,
  geometry: GeometryConfig,
  material: Partial<MaterialConfig>,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
): Omit<SceneObject, 'id'> {
  return {
    name,
    type: 'mesh',
    geometry,
    material: {
      type: 'standard',
      color: '#888888',
      roughness: 0.5,
      metalness: 0,
      emissive: '#000000',
      emissiveIntensity: 0,
      opacity: 1,
      transparent: false,
      wireframe: false,
      envMapIntensity: 1,
      transmission: 0,
      ior: 1.5,
      thickness: 0.5,
      flatShading: false,
      side: 'front',
      ...material,
    },
    light: null,
    transform: { position: pos, rotation: rot, scale },
    animation: null,
    physics: null,
    children: [],
    parentId: null,
    visible: true,
    locked: false,
    tags: [],
    expanded: false,
    castShadow: true,
    receiveShadow: true,
  }
}

function light(
  name: string,
  cfg: Partial<LightConfig>,
  pos: [number, number, number]
): Omit<SceneObject, 'id'> {
  return {
    name,
    type: 'light',
    geometry: { type: 'sphere', radius: 0.1 },
    material: { type: 'standard', color: '#ffff00', roughness: 0, metalness: 0, emissive: '#ffff00', emissiveIntensity: 1, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' },
    light: {
      type: 'point',
      intensity: 1,
      color: '#ffffff',
      distance: 20,
      decay: 2,
      angle: Math.PI / 4,
      penumbra: 0.1,
      castShadow: true,
      ...cfg,
    },
    transform: { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] },
    animation: null,
    physics: null,
    children: [],
    parentId: null,
    visible: true,
    locked: false,
    tags: [],
    expanded: false,
    castShadow: false,
    receiveShadow: false,
  }
}

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    id: 'empty',
    name: 'Empty Scene',
    icon: '⬛',
    description: 'Start from scratch with just a ground plane.',
    environment: {
      hdriUrl: null,
      hdriName: 'None',
      ambientIntensity: 0.4,
      directionalIntensity: 1.2,
    },
    objects: [
      mesh('Ground', { type: 'plane', width: 20, height: 20 }, { color: '#444444', roughness: 0.9 }, [0, 0, 0], [-Math.PI / 2, 0, 0]),
    ],
  },
  {
    id: 'ancient_forest',
    name: 'Ancient Forest',
    icon: '🌲',
    description: 'Dense trees with fog and dappled light.',
    environment: {
      hdriName: 'forest_slope',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/forest_slope_1k.hdr',
      hdriIntensity: 0.6,
      ambientColor: '#2a4a1e',
      ambientIntensity: 0.5,
      fogType: 'exponential',
      fogColor: '#3a5a2a',
      fogDensity: 0.04,
      directionalColor: '#ffe8b0',
      directionalIntensity: 0.8,
      directionalPosition: [3, 10, 3],
      skyEnabled: true,
      skyTurbidity: 8,
      skyRayleigh: 3,
      sunElevation: 35,
      sunAzimuth: 150,
    },
    objects: [
      mesh('Ground', { type: 'plane', width: 40, height: 40 }, { color: '#2d5016', roughness: 0.95 }, [0, 0, 0], [-Math.PI / 2, 0, 0]),
      // Trees — trunk + canopy pairs
      ...([
        [0, 0], [4, 3], [-5, 2], [2, -6], [-3, -4], [7, 0], [-7, 5], [1, 8],
      ] as [number, number][]).flatMap(([x, z], i) => [
        mesh(`Trunk ${i + 1}`, { type: 'cylinder', radiusTop: 0.12, radiusBottom: 0.18, height: 4, segments: 6 }, { color: '#4a2e0a', roughness: 0.9 }, [x, 2, z]),
        mesh(`Canopy ${i + 1}`, { type: 'cone', radius: 1.4 + Math.sin(i) * 0.5, height: 3.5, segments: 7 }, { color: '#1a4a0a', roughness: 0.9 }, [x, 5.5, z], [0, i * 0.8, 0]),
      ]),
      // Rocks
      mesh('Rock 1', { type: 'sphere', radius: 0.5, segments: 5 }, { color: '#5a5a5a', roughness: 0.95, flatShading: true }, [-2, 0.3, 3], [0.3, 0.5, 0.1], [1, 0.7, 1.2]),
      mesh('Rock 2', { type: 'sphere', radius: 0.35, segments: 5 }, { color: '#4a4a4a', roughness: 0.9, flatShading: true }, [5, 0.2, -2], [0.1, 1.2, 0.2], [0.8, 0.6, 1.1]),
      light('Sun', { type: 'directional', intensity: 0.8, color: '#ffe8b0', castShadow: true }, [5, 10, 5]),
      light('Fill', { type: 'ambient', intensity: 0.4, color: '#3a6a2a' }, [0, 5, 0]),
    ],
  },
  {
    id: 'scifi_base',
    name: 'Sci-Fi Base',
    icon: '🛸',
    description: 'Modular metal structures with glowing emissive panels.',
    environment: {
      hdriName: 'satara_night',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/satara_night_1k.hdr',
      hdriIntensity: 0.3,
      ambientColor: '#0a0a2a',
      ambientIntensity: 0.2,
      fogType: 'exponential',
      fogColor: '#050510',
      fogDensity: 0.015,
      directionalColor: '#6080ff',
      directionalIntensity: 0.4,
    },
    objects: [
      mesh('Platform', { type: 'box', width: 16, height: 0.4, depth: 16 }, { color: '#2a2a3a', roughness: 0.3, metalness: 0.8 }, [0, -0.2, 0]),
      // Main structure
      mesh('Tower A', { type: 'box', width: 3, height: 8, depth: 3 }, { color: '#1e2030', roughness: 0.2, metalness: 0.9 }, [-4, 4, -4]),
      mesh('Tower B', { type: 'box', width: 3, height: 6, depth: 3 }, { color: '#1e2030', roughness: 0.2, metalness: 0.9 }, [4, 3, -4]),
      mesh('Bridge', { type: 'box', width: 8, height: 0.3, depth: 1.2 }, { color: '#252535', roughness: 0.3, metalness: 0.8 }, [0, 6, -4]),
      // Emissive panels
      mesh('Panel A', { type: 'plane', width: 1.5, height: 3 }, { color: '#003399', emissive: '#0055ff', emissiveIntensity: 2, roughness: 0 }, [-4, 4, -2.4], [0, 0, 0]),
      mesh('Panel B', { type: 'plane', width: 1.5, height: 2 }, { color: '#003399', emissive: '#0055ff', emissiveIntensity: 2, roughness: 0 }, [4, 3, -2.4], [0, 0, 0]),
      mesh('Radar Dish', { type: 'torus', radius: 1.2, tube: 0.08, segments: 16 }, { color: '#555', roughness: 0.2, metalness: 0.9 }, [0, 9, -4], [Math.PI / 4, 0, 0]),
      // Landing pad
      mesh('Landing Pad', { type: 'cylinder', radiusTop: 3, radiusBottom: 3, height: 0.15, segments: 8 }, { color: '#1a1a2a', roughness: 0.2, metalness: 0.7 }, [0, 0.08, 5]),
      mesh('Pad Ring', { type: 'torus', radius: 2.8, tube: 0.05, segments: 32 }, { color: '#ffaa00', emissive: '#ff8800', emissiveIntensity: 2 }, [0, 0.2, 5], [-Math.PI / 2, 0, 0]),
      // Lights
      light('Main', { type: 'directional', intensity: 0.4, color: '#6688ff', castShadow: true }, [5, 15, 5]),
      light('Blue Accent 1', { type: 'point', intensity: 3, color: '#0044ff', distance: 8, decay: 2 }, [-4, 4, -2]),
      light('Blue Accent 2', { type: 'point', intensity: 3, color: '#0044ff', distance: 8, decay: 2 }, [4, 3, -2]),
      light('Landing', { type: 'point', intensity: 4, color: '#ff8800', distance: 10, decay: 2 }, [0, 3, 5]),
    ],
  },
  {
    id: 'medieval_village',
    name: 'Medieval Village',
    icon: '🏰',
    description: 'Stone castle, market stalls, and torchlight.',
    environment: {
      hdriName: 'kiara_interior',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_interior_1k.hdr',
      hdriIntensity: 0.8,
      ambientColor: '#e8c880',
      ambientIntensity: 0.4,
      fogType: 'linear',
      fogColor: '#a0876a',
      fogNear: 20,
      fogFar: 60,
      directionalColor: '#ffe090',
      directionalIntensity: 1.2,
      directionalPosition: [8, 15, 5],
    },
    objects: [
      mesh('Ground', { type: 'plane', width: 50, height: 50 }, { color: '#5a4a2a', roughness: 0.98 }, [0, 0, 0], [-Math.PI / 2, 0, 0]),
      // Castle keep
      mesh('Keep', { type: 'box', width: 6, height: 10, depth: 6 }, { color: '#6a6060', roughness: 0.9 }, [0, 5, -8]),
      mesh('Keep Roof', { type: 'cone', radius: 3.8, height: 3, segments: 4 }, { color: '#555050', roughness: 0.8 }, [0, 11.5, -8], [0, Math.PI / 4, 0]),
      // Corner towers
      ...([[3.5, 3.5], [-3.5, 3.5], [3.5, -3.5], [-3.5, -3.5]] as [number, number][]).map(([x, z], i) =>
        mesh(`Tower ${i + 1}`, { type: 'cylinder', radiusTop: 1, radiusBottom: 1.1, height: 7, segments: 8 }, { color: '#5e5858', roughness: 0.9 }, [x, 3.5, z + (-8)])
      ),
      // Walls
      mesh('Wall N', { type: 'box', width: 8, height: 3, depth: 0.6 }, { color: '#635e5e', roughness: 0.9 }, [0, 1.5, -4.7]),
      mesh('Wall S', { type: 'box', width: 8, height: 3, depth: 0.6 }, { color: '#635e5e', roughness: 0.9 }, [0, 1.5, -11.3]),
      // Market stalls
      mesh('Stall A', { type: 'box', width: 2.5, height: 0.1, depth: 1.5 }, { color: '#cc4400', roughness: 0.7 }, [-4, 1.5, 3]),
      mesh('Stall A Post 1', { type: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: 1.5, segments: 4 }, { color: '#6b3a2a', roughness: 0.9 }, [-5, 0.75, 2.3]),
      mesh('Stall A Post 2', { type: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: 1.5, segments: 4 }, { color: '#6b3a2a', roughness: 0.9 }, [-3, 0.75, 2.3]),
      mesh('Stall B', { type: 'box', width: 2.5, height: 0.1, depth: 1.5 }, { color: '#4444aa', roughness: 0.7 }, [4, 1.5, 3]),
      // Well
      mesh('Well Ring', { type: 'torus', radius: 0.7, tube: 0.12, segments: 16 }, { color: '#5e5858', roughness: 0.9 }, [0, 0.5, 2]),
      mesh('Well Roof', { type: 'cone', radius: 1, height: 1, segments: 6 }, { color: '#7a4a20', roughness: 0.8 }, [0, 2, 2]),
      // Torches
      light('Torch 1', { type: 'point', intensity: 5, color: '#ff6600', distance: 8, decay: 2 }, [-4, 2.5, 3]),
      light('Torch 2', { type: 'point', intensity: 5, color: '#ff6600', distance: 8, decay: 2 }, [4, 2.5, 3]),
      light('Keep Torch', { type: 'point', intensity: 4, color: '#ff7700', distance: 10, decay: 2 }, [0, 6, -5]),
      light('Sun', { type: 'directional', intensity: 1.2, color: '#ffe090', castShadow: true }, [8, 15, 5]),
    ],
  },
  {
    id: 'cyberpunk_city',
    name: 'Cyberpunk City',
    icon: '🏙️',
    description: 'Neon signs, rain-slicked streets and holographic ads.',
    environment: {
      hdriName: 'satara_night',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/satara_night_1k.hdr',
      hdriIntensity: 0.1,
      ambientColor: '#050a1a',
      ambientIntensity: 0.2,
      fogType: 'exponential',
      fogColor: '#080818',
      fogDensity: 0.025,
      directionalColor: '#2244aa',
      directionalIntensity: 0.2,
    },
    objects: [
      // Road
      mesh('Road', { type: 'plane', width: 30, height: 60 }, { color: '#111118', roughness: 0.1, metalness: 0.3 }, [0, 0, 0], [-Math.PI / 2, 0, 0]),
      // Buildings
      ...[
        { pos: [-7, 9, -5] as [number,number,number], size: [4, 18, 5] as [number,number,number], col: '#0e0e14' },
        { pos: [7, 7, -5] as [number,number,number], size: [4, 14, 5] as [number,number,number], col: '#0a0a12' },
        { pos: [-8, 12, -12] as [number,number,number], size: [5, 24, 6] as [number,number,number], col: '#0c0c18' },
        { pos: [8, 10, -12] as [number,number,number], size: [5, 20, 6] as [number,number,number], col: '#0d0d16' },
        { pos: [-7, 6, 5] as [number,number,number], size: [4, 12, 5] as [number,number,number], col: '#0e0e14' },
        { pos: [7, 8, 5] as [number,number,number], size: [4, 16, 5] as [number,number,number], col: '#0a0a12' },
      ].map(({ pos, size, col }, i) =>
        mesh(`Building ${i + 1}`, { type: 'box', width: size[0], height: size[1], depth: size[2] }, { color: col, roughness: 0.3, metalness: 0.6 }, pos)
      ),
      // Neon signs
      mesh('Neon H', { type: 'box', width: 3, height: 0.2, depth: 0.1 }, { color: '#ff00aa', emissive: '#ff00aa', emissiveIntensity: 4 }, [-5, 8, -2.3]),
      mesh('Neon V', { type: 'box', width: 0.2, height: 4, depth: 0.1 }, { color: '#00ffff', emissive: '#00ffff', emissiveIntensity: 4 }, [5, 7, -2.3]),
      mesh('Neon Ring', { type: 'torus', radius: 0.8, tube: 0.06, segments: 32 }, { color: '#aaff00', emissive: '#aaff00', emissiveIntensity: 3 }, [0, 10, -4.6]),
      // Street reflections (thin glossy slabs)
      mesh('Puddle 1', { type: 'plane', width: 2, height: 1 }, { color: '#222230', roughness: 0.05, metalness: 0.5 }, [-2, 0.01, 4], [-Math.PI / 2, 0, 0.3]),
      mesh('Puddle 2', { type: 'plane', width: 1.5, height: 0.8 }, { color: '#222230', roughness: 0.05, metalness: 0.5 }, [3, 0.01, 2], [-Math.PI / 2, 0, -0.5]),
      // Lights
      light('Pink Neon', { type: 'point', intensity: 6, color: '#ff00aa', distance: 12, decay: 2 }, [-5, 8, -2]),
      light('Cyan Neon', { type: 'point', intensity: 6, color: '#00ffff', distance: 12, decay: 2 }, [5, 7, -2]),
      light('Green Neon', { type: 'point', intensity: 5, color: '#aaff00', distance: 10, decay: 2 }, [0, 10, -4]),
      light('Overhead', { type: 'point', intensity: 2, color: '#ffffff', distance: 15, decay: 2 }, [0, 12, 0]),
    ],
  },
  {
    id: 'space_station',
    name: 'Space Station',
    icon: '🚀',
    description: 'Modular ring, zero-G debris, Earth below.',
    environment: {
      hdriName: 'starlit_golf',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/starlit_golf_1k.hdr',
      hdriIntensity: 0.05,
      ambientColor: '#000011',
      ambientIntensity: 0.1,
      fogType: 'none',
      directionalColor: '#fffaf0',
      directionalIntensity: 2,
      directionalPosition: [50, 20, 30],
    },
    objects: [
      // Central hub
      mesh('Hub', { type: 'cylinder', radiusTop: 1.5, radiusBottom: 1.5, height: 6, segments: 12 }, { color: '#cccccc', roughness: 0.1, metalness: 0.9 }, [0, 0, 0], [Math.PI / 2, 0, 0]),
      // Ring
      mesh('Ring', { type: 'torus', radius: 6, tube: 0.8, segments: 64 }, { color: '#aaaaaa', roughness: 0.15, metalness: 0.85 }, [0, 0, 0], [Math.PI / 2, 0, 0]),
      // Spokes
      ...[0, 1, 2, 3].map((i) =>
        mesh(`Spoke ${i + 1}`, { type: 'cylinder', radiusTop: 0.15, radiusBottom: 0.15, height: 5, segments: 6 }, { color: '#bbbbbb', roughness: 0.2, metalness: 0.8 }, [
          Math.sin((i / 4) * Math.PI * 2) * 3.5,
          Math.cos((i / 4) * Math.PI * 2) * 3.5,
          0,
        ], [0, 0, (i / 4) * Math.PI * 2])
      ),
      // Solar panels
      mesh('Solar A1', { type: 'box', width: 4, height: 0.05, depth: 2 }, { color: '#112244', roughness: 0.3, metalness: 0.5 }, [0, 0, -8], [0, 0, 0]),
      mesh('Solar A2', { type: 'box', width: 4, height: 0.05, depth: 2 }, { color: '#112244', roughness: 0.3, metalness: 0.5 }, [0, 0, 8], [0, 0, 0]),
      // Debris
      mesh('Debris 1', { type: 'tetrahedron', radius: 0.3 }, { color: '#888888', roughness: 0.5, metalness: 0.6, flatShading: true }, [8, 3, 2], [0.5, 1.2, 0.3]),
      mesh('Debris 2', { type: 'tetrahedron', radius: 0.2 }, { color: '#777777', roughness: 0.5, metalness: 0.5, flatShading: true }, [-9, -2, 4], [1, 0.5, 1.5]),
      mesh('Debris 3', { type: 'box', width: 0.4, height: 0.2, depth: 0.3 }, { color: '#999999', roughness: 0.4, metalness: 0.7 }, [3, 5, -7], [0.3, 0.8, 0.2]),
      // Earth (large sphere below)
      mesh('Earth', { type: 'sphere', radius: 20, segments: 32 }, { color: '#1a5a1a', roughness: 0.9 }, [0, -30, -10]),
      // Lights
      light('Sun', { type: 'directional', intensity: 2, color: '#fffaf0', castShadow: true }, [50, 20, 30]),
      light('Earth Glow', { type: 'hemisphere', intensity: 0.3, color: '#224488', skyColor: '#224488', groundColor: '#113300' }, [0, 0, 0]),
    ],
  },
  {
    id: 'golden_sunset',
    name: 'Golden Sunset',
    icon: '🌅',
    description: 'Rolling hills, warm HDRI, dramatic god rays.',
    environment: {
      hdriName: 'golden_bay',
      hdriUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/golden_bay_1k.hdr',
      hdriIntensity: 1.2,
      ambientColor: '#ff8844',
      ambientIntensity: 0.5,
      fogType: 'linear',
      fogColor: '#ffaa66',
      fogNear: 30,
      fogFar: 80,
      directionalColor: '#ffcc55',
      directionalIntensity: 2,
      directionalPosition: [10, 5, 10],
      skyEnabled: true,
      skyTurbidity: 12,
      skyRayleigh: 2,
      sunElevation: 12,
      sunAzimuth: 200,
    },
    objects: [
      mesh('Ground', { type: 'plane', width: 60, height: 60 }, { color: '#6a8a3a', roughness: 0.9 }, [0, 0, 0], [-Math.PI / 2, 0, 0]),
      // Hills (flattened spheres)
      mesh('Hill 1', { type: 'sphere', radius: 8, segments: 12 }, { color: '#5a7a2a', roughness: 0.95, flatShading: true }, [-10, -5, -15]),
      mesh('Hill 2', { type: 'sphere', radius: 6, segments: 10 }, { color: '#4a6a1a', roughness: 0.95, flatShading: true }, [12, -4, -18]),
      mesh('Hill 3', { type: 'sphere', radius: 5, segments: 10 }, { color: '#507020', roughness: 0.95, flatShading: true }, [0, -4, -20]),
      // Trees silhouettes
      ...([[-3, -10], [5, -12], [-8, -8], [10, -9]] as [number, number][]).flatMap(([x, z], i) => [
        mesh(`Trunk S${i}`, { type: 'cylinder', radiusTop: 0.08, radiusBottom: 0.12, height: 3, segments: 5 }, { color: '#2a1a0a', roughness: 0.9 }, [x, 1.5, z]),
        mesh(`Can S${i}`, { type: 'sphere', radius: 1 + i * 0.2, segments: 6 }, { color: '#1a3a0a', roughness: 0.9, flatShading: true }, [x, 4, z]),
      ]),
      // Sun disc
      mesh('Sun', { type: 'sphere', radius: 0.8, segments: 12 }, { color: '#ffdd00', emissive: '#ff9900', emissiveIntensity: 3 }, [15, 8, -25]),
      light('Sun Key', { type: 'directional', intensity: 2, color: '#ffcc55', castShadow: true }, [10, 5, 10]),
      light('Sky Fill', { type: 'hemisphere', intensity: 0.5, color: '#ff8844', skyColor: '#ffaa66', groundColor: '#2a3a1a' }, [0, 0, 0]),
    ],
  },
  {
    id: 'deep_space',
    name: 'Deep Space',
    icon: '🌌',
    description: 'Starfield, nebula colors and orbiting planets.',
    environment: {
      hdriUrl: null,
      hdriName: 'None',
      ambientColor: '#050518',
      ambientIntensity: 0.15,
      fogType: 'none',
      backgroundColor: '#000005',
      directionalColor: '#ffffff',
      directionalIntensity: 3,
      directionalPosition: [100, 50, 80],
    },
    objects: [
      // Central star
      mesh('Star', { type: 'sphere', radius: 2, segments: 24 }, { color: '#ffffff', emissive: '#ffffaa', emissiveIntensity: 3 }, [0, 0, 0]),
      // Planets
      mesh('Planet A', { type: 'sphere', radius: 1.2, segments: 20 }, { color: '#4466aa', roughness: 0.4 }, [8, 2, 0]),
      mesh('Ring A', { type: 'torus', radius: 2, tube: 0.12, segments: 48 }, { color: '#886644', roughness: 0.6 }, [8, 2, 0], [Math.PI / 3, 0, 0]),
      mesh('Planet B', { type: 'sphere', radius: 0.7, segments: 16 }, { color: '#aa4422', roughness: 0.7, flatShading: true }, [-12, 3, -5]),
      mesh('Planet C', { type: 'sphere', radius: 1.8, segments: 24 }, { color: '#338855', roughness: 0.5 }, [0, -4, -16]),
      mesh('Moon', { type: 'sphere', radius: 0.4, segments: 12 }, { color: '#aaaaaa', roughness: 0.9, flatShading: true }, [2, -4, -14]),
      // Asteroids
      ...([
        [4, 5, -3], [-5, -3, 4], [6, -2, 6], [-4, 6, -6], [7, 3, -8],
      ] as [number,number,number][]).map((pos, i) =>
        mesh(`Asteroid ${i}`, { type: 'tetrahedron', radius: 0.2 + i * 0.05 }, { color: '#666655', roughness: 0.9, flatShading: true }, pos, [i * 0.5, i * 0.8, i * 0.3])
      ),
      // Lights
      light('Star Glow', { type: 'point', intensity: 8, color: '#ffffdd', distance: 60, decay: 1 }, [0, 0, 0]),
      light('Nebula', { type: 'hemisphere', intensity: 0.3, skyColor: '#220066', groundColor: '#004422' }, [0, 0, 0]),
    ],
  },

  // ── Website-mode templates ────────────────────────────────────────────────

  {
    id: 'website_landing',
    name: '3D Landing Page',
    icon: '🌐',
    description: 'Scroll-driven hero with floating geometry and neon materials.',
    appMode: 'website',
    environment: {
      hdriUrl: null,
      hdriName: 'None',
      backgroundColor: '#050508',
      ambientColor: '#1a1040',
      ambientIntensity: 0.6,
      directionalColor: '#8866ff',
      directionalIntensity: 1.5,
      directionalPosition: [5, 10, 5],
      fogType: 'exponential',
      fogColor: '#050508',
      fogDensity: 0.04,
    },
    cameraPath: [
      { label: 'Hero', position: [0, 2, 12], target: [0, 0, 0], fov: 60, easing: 'ease' },
      { label: 'Close-up', position: [0, 0.5, 5], target: [0, 0.5, 0], fov: 50, easing: 'ease' },
      { label: 'Reveal', position: [4, 2, 6], target: [0, 0, 0], fov: 55, easing: 'ease-out' },
    ],
    objects: [
      // Hero torus
      mesh('Hero Ring', { type: 'torus', radius: 2.5, tube: 0.18, segments: 64 },
        { color: '#7744ff', emissive: '#5522cc', emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1 },
        [0, 0, 0], [Math.PI / 2.5, 0, 0]),
      // Floating spheres
      mesh('Orb A', { type: 'sphere', radius: 0.5, segments: 32 },
        { color: '#ff44aa', emissive: '#cc2277', emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.05 },
        [-3, 1.5, 1]),
      mesh('Orb B', { type: 'sphere', radius: 0.3, segments: 32 },
        { color: '#44ffcc', emissive: '#22ccaa', emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.1 },
        [3.5, -0.5, 2]),
      mesh('Orb C', { type: 'sphere', radius: 0.4, segments: 32 },
        { color: '#ffaa22', emissive: '#cc7700', emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.15 },
        [2, 2.5, -1]),
      // Accent boxes
      mesh('Cube A', { type: 'box', width: 0.6, height: 0.6, depth: 0.6 },
        { color: '#4488ff', emissive: '#2255cc', emissiveIntensity: 0.4, metalness: 1, roughness: 0 },
        [-4, -1, -1], [0.5, 0.8, 0.3]),
      mesh('Cube B', { type: 'box', width: 0.4, height: 0.4, depth: 0.4 },
        { color: '#ff6644', emissive: '#cc3322', emissiveIntensity: 0.4, metalness: 1, roughness: 0 },
        [4, 1, -2], [0.3, 1.1, 0.6]),
      // Ground
      mesh('Floor', { type: 'plane', width: 30, height: 30 },
        { color: '#0a0a14', roughness: 0.95, metalness: 0.1 },
        [0, -3, 0], [-Math.PI / 2, 0, 0]),
      // Lights
      light('Key', { type: 'point', intensity: 4, color: '#8866ff', distance: 30, decay: 2 }, [3, 5, 5]),
      light('Fill', { type: 'point', intensity: 2, color: '#ff44aa', distance: 20, decay: 2 }, [-4, 2, 2]),
    ],
  },

  {
    id: 'website_portfolio',
    name: 'Portfolio Showcase',
    icon: '💎',
    description: 'Orbital product display with scroll-through camera.',
    appMode: 'website',
    environment: {
      hdriUrl: null,
      hdriName: 'None',
      backgroundColor: '#08080c',
      ambientColor: '#203040',
      ambientIntensity: 0.5,
      directionalColor: '#ffffff',
      directionalIntensity: 2,
      directionalPosition: [5, 8, 3],
      shadowsEnabled: true,
    },
    cameraPath: [
      { label: 'Top-down', position: [0, 8, 4], target: [0, 0, 0], fov: 50, easing: 'ease' },
      { label: 'Side', position: [7, 3, 0], target: [0, 1, 0], fov: 45, easing: 'ease' },
      { label: 'Front', position: [0, 2, 7], target: [0, 1, 0], fov: 55, easing: 'ease-out' },
    ],
    objects: [
      // Central product sphere
      mesh('Hero Gem', { type: 'sphere', radius: 1.2, segments: 64 },
        { type: 'physical', color: '#88ccff', roughness: 0, metalness: 0, transmission: 0.9, ior: 1.6, transparent: true },
        [0, 1.2, 0]),
      // Pedestal
      mesh('Pedestal Top', { type: 'cylinder', radiusTop: 1.4, radiusBottom: 1.4, height: 0.15, segments: 32 },
        { color: '#222233', roughness: 0.3, metalness: 0.9 },
        [0, 0, 0]),
      mesh('Pedestal Base', { type: 'cylinder', radiusTop: 1.8, radiusBottom: 2, height: 0.8, segments: 32 },
        { color: '#1a1a2a', roughness: 0.4, metalness: 0.7 },
        [0, -0.475, 0]),
      // Orbital ring
      mesh('Ring A', { type: 'torus', radius: 2.5, tube: 0.04, segments: 64 },
        { color: '#4499ff', emissive: '#2266cc', emissiveIntensity: 0.5, metalness: 1, roughness: 0 },
        [0, 1.2, 0], [Math.PI / 2, 0, 0]),
      mesh('Ring B', { type: 'torus', radius: 3.2, tube: 0.03, segments: 64 },
        { color: '#ff99aa', emissive: '#cc5566', emissiveIntensity: 0.3, metalness: 1, roughness: 0 },
        [0, 1.2, 0], [Math.PI / 3, Math.PI / 5, 0]),
      // Orbital particles
      ...([
        [2.5, 1.2, 0], [-2.5, 1.2, 0], [0, 1.2, 2.5], [0, 1.2, -2.5],
        [1.77, 1.2, 1.77], [-1.77, 1.2, -1.77],
      ] as [number, number, number][]).map((pos, i) =>
        mesh(`Dot ${i}`, { type: 'sphere', radius: 0.08, segments: 8 },
          { color: '#aaccff', emissive: '#6699ff', emissiveIntensity: 0.8 },
          pos)
      ),
      // Floor
      mesh('Studio Floor', { type: 'plane', width: 20, height: 20 },
        { color: '#0d0d18', roughness: 0.8, metalness: 0.2 },
        [0, -0.9, 0], [-Math.PI / 2, 0, 0]),
      // Lights
      light('Key', { type: 'spot', intensity: 10, color: '#ffffff', distance: 25, angle: 0.4, penumbra: 0.3, castShadow: true }, [4, 8, 4]),
      light('Rim', { type: 'point', intensity: 3, color: '#4499ff', distance: 15, decay: 2 }, [-5, 3, -3]),
      light('Fill', { type: 'point', intensity: 1.5, color: '#ffddaa', distance: 12, decay: 2 }, [2, 1, 5]),
    ],
  },
]

export const TEMPLATE_MAP = new Map(WORLD_TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(id: string): WorldTemplate | undefined {
  return TEMPLATE_MAP.get(id)
}
