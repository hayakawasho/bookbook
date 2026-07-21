import { describe, expect, it } from 'vitest'

import { createContinuousDetectionGate } from './continuousDetectionGate'

const GAP = 1500

describe('createContinuousDetectionGate', () => {
  it('初回の検知は扱う', () => {
    const gate = createContinuousDetectionGate(GAP)

    expect(gate.shouldHandle('978A', 0)).toBe(true)
  })

  it('映り続けている間の連続検知は扱わない', () => {
    const gate = createContinuousDetectionGate(GAP)
    gate.shouldHandle('978A', 0)

    expect(gate.shouldHandle('978A', 125)).toBe(false)
    expect(gate.shouldHandle('978A', 250)).toBe(false)
  })

  it('連続検知中は時刻が更新され続け、映り続ける限り再発火しない', () => {
    const gate = createContinuousDetectionGate(GAP)
    gate.shouldHandle('978A', 0)

    for (let t = 125; t <= 10_000; t += 125) {
      expect(gate.shouldHandle('978A', t)).toBe(false)
    }
  })

  it('検知が途切れて再度かざしたら新規スキャンとして扱う', () => {
    const gate = createContinuousDetectionGate(GAP)
    gate.shouldHandle('978A', 0)
    gate.shouldHandle('978A', 125)

    expect(gate.shouldHandle('978A', 125 + GAP + 1)).toBe(true)
  })

  it('別のバーコードは即座に扱う', () => {
    const gate = createContinuousDetectionGate(GAP)
    gate.shouldHandle('978A', 0)

    expect(gate.shouldHandle('978B', 125)).toBe(true)
  })

  it('reset 後は同じバーコードでも新規スキャンとして扱う', () => {
    const gate = createContinuousDetectionGate(GAP)
    gate.shouldHandle('978A', 0)
    gate.reset()

    expect(gate.shouldHandle('978A', 125)).toBe(true)
  })

  it('必要回数連続して同じ値を検出するまで扱わない', () => {
    const gate = createContinuousDetectionGate(GAP, 3)

    expect(gate.shouldHandle('978A', 0)).toBe(false)
    expect(gate.shouldHandle('978B', 100)).toBe(false)
    expect(gate.shouldHandle('978A', 200)).toBe(false)
    expect(gate.shouldHandle('978A', 300)).toBe(false)
    expect(gate.shouldHandle('978A', 400)).toBe(true)
  })

  it('扱い済みの値が映り続けている間は、誤読フレームが挟まっても再発火しない', () => {
    const gate = createContinuousDetectionGate(GAP, 3)
    gate.shouldHandle('978A', 0)
    gate.shouldHandle('978A', 125)

    expect(gate.shouldHandle('978A', 250)).toBe(true)

    gate.shouldHandle('978B', 375)

    expect(gate.shouldHandle('978A', 500)).toBe(false)
    expect(gate.shouldHandle('978A', 625)).toBe(false)
    expect(gate.shouldHandle('978A', 750)).toBe(false)
  })

  it('扱い済みの値でも検知断が続けば新規スキャンとして再アームされる', () => {
    const gate = createContinuousDetectionGate(GAP, 3)
    gate.shouldHandle('978A', 0)
    gate.shouldHandle('978A', 125)
    gate.shouldHandle('978A', 250)

    const t = 250 + GAP + 1

    expect(gate.shouldHandle('978A', t)).toBe(false)
    expect(gate.shouldHandle('978A', t + 125)).toBe(false)
    expect(gate.shouldHandle('978A', t + 250)).toBe(true)
  })

  it('別の値を扱った後も、検知断が続いていない元の値は再発火しない', () => {
    const gate = createContinuousDetectionGate(GAP, 3)
    gate.shouldHandle('978A', 0)
    gate.shouldHandle('978A', 125)
    expect(gate.shouldHandle('978A', 250)).toBe(true)

    gate.shouldHandle('978B', 375)
    gate.shouldHandle('978B', 500)
    expect(gate.shouldHandle('978B', 625)).toBe(true)

    gate.shouldHandle('978A', 750)
    gate.shouldHandle('978A', 875)
    expect(gate.shouldHandle('978A', 1000)).toBe(false)
  })
})
