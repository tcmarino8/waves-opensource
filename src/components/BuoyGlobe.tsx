import { useEffect, useRef } from 'react'
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import worldLand from 'world-atlas/land-110m.json'
import type { StationConfig } from '../config/stations'

interface BuoyGlobeProps {
  stations: StationConfig[]
}

const MARKER_COLORS = ['#74d8d8', '#c9a5ff']
const landFeature = feature(worldLand as Parameters<typeof feature>[0], (worldLand as Parameters<typeof feature>[0]).objects.land)

export function BuoyGlobe({ stations }: BuoyGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let width = 0
    let height = 0
    let animationFrameId = 0
    let isDragging = false
    let lastPointerX = 0

    const projection = geoOrthographic()
    const path = geoPath(projection, context)

    function resizeCanvas() {
      width = container.clientWidth
      height = Math.min(360, Math.max(260, width * 0.7))
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
      projection
        .translate([width / 2, height / 2])
        .scale(Math.min(width, height) * 0.44)
        .clipAngle(90)
    }

    function drawGlobe() {
      const [lambda] = projection.rotate()
      if (!isDragging) {
        projection.rotate([lambda + 0.12, -15, 0])
      }

      context.clearRect(0, 0, width, height)

      context.beginPath()
      path({ type: 'Sphere' })
      context.fillStyle = '#082d4d'
      context.fill()
      context.strokeStyle = 'rgba(116, 216, 216, 0.45)'
      context.lineWidth = 1.4
      context.stroke()

      context.beginPath()
      path(geoGraticule10())
      context.strokeStyle = 'rgba(255, 255, 255, 0.13)'
      context.lineWidth = 0.8
      context.stroke()

      context.beginPath()
      path(landFeature)
      context.fillStyle = '#3f8f46'
      context.fill()
      context.strokeStyle = 'rgba(18, 56, 18, 0.4)'
      context.lineWidth = 0.6
      context.stroke()

      stations.forEach((station, index) => {
        const point = projection([station.longitude, station.latitude])
        if (!point) {
          return
        }

        const [x, y] = point
        context.beginPath()
        context.arc(x, y, 5, 0, Math.PI * 2)
        context.fillStyle = MARKER_COLORS[index % MARKER_COLORS.length]
        context.fill()

        context.font = '12px Inter, system-ui, sans-serif'
        context.fillStyle = '#f8fbff'
        context.fillText(station.id, x + 8, y - 8)
      })

      animationFrameId = window.requestAnimationFrame(drawGlobe)
    }

    function handlePointerDown(event: PointerEvent) {
      isDragging = true
      lastPointerX = event.clientX
      canvas.setPointerCapture(event.pointerId)
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDragging) {
        return
      }
      const deltaX = event.clientX - lastPointerX
      lastPointerX = event.clientX
      const [lambda, phi, gamma] = projection.rotate()
      projection.rotate([lambda + deltaX * 0.35, phi, gamma])
    }

    function handlePointerUp(event: PointerEvent) {
      isDragging = false
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    resizeCanvas()
    drawGlobe()

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(container)

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [stations])

  return (
    <section className="panel">
      <h3>Buoy Globe</h3>
      <div className="globe-container" ref={containerRef}>
        <canvas className="globe-canvas" ref={canvasRef} aria-label="Interactive buoy globe map" />
      </div>
      <p className="footer-note">Drag to spin. Marker labels show buoy station IDs.</p>
    </section>
  )
}
