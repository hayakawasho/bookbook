import { describe, expect, it } from 'vitest'

import { createBarcodeScanSession } from './barcodeScanSession'

describe('createBarcodeScanSession', () => {
  it('不正な候補は即時エラーにせず解析を継続する', () => {
    const session = createBarcodeScanSession({
      rearmGapMs: 700,
      requiredMatches: 3,
      failureAfterMs: 3000,
    })

    expect(session.observe('123', 0)).toEqual({ kind: 'detecting' })
    expect(session.observe('123', 100)).toEqual({ kind: 'detecting' })
    expect(session.observe('123', 200)).toEqual({ kind: 'detecting' })
  })

  it('有効なISBNが3回連続した場合だけ確定する', () => {
    const session = createBarcodeScanSession({
      rearmGapMs: 700,
      requiredMatches: 3,
      failureAfterMs: 3000,
    })

    expect(session.observe('9784873119038', 0)).toEqual({ kind: 'detecting' })
    expect(session.observe('9784873119038', 100)).toEqual({ kind: 'detecting' })
    expect(session.observe('9784873119038', 200)).toEqual({
      kind: 'confirmed',
      isbn: '9784873119038',
    })
  })

  it('候補を検出し続けても3秒確定できない場合だけ一度失敗を返す', () => {
    const session = createBarcodeScanSession({
      rearmGapMs: 700,
      requiredMatches: 3,
      failureAfterMs: 3000,
    })

    for (let now = 0; now < 3000; now += 500) {
      expect(session.observe('123', now)).toEqual({ kind: 'detecting' })
    }
    expect(session.observe('123', 3000)).toEqual({ kind: 'failed' })
    expect(session.observe('123', 3100)).toEqual({ kind: 'detecting' })
  })

  it('検知断後は新しい試行としてタイムアウトを再判定する', () => {
    const session = createBarcodeScanSession({
      rearmGapMs: 700,
      requiredMatches: 3,
      failureAfterMs: 3000,
    })

    for (let now = 0; now <= 3000; now += 500) {
      session.observe('123', now)
    }

    expect(session.observe('123', 4000)).toEqual({ kind: 'detecting' })
    for (let now = 4500; now < 7000; now += 500) {
      expect(session.observe('123', now)).toEqual({ kind: 'detecting' })
    }
    expect(session.observe('123', 7000)).toEqual({ kind: 'failed' })
  })
})
