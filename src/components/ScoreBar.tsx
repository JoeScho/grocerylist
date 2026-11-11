import { scoreLabel, type RecipeScore } from '../lib/seasons'

// Fills from the left to the score. The gradient is sized to the whole track,
// so a low score stops in the red and only a high one reaches the green.
export function ScoreBar({ score, inline }: { score: RecipeScore; inline?: boolean }) {
  const pct = Math.round(score.score * 100)
  return (
    <div className={inline ? 'score-bar inline' : 'score-bar'} role="img" aria-label={scoreLabel(score)}>
      {pct > 0 && (
        <div
          className="score-fill"
          style={{ width: `${pct}%`, backgroundSize: `${10000 / pct}% 100%`, borderRadius: pct === 100 ? 0 : undefined }}
        />
      )}
    </div>
  )
}
