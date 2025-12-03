/**
 * Type definitions for pricing-related data structures
 */

export type ServiceType = 'hvac' | 'roofing' | 'painting'
export type UnitType = 'per_sqft' | 'per_hour' | 'per_unit' | 'fixed'

export interface PricingRule {
  id: string
  service_type: ServiceType
  name: string
  description?: string
  base_price: number
  unit_type: UnitType
  unit_price?: number
  min_price?: number
  max_price?: number
  is_active: boolean
}





