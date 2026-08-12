import katex from 'katex'
import { Fragment, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

// Rendu des textes du contenu pedagogique : enonces, corriges, indices.
// Le schema autorise du Markdown leger et des formules LaTeX entre $...$
// (bloc entre $$...$$). On ne branche pas un moteur Markdown complet : le
// contenu est ecrit par Marius dans un format volontairement etroit, et une
// bibliotheque de plus serait du poids pour rien.

const TOKEN = /(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*|`[^`]+`)/g

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    })
  } catch {
    // Une formule cassee ne doit jamais faire tomber un ecran devant un eleve.
    return tex
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(TOKEN).map((chunk, index) => {
    const key = `${keyPrefix}-${index}`
    if (!chunk) return null

    if (chunk.startsWith('$$') && chunk.endsWith('$$')) {
      return (
        <span
          key={key}
          className="my-2 block text-center"
          dangerouslySetInnerHTML={{ __html: renderMath(chunk.slice(2, -2), true) }}
        />
      )
    }

    if (chunk.startsWith('$') && chunk.endsWith('$') && chunk.length > 2) {
      return (
        <span
          key={key}
          dangerouslySetInnerHTML={{ __html: renderMath(chunk.slice(1, -1), false) }}
        />
      )
    }

    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {chunk.slice(2, -2)}
        </strong>
      )
    }

    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 2) {
      return (
        <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
          {chunk.slice(1, -1)}
        </code>
      )
    }

    return <Fragment key={key}>{chunk}</Fragment>
  })
}

interface RichTextProps {
  children: string
  className?: string
  /** `block` pose les paragraphes, `inline` reste dans le flux du parent. */
  as?: 'block' | 'inline'
}

export function RichText({ children, className, as = 'block' }: RichTextProps) {
  if (as === 'inline') {
    return <span className={className}>{renderInline(children, 'i')}</span>
  }

  const paragraphs = children.split(/\n{2,}/)

  return (
    <div className={cn('space-y-3', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {renderInline(paragraph, `p${index}`)}
        </p>
      ))}
    </div>
  )
}
