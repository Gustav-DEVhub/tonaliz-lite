import { Volume2 } from 'lucide-react'
import { usePlayerStore } from '@/features/player/store/use-player-store'
import { useVolumePopover } from '@/features/player/hooks/use-volume-popover'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

export function DesktopVolumeControl({ panelClassName }: { panelClassName?: string }) {
  const volume = usePlayerStore((state) => state.volume)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const { isVisible, scheduleHide, showPopover, startDragging } = useVolumePopover()

  return (
    <div
      className="relative"
      onMouseEnter={showPopover}
      onMouseLeave={() => {
        scheduleHide()
      }}
      onFocusCapture={showPopover}
      onBlurCapture={() => {
        scheduleHide()
      }}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="border border-border-subtle"
        onClick={showPopover}
        aria-expanded={isVisible}
        aria-label="Open volume control"
      >
        <Volume2 className="size-4" />
      </Button>

      <div
        className={cn(
          'editorial-panel pointer-events-none absolute right-0 bottom-14 z-50 w-44 rounded-2xl px-4 py-3 opacity-0 translate-y-1 transition-[opacity,transform] duration-200 ease-out',
          isVisible && 'pointer-events-auto translate-y-0 opacity-100',
          panelClassName,
        )}
      >
        <div className="flex items-center gap-3">
          <Volume2 className="size-4 shrink-0 text-text-muted" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onPointerDown={startDragging}
            onChange={(event) => {
              setVolume(Number(event.target.value))
            }}
            className="h-2 w-full cursor-pointer accent-[var(--mood-accent)]"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  )
}
