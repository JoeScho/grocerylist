// Makes an imported recipe read like a British one: no coriander, UK names
// for American ingredients and kit, and metric amounts. Spoons are left alone.
// Also capitalises the title and the start of each ingredient and step.

import type { RecipeDraft } from '../types'
import { parseIngredient } from './ingredients'

// --- Coriander ---------------------------------------------------------------

const MOD = String.raw`(?:(?:a|some|the|few|little|handful|of|small|large|bunch|fresh|freshly|roughly|finely|chopped|ground|torn|picked|extra)\s+)*`
const HERB = String.raw`(?:coriander|cilantro)(?:\s+(?:leaves|leaf|stalks?|stems?|sprigs?|seeds?|powder))?`
const MENTION = /\b(coriander|cilantro)\b/i
const ONLY_HERB = new RegExp(String.raw`^${MOD}${HERB}$`, 'i')
// Stops "coriander and serve" losing the verb along with the herb.
const NOT_A_CLAUSE = String.raw`(?!\s*(?:then|serve|season|stir|cook|leave|enjoy|garnish|top|transfer|remove|set|let|mix|toss|squeeze|sprinkle|scatter|spoon|pour|add|place|put|bake|fry)\b)`

// "mint and coriander", "coriander, mint", "(cilantro)" lose just the coriander part.
const ALTERNATIVES = [
  new RegExp(String.raw`\s*\(\s*(?:or\s+)?${MOD}${HERB}\s*\)`, 'gi'),
  new RegExp(String.raw`,?\s+(?:and|or|&|\/)\s+${MOD}${HERB}\b`, 'gi'),
  new RegExp(String.raw`\b${MOD}${HERB}\s*(?:,|\band\b|\bor\b|&|\/)\s*${NOT_A_CLAUSE}`, 'gi'),
  new RegExp(String.raw`,\s*${MOD}${HERB}\b`, 'gi'),
]

function dropAlternatives(text: string): string {
  return ALTERNATIVES.reduce((s, re) => s.replace(re, ''), text).replace(/\s{2,}/g, ' ').trim()
}

// Sentences that still mention it ("Scatter over the coriander.") are dropped.
function dropSentences(text: string): string {
  const cleaned = dropAlternatives(text)
  if (!MENTION.test(cleaned)) return cleaned
  return (cleaned.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [cleaned])
    .filter(s => !MENTION.test(s))
    .join('')
    .trim()
}

// --- Names -------------------------------------------------------------------

// American -> British. Plurals are listed where they don't just take an "s".
const NAMES: [string, string][] = [
  ['shrimp paste', 'shrimp paste'],
  ['scallions', 'spring onions'], ['scallion', 'spring onion'],
  ['green onions', 'spring onions'], ['green onion', 'spring onion'],
  ['eggplants', 'aubergines'], ['eggplant', 'aubergine'],
  ['zucchinis', 'courgettes'], ['zucchini', 'courgette'],
  ['arugula', 'rocket'],
  ['bell peppers', 'peppers'], ['bell pepper', 'pepper'], ['capsicums', 'peppers'], ['capsicum', 'pepper'],
  ['rutabagas', 'swedes'], ['rutabaga', 'swede'],
  ['beets', 'beetroot'], ['beet', 'beetroot'],
  ['snow peas', 'mangetout'], ['garbanzo beans', 'chickpeas'], ['garbanzos', 'chickpeas'],
  ['fava beans', 'broad beans'], ['lima beans', 'butter beans'], ['navy beans', 'haricot beans'],
  ['romaine lettuce', 'cos lettuce'], ['romaine', 'cos lettuce'],
  ['shrimps', 'prawns'], ['shrimp', 'prawns'],
  ['ground beef', 'beef mince'], ['ground pork', 'pork mince'], ['ground lamb', 'lamb mince'],
  ['ground turkey', 'turkey mince'], ['ground chicken', 'chicken mince'], ['ground meat', 'mince'],
  ['canadian bacon', 'back bacon'],
  ['heavy whipping cream', 'double cream'], ['heavy cream', 'double cream'], ['whipping cream', 'double cream'],
  ['light cream', 'single cream'], ['half-and-half', 'single cream'],
  ['all-purpose flour', 'plain flour'], ['all purpose flour', 'plain flour'],
  ['self-rising flour', 'self-raising flour'], ['self rising flour', 'self-raising flour'],
  ['cornstarch', 'cornflour'], ['corn starch', 'cornflour'],
  ["confectioners' sugar", 'icing sugar'], ['confectioners sugar', 'icing sugar'], ['powdered sugar', 'icing sugar'],
  ['superfine sugar', 'caster sugar'],
  ['baking soda', 'bicarbonate of soda'],
  ['tomato paste', 'tomato puree'],
  ['red pepper flakes', 'chilli flakes'], ['crushed red pepper', 'chilli flakes'],
  ['chilies', 'chillies'], ['chiles', 'chillies'], ['chilis', 'chillies'], ['chili', 'chilli'], ['chile', 'chilli'],
  ['canola oil', 'rapeseed oil'],
  ['molasses', 'black treacle'],
  ['graham crackers', 'digestive biscuits'], ['graham cracker', 'digestive biscuit'],
  ['bouillon cubes', 'stock cubes'], ['bouillon cube', 'stock cube'], ['broth', 'stock'],
  ['skillet', 'frying pan'], ['stovetop', 'hob'], ['stove top', 'hob'],
  ['broiler', 'grill'], ['broiled', 'grilled'], ['broiling', 'grilling'], ['broil', 'grill'],
  ['plastic wrap', 'cling film'], ['parchment paper', 'baking paper'], ['aluminum foil', 'foil'],
  ['cookie sheet', 'baking tray'], ['baking sheet', 'baking tray'], ['sheet pan', 'baking tray'],
  ['cheesecloth', 'muslin'],
  ['flavors', 'flavours'], ['flavor', 'flavour'], ['colors', 'colours'], ['color', 'colour'],
]

const NAME_LOOKUP = new Map(NAMES.map(([us, uk]) => [us.toLowerCase(), uk]))
const NAME_RE = new RegExp(
  String.raw`\b(${[...NAMES].sort((a, b) => b[0].length - a[0].length).map(([us]) => us).join('|')})\b`,
  'gi',
)

function britishNames(text: string): string {
  return text.replace(NAME_RE, match => {
    const uk = NAME_LOOKUP.get(match.toLowerCase()) ?? match
    return /^[A-Z]/.test(match) ? uk[0].toUpperCase() + uk.slice(1) : uk
  })
}

// --- Units -------------------------------------------------------------------

const FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+(?:\.\d+)?)`
const AMOUNT = String.raw`${NUM}(?:\s*(?:-|–|to)\s*${NUM})?`
// \b doesn't work before "½", so an amount just mustn't follow a digit, letter or slash.
const LEAD = String.raw`(?<![\w.\/])`

function readNum(s: string): number {
  const t = s.trim()
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const uni = t.match(/^(\d*)([½⅓⅔¼¾⅛⅜⅝⅞])$/)
  if (uni) return Number(uni[1] || 0) + FRACTIONS[uni[2]]
  return Number(t)
}

function readAmount(s: string): number[] {
  return s.split(/\s*(?:-|–|\bto\b)\s*/).filter(Boolean).map(readNum)
}

// Grams in one US cup, for things a UK cook would weigh. Liquids and anything else go to ml.
const LIQUID = /water|milk|stock|cream|oil|juice|wine|vinegar|sauce|yoghurt|yogurt|syrup|honey/i
const CUP_GRAMS: [RegExp, number][] = [
  [/icing sugar|powdered sugar/i, 120],
  [/brown sugar/i, 220],
  [/sugar/i, 200],
  [/flour|cocoa/i, 125],
  [/butter(?!milk)/i, 225],
  [/oats/i, 90],
  [/rice|quinoa|lentils/i, 190],
  [/breadcrumbs|panko/i, 60],
  [/grated|shredded|parmesan|cheddar|mozzarella/i, 100],
  [/almonds|walnuts|pecans|cashews|peanuts|nuts/i, 130],
  [/chocolate chips/i, 170],
  [/raisins|sultanas/i, 150],
]

const CUP_ML = 240

// Rounds to what a recipe would say: 5s and 10s, then kg/l past a thousand.
function metric(value: number, unit: 'g' | 'ml'): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}${unit === 'g' ? 'kg' : 'l'}`
  if (value < 10) return `${Math.max(1, Math.round(value))}${unit}`
  return `${Math.round(value / (value < 250 ? 5 : 10)) * (value < 250 ? 5 : 10)}${unit}`
}

const celsius = (f: string) => `${Math.round(((Number(f) - 32) * 5) / 9 / 10) * 10}°C`

function cm(inches: number): string {
  const v = inches * 2.54
  return `${v < 10 ? Math.round(v * 2) / 2 : Math.round(v)}cm`
}

function amounts(raw: string, one: (n: number) => string): string {
  const parts = readAmount(raw).map(one)
  if (parts.length === 1) return parts[0]
  // "240–480ml" rather than "240ml–480ml".
  const unit = parts[1].replace(/^[\d.]+/, '')
  return parts[0].endsWith(unit) ? `${parts[0].slice(0, -unit.length)}–${parts[1]}` : parts.join('–')
}

const IMPERIAL = String.raw`(?:cups?|fl\.?\s*oz\.?|fluid\s+ounces?|oz\.?|ounces?|lbs?\.?|pounds?|pints?|quarts?|qts?\.?|gallons?|inch(?:es)?|in\.)`
const METRIC = String.raw`(?:g|grams?|kg|kgs|ml|l|litres?|liters?|cm|mm)\b`
const DEGREES_F = String.raw`(\d{3})\s*(?:°\s*F|º\s*F|degrees?\s*F(?:ahrenheit)?|F\b)`
const DEGREES_C = String.raw`\d{2,3}\s*(?:°\s*C|º\s*C|degrees?\s*C(?:elsius)?|C\b)(?:\s*\(?\s*(?:fan|gas)[^)]*\)?)?`

// "1 cup (120g)", "120g (1 cup)", "350°F / 180°C": keep the metric half the author gave.
const DUAL = [
  new RegExp(String.raw`${LEAD}${AMOUNT}\s*-?\s*${IMPERIAL}(?![a-z])\s*(?:\(\s*|\/\s*)(${AMOUNT}\s*${METRIC})(?:\s*\))?`, 'gi'),
  new RegExp(String.raw`${LEAD}(${AMOUNT}\s*${METRIC})\s*(?:\(\s*|\/\s*)${AMOUNT}\s*-?\s*${IMPERIAL}(?![a-z])(?:\s*\))?`, 'gi'),
  new RegExp(String.raw`\b${DEGREES_F}\s*(?:\(\s*|\/\s*|or\s+)(${DEGREES_C})(?:\s*\))?`, 'gi'),
  new RegExp(String.raw`\b(${DEGREES_C})\s*(?:\(\s*|\/\s*|or\s+)${DEGREES_F}(?:\s*\))?`, 'gi'),
]

function metricUnits(text: string): string {
  let s = text
  s = s.replace(DUAL[0], '$1').replace(DUAL[1], '$1')
  s = s.replace(DUAL[2], '$2').replace(DUAL[3], '$1')

  s = s.replace(new RegExp(String.raw`\b${DEGREES_F}`, 'gi'), (_, f) => celsius(f))
  // "350 degrees" or "400°" with no letter is Fahrenheit when it's too hot to be Celsius.
  s = s.replace(/\b(\d{3})\s*(?:°|º|degrees?\b)(?!\s*[CF]\b)/gi, (match, f) => (Number(f) >= 275 ? celsius(f) : match))

  // "9x13-inch pan"
  s = s.replace(/\b(\d+)\s*[x×]\s*(\d+)\s*-?\s*inch(?:es)?\b/gi, (_, a, b) => `${cm(Number(a)).replace('cm', '')} x ${cm(Number(b))}`)

  // Sticks of butter are 113g each.
  s = s.replace(new RegExp(String.raw`${LEAD}(${AMOUNT})\s+sticks?\s+(?=(?:of\s+)?(?:\w+\s+)?butter)`, 'gi'), (_, a) => `${amounts(a, n => metric(n * 113, 'g'))} `)

  return s.replace(new RegExp(String.raw`${LEAD}(${AMOUNT})\s*-?\s*(${IMPERIAL})(?![a-z])`, 'gi'), (match, a: string, u: string, offset: number, whole: string) => {
    const unit = u.toLowerCase().replace(/\.$/, '')
    if (/^fl|^fluid/.test(unit)) return amounts(a, n => metric(n * 29.57, 'ml'))
    if (/^oz|^ounce/.test(unit)) return amounts(a, n => metric(n * 28.35, 'g'))
    if (/^lb|^pound/.test(unit)) return amounts(a, n => metric(n * 453.6, 'g'))
    if (/^pint/.test(unit)) return amounts(a, n => metric(n * 473, 'ml'))
    if (/^q/.test(unit)) return amounts(a, n => metric(n * 946, 'ml'))
    if (/^gallon/.test(unit)) return amounts(a, n => metric(n * 3785, 'ml'))
    if (/^in/.test(unit)) return amounts(a, cm)
    if (/^cup/.test(unit)) {
      // Weigh it if the rest of the line is something a UK recipe would weigh.
      const what = whole.slice(offset + match.length).split(/[,(]/)[0].slice(0, 40)
      const grams = LIQUID.test(what) ? undefined : CUP_GRAMS.find(([re]) => re.test(what))?.[1]
      return amounts(a, n => (grams ? metric(n * grams, 'g') : metric(n * CUP_ML, 'ml')))
    }
    return match
  })
}

// --- Capitals ----------------------------------------------------------------

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'n', 'of', 'on', 'or', 'the', 'to', 'with'])

// Only ever raises a letter, so "BBQ" and "McDonald's" survive.
const capitalise = (s: string) => s.replace(/^([^\p{L}\p{N}]*)(\p{Ll})/u, (_, lead, c) => lead + c.toUpperCase())

export function titleCase(title: string): string {
  return title
    .split(/(\s+)/)
    .map((word, i) => {
      if (i === 0) return capitalise(word)
      const bare = word.replace(/[^\p{L}]/gu, '').toLowerCase()
      return SMALL_WORDS.has(bare) ? word.toLowerCase() : capitalise(word)
    })
    .join('')
}

// --- Recipe ------------------------------------------------------------------

const localiseLine = (line: string) => capitalise(metricUnits(britishNames(line)))

export function localiseRecipe<T extends Pick<RecipeDraft, 'title' | 'ingredients' | 'steps'>>(recipe: T): T {
  const title = dropAlternatives(recipe.title).replace(/\b(?:coriander|cilantro)\b\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
  return {
    ...recipe,
    title: titleCase(britishNames(title || recipe.title)),
    ingredients: recipe.ingredients
      .filter(line => !ONLY_HERB.test(parseIngredient(line).name))
      .map(dropAlternatives)
      .filter(line => line && !MENTION.test(line))
      .map(localiseLine),
    steps: recipe.steps.map(dropSentences).filter(Boolean).map(localiseLine),
  }
}
