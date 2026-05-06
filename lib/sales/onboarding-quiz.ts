/**
 * Step 7 quiz bank.
 *
 * 10 questions, multiple choice. 80% (8/10) to pass. The bank lives
 * here so updating questions is a code change - no DB migration. The
 * `videoStep` field is the step number whose video covers the answer,
 * so we can prompt the rep to rewatch it on a wrong answer.
 */

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** Index into options. */
  answer: number
  /** Step number (1-6) whose video covers this. */
  videoStep: number
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'What does CloudGreet do?',
    options: [
      'Cleans up junk files on your computer',
      'A 24/7 AI receptionist that answers calls and books appointments for service businesses',
      'A CRM for sales reps',
      'A marketing automation tool',
    ],
    answer: 1,
    videoStep: 1,
  },
  {
    id: 'q2',
    prompt: 'What is the recommended starting price for a new client?',
    options: ['$199/mo + $99 setup', '$500/mo + $500 setup', '$1,500/mo flat', 'Whatever the rep wants'],
    answer: 1,
    videoStep: 2,
  },
  {
    id: 'q3',
    prompt: 'What is your commission structure on setup fees AND monthly recurring?',
    options: ['25/75 split', '50/50 split', '70/30 split', 'Flat $200 per close'],
    answer: 1,
    videoStep: 2,
  },
  {
    id: 'q4',
    prompt: 'When do payouts hit your bank account?',
    options: ['Monthly on the 1st', 'Friday auto-payouts via Stripe Connect', 'When you request them', 'Every other Wednesday'],
    answer: 1,
    videoStep: 2,
  },
  {
    id: 'q5',
    prompt: 'What happens to your commission if you stop closing for 4 months?',
    options: ['Nothing changes', 'It drops to 25% MRR', 'Clients fully transfer to CloudGreet', 'You get fired'],
    answer: 1,
    videoStep: 2,
  },
  {
    id: 'q6',
    prompt: 'What happens at 7 months of no closes?',
    options: ['Nothing changes', 'It drops to 25% MRR', 'Clients fully transfer to CloudGreet (you earn 0%)', 'You owe CloudGreet money'],
    answer: 2,
    videoStep: 2,
  },
  {
    id: 'q7',
    prompt: 'How do you reset your trailing commission window?',
    options: [
      'Wait 90 days',
      'Email Anthony',
      'Land any new close - the clock resets to month 0',
      'There is no reset',
    ],
    answer: 2,
    videoStep: 2,
  },
  {
    id: 'q8',
    prompt: 'What is the difference between "Send booking link" and "Send payment link"?',
    options: [
      'They are the same button',
      'Booking link provisions a client account + emails the prospect; Payment link generates a Stripe checkout for monthly + setup',
      'Booking link is for demos, Payment link is for refunds',
      'Booking link is paid, Payment link is free',
    ],
    answer: 1,
    videoStep: 4,
  },
  {
    id: 'q9',
    prompt: 'How should you frame the demo agent during a sales call?',
    options: [
      'As the final, polished version',
      'As a rough draft that we will customize before going live',
      'As a competitor product',
      'Do not let the prospect hear it at all',
    ],
    answer: 1,
    videoStep: 6,
  },
  {
    id: 'q10',
    prompt: 'After the prospect signs up and pays, what is your next step?',
    options: [
      'Build the agent prompt yourself in Retell',
      'Send the customization form - the platform team handles agent build and go-live',
      'Wait for the client to call you',
      'Cancel the deal if they have questions',
    ],
    answer: 1,
    videoStep: 6,
  },
]

export const QUIZ_PASS_THRESHOLD = 0.8 // 80%

export type GradedAnswer = {
  id: string
  correct: boolean
  /** Step the rep should rewatch if they got this wrong. */
  videoStep: number
}

export function gradeQuiz(answers: Record<string, number>): {
  total: number
  correct: number
  scorePct: number
  passed: boolean
  graded: GradedAnswer[]
} {
  const graded: GradedAnswer[] = QUIZ.map((q) => ({
    id: q.id,
    correct: answers[q.id] === q.answer,
    videoStep: q.videoStep,
  }))
  const correct = graded.filter((g) => g.correct).length
  const total = QUIZ.length
  const scorePct = Math.round((correct / total) * 100)
  return { total, correct, scorePct, passed: scorePct / 100 >= QUIZ_PASS_THRESHOLD, graded }
}
