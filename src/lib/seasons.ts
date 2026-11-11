// Works out whether a recipe's fresh produce is British and in season, for the
// sustainability score. UK only. The calendar is a draft from general knowledge
// of UK growing seasons; see docs/superpowers/specs/2026-11-11-sustainability-score-design.md.

import { categorise } from './categories'
import { parseIngredient } from './ingredients'

export type ProduceStatus = 'in-season' | 'out-of-season' | 'imported'

export interface ProduceMatch {
  id: string
  status: ProduceStatus
}

export const STATUS_LABEL: Record<ProduceStatus, string> = {
  'in-season': 'In season',
  'out-of-season': 'Out of season',
  imported: 'Imported',
}

// 'all': stored or grown year-round in the UK. 'import': never grown here at scale.
// [from, to]: months 1-12 inclusive; from > to wraps the year end.
type Season = 'all' | 'import' | [number, number]

interface Produce {
  id: string
  names: string[] // singular, lower case, as normaliseName leaves them
  season: Season
}

const p = (id: string, season: Season, ...names: string[]): Produce => ({
  id, season, names: names.length ? names : [id.replace(/-/g, ' ')],
})

const CALENDAR: Produce[] = [
  // Stored crops count as in season all year (the owner's rule), as do crops grown under cover year-round.
  p('potato', 'all'), p('onion', 'all'), p('shallot', 'all'), p('garlic', 'all'), p('carrot', 'all'),
  p('apple', 'all'), p('pear', 'all'), p('beetroot', 'all'), p('cabbage', 'all'), p('swede', 'all'),
  p('cauliflower', 'all'), p('mushroom', 'all'), p('bean-sprout', 'all', 'bean sprout', 'beansprout'),

  p('asparagus', [5, 6]),
  p('aubergine', [6, 9]),
  p('blackberry', [8, 9]),
  p('blueberry', [7, 9]),
  p('broad-bean', [6, 8]),
  p('broccoli', [6, 10]),
  p('brussels-sprout', [10, 2], 'brussels sprout', 'brussel sprout'),
  p('celeriac', [9, 3]),
  p('celery', [7, 10]),
  p('chard', [6, 10]),
  p('cherry', [6, 7]),
  p('chilli', [7, 10], 'chilli', 'chili'),
  p('courgette', [6, 9]),
  p('cucumber', [5, 9]),
  p('fennel', [6, 9]),
  p('green-bean', [7, 9], 'green bean', 'runner bean', 'french bean'),
  p('kale', [9, 3]),
  p('leek', [9, 3]),
  p('lettuce', [5, 10], 'lettuce', 'rocket', 'salad leaf', 'mixed leaf', 'salad'),
  p('mangetout', [6, 8]),
  p('sugar-snap', [6, 8], 'sugar snap pea', 'sugar snap'),
  p('pak-choi', [5, 10], 'pak choi', 'bok choy'),
  p('parsnip', [9, 3]),
  p('pepper', [7, 10]),
  p('plum', [8, 9]),
  p('squash', [9, 1], 'squash', 'pumpkin'),
  p('radish', [4, 9]),
  p('raspberry', [6, 9]),
  p('rhubarb', [1, 6]),
  p('spinach', [4, 10]),
  p('spring-onion', [4, 9]),
  p('strawberry', [5, 9]),
  p('sweetcorn', [8, 9], 'sweetcorn', 'corn'),
  p('tomato', [6, 10]),
  p('parsley', [4, 10]), p('chive', [4, 10]),
  p('basil', [5, 9]), p('mint', [5, 9]), p('dill', [5, 9]),

  p('lemon', 'import'), p('lime', 'import'), p('orange', 'import'), p('clementine', 'import'),
  p('satsuma', 'import'), p('tangerine', 'import'), p('mandarin', 'import'), p('grapefruit', 'import'),
  p('banana', 'import'), p('avocado', 'import'), p('mango', 'import'), p('pineapple', 'import'),
  p('melon', 'import'), p('kiwi', 'import'), p('pomegranate', 'import'), p('fig', 'import'),
  p('date', 'import'), p('grape', 'import'), p('peach', 'import'), p('nectarine', 'import'),
  p('apricot', 'import'), p('ginger', 'import'), p('lemongrass', 'import', 'lemongrass', 'lemon grass'),
  p('sweet-potato', 'import'),
]

// categorise files sugar snaps under the cupboard aisle (its "pea" keyword), but they are fresh produce.
const SKIPS_AISLE_CHECK = new Set(['sugar-snap'])

// Dried, tinned and otherwise preserved forms aren't fresh produce. Checked on the
// raw line because parseIngredient strips "ground" as a descriptor.
const PROCESSED = /(^|[^a-z])(dried|sun-?dried|ground|powder(ed)?|flakes?|frozen|tinned|canned|tins?|cans?|pickled|sauce|pur[eé]e|paste|ketchup)(?![a-z])/i

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole words only, allowing a plural, so "pineapple" isn't an apple.
const MATCHERS = CALENDAR.flatMap(entry =>
  entry.names.map(name => ({ entry, name, re: new RegExp(`(?:^|\\s)(${escape(name)}(?:e?s)?)(?=$|\\s)`) })),
)

// The head noun comes last in English ("cherry tomato" is a tomato), so the match
// that ends latest wins, then the longest ("sweet potato" over "potato").
function findProduce(name: string): Produce | null {
  let best: { entry: Produce; end: number; length: number } | null = null
  for (const { entry, re } of MATCHERS) {
    const m = re.exec(name)
    if (!m) continue
    const end = m.index + m[0].length
    const length = m[1].length
    if (!best || end > best.end || (end === best.end && length > best.length)) best = { entry, end, length }
  }
  return best?.entry ?? null
}

function inSeason([from, to]: [number, number], month: number): boolean {
  return from <= to ? month >= from && month <= to : month >= from || month <= to
}

export function classifyIngredient(line: string, month: number): ProduceMatch | null {
  const trimmed = line.trim()
  // A trailing colon marks a heading such as "For the salad:".
  if (!trimmed || trimmed.endsWith(':')) return null
  if (PROCESSED.test(trimmed)) return null

  const { name, qty, unit } = parseIngredient(trimmed)
  const produce = findProduce(name)
  if (!produce) return null

  // A bare "pepper" is the seasoning unless it is counted ("2 peppers").
  if (produce.id === 'pepper' && name === 'pepper' && (qty === null || unit !== null)) return null

  if (!SKIPS_AISLE_CHECK.has(produce.id)) {
    const aisle = categorise(name)
    if (aisle !== 'produce' && aisle !== 'misc') return null
  }

  const { season } = produce
  const status: ProduceStatus =
    season === 'import' ? 'imported' : season === 'all' || inSeason(season, month) ? 'in-season' : 'out-of-season'
  return { id: produce.id, status }
}

const CREDIT: Record<ProduceStatus, number> = { 'in-season': 1, imported: 0.5, 'out-of-season': 0 }

export interface RecipeScore {
  score: number // 0-1, unrounded
  scored: number // distinct fresh produce counted
}

// Each produce counts once, whatever the quantity: ingredient lines are free
// text, so weighting a squeeze of lemon against a kilo of leeks isn't reliable.
export function scoreRecipe(ingredients: string[], month: number): RecipeScore {
  const credits = new Map<string, number>()
  for (const line of ingredients) {
    const match = classifyIngredient(line, month)
    if (match) credits.set(match.id, CREDIT[match.status])
  }
  // Nothing to judge counts as a full score rather than a bad one.
  if (credits.size === 0) return { score: 1, scored: 0 }
  let total = 0
  for (const c of credits.values()) total += c
  return { score: total / credits.size, scored: credits.size }
}

export function scoreLabel(s: RecipeScore): string {
  return s.scored === 0 ? 'No fresh produce' : `${Math.round(s.score * 100)}% sustainable`
}

export function currentMonth(): number {
  return new Date().getMonth() + 1
}
