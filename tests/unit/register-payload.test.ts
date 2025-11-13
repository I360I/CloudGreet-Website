import { describe, expect, it } from '@jest/globals'
import { buildRegistrationPayload } from '../../lib/auth/register-payload'

describe('buildRegistrationPayload', () => {
  it('maps camelCase form data into API payload with snake_case keys', () => {
    const payload = buildRegistrationPayload({
      firstName: '  Jamie  ',
      lastName: '  Rivera ',
      businessName: ' Horizon Heating ',
      businessType: 'HVAC',
      email: 'Owner@HorizonHeating.com ',
      password: 'SuperSecure123!',
      phone: '(555) 987-6543',
      address: ' 42 Industrial Way, Denver, CO '
    })

    expect(payload).toEqual({
      email: 'owner@horizonheating.com',
      password: 'SuperSecure123!',
      business_name: 'Horizon Heating',
      business_type: 'HVAC',
      phone: '5559876543',
      address: '42 Industrial Way, Denver, CO',
      first_name: 'Jamie',
      last_name: 'Rivera',
      name: 'Jamie Rivera'
    })
  })

  it('falls back to general business type and preserves leading plus in phone numbers', () => {
    const payload = buildRegistrationPayload({
      firstName: 'Alex',
      lastName: 'Smith',
      businessName: 'Test Plumbing',
      businessType: 'Unknown Type',
      email: 'test@example.com',
      password: 'Password123!',
      phone: '+1 (800) 555-1212',
      address: '123 Main Street'
    })

    expect(payload.business_type).toBe('general')
    expect(payload.phone).toBe('+18005551212')
  })

  it('builds a full name even if body omits it explicitly', () => {
    const payload = buildRegistrationPayload({
      firstName: 'Taylor',
      lastName: 'Nguyen',
      businessName: 'Next Level Roofing',
      businessType: 'Roofing',
      email: 'taylor@example.com',
      password: 'Password123!',
      phone: '555-101-0101',
      address: '555 Elm St'
    })

    expect(payload.name).toBe('Taylor Nguyen')
  })
})


