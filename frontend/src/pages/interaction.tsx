import { useEffect, useRef, useState } from 'react'
import './interaction.css'

type ShirtId = 'ratphex' | 'ratwardScissor' | 'animalCollective'

type ShirtConfig = {
  id: ShirtId
  productSrc: string
  modelSrc: string
  modelHoverSrc: string
  shirtName: string
  modelSize: 'S' | 'L' | 'XL'
  positionClass: 'top-left' | 'middle-right' | 'bottom-left'
}

type DragState = {
  id: ShirtId
  element: HTMLImageElement
  pointerId: number
  lastX: number
  lastY: number
  idleTimer: number | null
}

const MODEL_HEIGHT = '5ft 4"'

const SHIRTS: ShirtConfig[] = [
  {
    id: 'ratphex',
    productSrc: '/interact-assets/1Product.png',
    modelSrc: '/interact-assets/1Model.png',
    modelHoverSrc: '/interact-assets/1ModelHover.png',
    shirtName: 'Ratphex-T',
    modelSize: 'L',
    positionClass: 'top-left',
  },
  {
    id: 'ratwardScissor',
    productSrc: '/interact-assets/2Product.png',
    modelSrc: '/interact-assets/2Model.png',
    modelHoverSrc: '/interact-assets/2ModelHover.png',
    shirtName: 'RatwardScissor-T',
    modelSize: 'XL',
    positionClass: 'middle-right',
  },
  {
    id: 'animalCollective',
    productSrc: '/interact-assets/3Product.png',
    modelSrc: '/interact-assets/3Model.png',
    modelHoverSrc: '/interact-assets/3ModelHover.png',
    shirtName: 'AnimalCollective-T',
    modelSize: 'S',
    positionClass: 'bottom-left',
  },
]

const SHIRT_BY_ID: Record<ShirtId, ShirtConfig> = SHIRTS.reduce(
  (accumulator, shirt) => {
    accumulator[shirt.id] = shirt
    return accumulator
  },
  {} as Record<ShirtId, ShirtConfig>,
)

const rectanglesOverlap = (shirtRect: DOMRect, centerRect: DOMRect) => {
  return !(
    shirtRect.right < centerRect.left ||
    shirtRect.left > centerRect.right ||
    shirtRect.bottom < centerRect.top ||
    shirtRect.top > centerRect.bottom
  )
}

const shirtCenterInsideModel = (shirtRect: DOMRect, centerRect: DOMRect) => {
  const shirtCenterX = shirtRect.left + shirtRect.width / 2
  const shirtCenterY = shirtRect.top + shirtRect.height / 2

  return (
    shirtCenterX >= centerRect.left &&
    shirtCenterX <= centerRect.right &&
    shirtCenterY >= centerRect.top &&
    shirtCenterY <= centerRect.bottom
  )
}

const Interaction = () => {
  const centerImageRef = useRef<HTMLImageElement | null>(null)
  const infoTooltipRef = useRef<HTMLButtonElement | null>(null)
  const shirtRefs = useRef<Record<ShirtId, HTMLImageElement | null>>({
    ratphex: null,
    ratwardScissor: null,
    animalCollective: null,
  })
  const offsetsRef = useRef<Record<ShirtId, { x: number; y: number }>>({
    ratphex: { x: 0, y: 0 },
    ratwardScissor: { x: 0, y: 0 },
    animalCollective: { x: 0, y: 0 },
  })
  const dragRef = useRef<DragState | null>(null)

  const [centerBaseId, setCenterBaseId] = useState<ShirtId>('ratphex')
  const [isCenterHovered, setIsCenterHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [activeShirtId, setActiveShirtId] = useState<ShirtId | null>(null)

  const centerModel = SHIRT_BY_ID[centerBaseId]
  const centerDisplaySrc = isCenterHovered ? centerModel.modelHoverSrc : centerModel.modelSrc
  const tooltipText = `Model is ${MODEL_HEIGHT} and wears size ${centerModel.modelSize}`

  const resetShirtVisualState = (shirtElement: HTMLImageElement) => {
    shirtElement.classList.remove('grabbed', 'dragging-right', 'dragging-left')
    shirtElement.style.setProperty('--drag-x', '0px')
    shirtElement.style.setProperty('--drag-y', '0px')
  }

  const setShirtRef = (id: ShirtId) => {
    return (element: HTMLImageElement | null) => {
      shirtRefs.current[id] = element
    }
  }

  useEffect(() => {
    let isUnmounted = false

    const sourceSet = new Set<string>()
    SHIRTS.forEach((shirt) => {
      sourceSet.add(shirt.productSrc)
      sourceSet.add(shirt.modelSrc)
      sourceSet.add(shirt.modelHoverSrc)
    })

    const allSources = Array.from(sourceSet)
    if (allSources.length === 0) {
      setIsLoading(false)
      return
    }

    let loadedCount = 0
    const completeLoad = () => {
      loadedCount += 1
      if (!isUnmounted && loadedCount === allSources.length) {
        setIsLoading(false)
      }
    }

    allSources.forEach((source) => {
      const image = new Image()
      image.onload = completeLoad
      image.onerror = completeLoad
      image.src = source
    })

    return () => {
      isUnmounted = true
    }
  }, [])

  useEffect(() => {
    if (!tooltipVisible) {
      return
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const tooltipElement = infoTooltipRef.current
      if (!tooltipElement) {
        return
      }

      if (!tooltipElement.contains(event.target as Node)) {
        setTooltipVisible(false)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [tooltipVisible])

  useEffect(() => {
    const evaluateHoverCollision = (shirtElement: HTMLImageElement) => {
      const centerElement = centerImageRef.current
      if (!centerElement) {
        return false
      }

      return rectanglesOverlap(
        shirtElement.getBoundingClientRect(),
        centerElement.getBoundingClientRect(),
      )
    }

    const evaluateDropCollision = (shirtElement: HTMLImageElement) => {
      const centerElement = centerImageRef.current
      if (!centerElement) {
        return false
      }

      return shirtCenterInsideModel(
        shirtElement.getBoundingClientRect(),
        centerElement.getBoundingClientRect(),
      )
    }

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      event.preventDefault()

      const deltaX = event.clientX - drag.lastX
      const deltaY = event.clientY - drag.lastY
      drag.lastX = event.clientX
      drag.lastY = event.clientY

      const nextOffset = offsetsRef.current[drag.id]
      nextOffset.x += deltaX
      nextOffset.y += deltaY

      drag.element.style.setProperty('--drag-x', `${nextOffset.x}px`)
      drag.element.style.setProperty('--drag-y', `${nextOffset.y}px`)

      drag.element.classList.remove('grabbed', 'dragging-right', 'dragging-left')
      if (Math.abs(deltaX) > 2) {
        drag.element.classList.add(deltaX > 0 ? 'dragging-right' : 'dragging-left')
      } else {
        drag.element.classList.add('grabbed')
      }

      if (drag.idleTimer !== null) {
        window.clearTimeout(drag.idleTimer)
      }

      drag.idleTimer = window.setTimeout(() => {
        drag.element.classList.remove('dragging-right', 'dragging-left')
        drag.element.classList.add('grabbed')
      }, 60)

      setIsCenterHovered(evaluateHoverCollision(drag.element))
    }

    const handlePointerEnd = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      if (drag.idleTimer !== null) {
        window.clearTimeout(drag.idleTimer)
      }

      if (evaluateDropCollision(drag.element)) {
        setCenterBaseId(drag.id)
      }

      offsetsRef.current[drag.id] = { x: 0, y: 0 }
      resetShirtVisualState(drag.element)

      if (drag.element.hasPointerCapture(event.pointerId)) {
        drag.element.releasePointerCapture(event.pointerId)
      }

      dragRef.current = null
      setIsCenterHovered(false)
      setActiveShirtId(null)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)

      const drag = dragRef.current
      if (drag?.idleTimer !== null && drag?.idleTimer !== undefined) {
        window.clearTimeout(drag.idleTimer)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      SHIRTS.forEach((shirt) => {
        offsetsRef.current[shirt.id] = { x: 0, y: 0 }
        const shirtElement = shirtRefs.current[shirt.id]
        if (shirtElement) {
          resetShirtVisualState(shirtElement)
        }
      })

      dragRef.current = null
      setActiveShirtId(null)
      setIsCenterHovered(false)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handlePointerDown = (id: ShirtId) => {
    return (event: React.PointerEvent<HTMLImageElement>) => {
      event.preventDefault()

      const shirtElement = shirtRefs.current[id]
      if (!shirtElement) {
        return
      }

      const existingDrag = dragRef.current
      if (existingDrag?.idleTimer !== null && existingDrag?.idleTimer !== undefined) {
        window.clearTimeout(existingDrag.idleTimer)
      }

      shirtElement.setPointerCapture(event.pointerId)
      shirtElement.classList.remove('dragging-right', 'dragging-left')
      shirtElement.classList.add('grabbed')

      dragRef.current = {
        id,
        element: shirtElement,
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
        idleTimer: null,
      }

      setTooltipVisible(false)
      setIsCenterHovered(false)
      setActiveShirtId(id)
    }
  }

  return (
    <section className="interaction-page">
      <header className="interaction-copy">
        <p className="interaction-kicker">Drag and Drop Experience</p>
        <h1 className="interaction-title">Interactive Styling Canvas</h1>
        <p className="interaction-description">
          Drag a t-shirt card over the model to preview hover styling, then drop to switch the
          active look.
        </p>
      </header>

      <div className={`interaction-canvas ${isLoading ? 'is-loading' : ''}`}>
        {isLoading ? <div className="canvas-loader" aria-hidden="true" /> : null}

        <div className="shirts-container">
          <img
            ref={centerImageRef}
            src={centerDisplaySrc}
            alt={`${centerModel.shirtName} on model`}
            className="rat-center"
            draggable={false}
          />

          {SHIRTS.map((shirt) => {
            return (
              <img
                key={shirt.id}
                ref={setShirtRef(shirt.id)}
                src={shirt.productSrc}
                alt={`${shirt.shirtName} product card`}
                className={`shirt ${shirt.positionClass} ${
                  activeShirtId === shirt.id ? 'is-active' : ''
                }`}
                onPointerDown={handlePointerDown(shirt.id)}
                draggable={false}
              />
            )
          })}

          <button
            ref={infoTooltipRef}
            id="info-tooltip"
            type="button"
            className={tooltipVisible ? 'tooltip-visible' : ''}
            data-tooltip={tooltipText}
            onClick={(event) => {
              event.stopPropagation()
              setTooltipVisible((value) => !value)
            }}
            aria-label="Show model information"
          >
            ?
          </button>
        </div>
      </div>
    </section>
  )
}

export default Interaction