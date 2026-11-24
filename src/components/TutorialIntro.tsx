// TutorialIntro.tsx — "How to play" picture cards, shown before the practice
// puzzles. Three cards explain the whole idea with real mobile drawings:
//   1. Make every bar level        (a bar tipping toward its heavier side)
//   2. Further out pulls harder    (pull = weight × notches; 1 × 2 = 2 × 1)
//   3. A bar carries everything below it
// The drawings are pictures only (readOnly): nothing can be tapped.

import { useState } from 'react'
import { TUTORIAL_PUZZLES } from '../game/puzzles.ts'
import type { Placement, Puzzle } from '../game/types.ts'
import { MobileView } from './MobileView.tsx'
import './TutorialIntro.css'

type Card = {
  title: string
  text: string
  puzzle: Puzzle
  placement: Placement
  solved: boolean
  /** The worked example under the picture, e.g. "1 × 2 = 2 × 1". */
  sum?: string
}

const ONE_BAR = TUTORIAL_PUZZLES[0] // 2 notches left, 1 notch right
const TWO_BARS = TUTORIAL_PUZZLES[1] // a small bar hanging from the top bar

const CARDS: Card[] = [
  {
    title: 'Make every bar level',
    text: 'Hang the numbered weights on the hooks. A bar tips toward its heavier side. You win when every bar hangs perfectly level.',
    puzzle: ONE_BAR,
    placement: { right: 2 },
    solved: false,
    sum: 'Only the 2 is hung, so the bar tips right.',
  },
  {
    title: 'Further out pulls harder',
    text: 'Each side pulls with its weight × its notches (the number above the arm). A light weight far out can balance a heavy one close in.',
    puzzle: ONE_BAR,
    placement: { left: 1, right: 2 },
    solved: true,
    sum: '1 × 2 notches = 2   and   2 × 1 notch = 2   → level',
  },
  {
    title: 'A bar carries everything below it',
    text: 'When a bar hangs from another bar, all of its weights count for the bar above. Level the lower bars first, then the top.',
    puzzle: TWO_BARS,
    placement: { a: 3, x1: 2, x2: 1 },
    solved: true,
    sum: 'The small bar holds 2 + 1 = 3, which balances the 3.',
  },
]

export function TutorialIntro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const card = CARDS[index]
  const isLast = index === CARDS.length - 1

  return (
    <section className="intro-cards" aria-labelledby="intro-card-title">
      <p className="intro-step">
        How to play · {index + 1} of {CARDS.length}
      </p>
      {/* key={index} restarts the little entrance animation on each card */}
      <div key={index} className="intro-card card">
        <h2 id="intro-card-title" className="intro-card-title">
          {card.title}
        </h2>
        <div className="intro-picture" aria-hidden="true">
          <MobileView
            puzzle={card.puzzle}
            placement={card.placement}
            selected={null}
            isDragging={false}
            dropTargetId={null}
            solved={card.solved}
            celebrate={false}
            readOnly
            onHookTap={() => {}}
            onWeightPointerDown={() => {}}
          />
        </div>
        {card.sum && <p className="intro-sum">{card.sum}</p>}
        <p className="intro-text">{card.text}</p>
      </div>

      {/* Dots show which card you're on */}
      <div className="intro-dots" aria-hidden="true">
        {CARDS.map((_, i) => (
          <span key={i} className={`intro-dot${i === index ? ' is-on' : ''}`} />
        ))}
      </div>

      <div className="intro-nav">
        {index > 0 ? (
          <button type="button" className="link-button" onClick={() => setIndex(index - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="button" onClick={isLast ? onDone : () => setIndex(index + 1)}>
          {isLast ? "Let's try it" : 'Next'}
        </button>
      </div>
    </section>
  )
}
