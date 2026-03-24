<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { useMetricsStore } from '@/stores/metrics.store'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export type BodyGender = 'male' | 'female'

const props = withDefaults(defineProps<{
  clientId: string
  gender?: BodyGender
}>(), { gender: 'male' })

const metricsStore = useMetricsStore()
const authStore    = useAuthStore()

const mountRef  = ref<HTMLDivElement | null>(null)
const overlayRef = ref<HTMLCanvasElement | null>(null)
const showLabels = ref(true)

const userName    = computed(() => authStore.user?.name?.split(' ')[0] ?? '')
const userInitial = computed(() => userName.value?.charAt(0)?.toUpperCase() ?? 'U')

// ── METRIC DEFINITIONS ──────────────────────────────────────────────────────
interface BodyMetric {
  id: string
  field: string
  label: string
  suffix: string
  worldPos: [number, number, number]
  side: 'left' | 'right'
  color: string
}

const metricDefs: BodyMetric[] = [
  { id: 'chest',   field: 'chestCm',    label: t('client.metrics.measurements.chest'),   suffix: ' cm', worldPos: [ 0.20, 0.48, 0.22], side: 'right', color: '#8b5cf6' },
  { id: 'weight',  field: 'weightKg',   label: t('client.metrics.stats.weight'),          suffix: ' kg', worldPos: [-0.20, 0.32, 0.22], side: 'left',  color: '#3b82f6' },
  { id: 'fat',     field: 'bodyFatPct', label: t('client.metrics.stats.fatPct'),          suffix: '%',   worldPos: [ 0.18, 0.12, 0.22], side: 'right', color: '#f97316' },
  { id: 'waist',   field: 'waistCm',    label: t('client.metrics.stats.waist'),           suffix: ' cm', worldPos: [-0.16, 0.00, 0.20], side: 'left',  color: '#eab308' },
  { id: 'abdomen', field: 'abdomenCm',  label: t('client.metrics.stats.abdomen'),         suffix: ' cm', worldPos: [ 0.16,-0.14, 0.20], side: 'right', color: '#a855f7' },
  { id: 'hips',    field: 'hipsCm',     label: t('client.metrics.measurements.hips'),     suffix: ' cm', worldPos: [-0.18,-0.24, 0.18], side: 'left',  color: '#22c55e' },
]

const resolvedMetrics = computed(() =>
  metricDefs.map(def => {
    const delta = metricsStore.getDelta(props.clientId, def.field as any)
    const raw   = delta?.lastValue
    const value = raw != null ? `${raw}${def.suffix}` : null
    return { ...def, value }
  }).filter((m): m is typeof m & { value: string } => m.value !== null)
)

// ── CANVAS LABEL HELPERS ─────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,       y + h - r, r)
  ctx.lineTo(x,    y + r)
  ctx.arcTo(x,     y,     x + r,   y,         r)
  ctx.closePath()
}

// ── THREE.JS STATE ───────────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null
let raf = 0
let autoTimer: ReturnType<typeof setTimeout> | null = null
let cleanupFn: (() => void) | null = null

// ─────────────────────────────────────────────────────────────────────────────
function initScene() {
  const mount   = mountRef.value
  const overlay = overlayRef.value
  if (!mount || !overlay) return

  const isFemale = props.gender === 'female'
  const W = mount.clientWidth
  const H = mount.clientHeight
  overlay.width  = W
  overlay.height = H
  const ctx = overlay.getContext('2d')!

  // ── RENDERER ────────────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x020617, 1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.inset    = '0'
  mount.insertBefore(renderer.domElement, overlay)

  // ── SCENE ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.fog   = new THREE.Fog(0x020617, 7, 18)

  // ── CAMERA ───────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 50)
  camera.position.set(0, 0.0, 4.2)
  camera.lookAt(0, 0.0, 0)

  // ── LIGHTS ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.55))

  const sun = new THREE.DirectionalLight(0xffeedd, 1.0)
  sun.position.set(2.5, 6, 4)
  sun.castShadow = true
  sun.shadow.mapSize.width  = 1024
  sun.shadow.mapSize.height = 1024
  scene.add(sun)

  const rim  = new THREE.DirectionalLight(0x4466cc, 0.45)
  rim.position.set(-3, 2, -3)
  scene.add(rim)

  const fill = new THREE.PointLight(0xfff0e8, 0.3)
  fill.position.set(0, 0.4, 2.8)
  scene.add(fill)

  // ── FLOOR ────────────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(10, 28, 0x1e293b, 0x0f172a)
  grid.position.y = -1.04
  scene.add(grid)

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.025, 48),
    new THREE.MeshLambertMaterial({ color: 0x1e293b }),
  )
  platform.position.y = -1.03
  platform.receiveShadow = true
  scene.add(platform)

  // ── MATERIALS ────────────────────────────────────────────────────────────
  const skinTone = isFemale ? 0xd8a882 : 0xd09870
  const jointTone = isFemale ? 0xc49070 : 0xbe8a60

  const skin    = new THREE.MeshStandardMaterial({ color: skinTone,  roughness: 0.65, metalness: 0 })
  const joint   = new THREE.MeshStandardMaterial({ color: jointTone, roughness: 0.70, metalness: 0 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.9,  metalness: 0 })
  const hairMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0x4a2810 : 0x241408, roughness: 0.9 })
  const cloth   = new THREE.MeshStandardMaterial({ color: 0xc0c8d4, roughness: 0.88, metalness: 0 })
  const elastic = new THREE.MeshStandardMaterial({ color: 0x7880a0, roughness: 0.85, metalness: 0 })

  // ── BODY MEASUREMENTS → SCALE FACTORS ────────────────────────────────────
  const REF = isFemale
    ? { chest: 90, waist: 70, abdomen: 76, hips: 98, thigh: 54, calf: 34, arm: 28, neck: 32, shoulder: 102 }
    : { chest: 98, waist: 80, abdomen: 84, hips: 96, thigh: 56, calf: 36, arm: 32, neck: 37, shoulder: 116 }

  function getVal(field: string): number | null {
    const d = metricsStore.getDelta(props.clientId, field as any)
    return d?.lastValue ?? null
  }
  function sf(field: string, ref: number): number {
    const v = getVal(field)
    return v != null ? Math.max(0.65, Math.min(1.75, v / ref)) : 1.0
  }
  const S = {
    chest:    sf('chestCm',           REF.chest),
    waist:    sf('waistCm',           REF.waist),
    abdomen:  sf('abdomenCm',         REF.abdomen),
    hips:     sf('hipsCm',            REF.hips),
    thigh:    sf('thighRightCm',      REF.thigh),
    calf:     sf('calfRightCm',       REF.calf),
    arm:      sf('armRelaxedRightCm', REF.arm),
    neck:     sf('neckCm',            REF.neck),
    shoulder: sf('shouldersCm',       REF.shoulder),
  }

  // ── GEOMETRY HELPERS ─────────────────────────────────────────────────────
  // Parametric mesh (u ∈ [0,1], v ∈ [0,1])
  function parametricMesh(
    fn: (u: number, v: number, t: THREE.Vector3) => void,
    uSeg: number,
    vSeg: number,
    mat: THREE.Material,
    posX = 0, posY = 0, posZ = 0,
  ): THREE.Mesh {
    const positions: number[] = []
    const indices:   number[] = []
    const tmp = new THREE.Vector3()
    for (let i = 0; i <= uSeg; i++) {
      for (let j = 0; j <= vSeg; j++) {
        fn(i / uSeg, j / vSeg, tmp)
        positions.push(tmp.x, tmp.y, tmp.z)
      }
    }
    for (let i = 0; i < uSeg; i++) {
      for (let j = 0; j < vSeg; j++) {
        const a = i * (vSeg + 1) + j
        const b = a + vSeg + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setIndex(indices)
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(posX, posY, posZ)
    mesh.castShadow = true
    scene.add(mesh)
    return mesh
  }

  // Oriented cylinder segment — cross-section always perpendicular to the direction
  function addSegment(
    start: [number, number, number],
    end:   [number, number, number],
    rStart: number,
    rEnd:   number,
    mat: THREE.Material,
  ): THREE.Mesh {
    const s   = new THREE.Vector3(...start)
    const e   = new THREE.Vector3(...end)
    const dir = new THREE.Vector3().subVectors(e, s)
    const len = dir.length()
    const mid = s.clone().add(e).multiplyScalar(0.5)
    const geo = new THREE.CylinderGeometry(rEnd, rStart, len, 16, 1, false)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(mid)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.castShadow = true
    scene.add(mesh)
    return mesh
  }

  function addSphere(
    x: number, y: number, z: number,
    r: number,
    mat: THREE.Material,
    sx = 1, sy = 1, sz = 1,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 18), mat)
    mesh.position.set(x, y, z)
    mesh.scale.set(sx, sy, sz)
    mesh.castShadow = true
    scene.add(mesh)
    return mesh
  }

  function ss(a: number, b: number, t: number): number {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)
  }

  // Cossers: localised cosine bumps — only positive contribution (clamp < 0 to 0)
  // v=0 → front (z+), v=0.25 → right (+x), v=0.5 → back (z-), v=0.75 → left (-x)
  function cossBump(u: number, v: number, cu: number, su: number, cv: number, sv: number): number {
    const du = Math.abs(u - cu)
    const dv = Math.min(Math.abs(v - cv), 1 - Math.abs(v - cv)) // wraps around
    if (du >= 1 || dv >= 1) return 0
    return su * Math.max(0, Math.cos(du * Math.PI)) * sv * Math.max(0, Math.cos(dv * Math.PI))
  }

  // ── HEAD ─────────────────────────────────────────────────────────────────
  // Oval head: slightly taller than wide, flat at back
  const headR = isFemale ? 0.148 : 0.155
  parametricMesh((u, v, t) => {
    const phi   = u * Math.PI
    const theta = v * Math.PI * 2
    // Jaw taper (narrower at bottom-front)
    const jaw = 1.0 - 0.14 * Math.max(0, Math.sin(phi) - 0.25) * Math.max(0, Math.cos(theta))
    // Brow ridge (male)
    const brow = isFemale ? 0 : 0.009 * Math.max(0, Math.cos((phi - 0.32) * 6)) * Math.max(0, Math.cos(theta))
    // Flatten back
    const fz   = 0.93 + 0.07 * Math.max(0, Math.cos(theta))
    const r    = headR * jaw + brow
    t.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) * 1.10, r * Math.sin(phi) * Math.cos(theta) * fz)
  }, 28, 28, skin, 0, 0.89, 0)

  // Hair cap
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(headR + 0.009, 24, 16, 0, Math.PI * 2, 0, isFemale ? 0.64 * Math.PI : 0.56 * Math.PI),
    hairMat,
  )
  hairMesh.position.set(0, 0.915, -0.008)
  hairMesh.scale.set(1.04, 1.06, 1.02)
  scene.add(hairMesh)

  // Facial features
  addSphere(-0.054, 0.90, 0.134, 0.022, darkMat)       // L eye
  addSphere( 0.054, 0.90, 0.134, 0.022, darkMat)       // R eye
  addSphere( 0.000, 0.86, 0.152, 0.015, joint, 0.8, 1, 1.2) // nose tip
  addSphere( 0.000, 0.84, 0.145, 0.020, joint, 1.5, 0.35, 0.5) // lips
  addSphere(-0.148, 0.89, 0.0, 0.024, joint, 0.44, 0.9, 0.68) // L ear
  addSphere( 0.148, 0.89, 0.0, 0.024, joint, 0.44, 0.9, 0.68) // R ear

  // ── NECK ─────────────────────────────────────────────────────────────────
  const neckR = (isFemale ? 0.052 : 0.064) * S.neck
  parametricMesh((u, v, t) => {
    const theta = v * Math.PI * 2
    const r = (neckR * 1.15) + ((neckR * 0.87) - (neckR * 1.15)) * u
    // Slight forward lean at top
    const zShift = 0.006 * u
    t.set(r * Math.sin(theta), u * 0.105, r * Math.cos(theta) + zShift)
  }, 8, 16, skin, 0, 0.695, 0)

  // ── TORSO ────────────────────────────────────────────────────────────────
  // u=0 → bottom (pelvis y=-0.18), u=1 → top (shoulder y=0.70)
  // FIX: height 0.88 fills gap to neck (was 0.78, causing 5cm void)
  // FIX: v=0 is FRONT (+z), v=0.25 is RIGHT (+x)
  const torsoH  = 0.88
  parametricMesh((u, v, t) => {
    const theta = v * Math.PI * 2
    const h     = u * torsoH

    let r: number
    if (isFemale) {
      r = 0.058
        + 0.12  * S.hips    * Math.exp(-((u - 0.14) ** 2) / 0.009)
        - 0.042 * S.waist   * Math.exp(-((u - 0.36) ** 2) / 0.008)
        + 0.030 * Math.max(0, S.abdomen - 1) * Math.exp(-((u - 0.26) ** 2) / 0.010)
        + 0.100 * S.chest   * Math.exp(-((u - 0.60) ** 2) / 0.014)
        + 0.085 * S.shoulder * Math.exp(-((u - 0.80) ** 2) / 0.010)
        + 0.048 * ss(0, 0.08, u)
        - 0.090 * ss(0.88, 1.0, u)
        // Bust bumps (front only, v≈0 and v≈1 wraps to front)
        + cossBump(u, v, 0.60, 0.040 * S.chest, 0.08, 0.45)
        + cossBump(u, v, 0.60, 0.040 * S.chest, 0.92, 0.45)
    } else {
      r = 0.058
        + 0.095 * S.hips    * Math.exp(-((u - 0.14) ** 2) / 0.009)
        - 0.018 * S.waist   * Math.exp(-((u - 0.38) ** 2) / 0.010)
        + 0.028 * Math.max(0, S.abdomen - 1) * Math.exp(-((u - 0.27) ** 2) / 0.010)
        + 0.115 * S.chest   * Math.exp(-((u - 0.62) ** 2) / 0.015)
        + 0.110 * S.shoulder * Math.exp(-((u - 0.80) ** 2) / 0.009)
        + 0.045 * ss(0, 0.08, u)
        - 0.110 * ss(0.90, 1.0, u)
        // FIX: pectorals at v≈0.10 (right pec, front-right) and v≈0.90 (left pec, front-left)
        // BEFORE: was v=0.45 and v=0.55 which mapped to the SIDES, not the front
        + cossBump(u, v, 0.66, 0.040 * S.chest, 0.10, 0.48)
        + cossBump(u, v, 0.66, 0.040 * S.chest, 0.90, 0.48)
        // Obliques (sides: v=0.25 = right side, v=0.75 = left side) ← already correct
        + cossBump(u, v, 0.34, 0.012, 0.25, 0.35)
        + cossBump(u, v, 0.34, 0.012, 0.75, 0.35)
        // Serratus (front-side, ribs)
        + cossBump(u, v, 0.52, 0.008, 0.18, 0.25)
        + cossBump(u, v, 0.55, 0.007, 0.16, 0.25)
        + cossBump(u, v, 0.52, 0.008, 0.82, 0.25)
        + cossBump(u, v, 0.55, 0.007, 0.84, 0.25)
    }

    // Flatten back slightly
    r *= 1.0 - 0.055 * Math.max(0, -Math.cos(theta))

    // FIX: linea alba groove at front (theta=0, z+) using cosine, not v=0.5
    // BEFORE: code subtracted based on exp at v=0.5 which is the BACK
    if (!isFemale) {
      const frontFacing = Math.max(0, Math.cos(theta))
      const centerline  = Math.exp(-((Math.sin(theta)) ** 2) / 0.003)
      r -= 0.008 * frontFacing * centerline * ss(0.22, 0.60, u) * ss(0.60, 0.22, u)
    }

    t.set(r * Math.sin(theta), h, r * Math.cos(theta))
  }, 30, 24, skin, 0, -0.18, 0)

  // ── SHOULDERS ────────────────────────────────────────────────────────────
  const shW  = (isFemale ? 0.19 : 0.225) * S.shoulder
  const shR  = (isFemale ? 0.082 : 0.095) * S.shoulder
  addSphere(-shW, 0.565, 0, shR, joint)
  addSphere( shW, 0.565, 0, shR, joint)

  // ── ARMS ─────────────────────────────────────────────────────────────────
  // FIX: replaced broken createLimb (wrong XZ cross-section) with oriented cylinders.
  // The arm goes mostly downward (Y direction) with slight outward X offset.
  // Oriented CylinderGeometry cross-section is always perpendicular to the arm axis.

  const armTop = (isFemale ? 0.054 : 0.068) * S.arm
  const armMid = (isFemale ? 0.044 : 0.056) * S.arm
  const armBot = (isFemale ? 0.035 : 0.046) * S.arm
  const foreTop = (isFemale ? 0.042 : 0.052) * S.arm
  const foreBot = (isFemale ? 0.028 : 0.036) * S.arm

  for (const sign of [-1, 1] as const) {
    const sx = shW * sign

    // Shoulder joint → elbow
    const elbow:  [number, number, number] = [sx + sign * 0.068, 0.185, 0.010]
    const wrist:  [number, number, number] = [sx + sign * 0.120, -0.195, 0.008]
    const hand:   [number, number, number] = [sx + sign * 0.128, -0.260, 0.010]

    addSegment([sx * 0.90, 0.555, 0], elbow, armTop, armMid, skin)
    addSphere(...elbow, armMid * 1.02, joint)                          // elbow
    addSegment(elbow, wrist, foreTop, foreBot, skin)
    addSphere(...wrist, foreBot * 1.0, joint)                          // wrist
    // Hand: slightly flattened sphere
    addSphere(...hand, (isFemale ? 0.030 : 0.037), joint, 0.80, 1.05, 0.72)
  }

  // ── LEGS ─────────────────────────────────────────────────────────────────
  const legX = (isFemale ? 0.092 : 0.095) * S.hips
  const thR1 = (isFemale ? 0.090 : 0.096) * S.thigh
  const thR2 = (isFemale ? 0.068 : 0.072) * S.thigh
  const caR1 = (isFemale ? 0.064 : 0.068) * S.calf
  const caR2 = (isFemale ? 0.040 : 0.045) * S.calf

  for (const sign of [-1, 1] as const) {
    const lx = legX * sign

    const knee:  [number, number, number] = [lx, -0.535, 0.010]
    const ankle: [number, number, number] = [lx, -0.905, 0.000]
    const foot:  [number, number, number] = [lx, -0.965, 0.035]

    // Thigh: starts above pelvis bottom for seamless join with torso
    addSegment([lx, -0.145, 0], knee, thR1, thR2, skin)

    // Knee cap
    addSphere(...knee, thR2 * 1.06, joint, 1.0, 0.90, 1.10)

    // Calf with gastrocnemius bulge (parametric, more realistic than cylinder)
    parametricMesh((u, v, t) => {
      const theta = v * Math.PI * 2
      let r = caR1 + (caR2 - caR1) * u
      // Gastrocnemius (back of calf): bump behind at v≈0.5 (back)
      r += 0.018 * S.calf * Math.exp(-((u - 0.28) ** 2) / 0.022) * Math.max(0, -Math.cos(theta))
      r *= ss(1.0, 0.94, u)
      r  = Math.max(r, caR2 * 0.6)
      // Path follows straight leg (knee to ankle)
      const py = knee[1] + (ankle[1] - knee[1]) * u
      t.set(lx + r * Math.sin(theta), py, r * Math.cos(theta))
    }, 18, 14, skin)

    addSphere(...ankle, caR2 * 0.90, joint)

    // Foot (low box)
    const footGeo = new THREE.BoxGeometry(
      isFemale ? 0.082 : 0.096,
      0.044,
      isFemale ? 0.20 : 0.23,
    )
    const footMesh = new THREE.Mesh(footGeo, joint)
    footMesh.position.set(lx, foot[1], foot[2])
    footMesh.castShadow = true
    scene.add(footMesh)
  }

  // ── SHORTS / UNDERWEAR ────────────────────────────────────────────────────
  parametricMesh((u, v, t) => {
    const theta = v * Math.PI * 2
    const hipR   = (isFemale ? 0.185 : 0.178) * S.hips
    const waistR = (isFemale ? 0.165 : 0.158) * S.waist
    let r = waistR + (hipR - waistR) * u
    r += 0.010 // slight offset from body

    // Flatten back very slightly
    r *= 1.0 - 0.04 * Math.max(0, -Math.cos(theta))

    // Split at crotch: separate legs below ~65%
    if (u > 0.60) {
      const split = ss(0.60, 1.0, u) * 0.09
      const side  = Math.sin(theta) > 0 ? 1 : -1
      t.set(r * Math.sin(theta) + side * split, u * 0.195, r * Math.cos(theta))
    } else {
      t.set(r * Math.sin(theta), u * 0.195, r * Math.cos(theta))
    }
  }, 18, 22, cloth, 0, -0.218, 0)

  // Waistband
  parametricMesh((u, v, t) => {
    const theta = v * Math.PI * 2
    const r = ((isFemale ? 0.165 : 0.158) * S.waist + 0.013)
    r * (1.0 - 0.03 * Math.max(0, -Math.cos(theta)))
    t.set(r * Math.sin(theta), u * 0.016, r * Math.cos(theta))
  }, 3, 22, elastic, 0, -0.220, 0)

  // ── METRIC ORBS ───────────────────────────────────────────────────────────
  const currentMetrics = resolvedMetrics.value
  const orbs = currentMetrics.map(m => {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 14, 14),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(m.color) }),
    )
    orb.position.set(...m.worldPos)
    scene.add(orb)

    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(m.color), transparent: true, opacity: 0.55,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.007, 8, 28), ringMat)
    ring.position.set(...m.worldPos)
    scene.add(ring)

    return { orb, ring, ringMat, metric: m }
  })

  // ── SCAN LINE ────────────────────────────────────────────────────────────
  const scanMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6, transparent: true, opacity: 0.05,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.05), scanMat)
  scanPlane.rotation.x = Math.PI / 2
  scene.add(scanPlane)

  // ── ORBIT ────────────────────────────────────────────────────────────────
  let theta  = 0,   phi    = 1.44, radius = 4.2
  let tTheta = 0.0, tPhi   = 1.44
  let autoRotate = true

  const pauseAuto = () => {
    autoRotate = false
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(() => { autoRotate = true }, 4000)
  }

  // ── INPUT ─────────────────────────────────────────────────────────────────
  const drag = { active: false, x: 0, y: 0 }

  const getXY = (e: MouseEvent | TouchEvent) =>
    'touches' in e && e.touches.length
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }

  const onDown  = (e: MouseEvent | TouchEvent) => { const p = getXY(e); drag.active = true; drag.x = p.x; drag.y = p.y; pauseAuto() }
  const onUp    = () => { drag.active = false }
  const onMove  = (e: MouseEvent | TouchEvent) => {
    if (!drag.active) return
    const p  = getXY(e)
    const dx = p.x - drag.x
    const dy = p.y - drag.y
    drag.x = p.x; drag.y = p.y
    tTheta -= dx * 0.007
    tPhi    = Math.max(0.35, Math.min(Math.PI - 0.35, tPhi + dy * 0.007))
  }
  const onWheel = (e: WheelEvent) => { radius = Math.max(2.2, Math.min(7.5, radius + e.deltaY * 0.004)) }

  mount.addEventListener('mousedown',  onDown)
  window.addEventListener('mouseup',   onUp)
  window.addEventListener('mousemove', onMove)
  mount.addEventListener('wheel',      onWheel, { passive: true })
  mount.addEventListener('touchstart', onDown as EventListener,  { passive: true })
  window.addEventListener('touchend',  onUp)
  window.addEventListener('touchmove', onMove as EventListener,  { passive: true })

  // ── LABEL PROJECTION ──────────────────────────────────────────────────────
  const project = (worldPos: [number, number, number]) => {
    const v = new THREE.Vector3(...worldPos).project(camera)
    return { x: ((v.x + 1) / 2) * W, y: (-(v.y - 1) / 2) * H, visible: v.z < 1.0 }
  }

  const BOX_W = 120, BOX_H = 46

  const drawLabel = (m: (typeof currentMetrics)[0], sx: number, sy: number) => {
    const spaceR = W - sx, spaceL = sx
    const right   = m.side === 'right' ? spaceR > BOX_W + 50 : spaceL < BOX_W + 50
    const lineLen = Math.min(160, (right ? spaceR : spaceL) - BOX_W - 14)
    if (lineLen < 18) return
    const ex = right ? sx + lineLen : sx - lineLen
    let bx = right ? ex : ex - BOX_W
    let by = sy - BOX_H / 2
    bx = Math.max(4, Math.min(W - BOX_W - 4, bx))
    by = Math.max(4, Math.min(H - BOX_H - 4, by))

    // Orb glow
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2)
    ctx.fillStyle = m.color + '22'; ctx.fill()
    // Orb dot
    ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = m.color; ctx.fill()
    // Line
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, sy)
    ctx.strokeStyle = m.color + '88'; ctx.lineWidth = 1.2
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([])
    // Box bg
    ctx.fillStyle = 'rgba(2,6,23,0.90)'
    roundRect(ctx, bx, by, BOX_W, BOX_H, 7); ctx.fill()
    // Box border
    ctx.strokeStyle = m.color + '50'; ctx.lineWidth = 1
    roundRect(ctx, bx, by, BOX_W, BOX_H, 7); ctx.stroke()
    // Accent bar
    ctx.fillStyle = m.color
    roundRect(ctx, bx + 1, by + 8, 3, BOX_H - 16, 2); ctx.fill()
    // Text
    ctx.font = '10px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#94a3b8'; ctx.fillText(m.label, bx + 11, by + 18)
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#fff'; ctx.fillText(m.value, bx + 11, by + 35)
  }

  // ── ANIMATION LOOP ────────────────────────────────────────────────────────
  let time = 0

  const tick = () => {
    raf  = requestAnimationFrame(tick)
    time += 0.016

    if (autoRotate) tTheta += 0.0025
    theta  += (tTheta - theta) * 0.08
    phi    += (tPhi   - phi)   * 0.08

    camera.position.x = radius * Math.sin(phi) * Math.sin(theta)
    camera.position.y = 0.02   + radius * Math.cos(phi)
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta)
    camera.lookAt(0, 0.02, 0)

    orbs.forEach(({ orb, ring, ringMat }, i) => {
      const show = showLabels.value
      orb.visible  = show
      ring.visible = show
      if (show) {
        orb.scale.setScalar(1 + 0.22 * Math.sin(time * 2.8 + i))
        ring.rotation.z = time * 1.3 + i * 0.6
        ring.rotation.x = time * 0.9 + i * 0.3
        ringMat.opacity = 0.3 + 0.22 * Math.sin(time * 2.2 + i * 0.7)
      }
    })

    // Scan line
    scanPlane.position.y = -1.0 + ((Math.sin(time * 0.44) + 1) / 2) * 2.1
    scanMat.opacity       = 0.040 + 0.025 * Math.sin(time * 3.5)

    renderer!.render(scene, camera)

    // 2D labels
    ctx.clearRect(0, 0, W, H)
    if (showLabels.value) {
      orbs.forEach(({ metric }) => {
        const { x, y, visible } = project(metric.worldPos)
        if (visible && x > 20 && x < W - 20 && y > 20 && y < H - 20) {
          drawLabel(metric, x, y)
        }
      })
    }
  }

  tick()

  // ── CLEANUP ──────────────────────────────────────────────────────────────
  cleanupFn = () => {
    cancelAnimationFrame(raf)
    if (autoTimer) clearTimeout(autoTimer)
    mount.removeEventListener('mousedown',  onDown)
    window.removeEventListener('mouseup',   onUp)
    window.removeEventListener('mousemove', onMove)
    mount.removeEventListener('wheel',      onWheel)
    mount.removeEventListener('touchstart', onDown as EventListener)
    window.removeEventListener('touchend',  onUp)
    window.removeEventListener('touchmove', onMove as EventListener)
    renderer?.dispose()
    if (renderer && mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    renderer = null
  }
}

onMounted(initScene)
onBeforeUnmount(() => cleanupFn?.())
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border border-border/70 bg-slate-950">
    <!-- 3D mount -->
    <div
      ref="mountRef"
      class="relative h-[420px] cursor-grab active:cursor-grabbing sm:h-[520px]"
      style="touch-action: none;"
    >
      <!-- 2D label overlay -->
      <canvas
        ref="overlayRef"
        class="pointer-events-none absolute inset-0 z-10"
      />

      <!-- Title -->
      <div class="absolute left-4 top-4 z-20 select-none">
        <div class="text-[15px] font-bold tracking-tight text-white">
          {{ t('client.metrics.bodyScanner') }}
        </div>
        <div class="mt-0.5 text-[10px] tracking-widest text-blue-400/80 uppercase">
          FitCoach · 3D
        </div>
      </div>

      <!-- User badge -->
      <div class="absolute right-4 top-4 z-20 flex items-center gap-2 select-none">
        <div class="hidden flex-col items-end sm:flex">
          <span class="text-sm font-semibold text-white">{{ userName }}</span>
          <span class="text-[10px] text-emerald-400">● {{ t('client.metrics.liveData') }}</span>
        </div>
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
          style="background: linear-gradient(135deg, #3b82f6, #8b5cf6)"
        >
          {{ userInitial }}
        </div>
      </div>

      <!-- Labels toggle -->
      <button
        class="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all"
        :class="showLabels
          ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 hover:bg-blue-500/30'
          : 'bg-white/5 text-slate-500 hover:bg-white/10'"
        @click="showLabels = !showLabels"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path v-if="showLabels" stroke-linecap="round" stroke-linejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path v-if="showLabels" stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path v-if="!showLabels" stroke-linecap="round" stroke-linejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
        Labels
      </button>

      <!-- Hint -->
      <div class="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 select-none text-[10px] text-slate-700">
        {{ t('client.metrics.dragHint', 'Arrastra · Scroll para zoom') }}
      </div>
    </div>
  </div>
</template>