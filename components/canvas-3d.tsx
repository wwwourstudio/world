'use client'

import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useWorldBuilder } from '@/lib/store'
import type { PrimitiveType } from '@/lib/constants'
import { EffectComposer, Bloom, BrightnessContrast } from '@react-three/postprocessing'

// ─── Terrain ────────────────────────────────────────────────────────────────

function terrainNoise(x: number, z: number): number {
  return (
    Math.sin(0.5 * x) * Math.cos(0.5 * z) +
    0.5 * Math.sin(1.2 * x + 0.8 * z) +
    0.25 * Math.sin(2.3 * x - 1.7 * z) +
    0.125 * Math.sin(4.1 * x + 3.2 * z)
  )
}

function heightToColor(height: number): THREE.Color {
  const color = new THREE.Color()
  if (height > 12) color.setHex(0xffffff)
  else if (height > 8) color.setHex(0x8b7740)
  else if (height > 3) color.setHex(0x4a6b3a)
  else if (height > 0) color.setHex(0x5aa24a)
  else color.setHex(0xc2b280)
  return color
}

function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 120, 120)
    geo.rotateX(-Math.PI / 2)
    const positions = geo.attributes.position.array as Float32Array
    const colors: number[] = []

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      const height =
        15 * terrainNoise(0.01 * x, 0.01 * z) +
        7 * terrainNoise(0.03 * x, 0.03 * z) +
        3 * terrainNoise(0.06 * x, 0.06 * z) +
        1.5 * terrainNoise(0.12 * x, 0.12 * z)

      positions[i + 1] = height
      const c = heightToColor(height)
      colors.push(c.r, c.g, c.b)
    }

    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} metalness={0.1} />
    </mesh>
  )
}

// ─── Water ──────────────────────────────────────────────────────────────────

const WATER_VERTEX = /* glsl */ `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.3 + time) * 0.4;
    pos.y += cos(pos.z * 0.4 + time * 1.3) * 0.3;
    pos.y += sin((pos.x + pos.z) * 0.2 + time * 0.7) * 0.2;
    vPosition = pos;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const WATER_FRAGMENT = /* glsl */ `
  uniform vec3 waterColor;
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
    vec3 halfDir = normalize(sunDirection + viewDir);
    float specular = pow(max(dot(vNormal, halfDir), 0.0), 128.0);
    vec3 color = mix(waterColor, vec3(0.7, 0.9, 1.0), fresnel) + specular * 0.5;
    gl_FragColor = vec4(color, 0.7);
  }
`

function Water() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime()
    }
  })

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      waterColor: { value: new THREE.Color(0x0077be) },
      sunDirection: { value: new THREE.Vector3(0.7, 0.7, 0) },
    }),
    [],
  )

  return (
    <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 200, 100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={WATER_VERTEX}
        fragmentShader={WATER_FRAGMENT}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Primitive geometry helper ───────────────────────────────────────────────

function primitiveGeometry(type: PrimitiveType) {
  switch (type) {
    case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />
    case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
    default: return <boxGeometry args={[1, 1, 1]} />
  }
}

// ─── Scene Object (primitive) ────────────────────────────────────────────────

function SceneObjectPrimitive({ id }: { id: string }) {
  const obj = useWorldBuilder((s) => s.objects.find((o) => o.id === id))
  const isSelected = useWorldBuilder((s) => s.selectedObjectId === id)
  const setSelectedObject = useWorldBuilder((s) => s.setSelectedObject)
  const updateObject = useWorldBuilder((s) => s.updateObject)
  const currentTool = useWorldBuilder((s) => s.currentTool)
  const { raycaster, pointer } = useThree()

  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef(new THREE.Vector3())
  const startPointer = useRef({ x: 0, y: 0 })
  const startRotation = useRef(0)
  const startScale = useRef(1)

  useFrame(() => {
    if (!meshRef.current || !dragging) return
    if (currentTool === 'move') {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const target = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, target)
      if (target) meshRef.current.position.copy(target.add(dragOffset.current))
    } else if (currentTool === 'rotate') {
      const delta = pointer.x - startPointer.current.x
      meshRef.current.rotation.y = startRotation.current + delta * Math.PI * 2
    } else if (currentTool === 'scale') {
      const delta = Math.max(0.1, startScale.current + 2 * (pointer.y - startPointer.current.y))
      meshRef.current.scale.setScalar(delta)
    }
  })

  if (!obj || !obj.visible || obj.type === 'gltf') return null

  const type = obj.type as PrimitiveType

  function getColor() {
    if (dragging) {
      if (currentTool === 'move') return '#10b981'
      if (currentTool === 'rotate') return '#f59e0b'
      if (currentTool === 'scale') return '#8b5cf6'
    }
    if (isSelected) return '#3b82f6'
    if (hovered) return '#6b7280'
    return '#9ca3af'
  }

  const color = getColor()

  return (
    <mesh
      ref={meshRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        if (obj.locked) return
        setSelectedObject(id)
        if (currentTool === 'move') {
          setDragging(true)
          if (meshRef.current) dragOffset.current.copy(meshRef.current.position).sub(e.point)
        } else if (currentTool === 'rotate') {
          setDragging(true)
          startPointer.current = { x: pointer.x, y: pointer.y }
          if (meshRef.current) startRotation.current = meshRef.current.rotation.y
        } else if (currentTool === 'scale') {
          setDragging(true)
          startPointer.current = { x: pointer.x, y: pointer.y }
          if (meshRef.current) startScale.current = meshRef.current.scale.x
        }
      }}
      onPointerUp={() => {
        if (dragging && meshRef.current) {
          const { x: px, y: py, z: pz } = meshRef.current.position
          const { x: rx, y: ry, z: rz } = meshRef.current.rotation
          const { x: sx, y: sy, z: sz } = meshRef.current.scale
          updateObject(id, {
            position: [px, py, pz],
            rotation: [rx, ry, rz],
            scale: [sx, sy, sz],
          })
        }
        setDragging(false)
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {primitiveGeometry(type)}
      <meshStandardMaterial
        color={color}
        emissive={isSelected || dragging ? color : '#000000'}
        emissiveIntensity={isSelected || dragging ? 0.2 : 0}
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  )
}

// ─── GLTF Object ─────────────────────────────────────────────────────────────

function GltfMesh({
  url,
  position,
  rotation,
  scale,
  onSelect,
}: {
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  onSelect: () => void
}) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(), [scene])

  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={scale}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick={(e: any) => { e.stopPropagation(); onSelect() }}
    />
  )
}

function SceneObjectGltf({ id }: { id: string }) {
  const obj = useWorldBuilder((s) => s.objects.find((o) => o.id === id))
  const setSelectedObject = useWorldBuilder((s) => s.setSelectedObject)

  if (!obj || !obj.url || !obj.visible) return null

  return (
    <Suspense fallback={null}>
      <GltfMesh
        url={obj.url}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onSelect={() => setSelectedObject(id)}
      />
    </Suspense>
  )
}

// ─── FPS Counter ─────────────────────────────────────────────────────────────

function FPSCounter() {
  const setFPS = useWorldBuilder((s) => s.setFPS)
  const frameCount = useRef(0)
  const lastTime = useRef(Date.now())

  useFrame(() => {
    frameCount.current++
    const now = Date.now()
    if (now >= lastTime.current + 1000) {
      setFPS(frameCount.current)
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

// ─── Post Processing ──────────────────────────────────────────────────────────

function PostProcessing() {
  const bloom = useWorldBuilder((s) => s.bloom)
  const exposure = useWorldBuilder((s) => s.exposure)
  const contrast = useWorldBuilder((s) => s.contrast)

  return (
    <EffectComposer>
      <Bloom intensity={bloom} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
      <BrightnessContrast brightness={exposure - 1} contrast={contrast - 1} />
    </EffectComposer>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene() {
  const objects = useWorldBuilder((s) => s.objects)
  const weather = useWorldBuilder((s) => s.weather)

  useFrame(({ scene }) => {
    if (scene.fog instanceof THREE.FogExp2) {
      const target = weather === 'clear' ? 0.0008 : weather === 'rain' ? 0.002 : 0.005
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, target, 0.05)
    }
  })

  return (
    <>
      <Terrain />
      <Water />
      {objects.map((obj) =>
        obj.type === 'gltf' ? (
          <SceneObjectGltf key={obj.id} id={obj.id} />
        ) : (
          <SceneObjectPrimitive key={obj.id} id={obj.id} />
        ),
      )}
    </>
  )
}

// ─── Canvas3D (root export) ───────────────────────────────────────────────────

export function Canvas3D() {
  const timeOfDay = useWorldBuilder((s) => s.timeOfDay)
  const weather = useWorldBuilder((s) => s.weather)

  const sunAngle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2
  const sunPosition: [number, number, number] = [
    100 * Math.cos(sunAngle),
    50 * Math.sin(sunAngle),
    0,
  ]
  const ambientIntensity = 0.3 + 0.2 * Math.sin((timeOfDay / 24) * Math.PI * 2)

  return (
    <Canvas
      shadows
      camera={{ position: [10, 8, 10], fov: 60 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0e1a']} />
      <fogExp2 attach="fog" args={['#0a0e1a', 0.0008]} />

      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        castShadow
        position={sunPosition}
        intensity={0.8}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight intensity={0.15} />

      <Sky
        sunPosition={sunPosition}
        turbidity={weather === 'fog' ? 8 : 1}
        rayleigh={weather === 'rain' ? 3 : 0.5}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.1}
      />

      <FPSCounter />

      <Suspense fallback={null}>
        <Scene />
      </Suspense>

      <PostProcessing />
    </Canvas>
  )
}
