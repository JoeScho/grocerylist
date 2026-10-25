import * as cheerio from 'cheerio'

export interface ExtractedRecipe {
  title: string
  image: string | null
  servings: string | null
  ingredients: string[]
  steps: string[]
  sourceUrl: string
}

type Json = Record<string, unknown>

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function hasType(node: Json, type: string): boolean {
  return asArray(node['@type'] as string | string[]).some(t => typeof t === 'string' && t.toLowerCase() === type.toLowerCase())
}

// JSON-LD can nest the Recipe inside @graph, arrays, or mainEntity.
function findRecipe(node: unknown, depth = 0): Json | null {
  if (!node || typeof node !== 'object' || depth > 6) return null
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1)
      if (r) return r
    }
    return null
  }
  const obj = node as Json
  if (hasType(obj, 'Recipe')) return obj
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
    const r = findRecipe(obj[key], depth + 1)
    if (r) return r
  }
  return null
}

function decode(text: string): string {
  // JSON-LD strings often still contain HTML entities and tags.
  return cheerio.load(`<div>${text}</div>`)('div').text().replace(/\s+/g, ' ').trim()
}

function imageUrl(v: unknown): string | null {
  for (const item of asArray(v as unknown)) {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') {
      const url = (item as Json).url ?? (item as Json).contentUrl
      if (typeof url === 'string') return url
    }
  }
  return null
}

function instructions(v: unknown): string[] {
  const out: string[] = []
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      // Some sites put every step in one string separated by newlines.
      for (const part of node.split(/\n+/)) {
        const t = decode(part)
        if (t) out.push(t)
      }
      return
    }
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      const obj = node as Json
      if (hasType(obj, 'HowToSection')) return walk(obj.itemListElement)
      const text = obj.text ?? obj.name
      if (typeof text === 'string') walk(text)
      else if (obj.itemListElement) walk(obj.itemListElement)
    }
  }
  walk(v)
  return out
}

function fromJsonLd($: cheerio.CheerioAPI): Json | null {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(el).text()
    try {
      const r = findRecipe(JSON.parse(raw))
      if (r) return r
    } catch {
      // Some sites emit invalid JSON (trailing commas, raw newlines); try a light clean-up.
      try {
        const r = findRecipe(JSON.parse(raw.replace(/[\n\r\t]/g, ' ').replace(/,\s*([}\]])/g, '$1')))
        if (r) return r
      } catch {
        // ignore
      }
    }
  }
  return null
}

// Older sites mark up recipes with schema.org microdata attributes instead.
function fromMicrodata($: cheerio.CheerioAPI): Partial<ExtractedRecipe> | null {
  const scope = $('[itemtype*="schema.org/Recipe"]').first()
  if (!scope.length) return null
  const prop = (name: string) => scope.find(`[itemprop="${name}"]`)
  const ingredients = prop('recipeIngredient').add(prop('ingredients')).toArray().map(e => decode($(e).text())).filter(Boolean)
  const steps = prop('recipeInstructions').toArray().flatMap(e => {
    const lis = $(e).find('li').toArray()
    return lis.length ? lis.map(li => decode($(li).text())) : [decode($(e).text())]
  }).filter(Boolean)
  const img = prop('image').first()
  return {
    title: decode(prop('name').first().text()),
    image: img.attr('src') ?? img.attr('content') ?? null,
    servings: decode(prop('recipeYield').first().text()) || null,
    ingredients,
    steps,
  }
}

function absolute(url: string | null | undefined, base: string): string | null {
  if (!url) return null
  try {
    return new URL(url, base).toString()
  } catch {
    return null
  }
}

export function extractRecipe(html: string, pageUrl: string): ExtractedRecipe {
  const $ = cheerio.load(html)
  const ogTitle = $('meta[property="og:title"]').attr('content') ?? $('title').first().text()
  const ogImage = $('meta[property="og:image"]').attr('content')

  const ld = fromJsonLd($)
  if (ld) {
    return {
      title: decode(String(ld.name ?? ogTitle ?? '')),
      image: absolute(imageUrl(ld.image) ?? ogImage, pageUrl),
      servings: ld.recipeYield == null ? null : asArray(ld.recipeYield as string | string[]).map(String).join(' '),
      ingredients: asArray(ld.recipeIngredient as string[] | undefined ?? ld.ingredients as string[] | undefined)
        .map(i => decode(String(i)))
        .filter(Boolean),
      steps: instructions(ld.recipeInstructions),
      sourceUrl: pageUrl,
    }
  }

  const md = fromMicrodata($)
  return {
    title: md?.title || decode(ogTitle ?? ''),
    image: absolute(md?.image ?? ogImage, pageUrl),
    servings: md?.servings ?? null,
    ingredients: md?.ingredients ?? [],
    steps: md?.steps ?? [],
    sourceUrl: pageUrl,
  }
}
