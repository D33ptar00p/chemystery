import { it, expect, describe } from 'vitest'
import { groupOf, periodOf, blockOf } from '../../data/periodicTable'
import { ELEMENTS } from '../../data/elements'

describe('periodic table placement', () => {
  it('places the obvious ones', () => {
    expect([periodOf(1), groupOf(1)]).toEqual([1, 1])       // H
    expect([periodOf(2), groupOf(2)]).toEqual([1, 18])      // He
    expect([periodOf(3), groupOf(3)]).toEqual([2, 1])       // Li
    expect([periodOf(10), groupOf(10)]).toEqual([2, 18])    // Ne
    expect([periodOf(17), groupOf(17)]).toEqual([3, 17])    // Cl
    expect([periodOf(26), groupOf(26)]).toEqual([4, 8])     // Fe
    expect([periodOf(29), groupOf(29)]).toEqual([4, 11])    // Cu
    expect([periodOf(36), groupOf(36)]).toEqual([4, 18])    // Kr
    expect([periodOf(53), groupOf(53)]).toEqual([5, 17])    // I
    expect([periodOf(79), groupOf(79)]).toEqual([6, 11])    // Au
    expect([periodOf(86), groupOf(86)]).toEqual([6, 18])    // Rn
    expect([periodOf(118), groupOf(118)]).toEqual([7, 18])  // Og
  })
  it('puts the f-block outside the numbered groups', () => {
    expect(groupOf(57)).toBeNull()   // La
    expect(groupOf(64)).toBeNull()   // Gd
    expect(groupOf(70)).toBeNull()   // Yb
    expect(groupOf(92)).toBeNull()   // U
    expect(blockOf(92)).toBe('f')
  })
  it('follows modern IUPAC group 3 (Sc, Y, Lu, Lr)', () => {
    expect(groupOf(21)).toBe(3)   // Sc
    expect(groupOf(39)).toBe(3)   // Y
    expect(groupOf(71)).toBe(3)   // Lu
    expect(groupOf(103)).toBe(3)  // Lr
    expect(groupOf(72)).toBe(4)   // Hf follows Lu
  })
  it('assigns blocks correctly', () => {
    expect(blockOf(11)).toBe('s')  // Na
    expect(blockOf(26)).toBe('d')  // Fe
    expect(blockOf(15)).toBe('p')  // P
    expect(blockOf(2)).toBe('s')   // He is s-block despite sitting in group 18
  })
  it('agrees with each element\'s declared category', () => {
    // A category and a computed placement disagreeing means one of them is wrong.
    for (const el of Object.values(ELEMENTS)) {
      const g = groupOf(el.atomicNumber)
      if (el.category === 'alkali-metal') expect(g, el.symbol).toBe(1)
      if (el.category === 'alkaline-earth') expect(g, el.symbol).toBe(2)
      if (el.category === 'halogen') expect(g, el.symbol).toBe(17)
      if (el.category === 'noble-gas' && el.symbol !== 'He') expect(g, el.symbol).toBe(18)
      if (el.category === 'lanthanide' || el.category === 'actinide') {
        expect(blockOf(el.atomicNumber), el.symbol).toMatch(/[fd]/)
      }
    }
  })

  it('gives every element a valid placement', () => {
    for (let z = 1; z <= 118; z++) {
      const p = periodOf(z)
      expect(p, `Z=${z}`).toBeGreaterThanOrEqual(1)
      expect(p, `Z=${z}`).toBeLessThanOrEqual(7)
      const g = groupOf(z)
      if (g !== null) {
        expect(g, `Z=${z}`).toBeGreaterThanOrEqual(1)
        expect(g, `Z=${z}`).toBeLessThanOrEqual(18)
      }
    }
  })
})
