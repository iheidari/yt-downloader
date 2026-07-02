import { useState } from 'react'

// Copies a download's shareable /play link to the clipboard and flips `copied`
// for a short confirmation window. Shared by the card list and the player.
export function useShareLink(downloadId) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/play/${downloadId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('❌ Share copy failed:', err)
    }
  }

  return { copied, share }
}
