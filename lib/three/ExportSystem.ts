import * as THREE from 'three'
import type { SceneObject, EnvironmentState, CameraKeypoint } from '@/lib/scene/SceneStore'

export async function exportSceneGLB(objects: Record<string, SceneObject>): Promise<void> {
  // Dynamic import to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js') as any

  const root = new THREE.Scene()

  for (const obj of Object.values(objects)) {
    if (!obj.visible) continue
    if (obj.type !== 'mesh' && obj.type !== 'group') continue

    const g = obj.geometry
    let geo: THREE.BufferGeometry
    if (g.type === 'sphere') geo = new THREE.SphereGeometry(g.radius ?? 0.5, 16, 16)
    else if (g.type === 'cylinder') geo = new THREE.CylinderGeometry(g.radiusTop ?? 0.5, g.radiusBottom ?? 0.5, g.height ?? 1, 16)
    else if (g.type === 'cone') geo = new THREE.ConeGeometry(g.radius ?? 0.5, g.height ?? 1, 12)
    else if (g.type === 'torus') geo = new THREE.TorusGeometry(g.radius ?? 0.5, g.tube ?? 0.2, 12, 32)
    else if (g.type === 'plane') geo = new THREE.PlaneGeometry(g.width ?? 1, g.height ?? 1)
    else geo = new THREE.BoxGeometry(g.width ?? 1, g.height ?? 1, g.depth ?? 1)

    const m = obj.material
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(m.color),
      roughness: m.roughness,
      metalness: m.metalness,
      emissive: new THREE.Color(m.emissive),
      emissiveIntensity: m.emissiveIntensity,
      opacity: m.opacity,
      transparent: m.transparent,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = obj.name
    mesh.position.set(...obj.transform.position)
    mesh.rotation.set(...obj.transform.rotation)
    mesh.scale.set(...obj.transform.scale)
    root.add(mesh)
  }

  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, (result: ArrayBuffer | object) => {
      const blob = result instanceof ArrayBuffer
        ? new Blob([result], { type: 'model/gltf-binary' })
        : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result instanceof ArrayBuffer ? 'scene.glb' : 'scene.gltf'
      a.click()
      URL.revokeObjectURL(url)
      resolve()
    }, reject, { binary: true })
  })
}

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

const _animMeshes = []
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
  } else if (obj.type === 'mesh' && obj.geometry.type !== 'text' && obj.geometry.type !== 'gltf') {
    const mesh = new THREE.Mesh(buildGeo(obj.geometry), buildMat(obj.material))
    mesh.position.set(...obj.transform.position)
    mesh.rotation.set(...obj.transform.rotation)
    mesh.scale.set(...obj.transform.scale)
    mesh.castShadow = obj.castShadow
    mesh.receiveShadow = obj.receiveShadow
    scene.add(mesh)
    if (obj.animation && obj.animation.preset && obj.animation.preset !== 'none') {
      _animMeshes.push({ mesh, anim: obj.animation, baseY: obj.transform.position[1], baseScale: obj.transform.scale[0] })
    }
  }
}

const _clock = new THREE.Clock()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

;(function animate() {
  requestAnimationFrame(animate)
  controls.update()
  const t = _clock.getElapsedTime()
  for (const { mesh, anim, baseY, baseScale } of _animMeshes) {
    const s = anim.speed || 1
    const a = anim.amplitude || 0.5
    const off = anim.offset || 0
    const ax = anim.axis || 'y'
    if (anim.preset === 'float') mesh.position.y = baseY + Math.sin(t * s * 2 + off) * a
    else if (anim.preset === 'spin') mesh.rotation[ax] = t * s * 2
    else if (anim.preset === 'pulse') { const sc = 1 + Math.sin(t * s * 3 + off) * a * 0.3; mesh.scale.setScalar(baseScale * sc) }
    else if (anim.preset === 'bounce') mesh.position.y = baseY + Math.abs(Math.sin(t * s * 2 + off)) * a * 2
    else if (anim.preset === 'wave') { mesh.position.y = baseY + Math.sin(t * s * 2 + off) * a; mesh.rotation.z = Math.sin(t * s + off) * 0.2 }
    else if (anim.preset === 'shake') { mesh.position.x += (Math.random() - 0.5) * a * 0.02; mesh.position.y = baseY + (Math.random() - 0.5) * a * 0.02 }
    else if (anim.preset === 'orbit') { const r = a * 2; mesh.position.x = Math.cos(t * s + off) * r; mesh.position.z = Math.sin(t * s + off) * r }
  }
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

function buildHtmlElementDOM(o: SceneObject): string {
  const cfg = o.htmlConfig!
  const fs = cfg.fontSize
  const fw = cfg.fontWeight ?? '400'
  const ac = cfg.accentColor ?? '#5B6CFF'

  switch (cfg.htmlType) {
    case 'heading':
      return `<h1 style="font-size:${fs ?? 64}px;font-weight:${fw};margin:0;line-height:1.1;letter-spacing:-0.02em">${cfg.content ?? 'Heading'}</h1>`
    case 'paragraph':
      return `<p style="font-size:${fs ?? 16}px;font-weight:${fw};margin:0;line-height:1.6">${cfg.content ?? 'Paragraph'}</p>`
    case 'button':
      return `<button onclick="${cfg.linkUrl ? `window.open('${cfg.linkUrl}','_blank')` : ''}" style="font-size:${fs ?? 16}px;font-weight:${fw};background:${cfg.color ?? '#fff'};color:${cfg.background ?? '#000'};padding:14px 36px;border:none;border-radius:${cfg.borderRadius ?? 8}px;cursor:pointer">${cfg.content ?? 'Click Me'}</button>`
    case 'badge':
      return `<span style="display:inline-block;padding:4px 14px;border-radius:999px;background:${ac};font-size:${fs ?? 12}px;font-weight:${fw};letter-spacing:0.06em;text-transform:uppercase">${cfg.content ?? 'Badge'}</span>`
    case 'card':
      return `<div style="background:${cfg.background ?? 'rgba(255,255,255,0.06)'};border:1px solid ${ac}33;border-radius:${cfg.borderRadius ?? 16}px;padding:${cfg.padding ?? 28}px"><div style="font-size:${fs ?? 22}px;font-weight:${fw};margin-bottom:10px">${cfg.content ?? 'Card Title'}</div>${cfg.subtitle ? `<div style="font-size:${(fs ?? 22) * 0.65}px;opacity:0.7">${cfg.subtitle}</div>` : ''}</div>`
    case 'quote':
      return `<blockquote style="margin:0;padding-left:${cfg.padding ?? 24}px;border-left:4px solid ${ac}"><div style="font-size:${fs ?? 24}px;font-style:italic;margin-bottom:12px">&ldquo;${cfg.content ?? 'Quote'}&rdquo;</div>${cfg.subtitle ? `<cite style="font-size:${(fs ?? 24) * 0.6}px;opacity:0.6;font-style:normal;text-transform:uppercase">— ${cfg.subtitle}</cite>` : ''}</blockquote>`
    case 'stat':
      return `<div style="text-align:center"><div style="font-size:${fs ?? 80}px;font-weight:800;line-height:1;color:${ac}">${cfg.content ?? '99%'}</div>${cfg.subtitle ? `<div style="font-size:${(fs ?? 80) * 0.22}px;opacity:0.6;margin-top:8px;letter-spacing:0.08em;text-transform:uppercase">${cfg.subtitle}</div>` : ''}</div>`
    case 'divider':
      return cfg.dividerStyle === 'gradient'
        ? `<div style="width:100%;height:2px;background:linear-gradient(90deg,transparent,${ac},transparent)"></div>`
        : `<div style="width:100%;${cfg.dividerStyle === 'dashed' ? `border-top:2px dashed ${ac}` : `height:2px;background:${ac}`}"></div>`
    case 'spacer':
      return `<div style="height:${cfg.height ?? 80}px"></div>`
    case 'icontext':
      return `<div style="display:flex;align-items:center;gap:16px"><span style="font-size:${fs ?? 40}px">${cfg.content ?? '✦'}</span><span style="font-size:${(fs ?? 40) * 0.4}px;font-weight:${fw}">${cfg.subtitle ?? 'Feature'}</span></div>`
    case 'image': {
      const src = cfg.content ?? ''
      return `<img src="${src}" alt="" style="width:${cfg.width ?? 400}px;max-width:100%;border-radius:${cfg.borderRadius ?? 0}px;object-fit:cover;display:block" />`
    }
    case 'video': {
      const url = cfg.videoUrl ?? cfg.content ?? ''
      const isYT = url.includes('youtube.com') || url.includes('youtu.be')
      const vidW = cfg.width ?? 560
      const vidH = Math.round(vidW * 0.5625)
      if (isYT) {
        const vid = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop() ?? ''
        return `<iframe src="https://www.youtube.com/embed/${vid}" width="${vidW}" height="${vidH}" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen style="border-radius:${cfg.borderRadius ?? 8}px;display:block"></iframe>`
      }
      return `<video src="${url}" controls style="width:${vidW}px;max-width:100%;border-radius:${cfg.borderRadius ?? 8}px;display:block"></video>`
    }
    case 'form': {
      const btnColor = cfg.accentColor ?? '#5B6CFF'
      const radius = cfg.borderRadius ?? 8
      const fsize = cfg.fontSize ?? 14
      return `<form onsubmit="event.preventDefault();this.querySelector('.fs').style.display='block';this.querySelector('.ff').style.display='none'" style="width:${cfg.width ?? 400}px;font-family:inherit"><div class="ff" style="display:flex;flex-direction:column;gap:12px"><input name="name" placeholder="Your name" required style="padding:10px 14px;border-radius:${radius}px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-size:${fsize}px;outline:none"><input name="email" type="email" placeholder="Email address" required style="padding:10px 14px;border-radius:${radius}px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-size:${fsize}px;outline:none"><textarea name="message" placeholder="Your message" rows="4" style="padding:10px 14px;border-radius:${radius}px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-size:${fsize}px;outline:none;resize:vertical"></textarea><button type="submit" style="padding:12px 24px;background:${btnColor};color:#fff;border:none;border-radius:${radius}px;font-size:${fsize}px;font-weight:600;cursor:pointer">${cfg.content ?? 'Send Message'}</button></div><div class="fs" style="display:none;text-align:center;padding:24px;opacity:0.7">&#10003; Message sent — thank you!</div></form>`
    }
    case 'countdown': {
      const target = cfg.countdownTarget ?? new Date(Date.now() + 7 * 86400000).toISOString()
      const cid = 'cd' + Math.random().toString(36).slice(2, 8)
      const cdFs = cfg.fontSize ?? 64
      const cdAccent = cfg.accentColor ?? '#5B6CFF'
      const cdGap = cfg.padding ?? 16
      return `<div id="${cid}" style="display:flex;gap:${cdGap}px;font-family:inherit"></div><script>(function(){var el=document.getElementById('${cid}');var tgt=new Date('${target}');function fmt(n){return String(n).padStart(2,'0')}function tick(){var d=Math.max(0,tgt-Date.now());var days=Math.floor(d/86400000);var hrs=Math.floor(d%86400000/3600000);var min=Math.floor(d%3600000/60000);var sec=Math.floor(d%60000/1000);var u=['Days','Hours','Mins','Secs'];var v=[days,hrs,min,sec];var h='';for(var i=0;i<4;i++){if(i>0)h+='<div style="font-size:${cdFs}px;font-weight:300;opacity:0.3;line-height:1">:</div>';h+='<div style="text-align:center"><div style="font-size:${cdFs}px;font-weight:800;line-height:1;color:${cdAccent}">'+fmt(v[i])+'</div><div style="font-size:${Math.round(cdFs * 0.2)}px;opacity:0.5;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px">'+u[i]+'</div></div>';}el.innerHTML=h;}tick();setInterval(tick,1000);})();</script>`
    }
    default:
      return `<div>${cfg.content ?? ''}</div>`
  }
}

export function generateWebsiteHTML(
  objects: Record<string, SceneObject>,
  cameraPath: CameraKeypoint[],
): string {
  const primitiveObjs = Object.values(objects).filter(
    (o) => o.visible && (o.type === 'mesh' || o.type === 'group') && o.geometry.type !== 'gltf',
  )

  const htmlObjs = Object.values(objects).filter(
    (o) => o.visible && o.type === 'html' && o.htmlConfig,
  )

  const sceneData = primitiveObjs.map((o) => ({
    name: o.name,
    geo: o.geometry,
    mat: {
      color: o.material.color,
      roughness: o.material.roughness,
      metalness: o.material.metalness,
      emissive: o.material.emissive,
      emissiveIntensity: o.material.emissiveIntensity,
      opacity: o.material.opacity,
      transparent: o.material.transparent,
    },
    pos: o.transform.position,
    rot: o.transform.rotation,
    scale: o.transform.scale,
    scrollAnim: o.scrollAnim ?? null,
  }))

  const htmlOverlayData = htmlObjs.map((o, idx) => ({
    id: `hel_${idx}`,
    inner: buildHtmlElementDOM(o),
    baseOpacity: o.htmlConfig!.opacity ?? 1,
    color: o.htmlConfig!.color ?? '#ffffff',
    width: o.htmlConfig!.width ?? 400,
    padding: o.htmlConfig!.padding ?? 0,
    scrollAnim: o.scrollAnim ?? null,
    top: 15 + idx * 22,
    left: 6,
  }))

  const pathData = cameraPath.map((kp) => ({
    position: kp.position,
    target: kp.target,
    fov: kp.fov,
    easing: kp.easing,
  }))

  const overlayCSS = htmlOverlayData.map((el) =>
    `#${el.id}{position:fixed;left:${el.left}%;top:${el.top}%;width:${el.width}px;color:${el.color};pointer-events:${el.scrollAnim?.effect === 'none' || !el.scrollAnim ? 'auto' : 'auto'};padding:${el.padding}px;}`
  ).join('\n    ')

  const overlayHTML = htmlOverlayData.map((el) =>
    `<div id="${el.id}" style="will-change:opacity,transform">${el.inner}</div>`
  ).join('\n  ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>3D Website</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#000;overflow-x:hidden}
    #canvas-wrap{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0}
    canvas{display:block;width:100%!important;height:100%!important}
    #scroll-driver{height:500vh;position:relative;z-index:1;pointer-events:none}
    #scroll-pct{position:fixed;bottom:20px;right:20px;color:rgba(255,255,255,0.4);font:11px/1 monospace;z-index:10}
    #html-overlays{position:fixed;inset:0;z-index:5;pointer-events:none}
    #html-overlays>*{pointer-events:auto}
    ${overlayCSS}
  </style>
</head>
<body>
  <div id="canvas-wrap"><canvas id="c"></canvas></div>
  <div id="scroll-driver"></div>
  <div id="scroll-pct">0%</div>
  <div id="html-overlays">
  ${overlayHTML}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.min.js"></script>
  <script>
(function(){
  const SCENE_DATA=${JSON.stringify(sceneData)};
  const CAM_PATH=${JSON.stringify(pathData)};
  const HTML_OVERLAYS=${JSON.stringify(htmlOverlayData.map(el => ({ id: el.id, baseOpacity: el.baseOpacity, scrollAnim: el.scrollAnim })))};

  // --- Three.js setup ---
  const canvas=document.getElementById('c');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#0b0c0f');

  const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,1000);
  camera.position.set(0,2,8);

  const ambient=new THREE.AmbientLight('#ffffff',0.4);
  const dirLight=new THREE.DirectionalLight('#ffffff',1.2);
  dirLight.position.set(5,10,5);
  scene.add(ambient,dirLight);

  // --- Build meshes ---
  const meshes=[];
  SCENE_DATA.forEach(function(o){
    let geo;
    const g=o.geo;
    if(g.type==='sphere') geo=new THREE.SphereGeometry(g.radius||0.5,32,32);
    else if(g.type==='cylinder') geo=new THREE.CylinderGeometry(g.radiusTop||0.5,g.radiusBottom||0.5,g.height||1,16);
    else if(g.type==='cone') geo=new THREE.ConeGeometry(g.radius||0.5,g.height||1,16);
    else if(g.type==='torus') geo=new THREE.TorusGeometry(g.radius||0.5,g.tube||0.2,16,32);
    else if(g.type==='plane') geo=new THREE.PlaneGeometry(g.width||1,g.height||1);
    else geo=new THREE.BoxGeometry(g.width||1,g.height||1,g.depth||1);
    const m=o.mat;
    const mat=new THREE.MeshStandardMaterial({
      color:m.color,roughness:m.roughness,metalness:m.metalness,
      emissive:m.emissive,emissiveIntensity:m.emissiveIntensity,
      opacity:m.opacity,transparent:m.transparent||false,
    });
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(...o.pos);
    mesh.rotation.set(...o.rot);
    mesh.scale.set(...o.scale);
    mesh.castShadow=true;
    scene.add(mesh);
    meshes.push({mesh,data:o});
  });

  // --- HTML overlay elements ---
  const htmlEls=HTML_OVERLAYS.map(function(h){return{el:document.getElementById(h.id),data:h};});

  // --- Catmull-Rom camera path ---
  function ease(t,type){
    if(type==='ease-in') return t*t;
    if(type==='ease-out') return t*(2-t);
    if(type==='ease') return t<0.5?2*t*t:-1+(4-2*t)*t;
    return t;
  }
  function lerp3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  function catmullRom(p0,p1,p2,p3,t){
    const t2=t*t,t3=t2*t;
    return[
      0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
      0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
      0.5*((2*p1[2])+(-p0[2]+p2[2])*t+(2*p0[2]-5*p1[2]+4*p2[2]-p3[2])*t2+(-p0[2]+3*p1[2]-3*p2[2]+p3[2])*t3),
    ];
  }
  function interpolatePath(path,progress){
    if(!path||path.length===0) return null;
    if(path.length===1) return path[0];
    const t=Math.max(0,Math.min(1,progress));
    const seg=path.length-1;
    const raw=t*seg;
    const i=Math.min(Math.floor(raw),seg-1);
    const localT=ease(raw-i,(path[i]||path[0]).easing||'linear');
    const p0=path[Math.max(0,i-1)],p1=path[i],p2=path[i+1],p3=path[Math.min(seg,i+2)];
    if(path.length===2){
      return{position:lerp3(p1.position,p2.position,localT),target:lerp3(p1.target,p2.target,localT),fov:p1.fov+(p2.fov-p1.fov)*localT};
    }
    return{position:catmullRom(p0.position,p1.position,p2.position,p3.position,localT),target:catmullRom(p0.target,p1.target,p2.target,p3.target,localT),fov:p1.fov+(p2.fov-p1.fov)*localT};
  }

  // --- Scroll animation ---
  function computeScrollT(progress,enter,exit){
    let t=enter>0?Math.min(progress/enter,1):1;
    if(exit>0&&progress>exit) t=Math.max(0,1-(progress-exit)/Math.max(0.001,1-exit));
    return t;
  }

  // --- Resize ---
  function onResize(){
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
  window.addEventListener('resize',onResize);
  onResize();

  // --- Scroll ---
  let scrollProgress=0;
  const pctEl=document.getElementById('scroll-pct');
  window.addEventListener('scroll',function(){
    const max=document.body.scrollHeight-innerHeight;
    scrollProgress=max>0?scrollY/max:0;
    if(pctEl) pctEl.textContent=Math.round(scrollProgress*100)+'%';
  },{passive:true});

  // --- Render loop ---
  const target=new THREE.Vector3();
  function animate(){
    requestAnimationFrame(animate);
    // Camera path
    if(CAM_PATH.length>=2){
      const kp=interpolatePath(CAM_PATH,scrollProgress);
      if(kp){
        camera.position.set(...kp.position);
        target.set(...kp.target);
        camera.lookAt(target);
        camera.fov=kp.fov;
        camera.updateProjectionMatrix();
      }
    }
    // Per-mesh scroll animations
    meshes.forEach(function(item){
      const sa=item.data.scrollAnim;
      if(!sa||sa.effect==='none') return;
      const t=computeScrollT(scrollProgress,sa.enter,sa.exit);
      const mesh=item.mesh;
      const basePos=item.data.pos;
      const d=sa.distance||2;
      if(sa.effect==='fadeIn'){mesh.material.transparent=true;mesh.material.opacity=t*(item.data.mat.opacity||1);}
      else if(sa.effect==='scaleIn'){const s=Math.max(0.001,t);mesh.scale.set(item.data.scale[0]*s,item.data.scale[1]*s,item.data.scale[2]*s);}
      else if(sa.effect==='scaleOut'){const s=Math.max(0.001,1-t);mesh.scale.set(item.data.scale[0]*s,item.data.scale[1]*s,item.data.scale[2]*s);}
      else if(sa.effect==='slideUp'){mesh.position.set(basePos[0],basePos[1]+d*(1-t),basePos[2]);}
      else if(sa.effect==='slideDown'){mesh.position.set(basePos[0],basePos[1]-d*(1-t),basePos[2]);}
      else if(sa.effect==='slideLeft'){mesh.position.set(basePos[0]-d*(1-t),basePos[1],basePos[2]);}
      else if(sa.effect==='slideRight'){mesh.position.set(basePos[0]+d*(1-t),basePos[1],basePos[2]);}
    });
    // HTML overlay scroll animations
    htmlEls.forEach(function(item){
      if(!item.el) return;
      const sa=item.data.scrollAnim;
      const base=item.data.baseOpacity||1;
      if(!sa||sa.effect==='none'){item.el.style.opacity=base;return;}
      const t=computeScrollT(scrollProgress,sa.enter,sa.exit);
      const d=sa.scrollAnim&&sa.scrollAnim.distance?sa.scrollAnim.distance:40;
      if(sa.effect==='fadeIn'){item.el.style.opacity=t*base;}
      else if(sa.effect==='scaleIn'){item.el.style.transform='scale('+Math.max(0.001,t)+')';item.el.style.opacity=base;}
      else if(sa.effect==='scaleOut'){item.el.style.transform='scale('+Math.max(0.001,1-t)+')';item.el.style.opacity=base;}
      else if(sa.effect==='slideUp'){item.el.style.transform='translateY('+(d*(1-t))+'px)';item.el.style.opacity=base;}
      else if(sa.effect==='slideDown'){item.el.style.transform='translateY('+(-d*(1-t))+'px)';item.el.style.opacity=base;}
      else if(sa.effect==='slideLeft'){item.el.style.transform='translateX('+(-d*(1-t))+'px)';item.el.style.opacity=base;}
      else if(sa.effect==='slideRight'){item.el.style.transform='translateX('+(d*(1-t))+'px)';item.el.style.opacity=base;}
    });
    renderer.render(scene,camera);
  }
  animate();
})();
  </script>
  <!-- Note: External GLTF models and HDRI textures are not included in this standalone export -->
</body>
</html>`
}
