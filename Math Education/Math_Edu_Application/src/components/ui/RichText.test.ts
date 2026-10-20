import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText } from './RichText'

const rendre = (texte: string) => renderToStaticMarkup(createElement(RichText, { as: 'inline', children: texte }))

describe('RichText', () => {
  it('rend une formule placee dans du gras', () => {
    const html = rendre('**Cinq sixièmes, $\frac{5}{6}$** : on garde 6.')
    expect(html).toContain('<strong')
    expect(html).toContain('katex')
    expect(html).not.toContain('$')
  })

  it('laisse le texte simple tel quel', () => {
    expect(rendre('**Faux** : 2/6')).toContain('<strong class="font-semibold text-ink">Faux</strong>')
  })
})
