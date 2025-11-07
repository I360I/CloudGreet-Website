import { sanitizeString, sanitizeEmail, sanitizePhoneNumber, sanitizeJson } from '@/lib/security'

describe('Security Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeString(input)
      expect(result).toBe('scriptalert("xss")/scriptHello')
    })

    it('should remove quotes', () => {
      const input = 'test"value\'test'
      const result = sanitizeString(input)
      expect(result).toBe('testvaluetest')
    })

    it('should remove semicolons', () => {
      const input = 'test;value'
      const result = sanitizeString(input)
      expect(result).toBe('testvalue')
    })

    it('should remove parentheses', () => {
      const input = 'test(value)test'
      const result = sanitizeString(input)
      expect(result).toBe('testvaluetest')
    })

    it('should limit length', () => {
      const input = 'a'.repeat(2000)
      const result = sanitizeString(input)
      expect(result.length).toBeLessThanOrEqual(1000)
    })

    it('should handle non-string input', () => {
      const result = sanitizeString(123 as any)
      expect(result).toBe('')
    })
  })

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const result = sanitizeEmail('TEST@EXAMPLE.COM')
      expect(result).toBe('test@example.com')
    })

    it('should remove invalid characters', () => {
      const result = sanitizeEmail('test<script>@example.com')
      expect(result).toBe('testscript@example.com')
    })

    it('should limit length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      const result = sanitizeEmail(longEmail)
      expect(result.length).toBeLessThanOrEqual(254)
    })

    it('should handle non-string input', () => {
      const result = sanitizeEmail(123 as any)
      expect(result).toBe('')
    })
  })

  describe('sanitizePhoneNumber', () => {
    it('should keep valid phone characters', () => {
      const result = sanitizePhoneNumber('+1 (555) 123-4567')
      expect(result).toBe('+1 (555) 123-4567')
    })

    it('should remove invalid characters', () => {
      const result = sanitizePhoneNumber('+1 555<script>123-4567')
      expect(result).toBe('+1 555123-4567')
    })

    it('should limit length', () => {
      const longPhone = '+1' + '5'.repeat(30)
      const result = sanitizePhoneNumber(longPhone)
      expect(result.length).toBeLessThanOrEqual(20)
    })

    it('should handle non-string input', () => {
      const result = sanitizePhoneNumber(123 as any)
      expect(result).toBe('')
    })
  })

  describe('sanitizeJson', () => {
    it('should sanitize string values', () => {
      const input = { name: '<script>alert("xss")</script>John' }
      const result = sanitizeJson(input) as { name: string }
      expect(result.name).toBe('scriptalert("xss")/scriptJohn')
    })

    it('should handle number values', () => {
      const input = { count: 42 }
      const result = sanitizeJson(input) as { count: number }
      expect(result.count).toBe(42)
    })

    it('should handle boolean values', () => {
      const input = { active: true }
      const result = sanitizeJson(input) as { active: boolean }
      expect(result.active).toBe(true)
    })

    it('should handle array values', () => {
      const input = { items: ['<script>test</script>', 'normal'] }
      const result = sanitizeJson(input) as { items: string[] }
      expect(result.items).toEqual(['scripttest/script', 'normal'])
    })

    it('should limit array size', () => {
      const input = { items: Array(200).fill('test') }
      const result = sanitizeJson(input) as { items: string[] }
      expect(result.items.length).toBeLessThanOrEqual(100)
    })

    it('should handle nested objects', () => {
      const input = { user: { name: '<script>alert("xss")</script>John' } }
      const result = sanitizeJson(input) as { user: { name: string } }
      expect(result.user.name).toBe('scriptalert("xss")/scriptJohn')
    })

    it('should limit object keys', () => {
      const input: any = {}
      for (let i = 0; i < 100; i++) {
        input[`key${i}`] = 'value'
      }
      const result = sanitizeJson(input)
      expect(Object.keys(result).length).toBeLessThanOrEqual(50)
    })

    it('should handle null values', () => {
      const result = sanitizeJson(null)
      expect(result).toBe(null)
    })
  })
})


