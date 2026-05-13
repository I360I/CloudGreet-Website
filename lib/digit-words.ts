/**
 * Convert spelled-out digit words ("one one one one Main Street") back
 * to numerals ("1111 Main Street"). Retell's LLM frequently passes the
 * verbalized form into tool arguments because the agent literally said
 * the words aloud and copies its own speech into the tool call.
 *
 * Handles runs of single-digit words separated by spaces. Leaves words
 * like "one" alone when surrounded by non-digit words ("one bedroom").
 */

const DIGIT_WORDS: Record<string, string> = {
 zero: '0', oh: '0', o: '0',
 one: '1',
 two: '2',
 three: '3',
 four: '4',
 five: '5',
 six: '6',
 seven: '7',
 eight: '8',
 nine: '9',
}

const DIGIT_WORD_REGEX = new RegExp(
 `\\b(?:${Object.keys(DIGIT_WORDS).join('|')})(?:[\\s-]+(?:${Object.keys(DIGIT_WORDS).join('|')})){1,}\\b`,
 'gi',
)

export function compressDigitWords(input: string | null | undefined): string {
 if (!input || typeof input !== 'string') return input ?? ''
 return input.replace(DIGIT_WORD_REGEX, (match) => {
  const parts = match.split(/[\s-]+/)
  return parts.map((p) => DIGIT_WORDS[p.toLowerCase()] ?? p).join('')
 })
}
