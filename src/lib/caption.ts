// Pulls a recipe out of pasted Instagram caption text. Captions usually have
// a title line, an "Ingredients" heading with a list, then "Method"/"Steps".

export interface CaptionRecipe {
  title: string
  servings: number | null
  ingredients: string[]
  steps: string[]
}

const INGREDIENT_HEADING = /^(ingredients?|you(?:'|’)?ll need|what you need|shopping list)\b/i
const STEP_HEADING = /^(method|instructions?|directions?|steps?|how to (?:make|cook)(?: it)?|recipe|preparation|prep)\b/i
const NOISE = /^(#\w|@\w|follow|save this|like and|link in bio|comment\b)/i

// Strips bullets, emoji and step numbers from the start of a line.
function tidy(line: string): string {
  return line
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️\s•\-*▪●◦·–—>]+/u, '')
    .replace(/[\p{Extended_Pictographic}️]+$/u, '')
    .trim()
}

function stripStepNumber(line: string): string {
  return line.replace(/^(step\s*)?\d+[.):-]?\s*/i, '').trim()
}

function isHeading(line: string, re: RegExp): boolean {
  const t = tidy(line).replace(/[:\-–—]+$/, '').trim()
  return re.test(t) && t.length < 40
}

const STARTS_WITH_QTY = /^(\d|[½⅓⅔¼¾⅛]|a (pinch|handful|splash|bunch|knob)|pinch|handful)/i
const NUMBERED = /^(step\s*)?\d+[.)]\s+\S/i

export function parseCaption(text: string): CaptionRecipe {
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const ingredients: string[] = []
  const steps: string[] = []
  let title = ''
  let servings: number | null = null
  let section: 'none' | 'ingredients' | 'steps' = 'none'
  let sawHeadings = false

  for (const raw of lines) {
    if (!raw) continue
    const serves = raw.match(/\b(?:serves|servings?|portions?|feeds)\s*:?\s*(\d+)/i)
    if (serves && servings === null) servings = Number(serves[1])

    if (isHeading(raw, INGREDIENT_HEADING)) { section = 'ingredients'; sawHeadings = true; continue }
    if (isHeading(raw, STEP_HEADING)) { section = 'steps'; sawHeadings = true; continue }

    const line = tidy(raw)
    if (!line || NOISE.test(line)) continue
    if (/^#/.test(raw.trim()) && section === 'none') continue

    if (section === 'ingredients') {
      // A numbered sentence after the list usually means the method started without a heading.
      if (NUMBERED.test(line) && line.length > 40) { section = 'steps'; steps.push(stripStepNumber(line)); continue }
      ingredients.push(line)
    } else if (section === 'steps') {
      steps.push(stripStepNumber(line))
    } else if (!title) {
      title = line.replace(/[!.]+$/, '')
    } else if (!sawHeadings && NUMBERED.test(line)) {
      steps.push(stripStepNumber(line))
    } else if (!sawHeadings && STARTS_WITH_QTY.test(line) && line.length < 80) {
      ingredients.push(line)
    }
  }

  return {
    title: title.slice(0, 120),
    servings,
    ingredients,
    steps: steps.filter(s => !/^#/.test(s)),
  }
}
