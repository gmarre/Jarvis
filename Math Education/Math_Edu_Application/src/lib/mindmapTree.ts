// Conversion du Markdown hierarchique des cartes mentales en arbre markmap.
//
// Pourquoi ne pas utiliser `markmap-lib` : il embarque toute la chaine
// unified/remark plus Prism, soit ~500 Ko une fois minifie, pour analyser un
// format que Marius restreint volontairement a des titres `#` a `####`. On
// garde `markmap-view` pour le rendu, qui est la partie qui a de la valeur, et
// on ecrit ici l'analyse dont on a reellement besoin.
//
// Si le format des cartes s'ouvre un jour (listes, tableaux, images), c'est ce
// fichier qu'il faudra etendre, ou revenir a `markmap-lib`.

import katex from 'katex'
import type { IPureNode } from 'markmap-common'

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ESCAPES[char])
}

function renderMath(tex: string): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, strict: false, output: 'html' })
  } catch {
    return escapeHtml(tex)
  }
}

const INLINE = /(\$[^$]+\$|\*\*[^*]+\*\*|`[^`]+`)/g

/**
 * Rendu du Markdown en ligne vers du HTML : gras, code et formules LaTeX.
 * Tout le reste est echappe, aucune balise du contenu n'est interpretee.
 */
export function renderInlineHtml(text: string): string {
  return text
    .split(INLINE)
    .map((chunk) => {
      if (!chunk) return ''
      if (chunk.startsWith('$') && chunk.endsWith('$') && chunk.length > 2) {
        return renderMath(chunk.slice(1, -1))
      }
      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        return `<strong>${escapeHtml(chunk.slice(2, -2))}</strong>`
      }
      if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 2) {
        return `<code>${escapeHtml(chunk.slice(1, -1))}</code>`
      }
      return escapeHtml(chunk)
    })
    .join('')
}

/**
 * Transforme le Markdown d'une carte mentale en arbre markmap.
 * Le titre de niveau 1 devient la racine ; chaque niveau de titre supplementaire
 * descend d'un cran dans l'arbre.
 */
export function parseMindmap(markdown: string, fallbackTitle = 'Carte mentale'): IPureNode {
  const root: IPureNode = { content: renderInlineHtml(fallbackTitle), children: [] }

  // Pile des noeuds ouverts, indexee par profondeur de titre.
  const stack: { depth: number; node: IPureNode }[] = [{ depth: 0, node: root }]
  let rootFilled = false

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    const depth = heading ? heading[1].length : stack[stack.length - 1].depth + 1
    const text = heading ? heading[2] : line

    // Le premier titre de niveau 1 nomme la racine plutot que d'en creer une
    // seconde : une carte mentale n'a qu'un centre.
    if (heading && depth === 1 && !rootFilled) {
      root.content = renderInlineHtml(text)
      rootFilled = true
      continue
    }

    const node: IPureNode = { content: renderInlineHtml(text), children: [] }

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop()
    stack[stack.length - 1].node.children.push(node)
    stack.push({ depth, node })
  }

  return root
}
