import { Fira_Sans, Fira_Code } from 'next/font/google'

// Typeface pairing from the ui-ux-pro-max design-system output for a
// data/analytics dashboard ("dashboard, data, analytics, precise" mood):
// Fira Sans carries all UI text and numbers; Fira Code is reserved for
// small data annotations only (phone numbers, micro labels) - never
// headings, never large values.
export const firaSans = Fira_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
export const firaCode = Fira_Code({ subsets: ['latin'], weight: ['400', '500'] })
