'use client'

import { Suspense, useRef, useEffect, useMemo, Component, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  TransformControls,
  Grid,
  Environment,
  useGLTF,
  Html,
  Stars,
  Text3D,
  Outlines,
  Sky,
  Line,
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
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { Physics, RigidBody } from '@react-three/rapier'
import { useScene } from '@/lib/scene/SceneStore'
import type { SceneObject, GeometryConfig, MaterialConfig, LightConfig, AnimationConfig, ParticleConfig, Keyframe, BehaviorConfig } from '@/lib/scene/SceneStore'
import { captureCanvas } from '@/lib/canvasCapture'
import { captureCamera } from '@/lib/captureCamera'
import { cameraFrameFn } from '@/lib/cameraFrame'
import { fbmNoise } from '@/lib/noise'
import { interpolateCameraPath } from '@/lib/cameraPath'

// ─── GLTF Error Boundary ─────────────────────────────────────────────────────

class GLTFErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

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
    case 'octahedron': return <octahedronGeometry args={[geo.radius ?? 0.5]} />
    case 'icosahedron': return <icosahedronGeometry args={[geo.radius ?? 0.5, geo.segments ?? 0]} />
    case 'torusknot': return <torusKnotGeometry args={[geo.radius ?? 0.4, geo.tube ?? 0.15, 100, 16]} />
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

// ─── Keyframe Interpolation ───────────────────────────────────────────────────

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

function interpolateKeyframes(kfs: Keyframe[], playhead: number): THREE.Object3D | null {
  if (kfs.length === 0) return null
  if (kfs.length === 1) {
    const dummy = new THREE.Object3D()
    dummy.position.set(...kfs[0].transform.position)
    dummy.rotation.set(...kfs[0].transform.rotation)
    dummy.scale.set(...kfs[0].transform.scale)
    return dummy
  }
  const first = kfs[0], last = kfs[kfs.length - 1]
  const t = playhead
  if (t <= first.time) {
    const dummy = new THREE.Object3D()
    dummy.position.set(...first.transform.position)
    dummy.rotation.set(...first.transform.rotation)
    dummy.scale.set(...first.transform.scale)
    return dummy
  }
  if (t >= last.time) {
    const dummy = new THREE.Object3D()
    dummy.position.set(...last.transform.position)
    dummy.rotation.set(...last.transform.rotation)
    dummy.scale.set(...last.transform.scale)
    return dummy
  }
  let i = 0
  while (i < kfs.length - 1 && kfs[i + 1].time <= t) i++
  const k0 = kfs[i], k1 = kfs[i + 1]
  const alpha = (t - k0.time) / (k1.time - k0.time)
  const dummy = new THREE.Object3D()
  dummy.position.set(
    k0.transform.position[0] + (k1.transform.position[0] - k0.transform.position[0]) * alpha,
    k0.transform.position[1] + (k1.transform.position[1] - k0.transform.position[1]) * alpha,
    k0.transform.position[2] + (k1.transform.position[2] - k0.transform.position[2]) * alpha,
  )
  dummy.rotation.set(
    lerpAngle(k0.transform.rotation[0], k1.transform.rotation[0], alpha),
    lerpAngle(k0.transform.rotation[1], k1.transform.rotation[1], alpha),
    lerpAngle(k0.transform.rotation[2], k1.transform.rotation[2], alpha),
  )
  dummy.scale.set(
    k0.transform.scale[0] + (k1.transform.scale[0] - k0.transform.scale[0]) * alpha,
    k0.transform.scale[1] + (k1.transform.scale[1] - k0.transform.scale[1]) * alpha,
    k0.transform.scale[2] + (k1.transform.scale[2] - k0.transform.scale[2]) * alpha,
  )
  return dummy
}

// ─── Animation Hook ──────────────────────────────────────────────────────────

function useAnimation(ref: React.RefObject<THREE.Object3D | null>, anim: AnimationConfig | null, objectId: string) {
  const offsetRef = useRef(anim?.offset ?? Math.random() * Math.PI * 2)
  const originRef = useRef<THREE.Vector3 | null>(null)
  const playhead = useScene((s) => s.playhead)
  const isAnimating = useScene((s) => s.isAnimating)

  useFrame(({ clock }) => {
    if (!ref.current || !anim) return

    // Keyframe mode takes priority over preset
    const kfs = anim.keyframes
    if (kfs && kfs.length >= 2 && (isAnimating || playhead > 0)) {
      const interp = interpolateKeyframes(kfs, playhead)
      if (interp) {
        ref.current.position.copy(interp.position)
        ref.current.rotation.copy(interp.rotation)
        ref.current.scale.copy(interp.scale)
      }
      return
    }

    if (anim.preset === 'none') return
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

// ─── Behavior Hook ───────────────────────────────────────────────────────────

function useBehaviors(
  ref: React.RefObject<THREE.Object3D | null>,
  behaviors: BehaviorConfig[] | undefined,
  objectId: string,
) {
  const wanderTarget = useRef(new THREE.Vector3())
  const wanderTimer = useRef(0)
  const patrolIdx = useRef(0)

  useFrame(({ clock, camera }, delta) => {
    if (!ref.current || !behaviors?.length) return
    const obj = ref.current
    const t = clock.getElapsedTime()

    for (const b of behaviors) {
      if (!b.enabled) continue
      const speed = b.speed ?? 1
      const amp = b.amplitude ?? 0.5
      const freq = b.frequency ?? 1
      const off = b.offset ?? 0

      switch (b.type) {
        case 'rotate': {
          const ax = b.axis ?? 'y'
          obj.rotation[ax] += delta * speed
          break
        }
        case 'sway': {
          const ax = b.axis ?? 'z'
          obj.rotation[ax] = Math.sin(t * freq * 2 + off) * amp
          break
        }
        case 'oscillate': {
          const ax = b.axis ?? 'y'
          const axIdx = ax === 'x' ? 0 : ax === 'y' ? 1 : 2
          const sceneObj = useScene.getState().objects[objectId]
          if (sceneObj) {
            obj.position[ax] = sceneObj.transform.position[axIdx] + Math.sin(t * freq * 2 + off) * amp
          }
          break
        }
        case 'scalePulse': {
          const min = b.minValue ?? 0.8
          const max = b.maxValue ?? 1.2
          const s = min + (Math.sin(t * freq * 2 + off) * 0.5 + 0.5) * (max - min)
          obj.scale.setScalar(s)
          break
        }
        case 'emissivePulse': {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial
            if ('emissiveIntensity' in mat) {
              const min = b.minValue ?? 0
              const max = b.maxValue ?? 2
              mat.emissiveIntensity = min + (Math.sin(t * freq * 2 + off) * 0.5 + 0.5) * (max - min)
            }
          }
          break
        }
        case 'lookAtCamera': {
          obj.lookAt(camera.position)
          break
        }
        case 'lookAt': {
          if (b.targetId) {
            const target = useScene.getState().objects[b.targetId]
            if (target) obj.lookAt(...target.transform.position)
          }
          break
        }
        case 'follow': {
          if (b.targetId) {
            const target = useScene.getState().objects[b.targetId]
            if (target) {
              const [tx, , tz] = target.transform.position
              const minDist = b.minDistance ?? 2
              const dx = tx - obj.position.x
              const dz = tz - obj.position.z
              const dist = Math.sqrt(dx * dx + dz * dz)
              if (dist > minDist) {
                obj.position.x += (dx / dist) * speed * delta
                obj.position.z += (dz / dist) * speed * delta
              }
            }
          }
          break
        }
        case 'randomWander': {
          const range = b.range ?? 5
          const interval = b.interval ?? 2
          wanderTimer.current += delta
          if (wanderTimer.current >= interval) {
            wanderTimer.current = 0
            wanderTarget.current.set(
              obj.position.x + (Math.random() - 0.5) * range * 2,
              obj.position.y,
              obj.position.z + (Math.random() - 0.5) * range * 2,
            )
          }
          const dx = wanderTarget.current.x - obj.position.x
          const dz = wanderTarget.current.z - obj.position.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist > 0.1) {
            obj.position.x += (dx / dist) * speed * delta
            obj.position.z += (dz / dist) * speed * delta
          }
          break
        }
        case 'patrol': {
          const wps = b.waypoints
          if (!wps || wps.length < 2) break
          const wp = wps[patrolIdx.current % wps.length]
          const [tx, , tz] = wp
          const dx = tx - obj.position.x
          const dz = tz - obj.position.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < 0.2) {
            patrolIdx.current = (patrolIdx.current + 1) % wps.length
          } else {
            obj.position.x += (dx / dist) * speed * delta
            obj.position.z += (dz / dist) * speed * delta
          }
          break
        }
      }
    }
  })
}

// ─── Mesh Object ─────────────────────────────────────────────────────────────

function MeshObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Mesh>(null)
  const material = useSceneMaterial(obj.material)
  const { selectObject, activeTool, updateObject } = useScene()
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const isPlaying = useScene((s) => s.isPlaying)
  const hovered = useRef(false)
  useAnimation(ref as React.RefObject<THREE.Object3D | null>, obj.animation, obj.id)
  useBehaviors(ref as React.RefObject<THREE.Object3D | null>, obj.behaviors, obj.id)

  // Load PBR texture maps imperatively when maps or repeat change
  const mapsKey = JSON.stringify(obj.material.maps)
  const repeatKey = JSON.stringify(obj.material.textureRepeat)
  useEffect(() => {
    const maps = obj.material.maps
    if (!maps) return
    const mat = material as THREE.MeshStandardMaterial
    const loader = new THREE.TextureLoader()
    const repeat = obj.material.textureRepeat ?? [1, 1]
    let disposed = false
    const loaded: THREE.Texture[] = []

    function loadMap(url: string, srgb: boolean, apply: (t: THREE.Texture) => void) {
      loader.load(url, (tex) => {
        if (disposed) { tex.dispose(); return }
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace
        if (repeat[0] !== 1 || repeat[1] !== 1) {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping
          tex.repeat.set(repeat[0], repeat[1])
        }
        loaded.push(tex)
        apply(tex)
        mat.needsUpdate = true
      })
    }

    if (maps.map) loadMap(maps.map, true, (t) => { mat.map = t })
    if (maps.roughnessMap) loadMap(maps.roughnessMap, false, (t) => { mat.roughnessMap = t })
    if (maps.metalnessMap) loadMap(maps.metalnessMap, false, (t) => { mat.metalnessMap = t })
    if (maps.normalMap) loadMap(maps.normalMap, false, (t) => { mat.normalMap = t })

    return () => {
      disposed = true
      loaded.forEach((t) => t.dispose())
      mat.map = null; mat.roughnessMap = null
      mat.metalnessMap = null; mat.normalMap = null
      mat.needsUpdate = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, repeatKey, material])

  const hasPhysics = obj.physics?.enabled && useScene.getState().physicsEnabled
  const bodyType = obj.physics?.type ?? 'dynamic'

  const ix = obj.interaction
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
        if (ix?.clickAction === 'link' && ix.linkUrl) window.open(ix.linkUrl, '_blank')
        if (ix?.clickAction === 'toggle-visible') updateObject(obj.id, { visible: !obj.visible })
        if (ix?.clickAction === 'toggle-anim') {
          const playing = useScene.getState().isPlaying
          useScene.getState().setPlaying(!playing)
        }
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        selectObject(obj.id, false)
        useScene.getState().setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: obj.id })
      }}
      onPointerEnter={(e) => {
        e.stopPropagation()
        if (!ix || ix.hoverEffect === 'none') return
        hovered.current = true
        if (ref.current) {
          if (ix.hoverEffect === 'scale') ref.current.scale.multiplyScalar(1.08)
          if (ix.hoverEffect === 'highlight') {
            const mat = ref.current.material as THREE.MeshStandardMaterial
            if (mat?.emissiveIntensity !== undefined) mat.emissiveIntensity = (obj.material.emissiveIntensity ?? 0) + 0.4
          }
        }
        document.body.style.cursor = 'pointer'
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        if (!ix || ix.hoverEffect === 'none') return
        hovered.current = false
        if (ref.current) {
          if (ix.hoverEffect === 'scale') ref.current.scale.set(...obj.transform.scale)
          if (ix.hoverEffect === 'highlight') {
            const mat = ref.current.material as THREE.MeshStandardMaterial
            if (mat?.emissiveIntensity !== undefined) mat.emissiveIntensity = obj.material.emissiveIntensity ?? 0
          }
        }
        document.body.style.cursor = ''
      }}
      visible={obj.visible}
    >
      <SceneGeometry geo={obj.geometry} />
      <primitive object={material} attach="material" />
      {isSelected && !isPlaying && (
        <Outlines thickness={1.5} color="#5B6CFF" screenspace transparent opacity={0.85} />
      )}
      {ix?.tooltipText && hovered.current && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,11,15,0.9)', color: '#E8E9F0', padding: '4px 8px',
            borderRadius: '6px', fontSize: '11px', whiteSpace: 'nowrap',
            border: '1px solid #1E2028', backdropFilter: 'blur(4px)',
          }}>
            {ix.tooltipText}
          </div>
        </Html>
      )}
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
  useBehaviors(ref as React.RefObject<THREE.Object3D | null>, obj.behaviors, obj.id)
  const { selectObject } = useScene()
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const isPlaying = useScene((s) => s.isPlaying)
  const { scene: gltfScene } = useGLTF(url)

  const { cloned, bbSize, bbCenter } = useMemo(() => {
    const c = gltfScene.clone(true)
    // Auto-normalize: scale imported models to fit ~2m bounding box
    const box = new THREE.Box3().setFromObject(c)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0.001 && (maxDim > 5 || maxDim < 0.1)) {
      const factor = 2 / maxDim
      c.scale.setScalar(factor)
      const center = box.getCenter(new THREE.Vector3())
      c.position.sub(center.multiplyScalar(factor))
    }
    const finalBox = new THREE.Box3().setFromObject(c)
    return {
      cloned: c,
      bbSize: finalBox.getSize(new THREE.Vector3()),
      bbCenter: finalBox.getCenter(new THREE.Vector3()),
    }
  }, [gltfScene])

  return (
    <group
      ref={ref}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      visible={obj.visible}
      onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey) }}
      onContextMenu={(e) => {
        e.stopPropagation()
        selectObject(obj.id, false)
        useScene.getState().setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: obj.id })
      }}
    >
      <primitive object={cloned} />
      {isSelected && !isPlaying && (
        <mesh position={bbCenter.toArray() as [number, number, number]}>
          <boxGeometry args={[bbSize.x * 1.02, bbSize.y * 1.02, bbSize.z * 1.02]} />
          <meshBasicMaterial color="#5B6CFF" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

// ─── Text Object ─────────────────────────────────────────────────────────────

const FONTS: Record<string, string> = {
  helvetiker: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_regular.typeface.json',
  optimer: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/optimer_bold.typeface.json',
  gentilis: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/gentilis_bold.typeface.json',
}

function TextObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Mesh>(null)
  const { selectObject } = useScene()
  const mat = obj.material
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const isPlaying = useScene((s) => s.isPlaying)
  useAnimation(ref as React.RefObject<THREE.Object3D | null>, obj.animation, obj.id)
  useBehaviors(ref as React.RefObject<THREE.Object3D | null>, obj.behaviors, obj.id)

  const fontUrl = FONTS[obj.geometry.font ?? 'helvetiker'] ?? FONTS.helvetiker
  const fontSize = obj.geometry.fontSize ?? 0.5
  const textDepth = obj.geometry.textDepth ?? fontSize * 0.25
  const bevelEnabled = obj.geometry.bevelEnabled !== false
  const letterSpacing = obj.geometry.letterSpacing ?? 0
  const lineHeight = obj.geometry.lineHeight ?? 1
  const bevelThickness = obj.geometry.bevelThickness ?? 0.015
  const bevelSize = obj.geometry.bevelSize ?? 0.008

  return (
    <Suspense fallback={null}>
      <Text3D
        ref={ref}
        font={fontUrl}
        position={obj.transform.position}
        rotation={obj.transform.rotation}
        scale={obj.transform.scale}
        size={fontSize}
        height={textDepth}
        curveSegments={6}
        letterSpacing={letterSpacing}
        lineHeight={lineHeight}
        bevelEnabled={bevelEnabled}
        bevelThickness={bevelThickness}
        bevelSize={bevelSize}
        bevelSegments={3}
        castShadow={obj.castShadow}
        visible={obj.visible}
        onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey) }}
        onContextMenu={(e) => {
          e.stopPropagation()
          selectObject(obj.id, false)
          useScene.getState().setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: obj.id })
        }}
      >
        {obj.geometry.text ?? 'Text'}
        <meshStandardMaterial
          color={isSelected && !isPlaying ? '#7B8CFF' : mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          emissive={isSelected && !isPlaying ? new THREE.Color('#5B6CFF') : new THREE.Color(mat.emissive)}
          emissiveIntensity={isSelected && !isPlaying ? 0.3 : mat.emissiveIntensity}
        />
      </Text3D>
    </Suspense>
  )
}

// ─── Particle Object ──────────────────────────────────────────────────────────

const DEFAULT_PARTICLE: ParticleConfig = {
  count: 200,
  spread: [6, 6, 6],
  instanceGeometry: 'sphere',
  instanceScale: 0.08,
  randomScale: 0.5,
  preset: 'scatter',
}

function ParticleObject({ obj }: { obj: SceneObject }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const material = useSceneMaterial(obj.material)
  const { selectObject } = useScene()
  const cfg = obj.particle ?? DEFAULT_PARTICLE
  const cfgKey = JSON.stringify(cfg)

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const result: THREE.Matrix4[] = []
    const [sx, sy, sz] = cfg.spread
    for (let i = 0; i < cfg.count; i++) {
      let x = (Math.random() - 0.5) * sx
      let y = cfg.preset === 'rain' || cfg.preset === 'snow' || cfg.preset === 'sparks'
        ? Math.random() * sy
        : cfg.preset === 'leaves' ? Math.random() * sy * 0.6
        : (Math.random() - 0.5) * sy
      let z = (Math.random() - 0.5) * sz
      dummy.position.set(x, y, z)
      dummy.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
      const sc = cfg.instanceScale * (1 - cfg.randomScale * 0.5 + Math.random() * cfg.randomScale)
      dummy.scale.setScalar(Math.max(0.001, sc))
      dummy.updateMatrix()
      result.push(dummy.matrix.clone())
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey])

  useEffect(() => {
    if (!meshRef.current) return
    matrices.forEach((m, i) => meshRef.current!.setMatrixAt(i, m))
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [matrices])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const preset = cfg.preset
    const animated = ['rain', 'snow', 'sparks', 'fire', 'smoke', 'magic']
    if (!animated.includes(preset)) return
    const dummy = new THREE.Object3D()
    const [sx, sy, sz] = cfg.spread
    const t = state.clock.elapsedTime

    if (preset === 'magic') {
      for (let i = 0; i < cfg.count; i++) {
        const phase = (i / cfg.count) * Math.PI * 2
        const layer = i % 3
        const speed = 0.3 + ((i * 37) % 7) * 0.07
        const angle = phase + t * speed
        const radius = sx * 0.35 * (0.4 + 0.6 * ((i * 173) % 100) / 100)
        const hy = Math.sin(phase * 2 + t * 0.5) * sy * 0.4 + (layer - 1) * sy * 0.15
        dummy.position.set(Math.cos(angle) * radius, hy, Math.sin(angle) * radius)
        const sc = cfg.instanceScale * (0.5 + 0.5 * Math.abs(Math.sin(t * 3 + phase)))
        dummy.scale.setScalar(Math.max(0.001, sc))
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }
      meshRef.current.instanceMatrix.needsUpdate = true
      return
    }

    const isRising = preset === 'fire' || preset === 'smoke'
    const speed = preset === 'rain' ? 4 : preset === 'sparks' ? 2.5 : preset === 'snow' ? 0.5 : preset === 'fire' ? 1.8 : 0.7
    for (let i = 0; i < cfg.count; i++) {
      meshRef.current.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      if (isRising) {
        const speedMult = 0.5 + ((i * 1619) % 100) / 100
        dummy.position.y += speed * delta * speedMult
        if (preset === 'smoke') {
          dummy.position.x += Math.sin(t + i) * delta * 0.08
          dummy.position.z += Math.cos(t * 0.7 + i) * delta * 0.08
        }
        if (dummy.position.y > sy * 0.5) {
          const r = (preset === 'fire' ? 0.3 : 0.5) * (((i * 997) % 100) / 100)
          const a = ((i * 127) % 100) / 100 * Math.PI * 2
          dummy.position.set(Math.cos(a) * r * sx, -sy * 0.5 + ((i * 43) % 30) / 100, Math.sin(a) * r * sz)
          dummy.scale.setScalar(cfg.instanceScale * (0.3 + ((i * 317) % 100) / 100 * 0.7))
        }
      } else {
        dummy.position.y -= speed * delta
        if (dummy.position.y < -sy * 0.5) {
          dummy.position.y = sy * 0.5
          dummy.position.x = (Math.random() - 0.5) * sx
          dummy.position.z = (Math.random() - 0.5) * sz
        }
      }
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, cfg.count]}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      visible={obj.visible}
      castShadow={obj.castShadow}
      onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey) }}
    >
      {cfg.instanceGeometry === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {cfg.instanceGeometry === 'cone' && <coneGeometry args={[0.5, 1, 4]} />}
      {cfg.instanceGeometry === 'tetrahedron' && <tetrahedronGeometry args={[0.5, 0]} />}
      {(cfg.instanceGeometry === 'sphere' || !cfg.instanceGeometry) && <sphereGeometry args={[0.5, 6, 6]} />}
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}

// ─── Terrain Object ──────────────────────────────────────────────────────────

function TerrainObject({ obj }: { obj: SceneObject }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const { selectObject, sculptTerrain, updateTerrain } = useScene()
  const activeTool = useScene((s) => s.activeTool)
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const sculpting = useRef(false)
  const cfg = obj.terrain!

  const geometry = useMemo(() => {
    const res = cfg.resolution
    const size = cfg.size
    const half = size / 2
    const step = size / (res - 1)
    const count = res * res

    const positions = new Float32Array(count * 3)
    const uvs = new Float32Array(count * 2)

    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        const i = iy * res + ix
        const x = -half + ix * step
        const z = -half + iy * step
        const h = fbmNoise(x, z, cfg.seed, cfg.layers, cfg.noiseScale) * cfg.heightScale
        positions[i * 3] = x
        positions[i * 3 + 1] = h
        positions[i * 3 + 2] = z
        uvs[i * 2] = ix / (res - 1)
        uvs[i * 2 + 1] = iy / (res - 1)
      }
    }

    const indices: number[] = []
    for (let iy = 0; iy < res - 1; iy++) {
      for (let ix = 0; ix < res - 1; ix++) {
        const a = iy * res + ix
        const b = iy * res + ix + 1
        const c = (iy + 1) * res + ix
        const d = (iy + 1) * res + ix + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    geoRef.current = geo
    return geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.resolution, cfg.size, cfg.seed, cfg.layers, cfg.noiseScale, cfg.heightScale])

  // Apply sculpted heights imperatively
  useEffect(() => {
    const geo = geoRef.current
    if (!geo || !cfg.vertexHeights || cfg.vertexHeights.length !== cfg.resolution * cfg.resolution) return
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    cfg.vertexHeights.forEach((h, i) => pos.setY(i, h))
    pos.needsUpdate = true
    geo.computeVertexNormals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.vertexHeights, cfg.resolution])

  const terrainMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      lowColor: { value: new THREE.Color(cfg.lowColor) },
      midColor: { value: new THREE.Color(cfg.midColor) },
      highColor: { value: new THREE.Color(cfg.highColor) },
      maxH: { value: Math.max(cfg.heightScale, 0.001) },
    },
    vertexShader: `varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 lowColor; uniform vec3 midColor; uniform vec3 highColor; uniform float maxH;
      varying float vY;
      void main() {
        float t = clamp(vY/maxH,0.0,1.0);
        vec3 col = t<0.5 ? mix(lowColor,midColor,t*2.0) : mix(midColor,highColor,(t-0.5)*2.0);
        gl_FragColor = vec4(col,1.0);
      }`,
  }), [cfg.lowColor, cfg.midColor, cfg.highColor, cfg.heightScale])

  function handleSculptAt(point: THREE.Vector3) {
    const lx = point.x - obj.transform.position[0]
    const lz = point.z - obj.transform.position[2]
    if (!cfg.vertexHeights || cfg.vertexHeights.length !== cfg.resolution * cfg.resolution) {
      const geo = geoRef.current
      if (!geo) return
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      const heights = Array.from({ length: pos.count }, (_, i) => pos.getY(i))
      updateTerrain(obj.id, { vertexHeights: heights })
    }
    sculptTerrain(obj.id, lx, lz)
  }

  return (
    <mesh
      ref={meshRef}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      visible={obj.visible}
      castShadow={obj.castShadow}
      receiveShadow={obj.receiveShadow}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation()
        if (activeTool === 'sculpt') handleSculptAt(e.point)
        else selectObject(obj.id, e.shiftKey)
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        if (useScene.getState().activeTool !== 'sculpt') {
          selectObject(obj.id, false)
          useScene.getState().setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: obj.id })
        }
      }}
      onPointerDown={(e) => {
        if (activeTool === 'sculpt') { e.stopPropagation(); sculpting.current = true; handleSculptAt(e.point) }
      }}
      onPointerUp={() => { sculpting.current = false }}
      onPointerLeave={() => { sculpting.current = false }}
      onPointerMove={(e) => {
        if (activeTool === 'sculpt' && sculpting.current) { e.stopPropagation(); handleSculptAt(e.point) }
      }}
    >
      <primitive object={terrainMat} attach="material" />
      {isSelected && (
        <mesh>
          <boxGeometry args={[cfg.size * 1.01, 0.05, cfg.size * 1.01]} />
          <meshBasicMaterial color="#5B6CFF" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </mesh>
  )
}

// ─── Water Object ─────────────────────────────────────────────────────────────

function WaterObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Mesh>(null)
  const { selectObject } = useScene()
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const cfg = obj.water!

  const waterGeo = useMemo(() => new THREE.PlaneGeometry(cfg.size, cfg.size, 32, 32), [cfg.size])

  const waterMat = useMemo(() => new THREE.MeshPhongMaterial({
    color: new THREE.Color(cfg.color),
    opacity: cfg.opacity,
    transparent: cfg.opacity < 1,
    shininess: 120,
    specular: new THREE.Color('#aaccff'),
    side: THREE.DoubleSide,
  }), [cfg.color, cfg.opacity])

  useFrame((state) => {
    if (!ref.current) return
    const geo = ref.current.geometry as THREE.BufferGeometry
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const t = state.clock.elapsedTime * cfg.waveSpeed
    const scale = cfg.waveScale
    const h = cfg.waveHeight
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      pos.setZ(i, Math.sin(x * scale + t) * h * 0.5 + Math.cos(y * scale * 0.7 + t * 1.3) * h * 0.5)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <mesh
      ref={ref}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      scale={obj.transform.scale}
      visible={obj.visible}
      geometry={waterGeo}
      onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey) }}
    >
      <primitive object={waterMat} attach="material" />
      {isSelected && (
        <mesh>
          <planeGeometry args={[cfg.size * 1.01, cfg.size * 1.01]} />
          <meshBasicMaterial color="#5B6CFF" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </mesh>
  )
}

// ─── Camera Controller ────────────────────────────────────────────────────────

function CameraController() {
  const viewMode = useScene((s) => s.viewMode)
  const cameraFov = useScene((s) => s.cameraFov)
  const { camera } = useThree()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (viewMode === 'persp') {
      cam.fov = cameraFov
    } else {
      cam.fov = 5
      if (viewMode === 'top') camera.position.set(0, 50, 0.01)
      else if (viewMode === 'front') camera.position.set(0, 0, 50)
      else camera.position.set(50, 0, 0)
      camera.lookAt(0, 0, 0)
    }
    cam.updateProjectionMatrix()
  }, [viewMode, cameraFov, camera])

  return null
}

// ─── Light Gizmo ─────────────────────────────────────────────────────────────

function LightGizmo({ obj }: { obj: SceneObject }) {
  const cfg = obj.light!
  const selectObject = useScene((s) => s.selectObject)
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))

  if (cfg.type === 'ambient' || cfg.type === 'hemisphere') return null

  const [px, py, pz] = obj.transform.position
  const dist = cfg.distance ?? 10
  const angle = cfg.angle ?? Math.PI / 4
  const spotRadius = Math.tan(angle) * dist

  return (
    <group position={[px, py, pz]}>
      {/* Clickable gizmo sphere — always visible */}
      <mesh onClick={(e) => { e.stopPropagation(); selectObject(obj.id) }}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshBasicMaterial color={cfg.color} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.025, 8, 32]} />
          <meshBasicMaterial color="#5B6CFF" depthTest={false} />
        </mesh>
      )}

      {/* Point light: distance sphere wireframe */}
      {isSelected && cfg.type === 'point' && dist > 0 && (
        <mesh>
          <sphereGeometry args={[dist, 20, 14]} />
          <meshBasicMaterial color={cfg.color} wireframe transparent opacity={0.1} depthTest={false} />
        </mesh>
      )}

      {/* Spot light: cone wireframe opening downward */}
      {isSelected && cfg.type === 'spot' && (
        <group rotation={[Math.PI, 0, 0]}>
          <mesh position={[0, dist / 2, 0]}>
            <coneGeometry args={[spotRadius, dist, 18, 1, true]} />
            <meshBasicMaterial color={cfg.color} wireframe transparent opacity={0.2} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        </group>
      )}

      {/* Directional light: arrow pointing down */}
      {isSelected && cfg.type === 'directional' && (
        <>
          <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
            <meshBasicMaterial color={cfg.color} depthTest={false} />
          </mesh>
          <mesh position={[0, -2.25, 0]}>
            <coneGeometry args={[0.14, 0.45, 8]} />
            <meshBasicMaterial color={cfg.color} depthTest={false} />
          </mesh>
        </>
      )}

      {/* Area light: rectangle wireframe */}
      {isSelected && cfg.type === 'rectarea' && (
        <mesh>
          <planeGeometry args={[cfg.rectAreaWidth ?? 4, cfg.rectAreaHeight ?? 4]} />
          <meshBasicMaterial color={cfg.color} side={THREE.DoubleSide} wireframe transparent opacity={0.4} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}

// ─── Light Object ─────────────────────────────────────────────────────────────

function LightObject({ obj }: { obj: SceneObject }) {
  const cfg = obj.light!
  const pos = obj.transform.position
  const shadowMapSize = useScene((s) => s.environment.shadowMapSize)
  const mapSize = shadowMapSize ?? 2048

  return (
    <>
      {cfg.type === 'ambient' && (
        <ambientLight color={cfg.color} intensity={cfg.intensity} />
      )}
      {cfg.type === 'hemisphere' && (
        <hemisphereLight args={[cfg.skyColor ?? cfg.color, cfg.groundColor ?? '#444444', cfg.intensity]} />
      )}
      {cfg.type === 'directional' && (
        <directionalLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          castShadow={cfg.castShadow}
          shadow-mapSize={[mapSize, mapSize]}
          shadow-camera-far={100}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
      )}
      {cfg.type === 'point' && (
        <pointLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          distance={cfg.distance}
          decay={cfg.decay}
          castShadow={cfg.castShadow}
          shadow-mapSize={[mapSize, mapSize]}
        />
      )}
      {cfg.type === 'spot' && (
        <spotLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          distance={cfg.distance}
          angle={cfg.angle}
          penumbra={cfg.penumbra}
          castShadow={cfg.castShadow}
          shadow-mapSize={[mapSize, mapSize]}
        />
      )}
      {cfg.type === 'rectarea' && (
        <rectAreaLight
          position={pos}
          color={cfg.color}
          intensity={cfg.intensity}
          width={cfg.rectAreaWidth ?? 4}
          height={cfg.rectAreaHeight ?? 4}
        />
      )}
      <LightGizmo obj={obj} />
    </>
  )
}

// ─── HTML Overlay Object ─────────────────────────────────────────────────────

function HtmlObject({ obj }: { obj: SceneObject }) {
  const cfg = obj.htmlConfig!
  const selectObject = useScene((s) => s.selectObject)
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))

  return (
    <Html
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      transform
      occlude={false}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); selectObject(obj.id, false) }}
        style={{
          width: `${cfg.width ?? 400}px`,
          color: cfg.color ?? '#ffffff',
          background: cfg.background ?? 'transparent',
          padding: cfg.padding ? `${cfg.padding}px` : undefined,
          borderRadius: cfg.borderRadius ? `${cfg.borderRadius}px` : undefined,
          opacity: cfg.opacity ?? 1,
          textAlign: cfg.textAlign ?? 'left',
          outline: isSelected ? '2px solid rgba(255,255,255,0.8)' : 'none',
          outlineOffset: '4px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {cfg.htmlType === 'heading' && (
          <h1 style={{ fontSize: `${cfg.fontSize ?? 64}px`, fontWeight: cfg.fontWeight ?? '700', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {cfg.content ?? 'Heading'}
          </h1>
        )}
        {cfg.htmlType === 'paragraph' && (
          <p style={{ fontSize: `${cfg.fontSize ?? 16}px`, fontWeight: cfg.fontWeight ?? '400', margin: 0, lineHeight: 1.6 }}>
            {cfg.content ?? 'Paragraph text'}
          </p>
        )}
        {cfg.htmlType === 'image' && cfg.content && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cfg.content} alt="" style={{ width: '100%', borderRadius: cfg.borderRadius ? `${cfg.borderRadius}px` : undefined }} />
        )}
        {cfg.htmlType === 'video' && cfg.videoUrl && (
          <video src={cfg.videoUrl} autoPlay muted loop playsInline style={{ width: '100%' }} />
        )}
        {cfg.htmlType === 'button' && (
          <button style={{ fontSize: `${cfg.fontSize ?? 16}px`, fontWeight: cfg.fontWeight ?? '600', background: cfg.color ?? '#ffffff', color: cfg.background ?? '#000000', padding: '14px 36px', border: 'none', borderRadius: `${cfg.borderRadius ?? 8}px`, cursor: 'pointer', letterSpacing: '0.04em' }}>
            {cfg.content ?? 'Click Me'}
          </button>
        )}
        {cfg.htmlType === 'form' && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={(e) => e.preventDefault()}>
            <input placeholder="Your name" style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
            <input placeholder="Email" type="email" style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
            <textarea placeholder="Message" rows={3} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'none' }} />
            <button type="submit" style={{ padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </form>
        )}
      </div>
    </Html>
  )
}

// ─── Scroll-Driven Camera ─────────────────────────────────────────────────────

function ScrollCamera() {
  const appMode = useScene((s) => s.appMode)
  const cameraPath = useScene((s) => s.cameraPath)
  const scrollProgress = useScene((s) => s.scrollProgress)
  const { camera, controls } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  useFrame(() => {
    if (appMode !== 'website' || cameraPath.length < 2) return
    const { position, target, fov } = interpolateCameraPath(cameraPath, scrollProgress)
    targetPos.current.copy(position)
    targetLook.current.copy(target)
    camera.position.lerp(targetPos.current, 0.08)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = controls as any
    if (ctrl?.target) ctrl.target.lerp(targetLook.current, 0.08)
    const cam = camera as THREE.PerspectiveCamera
    if (cam.fov !== undefined) {
      cam.fov = THREE.MathUtils.lerp(cam.fov, fov, 0.05)
      cam.updateProjectionMatrix()
    }
  })

  return null
}

// ─── Scene Object Router ──────────────────────────────────────────────────────

function SceneObjectNode({ id }: { id: string }) {
  const obj = useScene((s) => s.objects[id])
  if (!obj || !obj.visible) return null

  if (obj.type === 'html' && obj.htmlConfig) return <HtmlObject obj={obj} />
  if (obj.type === 'light' && obj.light) return <LightObject obj={obj} />
  if (obj.type === 'terrain' && obj.terrain) return <TerrainObject obj={obj} />
  if (obj.type === 'water' && obj.water) return <WaterObject obj={obj} />
  if (obj.type === 'particle') return <ParticleObject obj={obj} />
  if (obj.geometry?.type === 'text') return <TextObject obj={obj} />
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
  const snapEnabled = useScene((s) => s.snapEnabled)
  const snapSize = useScene((s) => s.snapSize)
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

  if (!obj || isPlaying || activeTool === 'select' || activeTool === 'sculpt') return null

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
          const snap = (v: number) => snapEnabled && activeTool === 'translate' ? Math.round(v / snapSize) * snapSize : v
          const sx = snap(p.x), sy = snap(p.y), sz = snap(p.z)
          if (snapEnabled && activeTool === 'translate') ref.current.position.set(sx, sy, sz)
          updateObject(selectedId, {
            transform: {
              position: [sx, sy, sz],
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

// ─── Shadow Map + RectAreaLight Setup ────────────────────────────────────────

function ShadowMapSetup() {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap
    gl.shadowMap.needsUpdate = true
    // Initialize RectAreaLight uniforms so area lights illuminate standard materials
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { RectAreaLightUniformsLib } = require('three/examples/jsm/lights/RectAreaLightUniformsLib.js') as any
      RectAreaLightUniformsLib.init()
    } catch {
      // Gracefully skip if unavailable
    }
  }, [gl])
  return null
}

// ─── Sky System ──────────────────────────────────────────────────────────────

function SkySystem() {
  const env = useScene((s) => s.environment)
  if (!env.skyEnabled) return null

  const DEG2RAD = Math.PI / 180
  const elev = env.sunElevation * DEG2RAD
  const azim = env.sunAzimuth * DEG2RAD
  const sunPosition: [number, number, number] = [
    Math.cos(elev) * Math.sin(azim),
    Math.sin(elev),
    Math.cos(elev) * Math.cos(azim),
  ]

  return (
    <Sky
      distance={450000}
      sunPosition={sunPosition}
      turbidity={env.skyTurbidity}
      rayleigh={env.skyRayleigh}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  )
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

function BlobHDRIEnvironment({ url, showBackground, intensity }: { url: string; showBackground: boolean; intensity: number }) {
  const { gl, scene } = useThree()
  const texture = useLoader(RGBELoader, url)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const envMap = pmrem.fromEquirectangular(texture).texture
    scene.environment = envMap
    ;(scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = intensity
    if (showBackground) scene.background = envMap
    else scene.background = null
    pmrem.dispose()
    return () => {
      envMap.dispose()
      scene.environment = null
    }
  }, [texture, gl, scene, showBackground, intensity])

  return null
}

function HDRIEnvironment() {
  const env = useScene((s) => s.environment)
  if (!env.hdriUrl) return null

  if (env.hdriUrl.startsWith('blob:')) {
    return (
      <Suspense fallback={null}>
        <BlobHDRIEnvironment url={env.hdriUrl} showBackground={env.showBackground} intensity={env.hdriIntensity} />
      </Suspense>
    )
  }

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
      <ChromaticAberration
        offset={new THREE.Vector2(
          fx.chromaticAberration ? fx.chromaticOffset : 0,
          fx.chromaticAberration ? fx.chromaticOffset : 0,
        )}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

// ─── Canvas Capture Setup ────────────────────────────────────────────────────

function CanvasCaptureSetup() {
  const { gl } = useThree()
  useEffect(() => { captureCanvas.dom = gl.domElement }, [gl])
  return null
}

// ─── Fly Camera ──────────────────────────────────────────────────────────────

function FlyCamera() {
  const cameraMode = useScene((s) => s.cameraMode)
  const keys = useRef(new Set<string>())
  const { camera } = useThree()

  useEffect(() => {
    const dn = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((_, dt) => {
    if (cameraMode !== 'fly') return
    const s = 8 * dt
    if (keys.current.has('KeyW') || keys.current.has('ArrowUp'))    camera.translateZ(-s)
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown'))  camera.translateZ(s)
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft'))  camera.translateX(-s)
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) camera.translateX(s)
    if (keys.current.has('KeyE'))                                    camera.translateY(s)
    if (keys.current.has('KeyQ'))                                    camera.translateY(-s)
  })
  return null
}

// ─── Frame Controller ────────────────────────────────────────────────────────

function FrameController() {
  const { camera, controls } = useThree()

  useEffect(() => {
    cameraFrameFn.current = (pos, dist = 6) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctrl = controls as any
      if (!ctrl) return
      const target = new THREE.Vector3(...pos)
      ctrl.target.copy(target)
      const dir = new THREE.Vector3().subVectors(camera.position, target).normalize()
      if (dir.lengthSq() < 0.0001) dir.set(0.6, 0.6, 0.6).normalize()
      camera.position.copy(target).addScaledVector(dir, dist)
      ctrl.update()
    }
    return () => { cameraFrameFn.current = null }
  }, [camera, controls])

  return null
}

// ─── Camera Capture Registration ─────────────────────────────────────────────

function CameraCapture() {
  const { camera, controls } = useThree()

  useEffect(() => {
    captureCamera.fn = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctrl = controls as any
      const target = ctrl?.target ?? new THREE.Vector3(0, 0, 0)
      const cam = camera as THREE.PerspectiveCamera
      return {
        position: camera.position.toArray() as [number, number, number],
        target: (target as THREE.Vector3).toArray() as [number, number, number],
        fov: cam.fov ?? 60,
      }
    }
    return () => { captureCamera.fn = null }
  }, [camera, controls])

  return null
}

// ─── Camera Path Visualization ────────────────────────────────────────────────

function CameraPathVisual() {
  const appMode = useScene((s) => s.appMode)
  const cameraPath = useScene((s) => s.cameraPath)

  if (appMode !== 'website' || cameraPath.length < 2) {
    if (appMode !== 'website' || cameraPath.length < 1) return null
    // Single point: just show sphere
    return (
      <group>
        {cameraPath.map((kp, i) => (
          <group key={kp.id} position={kp.position}>
            <mesh>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshBasicMaterial color="#5B6CFF" />
            </mesh>
            <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
              <div style={{ color: '#5B6CFF', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.6)', padding: '2px 5px', borderRadius: 4 }}>
                {i + 1}. {kp.label}
              </div>
            </Html>
          </group>
        ))}
      </group>
    )
  }

  const points = cameraPath.map((kp) => new THREE.Vector3(...kp.position))

  return (
    <group>
      <Line points={points} color="#5B6CFF" lineWidth={1.5} dashed dashSize={0.4} gapSize={0.2} />
      {cameraPath.map((kp, i) => (
        <group key={kp.id} position={kp.position}>
          <mesh>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#5B6CFF" />
          </mesh>
          <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div style={{ color: '#ffffff', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(91,108,255,0.85)', padding: '2px 6px', borderRadius: 4, marginTop: -24 }}>
              {i + 1}. {kp.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
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
  const appMode = useScene((s) => s.appMode)

  const mapSize = environment.shadowMapSize ?? 2048

  // When sky is enabled, position the default directional light at the sun position
  const DEG2RAD = Math.PI / 180
  const skyDirPos: [number, number, number] = environment.skyEnabled ? [
    Math.cos(environment.sunElevation * DEG2RAD) * Math.sin(environment.sunAzimuth * DEG2RAD) * 50,
    Math.sin(environment.sunElevation * DEG2RAD) * 50,
    Math.cos(environment.sunElevation * DEG2RAD) * Math.cos(environment.sunAzimuth * DEG2RAD) * 50,
  ] : environment.directionalPosition

  const sceneObjects = (
    <>
      {/* Default environment lights */}
      <ambientLight color={environment.ambientColor} intensity={environment.ambientIntensity} />
      <directionalLight
        color={environment.directionalColor}
        intensity={environment.directionalIntensity}
        position={skyDirPos}
        castShadow={environment.shadowsEnabled}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {rootIds.map((id) => <SceneObjectNode key={id} id={id} />)}

      <GizmoControl />
      <FPSCounter />
      <CameraController />
      <FogController />
      <HDRIEnvironment />
      <SkySystem />
      <ShadowMapSetup />
      <PostProcessing />

      {/* Camera path visualization — website mode only */}
      <CameraPathVisual />

      {/* Grid — hidden in website mode */}
      {appMode !== 'website' && (
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
      )}

      {/* Stars when no HDRI and no sky shader */}
      {!environment.hdriUrl && !environment.skyEnabled && <Stars radius={100} depth={50} count={3000} factor={4} fade />}

      {/* Invisible background plane for right-click context menu on empty space */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, 0]}
        onContextMenu={(e) => {
          e.stopPropagation()
          useScene.getState().setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: null })
        }}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
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
  const appMode = useScene((s) => s.appMode)
  const deselectAll = useScene((s) => s.deselectAll)
  const toneMappingExposure = useScene((s) => s.postFX.toneMappingExposure)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const state = useScene.getState()
      if (!state.websiteScrollEnabled) return
      e.preventDefault()
      const delta = e.deltaY / 3000
      state.setScrollProgress(state.scrollProgress + delta)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div ref={wrapperRef} className="w-full h-full" style={{ background: '#000000' }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [10, 8, 10], fov: 60, near: 0.1, far: 1000 }}
        onPointerMissed={() => deselectAll()}
      >
        <Suspense fallback={null}>
          <InnerScene />
          <CanvasCaptureSetup />
          <CameraCapture />
          <FrameController />
          <FlyCamera />
          <ScrollCamera />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            enabled={cameraMode === 'orbit' && appMode !== 'website'}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
