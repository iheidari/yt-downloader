import { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../context/usePlayer'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// Playback-speed picker for the shared media element. Reads/sets the rate through
// the player context so the choice survives the element moving between stage and
// dock, and is reapplied after a new source loads.
function PlaybackSpeed() {
  const { playbackRate, setRate } = usePlayer()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Playback speed"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 bg-black/60 text-white rounded-full font-semibold text-[12.5px] px-3 py-1.5 backdrop-blur-sm hover:bg-black/75 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">speed</span>
        {playbackRate}×
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Playback speed"
          className="absolute right-0 mt-1.5 min-w-[104px] bg-surface border border-line2 rounded-xl shadow-lg py-1 z-20"
        >
          {SPEEDS.map((rate) => {
            const selected = rate === playbackRate
            return (
              <button
                key={rate}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setRate(rate)
                  setOpen(false)
                }}
                className={`flex items-center justify-between w-full text-left px-3.5 py-1.5 text-[13px] hover:bg-tint transition-colors ${
                  selected ? 'text-ink font-semibold' : 'text-muted'
                }`}
              >
                {rate === 1 ? 'Normal' : `${rate}×`}
                {selected ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default PlaybackSpeed
