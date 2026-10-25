// Parses free-text ingredient lines ("200g chicken thighs, diced") into
// quantity, unit and a normalised name used for merging and categorising.

export interface ParsedIngredient {
  text: string
  qty: number | null
  unit: string | null
  name: string
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125,
  '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

// Canonical unit -> spellings that map to it.
const UNIT_ALIASES: Record<string, string[]> = {
  g: ['g', 'gram', 'grams', 'gr', 'grm'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
  ml: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  l: ['l', 'litre', 'litres', 'liter', 'liters', 'ltr'],
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons', 't'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tbl', 'tablespoon', 'tablespoons', 'T'],
  cup: ['cup', 'cups'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans', 'tin', 'tins'],
  pinch: ['pinch', 'pinches'],
  bunch: ['bunch', 'bunches'],
  handful: ['handful', 'handfuls'],
  pack: ['pack', 'packs', 'packet', 'packets'],
  slice: ['slice', 'slices'],
  sprig: ['sprig', 'sprigs'],
  stick: ['stick', 'sticks'],
  jar: ['jar', 'jars'],
}

const UNIT_LOOKUP = new Map<string, string>()
for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
  for (const alias of aliases) {
    // Single-letter "t"/"T" are only safe case-sensitively.
    UNIT_LOOKUP.set(alias.length === 1 ? alias : alias.toLowerCase(), canonical)
  }
}

function lookupUnit(word: string): string | null {
  const stripped = word.replace(/\.$/, '')
  if (stripped.length === 1) return UNIT_LOOKUP.get(stripped) ?? null
  return UNIT_LOOKUP.get(stripped.toLowerCase()) ?? null
}

const DESCRIPTORS = [
  'finely', 'roughly', 'thinly', 'coarsely', 'freshly', 'lightly', 'very',
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed', 'peeled', 'halved',
  'quartered', 'shredded', 'trimmed', 'beaten', 'softened', 'melted', 'drained',
  'rinsed', 'deseeded', 'cubed', 'torn', 'ground', 'fresh', 'large', 'small',
  'medium', 'heaped', 'level', 'ripe', 'boneless', 'skinless', 'optional',
  'about', 'approx', 'approximately', 'of',
]
const DESCRIPTOR_SET = new Set(DESCRIPTORS)

function parseNumberToken(token: string): number | null {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token]
  // "1½"
  const mixedUnicode = token.match(/^(\d+)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
  if (mixedUnicode) return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]]
  const frac = token.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2])
  if (/^\d+([.,]\d+)?$/.test(token)) return Number(token.replace(',', '.'))
  return null
}

// Reads a leading quantity, supporting "1 1/2", "1½", "2-3" (takes the upper
// bound so you don't under-buy) and "2x".
function readQuantity(tokens: string[]): { qty: number | null; used: number } {
  if (tokens.length === 0) return { qty: null, used: 0 }
  const first = tokens[0]
  const range = first.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/)
  if (range) return { qty: Number(range[2].replace(',', '.')), used: 1 }
  const times = first.match(/^(\d+)x$/i)
  if (times) return { qty: Number(times[1]), used: 1 }
  const n = parseNumberToken(first)
  if (n === null) return { qty: null, used: 0 }
  if (tokens.length > 1) {
    const second = parseNumberToken(tokens[1])
    if (second !== null && second < 1 && /\/|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(tokens[1])) {
      return { qty: n + second, used: 2 }
    }
    if ((tokens[1] === '-' || tokens[1] === '–' || tokens[1] === 'to') && tokens[2]) {
      const upper = parseNumberToken(tokens[2])
      if (upper !== null) return { qty: upper, used: 3 }
    }
  }
  return { qty: n, used: 1 }
}

function singularise(word: string): string {
  if (word.length <= 3) return word
  if (/(ss|us|is)$/.test(word)) return word
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (/(tomato|potato)es$/.test(word)) return word.slice(0, -2)
  if (/(ches|shes|xes)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('es') && /(leaves)$/.test(word)) return word.slice(0, -3) + 'f'
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

export function normaliseName(raw: string): string {
  let s = raw.toLowerCase()
  s = s.replace(/\([^)]*\)/g, ' ') // parentheticals
  s = s.split(/,| - | – |;/)[0] // drop prep notes after comma
  s = s.replace(/\b(to taste|for serving|to serve|for garnish|plus extra.*|or more.*)\b/g, ' ')
  s = s.replace(/[^a-z\s'-]/g, ' ')
  const words = s.split(/\s+/).filter(w => w && !DESCRIPTOR_SET.has(w))
  if (words.length === 0) return raw.trim().toLowerCase()
  words[words.length - 1] = singularise(words[words.length - 1])
  return words.join(' ').trim()
}

export function parseIngredient(text: string): ParsedIngredient {
  const clean = text
    .replace(/^[\s•\-*▪●◦·✓✔️☐]+/u, '')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2') // "200g" -> "200 g"
    .replace(/(\d)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .replace(/^([\d.,/½¼¾⅓⅔ ]+ ?[a-zA-Z]+) ?\/ ?[\d.,/]+ ?[a-zA-Z]+\.?/, '$1') // "600 g/ 1.2 lb" -> "600 g"
    .trim()
  // Re-join "1 x" style that the regex above split ("2x" -> "2 x").
  const tokens = clean.split(' ').filter(Boolean)
  if (tokens[1] && /^x$/i.test(tokens[1]) && /^\d+$/.test(tokens[0])) tokens.splice(1, 1)

  const { qty, used } = readQuantity(tokens)
  let rest = tokens.slice(used)
  let unit: string | null = null
  // "1 x 400g tin ..." -> the 400g is pack size, the tin is the unit.
  if (qty !== null && rest.length > 3 && parseNumberToken(rest[0]) !== null && lookupUnit(rest[1]) && lookupUnit(rest[2])) {
    rest = rest.slice(2)
  }
  if (qty !== null && rest.length > 1) {
    const u = lookupUnit(rest[0])
    if (u) {
      unit = u
      rest = rest.slice(1)
    }
  }
  let name = normaliseName(rest.join(' '))
  // "2 garlic cloves" should match "2 cloves garlic".
  if (!unit && qty !== null && / clove$/.test(name)) {
    unit = 'clove'
    name = name.replace(/ clove$/, '')
  }
  return { text: text.trim(), qty, unit, name }
}

// Converts to a base unit so "1 kg" and "200 g" can be added together.
export function toBase(qty: number, unit: string | null): { qty: number; unit: string | null } {
  switch (unit) {
    case 'kg': return { qty: qty * 1000, unit: 'g' }
    case 'l': return { qty: qty * 1000, unit: 'ml' }
    case 'lb': return { qty: qty * 453.6, unit: 'g' }
    case 'oz': return { qty: qty * 28.35, unit: 'g' }
    default: return { qty, unit }
  }
}

function round(n: number): number {
  if (n >= 10) return Math.round(n)
  return Math.round(n * 4) / 4
}

export function formatQty(qty: number | null, unit: string | null): string {
  if (qty === null) return unit ?? ''
  let q = qty
  let u = unit
  if (u === 'g' && q >= 1000) { q = q / 1000; u = 'kg' }
  if (u === 'ml' && q >= 1000) { q = q / 1000; u = 'l' }
  if (u === 'kg' || u === 'l') return `${Math.round(q * 10) / 10}${u}`
  const r = round(q)
  const whole = Math.floor(r)
  const frac = r - whole
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : frac ? String(frac) : ''
  const num = whole === 0 && fracStr ? fracStr : `${whole}${fracStr}`
  if (!u) return num
  const tight = ['g', 'kg', 'ml', 'l', 'oz', 'lb']
  return tight.includes(u) ? `${num}${u}` : `${num} ${u}${r > 1 && !['tsp', 'tbsp'].includes(u) ? 's' : ''}`
}

export function scale(qty: number | null, from: number, to: number): number | null {
  if (qty === null || !from) return qty
  return (qty * to) / from
}

// Pulls a number out of schema.org recipeYield values like "Serves 4", "4-6", "12 cookies".
export function parseServings(raw: unknown): number | null {
  const s = Array.isArray(raw) ? raw.map(String).join(' ') : raw == null ? '' : String(raw)
  const m = s.match(/(\d+)/)
  return m ? Number(m[1]) : null
}
