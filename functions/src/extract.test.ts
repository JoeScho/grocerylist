import { describe, expect, it } from 'vitest'
import { extractRecipe } from './extract'

const page = (body: string) => `<html><head>${body}</head><body></body></html>`

describe('extractRecipe', () => {
  it('reads a Recipe inside a Yoast-style @graph', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Page' },
        {
          '@type': ['Recipe'],
          name: 'Chicken &amp; Leek Pie',
          image: [{ '@type': 'ImageObject', url: '/img/pie.jpg' }],
          recipeYield: ['4', '4 servings'],
          recipeIngredient: ['500g chicken', '2 leeks, <b>sliced</b>'],
          recipeInstructions: [
            { '@type': 'HowToSection', name: 'Filling', itemListElement: [{ '@type': 'HowToStep', text: 'Cook the chicken.' }] },
            { '@type': 'HowToStep', text: 'Bake for 30 mins.' },
          ],
        },
      ],
    }
    const r = extractRecipe(page(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`), 'https://example.com/pie')
    expect(r.title).toBe('Chicken & Leek Pie')
    expect(r.image).toBe('https://example.com/img/pie.jpg')
    expect(r.servings).toBe('4 4 servings')
    expect(r.ingredients).toEqual(['500g chicken', '2 leeks, sliced'])
    expect(r.steps).toEqual(['Cook the chicken.', 'Bake for 30 mins.'])
  })

  it('splits a single instruction string on newlines', () => {
    const ld = { '@type': 'Recipe', name: 'Toast', recipeIngredient: ['bread'], recipeInstructions: 'Toast bread.\nButter it.' }
    const r = extractRecipe(page(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`), 'https://x.com')
    expect(r.steps).toEqual(['Toast bread.', 'Butter it.'])
  })

  it('falls back to microdata', () => {
    const html = `<div itemscope itemtype="http://schema.org/Recipe">
      <h1 itemprop="name">Soup</h1>
      <span itemprop="recipeYield">Serves 2</span>
      <li itemprop="recipeIngredient">1 leek</li>
      <div itemprop="recipeInstructions"><ol><li>Chop</li><li>Simmer</li></ol></div>
    </div>`
    const r = extractRecipe(html, 'https://x.com')
    expect(r).toMatchObject({ title: 'Soup', servings: 'Serves 2', ingredients: ['1 leek'], steps: ['Chop', 'Simmer'] })
  })

  it('returns title and image only when there is no recipe data', () => {
    const r = extractRecipe(page('<meta property="og:title" content="Blog post"><meta property="og:image" content="https://x.com/a.jpg">'), 'https://x.com')
    expect(r).toMatchObject({ title: 'Blog post', image: 'https://x.com/a.jpg', ingredients: [], steps: [] })
  })
})
