import { useEffect, useRef, useState } from 'react'
import { useSandboxStore, inspectGroups } from '../state/useSandboxStore'

/**
 * The idle demonstration: builds water from hydrogen and oxygen, on a loop.
 *
 * It drives the real store rather than playing a recording, so what a newcomer
 * watches is genuinely the app working — the same proximity detection, the same
 * activation prompt, the same reaction engine.
 *
 * It gets out of the way immediately. A pointerdown or keypress anywhere cancels
 * it and wipes everything it created. Cancelling on `pointerdown` specifically
 * matters: that fires before `click`, so a user clicking a palette chip has the
 * demo cleared before their own molecule is added, rather than after.
 */

interface Step {
  caption: string
  run: () => Promise<void> | void
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export function useDemoTour() {
  const [caption, setCaption] = useState<string | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    // Only offer the tour on a clean bench.
    if (useSandboxStore.getState().entities.length > 0) return

    let cancelled = false
    let raf = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    runningRef.current = true

    const store = () => useSandboxStore.getState()

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms))
      })

    /** Slide an entity to a target, so molecules visibly travel rather than teleport. */
    const glide = (id: string, to: [number, number, number], ms: number) =>
      new Promise<void>((resolve) => {
        const start = performance.now()
        const from = store().entities.find((e) => e.id === id)?.position
        if (!from) return resolve()
        const [fx, , fz] = from
        const step = (now: number) => {
          if (cancelled) return resolve()
          const t = Math.min(1, (now - start) / ms)
          const k = easeInOut(t)
          store().move(id, [fx + (to[0] - fx) * k, 0, fz + (to[2] - fz) * k])
          if (t < 1) raf = requestAnimationFrame(step)
          else resolve()
        }
        raf = requestAnimationFrame(step)
      })

    const addAt = (speciesId: string, at: [number, number, number]) => {
      store().add(speciesId, at)
      const list = store().entities
      return list[list.length - 1].id
    }

    const cancel = () => {
      if (cancelled) return
      cancelled = true
      runningRef.current = false
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      setCaption(null)
      // Wipe everything the demo made, including its log entry.
      useSandboxStore.setState({ entities: [], selectedId: null, log: [] })
    }

    const onInteract = () => cancel()
    window.addEventListener('pointerdown', onInteract, true)
    window.addEventListener('keydown', onInteract, true)

    const playOnce = async () => {
      let a = ''
      let b = ''
      let o = ''

      const steps: Step[] = [
        {
          caption: 'Pick a species from the palette — here, two hydrogen molecules.',
          run: async () => {
            a = addAt('H2', [-11, 0, -5])
            await sleep(700)
            b = addAt('H2', [-11, 0, 5])
            await sleep(700)
          },
        },
        {
          caption: 'Water needs oxygen too, so add one O₂.',
          run: async () => {
            o = addAt('O2', [11, 0, 0])
            await sleep(1100)
          },
        },
        {
          caption: 'Drag them together. Nothing reacts until molecules are actually mixed.',
          run: async () => {
            store().select(null)
            // Every pair must land inside MIXING_DISTANCE (5 A). The earlier
            // targets left the oxygen 5.46 A from each hydrogen, so the flood
            // fill grouped the two H2 alone and the reaction never fired.
            await Promise.all([
              glide(a, [-2.1, 0, -1.9], 1500),
              glide(b, [-2.1, 0, 1.9], 1500),
              glide(o, [1.9, 0, 0], 1500),
            ])
            await sleep(900)
          },
        },
        {
          caption: 'Mixed — but still nothing. This reaction needs energy to start.',
          run: () => sleep(1900),
        },
        {
          caption: 'Add the spark, and the hydrogen burns.',
          run: async () => {
            const { pending } = inspectGroups(store().entities)
            if (pending) store().trigger(pending)
            await sleep(2600)
          },
        },
        {
          caption:
            'Two molecules of water — and the panel on the right explains what you just made.',
          run: () => sleep(3000),
        },
      ]

      for (const step of steps) {
        if (cancelled) return
        setCaption(step.caption)
        await step.run()
      }

      if (cancelled) return
      useSandboxStore.setState({ entities: [], selectedId: null, log: [] })
      setCaption(null)
      await sleep(1200)
    }

    const loop = async () => {
      while (!cancelled) await playOnce()
    }
    void loop()

    return () => {
      cancel()
      window.removeEventListener('pointerdown', onInteract, true)
      window.removeEventListener('keydown', onInteract, true)
    }
  }, [])

  return caption
}
