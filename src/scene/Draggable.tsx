import { useRef, useState, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3, type Group } from 'three'

/**
 * Drag a molecule across the ground plane with the pointer.
 *
 * The molecule is moved by intersecting the pointer ray with the y = 0 plane,
 * which keeps everything on one surface and makes proximity (and therefore
 * mixing) predictable. An offset captured on pointer-down stops the molecule
 * snapping its centre to the cursor.
 */
export function Draggable({
  position,
  onDrag,
  onDragEnd,
  onSelect,
  children,
}: {
  position: [number, number, number]
  onDrag: (position: [number, number, number]) => void
  onDragEnd?: () => void
  onSelect?: () => void
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  const { camera, gl } = useThree()
  const [dragging, setDragging] = useState(false)

  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const raycaster = useRef(new Raycaster())
  const offset = useRef(new Vector3())
  const pointer = useRef(new Vector2())
  const hit = useRef(new Vector3())

  const pointAt = (event: PointerEvent | { clientX: number; clientY: number }) => {
    const rect = gl.domElement.getBoundingClientRect()
    pointer.current.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.current.setFromCamera(pointer.current, camera)
    return raycaster.current.ray.intersectPlane(plane.current, hit.current)
  }

  return (
    <group
      ref={ref}
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation()
        const point = pointAt(e)
        if (!point) return
        offset.current.set(position[0] - point.x, 0, position[2] - point.z)
        setDragging(true)
        onSelect?.()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        e.stopPropagation()
        const point = pointAt(e)
        if (!point) return
        onDrag([point.x + offset.current.x, 0, point.z + offset.current.z])
      }}
      onPointerUp={(e) => {
        if (!dragging) return
        e.stopPropagation()
        setDragging(false)
        onDragEnd?.()
        ;(e.target as Element).releasePointerCapture?.(e.pointerId)
      }}
    >
      {children}
    </group>
  )
}
