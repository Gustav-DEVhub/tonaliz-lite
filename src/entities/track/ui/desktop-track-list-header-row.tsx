import { getDesktopTrackGridTemplate, type DesktopTrackColumnsConfig } from '@/entities/track/ui/desktop-track-columns'

interface DesktopTrackListHeaderRowProps {
  columns: DesktopTrackColumnsConfig
}

export function DesktopTrackListHeaderRow({ columns }: DesktopTrackListHeaderRowProps) {
  return (
    <div
      className="hidden items-center gap-3 border-b border-white/8 px-4 pb-2 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-text-muted lg:grid"
      style={{ gridTemplateColumns: getDesktopTrackGridTemplate(columns) }}
    >
      <span className="text-center">#</span>
      <span>Title</span>
      {columns.artist ? <span>Artist</span> : null}
      {columns.source ? <span>Source</span> : null}
      {columns.duration ? <span className="text-right">Duration</span> : null}
      <span className="text-right">Actions</span>
    </div>
  )
}
