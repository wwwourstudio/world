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
  Text3D,
  Outlines,
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
import type { SceneObject, GeometryConfig, MaterialConfig, LightConfig, AnimationConfig, ParticleConfig, Keyframe } from '@/lib/scene/SceneStore'
import { captureCanvas } from '@/lib/canvasCapture'
import { cameraFrameFn } from '@/lib/cameraFrame'

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

// ─── Mesh Object ─────────────────────────────────────────────────────────────

function MeshObject({ obj }: { obj: SceneObject }) {
  const ref = useRef<THREE.Mesh>(null)
  const material = useSceneMaterial(obj.material)
  const { selectObject, activeTool, updateObject } = useScene()
  const isSelected = useScene((s) => s.selectedIds.includes(obj.id))
  const isPlaying = useScene((s) => s.isPlaying)
  const hovered = useRef(false)
  useAnimation(ref as React.RefObject<THREE.Object3D | null>, obj.animation, obj.id)

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

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (cfg.preset !== 'rain' && cfg.preset !== 'snow' && cfg.preset !== 'sparks') return
    const dummy = new THREE.Object3D()
    const speed = cfg.preset === 'rain' ? 4 : cfg.preset === 'sparks' ? 2.5 : 0.5
    const [sx, sy, sz] = cfg.spread
    for (let i = 0; i < cfg.count; i++) {
      meshRef.current.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.position.y -= speed * delta
      if (dummy.position.y < -sy * 0.5) {
        dummy.position.y = sy * 0.5
        dummy.position.x = (Math.random() - 0.5) * sx
        dummy.position.z = (Math.random() - 0.5) * sz
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
      <CameraController />
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
          <CanvasCaptureSetup />
          <FrameController />
          <FlyCamera />
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
