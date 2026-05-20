import type { SceneObject, EnvironmentState } from '@/lib/scene/SceneStore'

export function generateEmbedCode(scene: { objects: Record<string, SceneObject>; environment: EnvironmentState }): string {
  const sceneJSON = JSON.stringify(scene, null, 2)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>World Builder Pro — Embedded Scene</title>
  <style>body{margin:0;overflow:hidden;background:#0B0C0F}canvas{display:block}</style>
</head>
<body>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.177.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

const SCENE_DATA = ${sceneJSON}

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = ${scene.environment.hdriIntensity ?? 1}
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.set(10, 8, 10)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Environment
const ambientLight = new THREE.AmbientLight('${scene.environment.ambientColor}', ${scene.environment.ambientIntensity})
scene.add(ambientLight)
const dirLight = new THREE.DirectionalLight('${scene.environment.directionalColor}', ${scene.environment.directionalIntensity})
dirLight.position.set(${scene.environment.directionalPosition.join(',')})
dirLight.castShadow = true
scene.add(dirLight)

if (${JSON.stringify(scene.environment.hdriUrl)}) {
  new RGBELoader().load(${JSON.stringify(scene.environment.hdriUrl)}, (t) => {
    const gen = new THREE.PMREMGenerator(renderer)
    const envMap = gen.fromEquirectangular(t).texture
    scene.environment = envMap
    if (${JSON.stringify(scene.environment.showBackground)}) scene.background = envMap
    gen.dispose(); t.dispose()
  })
}

// Objects
function buildMat(m) {
  const opts = { color: m.color||'#888', roughness: m.roughness??0.5, metalness: m.metalness??0, transparent: m.transparent||m.opacity<1, opacity: m.opacity??1, emissive: new THREE.Color(m.emissive||'#000'), emissiveIntensity: m.emissiveIntensity??0 }
  if (m.type === 'physical' || m.transmission > 0) {
    return new THREE.MeshPhysicalMaterial({...opts, transmission: m.transmission??0, ior: m.ior??1.5, thickness: m.thickness??0.5})
  }
  if (m.wireframe) return new THREE.MeshBasicMaterial({color: m.color, wireframe: true})
  return new THREE.MeshStandardMaterial(opts)
}

function buildGeo(g) {
  switch(g.type) {
    case 'box': return new THREE.BoxGeometry(g.width??1, g.height??1, g.depth??1)
    case 'sphere': return new THREE.SphereGeometry(g.radius??0.5, g.segments??24, g.segments??24)
    case 'cylinder': return new THREE.CylinderGeometry(g.radiusTop??0.5, g.radiusBottom??0.5, g.height??1, g.segments??16)
    case 'cone': return new THREE.ConeGeometry(g.radius??0.5, g.height??1, g.segments??12)
    case 'torus': return new THREE.TorusGeometry(g.radius??0.5, g.tube??0.2, 16, g.segments??32)
    case 'plane': return new THREE.PlaneGeometry(g.width??1, g.height??1)
    case 'ring': return new THREE.RingGeometry(0.3, g.radius??0.5, 32)
    case 'capsule': return new THREE.CapsuleGeometry(g.radius??0.3, g.height??1, 4, 16)
    case 'tetrahedron': return new THREE.TetrahedronGeometry(g.radius??0.5)
    default: return new THREE.BoxGeometry(1,1,1)
  }
}

for (const obj of Object.values(SCENE_DATA.objects)) {
  if (!obj.visible) continue
  if (obj.type === 'light' && obj.light) {
    let l
    const lc = obj.light
    if (lc.type==='ambient') l = new THREE.AmbientLight(lc.color, lc.intensity)
    else if (lc.type==='directional') { l = new THREE.DirectionalLight(lc.color, lc.intensity); l.position.set(...obj.transform.position) }
    else if (lc.type==='point') { l = new THREE.PointLight(lc.color, lc.intensity, lc.distance??20, lc.decay??2); l.position.set(...obj.transform.position) }
    else if (lc.type==='spot') { l = new THREE.SpotLight(lc.color, lc.intensity, lc.distance??20, lc.angle??0.8, lc.penumbra??0.1); l.position.set(...obj.transform.position) }
    else if (lc.type==='hemisphere') l = new THREE.HemisphereLight(lc.skyColor||lc.color, lc.groundColor||'#444', lc.intensity)
    if (l) scene.add(l)
  } else if (obj.type === 'mesh') {
    const mesh = new THREE.Mesh(buildGeo(obj.geometry), buildMat(obj.material))
    mesh.position.set(...obj.transform.position)
    mesh.rotation.set(...obj.transform.rotation)
    mesh.scale.set(...obj.transform.scale)
    mesh.castShadow = obj.castShadow
    mesh.receiveShadow = obj.receiveShadow
    scene.add(mesh)
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

;(function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
})()
</script>
</body>
</html>`
}

export function generateThreeJSCode(scene: { objects: Record<string, SceneObject>; environment: EnvironmentState }): string {
  const lines: string[] = [
    `import * as THREE from 'three'`,
    `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`,
    ``,
    `const renderer = new THREE.WebGLRenderer({ antialias: true })`,
    `renderer.setSize(window.innerWidth, window.innerHeight)`,
    `renderer.shadowMap.enabled = true`,
    `renderer.toneMapping = THREE.ACESFilmicToneMapping`,
    `document.body.appendChild(renderer.domElement)`,
    ``,
    `const scene = new THREE.Scene()`,
    `const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000)`,
    `camera.position.set(10, 8, 10)`,
    ``,
    `const controls = new OrbitControls(camera, renderer.domElement)`,
    ``,
    `// Lights`,
    `scene.add(new THREE.AmbientLight('${scene.environment.ambientColor}', ${scene.environment.ambientIntensity}))`,
    `const sun = new THREE.DirectionalLight('${scene.environment.directionalColor}', ${scene.environment.directionalIntensity})`,
    `sun.position.set(${scene.environment.directionalPosition.join(', ')})`,
    `sun.castShadow = true`,
    `scene.add(sun)`,
    ``,
    `// Objects`,
  ]

  for (const obj of Object.values(scene.objects)) {
    if (obj.type !== 'mesh') continue
    const g = obj.geometry
    const m = obj.material
    const [px, py, pz] = obj.transform.position
    const [rx, ry, rz] = obj.transform.rotation
    const [sx, sy, sz] = obj.transform.scale

    let geoCode = ''
    if (g.type === 'box') geoCode = `new THREE.BoxGeometry(${g.width ?? 1}, ${g.height ?? 1}, ${g.depth ?? 1})`
    else if (g.type === 'sphere') geoCode = `new THREE.SphereGeometry(${g.radius ?? 0.5}, ${g.segments ?? 24}, ${g.segments ?? 24})`
    else if (g.type === 'plane') geoCode = `new THREE.PlaneGeometry(${g.width ?? 1}, ${g.height ?? 1})`
    else if (g.type === 'cylinder') geoCode = `new THREE.CylinderGeometry(${g.radiusTop ?? 0.5}, ${g.radiusBottom ?? 0.5}, ${g.height ?? 1}, ${g.segments ?? 16})`
    else geoCode = `new THREE.BoxGeometry(1,1,1)`

    const matCode = m.transmission && m.transmission > 0
      ? `new THREE.MeshPhysicalMaterial({ color: '${m.color}', roughness: ${m.roughness}, metalness: ${m.metalness}, transmission: ${m.transmission}, ior: ${m.ior} })`
      : `new THREE.MeshStandardMaterial({ color: '${m.color}', roughness: ${m.roughness}, metalness: ${m.metalness}, emissive: new THREE.Color('${m.emissive}'), emissiveIntensity: ${m.emissiveIntensity} })`

    const safeName = obj.name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1')
    lines.push(`const ${safeName} = new THREE.Mesh(${geoCode}, ${matCode})`)
    lines.push(`${safeName}.position.set(${px}, ${py}, ${pz})`)
    if (rx || ry || rz) lines.push(`${safeName}.rotation.set(${rx}, ${ry}, ${rz})`)
    if (sx !== 1 || sy !== 1 || sz !== 1) lines.push(`${safeName}.scale.set(${sx}, ${sy}, ${sz})`)
    lines.push(`${safeName}.castShadow = ${obj.castShadow}`)
    lines.push(`scene.add(${safeName})`)
    lines.push(``)
  }

  lines.push(
    `;(function animate() {`,
    `  requestAnimationFrame(animate)`,
    `  controls.update()`,
    `  renderer.render(scene, camera)`,
    `})()`
  )

  return lines.join('\n')
}
