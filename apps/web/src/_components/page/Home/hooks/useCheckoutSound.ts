import { useCallback } from 'react'

import { feedbackSound } from '../../../../_foundation/feedbackSound'
import { useAppState } from '../../../app'

export function useCheckoutSound() {
  const { state } = useAppState()

  const playCheckoutSound = useCallback(() => {
    feedbackSound.play(state.volume)
  }, [state.volume])

  return { playCheckoutSound, unlockCheckoutSound: feedbackSound.unlock }
}
