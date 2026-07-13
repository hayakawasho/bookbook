export type SoundPlayer = {
  play(volume: number): void
  unlock(): void
}

export function createSoundPlayer(url: string): SoundPlayer {
  let audio: HTMLAudioElement | null = null
  let unlocked = false

  return {
    play(volume: number) {
      if (volume <= 0) {
        return
      }

      if (typeof Audio === 'undefined') {
        return
      }

      audio ??= new Audio(url)
      audio.muted = false
      audio.volume = Math.min(volume, 100) / 100
      audio.currentTime = 0
      audio.play()?.catch(() => {})
    },

    unlock() {
      if (unlocked) {
        return
      }

      if (typeof Audio === 'undefined') {
        return
      }

      audio ??= new Audio(url)
      audio.muted = true
      // iOS Safari は非ジェスチャー内の play() をブロックするため、事前にミュート再生してアンロックする
      audio
        .play()
        ?.then(() => {
          audio?.pause()
          if (audio) {
            audio.currentTime = 0
            audio.muted = false
          }
          unlocked = true
        })
        .catch(() => {})
    },
  }
}
