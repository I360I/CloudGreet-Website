/**
 * Type definitions for business hours
 */

export interface DayHours {
  open: string
  close: string
  closed: boolean
  enabled?: boolean
}

export interface BusinessHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
  [key: string]: DayHours | undefined
}





