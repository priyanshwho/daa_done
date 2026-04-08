import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'

type HeroProps = {
  isDarkMode: boolean
}

const TUNNEL_WIDTH = 24
const TUNNEL_HEIGHT = 16
const SEGMENT_DEPTH = 6
const NUM_SEGMENTS = 14
const FOG_DENSITY = 0.02
const FLOOR_COLS = 6
const WALL_ROWS = 4

const COL_WIDTH = TUNNEL_WIDTH / FLOOR_COLS
const ROW_HEIGHT = TUNNEL_HEIGHT / WALL_ROWS

const imageUrls = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1488161628813-99c974c76949?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1521119989659-a83eee488058?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&fit=crop',
]

const Hero = ({ isDarkMode }: HeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const segmentsRef = useRef<THREE.Group[]>([])
  const scrollPosRef = useRef(0)

  const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose())
      return
    }

    const basicMaterial = material as THREE.MeshBasicMaterial
    basicMaterial.map?.dispose()
    material.dispose()
  }

  const populateImages = (group: THREE.Group, w: number, h: number, d: number) => {
    const textureLoader = new THREE.TextureLoader()
    const cellMargin = 0.4

    const addImage = (position: THREE.Vector3, rotation: THREE.Euler, width: number, height: number) => {
      const selectedUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)]
      const geometry = new THREE.PlaneGeometry(width - cellMargin, height - cellMargin)
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })

      textureLoader.load(selectedUrl, (texture: THREE.Texture) => {
        texture.minFilter = THREE.LinearFilter
        material.map = texture
        material.needsUpdate = true
        gsap.to(material, { opacity: 0.85, duration: 1 })
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      mesh.rotation.copy(rotation)
      mesh.name = 'slab_image'
      group.add(mesh)
    }

    let lastFloorIndex = -999
    for (let index = 0; index < FLOOR_COLS; index += 1) {
      if (index > lastFloorIndex + 1 && Math.random() > 0.8) {
        addImage(
          new THREE.Vector3(-w + index * COL_WIDTH + COL_WIDTH / 2, -h, -d / 2),
          new THREE.Euler(-Math.PI / 2, 0, 0),
          COL_WIDTH,
          d,
        )
        lastFloorIndex = index
      }
    }

    let lastCeilIndex = -999
    for (let index = 0; index < FLOOR_COLS; index += 1) {
      if (index > lastCeilIndex + 1 && Math.random() > 0.88) {
        addImage(
          new THREE.Vector3(-w + index * COL_WIDTH + COL_WIDTH / 2, h, -d / 2),
          new THREE.Euler(Math.PI / 2, 0, 0),
          COL_WIDTH,
          d,
        )
        lastCeilIndex = index
      }
    }

    let lastLeftIndex = -999
    for (let index = 0; index < WALL_ROWS; index += 1) {
      if (index > lastLeftIndex + 1 && Math.random() > 0.8) {
        addImage(
          new THREE.Vector3(-w, -h + index * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
          new THREE.Euler(0, Math.PI / 2, 0),
          d,
          ROW_HEIGHT,
        )
        lastLeftIndex = index
      }
    }

    let lastRightIndex = -999
    for (let index = 0; index < WALL_ROWS; index += 1) {
      if (index > lastRightIndex + 1 && Math.random() > 0.8) {
        addImage(
          new THREE.Vector3(w, -h + index * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
          new THREE.Euler(0, -Math.PI / 2, 0),
          d,
          ROW_HEIGHT,
        )
        lastRightIndex = index
      }
    }
  }

  const createSegment = (zPosition: number) => {
    const group = new THREE.Group()
    group.position.z = zPosition

    const w = TUNNEL_WIDTH / 2
    const h = TUNNEL_HEIGHT / 2
    const d = SEGMENT_DEPTH

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xb0b0b0,
      transparent: true,
      opacity: 0.5,
    })

    const lineGeometry = new THREE.BufferGeometry()
    const vertices: number[] = []

    for (let index = 0; index <= FLOOR_COLS; index += 1) {
      const x = -w + index * COL_WIDTH
      vertices.push(x, -h, 0, x, -h, -d)
      vertices.push(x, h, 0, x, h, -d)
    }

    for (let index = 1; index < WALL_ROWS; index += 1) {
      const y = -h + index * ROW_HEIGHT
      vertices.push(-w, y, 0, -w, y, -d)
      vertices.push(w, y, 0, w, y, -d)
    }

    vertices.push(-w, -h, 0, w, -h, 0)
    vertices.push(-w, h, 0, w, h, 0)
    vertices.push(-w, -h, 0, -w, h, 0)
    vertices.push(w, -h, 0, w, h, 0)

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    group.add(lines)

    populateImages(group, w, h, d)
    return group
  }

  useEffect(() => {
    gsap.config({
      autoSleep: 60,
      force3D: true,
    })
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.fog = new THREE.FogExp2(0xffffff, FOG_DENSITY)
    sceneRef.current = scene

    const width = window.innerWidth
    const height = window.innerHeight
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000)
    camera.position.set(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    const segments: THREE.Group[] = []
    for (let index = 0; index < NUM_SEGMENTS; index += 1) {
      const z = -index * SEGMENT_DEPTH
      const segment = createSegment(z)
      scene.add(segment)
      segments.push(segment)
    }
    segmentsRef.current = segments

    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) {
        return
      }

      const targetZ = -scrollPosRef.current * 0.05
      const currentZ = cameraRef.current.position.z
      cameraRef.current.position.z += (targetZ - currentZ) * 0.1

      const tunnelLength = NUM_SEGMENTS * SEGMENT_DEPTH
      const cameraZ = cameraRef.current.position.z

      segmentsRef.current.forEach((segment) => {
        if (segment.position.z > cameraZ + SEGMENT_DEPTH) {
          let minZ = 0
          segmentsRef.current.forEach((entry) => {
            minZ = Math.min(minZ, entry.position.z)
          })
          segment.position.z = minZ - SEGMENT_DEPTH

          const toRemove: THREE.Object3D[] = []
          segment.traverse((child: THREE.Object3D) => {
            if (child.name === 'slab_image') {
              toRemove.push(child)
            }
          })

          toRemove.forEach((child) => {
            segment.remove(child)
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose()
              disposeMaterial(child.material)
            }
          })

          const w = TUNNEL_WIDTH / 2
          const h = TUNNEL_HEIGHT / 2
          populateImages(segment, w, h, SEGMENT_DEPTH)
        }

        if (segment.position.z < cameraZ - tunnelLength - SEGMENT_DEPTH) {
          let maxZ = -999999
          segmentsRef.current.forEach((entry) => {
            maxZ = Math.max(maxZ, entry.position.z)
          })
          segment.position.z = maxZ + SEGMENT_DEPTH

          const toRemove: THREE.Object3D[] = []
          segment.traverse((child: THREE.Object3D) => {
            if (child.name === 'slab_image') {
              toRemove.push(child)
            }
          })

          toRemove.forEach((child) => {
            segment.remove(child)
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose()
              disposeMaterial(child.material)
            }
          })

          const w = TUNNEL_WIDTH / 2
          const h = TUNNEL_HEIGHT / 2
          populateImages(segment, w, h, SEGMENT_DEPTH)
        }
      })

      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animate()

    const onScroll = () => {
      scrollPosRef.current = window.scrollY
    }

    const handleResize = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
    }

    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)

      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          disposeMaterial(child.material)
        }

        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose()
          disposeMaterial(child.material)
        }
      })

      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) {
      return
    }

    const backgroundColor = isDarkMode ? 0x050505 : 0xffffff
    const lineColor = isDarkMode ? 0x555555 : 0xb0b0b0
    const lineOpacity = isDarkMode ? 0.35 : 0.5

    sceneRef.current.background = new THREE.Color(backgroundColor)
    if (sceneRef.current.fog) {
      ;(sceneRef.current.fog as THREE.FogExp2).color.setHex(backgroundColor)
    }

    segmentsRef.current.forEach((segment) => {
      segment.children.forEach((child: THREE.Object3D) => {
        if (child instanceof THREE.LineSegments) {
          const material = child.material as THREE.LineBasicMaterial
          material.color.setHex(lineColor)
          material.opacity = lineOpacity
          material.needsUpdate = true
        }
      })
    })
  }, [isDarkMode])

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.5 },
      )
    }, containerRef)

    return () => {
      context.revert()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[10000vh] transition-colors duration-700 ${
        isDarkMode ? 'bg-[#050505]' : 'bg-white'
      }`}
    >
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div
          ref={contentRef}
          className="text-center flex flex-col items-center max-w-3xl px-6 pointer-events-auto mix-blend-normal"
        >
          <h1
            className={`text-[3.6rem] md:text-[6rem] lg:text-[7.4rem] leading-[0.85] font-bold tracking-tighter mb-8 transition-colors duration-500 ${
              isDarkMode ? 'text-white' : 'text-[#0F0F0F]'
            }`}
          >
            Deconstruct commerce.
          </h1>

          <p
            className={`text-lg md:text-xl font-normal max-w-lg leading-relaxed mb-10 transition-colors duration-500 ${
              isDarkMode ? 'text-gray-400' : 'text-[#6B6B6B]'
            }`}
          >
            Build your ecommerce platform with modular storefronts, smart inventory, and
            conversion-focused checkout flows,
            <span className="text-[#E85D35] font-medium"> all in one place</span>
          </p>

          <div className="flex items-center gap-6">
            <button
              className={`rounded-full px-8 py-3.5 text-sm font-medium hover:scale-105 transition-all duration-300 ${
                isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#0F0F0F] text-white'
              }`}
            >
              Start selling
            </button>
            <button
              className={`text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-1 ${
                isDarkMode ? 'text-white' : 'text-[#0F0F0F]'
              }`}
            >
              Explore features <span>-&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
