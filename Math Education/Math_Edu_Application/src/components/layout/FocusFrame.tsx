import type { ReactNode } from 'react'

import { Wordmark } from '@/components/layout/AppShell'
import { StepProgress } from '@/components/ui/Progress'
import { IconClose } from '@/components/ui/icons'

/** Cadre plein ecran des modes concentres : test, exercice, carte mentale. */
export function FocusFrame({
  title,
  onQuit,
  progress,
  counter,
  children,
}: {
  title: string
  onQuit: () => void
  progress?: { current: number; total: number }
  counter?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex items-center gap-4 border-b border-divider bg-surface px-5 py-3.5 sm:px-8">
        <Wordmark className="hidden text-base sm:block" />
        <span className="truncate text-[13px] font-semibold text-ink sm:hidden">{title}</span>
        {progress && <StepProgress current={progress.current} total={progress.total} />}
        {counter && (
          <span className="shrink-0 text-[12.5px] font-semibold text-ink-subtle">{counter}</span>
        )}
        <button
          type="button"
          onClick={onQuit}
          aria-label="Quitter"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line text-ink-muted transition hover:bg-muted"
        >
          <IconClose size={17} />
        </button>
      </header>

      <div className="flex flex-1 justify-center px-5 py-7 sm:px-8 sm:py-10">
        <div className="w-full max-w-[680px]">{children}</div>
      </div>
    </div>
  )
}
