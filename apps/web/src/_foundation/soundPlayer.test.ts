import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSoundPlayer } from './soundPlayer'

describe('createSoundPlayer', () => {
  const play = vi.fn()
  const pause = vi.fn()
  const originalAudio = globalThis.Audio

  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined)
    pause.mockReset()
    // biome-ignore lint/suspicious/noExplicitAny: minimal Audio stub for tests
    globalThis.Audio = function Audio() {
      return { play, pause, currentTime: 0, volume: 1, muted: false }
    } as any
  })

  afterEach(() => {
    globalThis.Audio = originalAudio
  })

  it('volume を 0-1 に変換して再生する', () => {
    const player = createSoundPlayer('bkbk.wav')

    player.play(70)

    expect(play).toHaveBeenCalledTimes(1)
  })

  it('volume が 0 のとき再生しない', () => {
    const player = createSoundPlayer('bkbk.wav')

    player.play(0)

    expect(play).not.toHaveBeenCalled()
  })

  it('play が拒否されても throw しない', async () => {
    play.mockRejectedValue(new Error('autoplay blocked'))
    const player = createSoundPlayer('bkbk.wav')

    expect(() => player.play(70)).not.toThrow()
    await Promise.resolve()
  })
})

describe('createSoundPlayer.unlock', () => {
  const play = vi.fn()
  const pause = vi.fn()
  const originalAudio = globalThis.Audio

  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined)
    pause.mockReset()
    // biome-ignore lint/suspicious/noExplicitAny: minimal Audio stub for tests
    globalThis.Audio = function Audio() {
      return { play, pause, currentTime: 0, volume: 1, muted: false }
    } as any
  })

  afterEach(() => {
    globalThis.Audio = originalAudio
  })

  it('ミュート再生でアンロックし、以後は再生しない', async () => {
    const player = createSoundPlayer('bkbk.wav')

    player.unlock()
    await Promise.resolve()
    await Promise.resolve()

    expect(play).toHaveBeenCalledTimes(1)
    expect(pause).toHaveBeenCalledTimes(1)

    player.unlock()
    await Promise.resolve()

    expect(play).toHaveBeenCalledTimes(1)
  })

  it('play が拒否された場合は次回再試行する', async () => {
    play.mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(undefined)
    const player = createSoundPlayer('bkbk.wav')

    player.unlock()
    await Promise.resolve()
    await Promise.resolve()

    expect(play).toHaveBeenCalledTimes(1)
    expect(pause).not.toHaveBeenCalled()

    player.unlock()
    await Promise.resolve()
    await Promise.resolve()

    expect(play).toHaveBeenCalledTimes(2)
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('アンロック後は muted が解除される', async () => {
    const player = createSoundPlayer('bkbk.wav')

    player.unlock()
    await Promise.resolve()
    await Promise.resolve()

    player.play(70)

    expect(play).toHaveBeenCalledTimes(2)
  })
})
