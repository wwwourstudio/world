'use client'

import { Suspense, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  TransformControls,
  Grid,
  Environment,
  useGLTF,
  Html,
  Stars,
} from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Physics, RigidBody } from '@react-three/rapier'
import { useScene } from '@/lib/scene/SceneStore'
import type { SceneObject, GeometryConfig, MaterialConfig, LightConfig, AnimationConfig } from '@/lib/scene/SceneStore'

// ─── Geometry Helper ─────────────────────────────────────────────────────────

function SceneGeometry({ geo }: { geo: GeometryConfig }) {
  switch (geo.type) {
    case 'sphere': return <sphereGeometry args={[geo.radius ?? 0.5, geo.segments ?? 24, geo.segments ?? 24]} />
    case 'cylinder': return <cylinderGeometry args={[geo.radiusTop ?? 0.5, geo.radiusBottom ?? 0.5, geo.height ?? 1, geo.segments ?? 16]} />
    case 'cone': return <coneGeometry args={[geo.radius ?? 0.5, geo.height ?? 1, geo.segments ?? 12]} />
    case 'torus': return <torusGeometry args={[geo.radius ?? 0.5, geo.tube ?? 0.2, 16, geo.segments ?? 32]} />
    case 'plane': return <planeGeometry args={[geo.width ?? 1, geo.height ?? 1]} />
    case 'ring': return <ringGeometry args={[0.3, geo.radius ?? 0.5, 32]} />
    case 'capsule': return <capsuleGeometry args={[geo.radius ?? 0.3, geo.height ?? 1, 4, 16]} />
    case 'tetrahedron': return <tetrahedronGeometry args={[geo.radius ?? 0.5]} />
    default: return <boxGeometry args={[geo.width ?? 1, geo.height ?? 1, geo.depth ?? 1]} />
  }
}

// ─── Material Helper ─────────────────────────────────────────────────────────

function useSceneMaterial(cfg: MaterialConfig) {
  return useMemo(() => {
    const common = {
      color: new THREE.Color(cfg.color),
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      emissive: new THREE.Color(cfg.emissive),
      emissiveIntensity: cfg.emissiveIntensity,
      transparent: cfg.transparent || cfg.opacity < 1,
      opacity: cfg.opacity,
      wireframe: cfg.wireframe,
      flatShading: cfg.flatShading,
      side: cfg.side === 'double' ? THREE.DoubleSide : cfg.side === 'back' ? THREE.BackSide : THREE.FrontSide,
    }

    if (cfg.type === 'wireframe') {
      return new THREE.MeshBasicMaterial({ color: cfg.color, wireframe: true })
    }
    if (cfg.type === 'toon') {
      return new THREE.MeshToonMaterial({ color: cfg.color, emissive: new THREE.Color(cfg.emissive), emissiveIntensity: cfg.emissiveIntensity })
    }
    if (cfg.type === 'glass' || cfg.type === 'physical' || cfg.transmission > 0) {
      return new THREE.MeshPhysicalMaterial({
        ...common,
        transmission: cfg.transmission,
        ior: cfg.ior,
        thickness: cfg.thickness,
        reflectivity: 0.5,
      })
    }
    if (cfg.type === 'hologram') {
      return new THREE.MeshStandardMaterial({
        ...common,
        transparent: true,
        opacity: cfg.opacity * 0.7,
        side: THREE.DoubleSide,
      })
    }
    return new THREE.MeshStandardMaterial(common)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cfg)])
}

// ─── Animation Hook ──────────────────────────────────────────────────────────

function useAnimation(ref: React.RefObject<THREE.Object3D | null>, anim: AnimationConfig | null, objectId: string) {
  const offsetRef = useRef(anim?.offset ?? Math.random() * Math.PI * 2)
  const originRef = useRef<THREE.Vector3 | null>(null)

  useFrame(({ clock }) => {
    if (!ref.current || !anim || anim.preset === 'none') return
    if (!originRef.current) {
      originRef.current = ref.current.position.clone()
    }
    const t = clock.getElapsedTime() * anim.speed + offsetRef.current
    const amp = anim.amplitude

    switch (anim.preset) {
      case 'float':
        ref.current.position.y = originRef.current.y + Math.sin(t) * amp
        break
      case 'spin':
        ref.current.rotation[anim.axis] += 0.01 * anim.speed
        break
      case 'pulse': {
        const s = 1 + Math.sin(t) * amp * 0.3
        ref.current.scale.setScalar(s)
        break
      }
      case 'orbit':
        ref.current.position.x = originRef.current.x + Math.sin(t) * amp * 2
        ref.current.position.z = originRef.current.z + Math.cos(t) * amp * 2
        break
      case 'shake':
        ref.current.position.x = originRef.current.x + (Math.random() - 0.5) * amp * 0.05
        ref.current.position.z = originRef.current.z + (Math.random() - 0.5) * amp * 0.05
        break
      case 'bounce':
        ref.current.position.y = originRef.current.y + Math.abs(Math.sin(t * 1.5)) * amp
        break
      case 'wave':
        ref.current.position.y = originRef.current.y + Math.sin(t + parseFloat(objectId.slice(0, 4) || '0')) * amp
        ref.current.position.x = originRef.current.x + Math.cos(t * 0.5) * amp * 0.5
        break
    }
  })
}

// ─── Mesh Object ─────────────────────────────────────────────────────────────

function MeshObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Mesh>(null)
  const material = useSceneMaterial(obj.material)
  const { selectObject, activeTool } = useScene()
  useAnimation(ref as React.RefObject<THREE.Object3D | null>, obj.animation, obj.id)

  // Load PBR texture maps imperatively when maps change
  const mapsKey = JSON.stringify(obj.material.maps)
  useEffect(() => {
    const maps = obj.material.maps
    if (!maps) return
    const mat = material as THREE.MeshStandardMaterial
    const loader = new THREE.TextureLoader()
    let disposed = false
    const loaded: THREE.Texture[] = []

    function loadMap(url: string, apply: (t: THREE.Texture) => void) {
      loader.load(url, (tex) => {
        if (disposed) { tex.dispose(); return }
        loaded.push(tex)
        apply(tex)
        mat.needsUpdate = true
      })
    }

    if (maps.map) loadMap(maps.map, (t) => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t })
    if (maps.roughnessMap) loadMap(maps.roughnessMap, (t) => { mat.roughnessMap = t })
    if (maps.metalnessMap) loadMap(maps.metalnessMap, (t) => { mat.metalnessMap = t })
    if (maps.normalMap) loadMap(maps.normalMap, (t) => { mat.normalMap = t })

    return () => {
      disposed = true
      loaded.forEach((t) => t.dispose())
      mat.map = null; mat.roughnessMap = null
      mat.metalnessMap = null; mat.normalMap = null
      mat.needsUpdate = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, material])

  const hasPhysics = obj.physics?.enabled && useScene.getState().physicsEnabled
  const bodyType = obj.physics?.type ?? 'dynamic'

  const meshContent = (
    <mesh
      ref={ref}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      castShadow={obj.castShadow}
      receiveShadow={obj.receiveShadow}
      onClick={(e) => {
        e.stopPropagation()
        if (activeTool === 'select' || activeTool === 'translate' || activeTool === 'rotate' || activeTool === 'scale') {
          selectObject(obj.id, e.shiftKey)
        }
      }}
      visible={obj.visible}
    >
      <SceneGeometry geo={obj.geometry} />
      <primitive object={material} attach="material" />
    </mesh>
  )

  if (hasPhysics) {
    return (
      <RigidBody
        type={bodyType === 'dynamic' ? 'dynamic' : bodyType === 'kinematic' ? 'kinematicPosition' : 'fixed'}
        mass={obj.physics?.mass ?? 1}
        restitution={obj.physics?.restitution ?? 0.3}
        friction={obj.physics?.friction ?? 0.5}
        linearDamping={obj.physics?.linearDamping ?? 0.1}
        gravityScale={obj.physics?.gravityScale ?? 1}
      >
        {meshContent}
      </RigidBody>
    )
  }

  return meshContent
}

// ─── GLTF Object ─────────────────────────────────────────────────────────────

function GLTFObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Group>(null)
  const url = obj.geometry.url ?? ''
  useAnimation(ref as React.RefObject<THREE.Object3D | null>, obj.animation, obj.id)
  const { selectObject } = useScene()
  const { scene: gltfScene } = useGLTF(url)
  const cloned = useMemo(() => gltfScene.clone(true), [gltfScene])

  return (
    <group
      ref={ref}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      visible={obj.visible}
      onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey) }}
    >
      <primitive object={cloned} />
    </group>
  )
}

// ─── Light Object ─────────────────────────────────────────────────────────────

function LightObject({ obj }: { obj: SceneObject }) {
  const cfg = obj.light!
  const pos = obj.transform.position

  switch (cfg.type) {
    case 'ambient':
      return <ambientLight color={cfg.color} intensity={cfg.intensity} />
    case 'hemisphere':
      return <hemisphereLight args={[cfg.skyColor ?? cfg.color, cfg.groundColor ?? '#444444', cfg.intensity]} />
    case 'directional':
      return (
        <directionalLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          castShadow={cfg.castShadow}
          shadow-mapSize={[2048, 2048]}
        />
      )
    case 'point':
      return (
        <pointLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          distance={cfg.distance}
          decay={cfg.decay}
          castShadow={cfg.castShadow}
        />
      )
    case 'spot':
      return (
        <spotLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          distance={cfg.distance}
          angle={cfg.angle}
          penumbra={cfg.penumbra}
          castShadow={cfg.castShadow}
        />
      )
    default:
      return null
  }
}

// ─── Scene Object Router ──────────────────────────────────────────────────────

function SceneObjectNode({ id }: { id: string }) {
  const obj = useScene((s) => s.objects[id])
  if (!obj || !obj.visible) return null

  if (obj.type === 'light' && obj.light) return <LightObject obj={obj} />
  if (obj.type === 'group') {
    return (
      <group
        position={obj.transform.position}
        rotation={obj.transform.rotation}
        scale={obj.transform.scale}
        visible={obj.visible}
      >
        {(obj.children ?? []).map((cid) => <SceneObjectNode key={cid} id={cid} />)}
      </group>
    )
  }
  if (obj.geometry.type === 'gltf' && obj.geometry.url) {
    return (
      <Suspense fallback={null}>
        <GLTFObject obj={obj} />
      </Suspense>
    )
  }
  return <MeshObject obj={obj} />
}

// ─── Transform Gizmo ─────────────────────────────────────────────────────────

function GizmoControl() {
  const selectedIds = useScene((s) => s.selectedIds)
  const activeTool = useScene((s) => s.activeTool)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)
  const isPlaying = useScene((s) => s.isPlaying)
  const ref = useRef<THREE.Object3D>(null)

  const selectedId = selectedIds[0]
  const obj = selectedId ? objects[selectedId] : null

  useEffect(() => {
    if (ref.current && obj) {
      ref.current.position.set(...obj.transform.position)
      ref.current.rotation.set(...obj.transform.rotation)
      ref.current.scale.set(...obj.transform.scale)
    }
  }, [obj, selectedId])

  if (!obj || isPlaying || activeTool === 'select') return null

  const mode = activeTool === 'rotate' ? 'rotate' : activeTool === 'scale' ? 'scale' : 'translate'

  return (
    <>
      <object3D ref={ref} />
      <TransformControls
        object={ref.current ?? undefined}
        mode={mode}
        onObjectChange={() => {
          if (!ref.current || !selectedId) return
          const p = ref.current.position
          const r = ref.current.rotation
          const sc = ref.current.scale
          updateObject(selectedId, {
            transform: {
              position: [p.x, p.y, p.z],
              rotation: [r.x, r.y, r.z],
              scale: [sc.x, sc.y, sc.z],
            },
          })
        }}
      />
    </>
  )
}

// ─── FPS Counter ─────────────────────────────────────────────────────────────

function FPSCounter() {
  const setFPS = useScene((s) => s.setFPS)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    if (now - lastTime.current >= 1000) {
      setFPS(frameCount.current)
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

// ─── Fog Controller ──────────────────────────────────────────────────────────

function FogController() {
  const { scene } = useThree()
  const environment = useScene((s) => s.environment)

  useEffect(() => {
    if (environment.fogType === 'none') {
      scene.fog = null
    } else if (environment.fogType === 'linear') {
      scene.fog = new THREE.Fog(environment.fogColor, environment.fogNear, environment.fogFar)
    } else {
      scene.fog = new THREE.FogExp2(environment.fogColor, environment.fogDensity)
    }
    scene.background = new THREE.Color(environment.backgroundColor)
  }, [scene, environment])

  return null
}

// ─── HDRI Environment ────────────────────────────────────────────────────────

function HDRIEnvironment() {
  const env = useScene((s) => s.environment)
  if (!env.hdriUrl) return null

  return (
    <Environment
      files={env.hdriUrl.startsWith('http') ? `/api/hdri/${env.hdriUrl.split('/').pop()?.replace('_1k', '') ?? 'scene.hdr'}` : env.hdriUrl}
      background={env.showBackground}
      backgroundIntensity={env.hdriIntensity}
      environmentIntensity={env.hdriIntensity}
      environmentRotation={[0, env.hdriRotation, 0]}
    />
  )
}

// ─── Post Processing ─────────────────────────────────────────────────────────

function PostProcessing() {
  const fx = useScene((s) => s.postFX)
  if (!fx.bloom && !fx.vignette && !fx.noise && !fx.chromaticAberration) return null

  return (
    <EffectComposer>
      <Bloom
        intensity={fx.bloom ? fx.bloomIntensity : 0}
        luminanceThreshold={fx.bloomThreshold}
        luminanceSmoothing={fx.bloomSmoothing}
      />
      <Vignette
        offset={fx.vignette ? fx.vignetteOffset : 0}
        darkness={fx.vignette ? fx.vignetteDarkness : 0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        opacity={fx.noise ? fx.noiseOpacity : 0}
        blendFunction={BlendFunction.ADD}
      />
    </EffectComposer>
  )
}

// ─── Inner Canvas Scene ───────────────────────────────────────────────────────

function InnerScene() {
  const rootIds = useScene((s) => s.rootIds)
  const environment = useScene((s) => s.environment)
  const physicsEnabled = useScene((s) => s.physicsEnabled)
  const isPlaying = useScene((s) => s.isPlaying)
  const activeTool = useScene((s) => s.activeTool)
  const deselectAll = useScene((s) => s.deselectAll)
  const transformSpace = useScene((s) => s.transformSpace)

  const sceneObjects = (
    <>
      {/* Default environment lights (when no HDRI light objects) */}
      <ambientLight color={environment.ambientColor} intensity={environment.ambientIntensity} />
      <directionalLight
        color={environment.directionalColor}
        intensity={environment.directionalIntensity}
        position={environment.directionalPosition}
        castShadow={environment.shadowsEnabled}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {rootIds.map((id) => <SceneObjectNode key={id} id={id} />)}

      <GizmoControl />
      <FPSCounter />
      <FogController />
      <HDRIEnvironment />
      <PostProcessing />

      {/* Grid */}
      <Grid
        infiniteGrid
        fadeDistance={50}
        fadeStrength={2}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2a4e"
      />

      {/* Stars when no HDRI */}
      {!environment.hdriUrl && <Stars radius={100} depth={50} count={3000} factor={4} fade />}
    </>
  )

  if (physicsEnabled || isPlaying) {
    return (
      <Physics gravity={[0, -9.81, 0]} paused={!isPlaying}>
        {sceneObjects}
      </Physics>
    )
  }

  return <>{sceneObjects}</>
}

// ─── Canvas Wrapper ───────────────────────────────────────────────────────────

export function ViewportCanvas() {
  const cameraMode = useScene((s) => s.cameraMode)
  const deselectAll = useScene((s) => s.deselectAll)
  const toneMappingExposure = useScene((s) => s.postFX.toneMappingExposure)

  return (
    <div className="w-full h-full" style={{ background: '#0B0C0F' }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [10, 8, 10], fov: 60, near: 0.1, far: 1000 }}
        onPointerMissed={() => deselectAll()}
      >
        <Suspense fallback={null}>
          <InnerScene />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            enabled={cameraMode === 'orbit'}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
