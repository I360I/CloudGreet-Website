export interface SelectionRange {
  start: number
  end: number
}

export function setSelectionRange(el: HTMLInputElement | HTMLTextAreaElement, range: SelectionRange): boolean {
  try {
    const len = el.value.length
    const start = Math.max(0, Math.min(range.start, len))
    const end = Math.max(start, Math.min(range.end, len))
    el.setSelectionRange(start, end)
    return el.selectionStart === start && el.selectionEnd === end
  } catch {
    return false
  }
}

export function placeCaretAtEnd(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  try {
    const pos = el.value.length
    el.setSelectionRange(pos, pos)
    return el.selectionStart === pos && el.selectionEnd === pos
  } catch {
    return false
  }
}

export function moveToNextMatch(
  el: HTMLInputElement | HTMLTextAreaElement,
  regex: RegExp,
  fromIndex = 0,
): SelectionRange | null {
  const text = el.value
  const sliced = text.slice(fromIndex)
  const match = sliced.match(regex)
  if (!match || match.index === undefined) return null
  const start = fromIndex + match.index
  const end = start + match[0].length
  const ok = setSelectionRange(el, { start, end })
  return ok ? { start, end } : null
}
















