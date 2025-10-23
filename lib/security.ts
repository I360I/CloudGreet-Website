// Security utilities for input sanitization and validation

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .replace(/[;]/g, '') // Remove semicolons that could break SQL
    .replace(/[()]/g, '') // Remove parentheses
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow valid email characters
    .substring(0, 254); // Email length limit
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[^0-9+()-]/g, '') // Only allow valid phone characters
    .substring(0, 20); // Phone length limit
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  
  if (typeof input === 'boolean') {
    return Boolean(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeJson).slice(0, 100); // Limit array size
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(input).slice(0, 50); // Limit object keys
    
    for (const key of keys) {
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeJson(input[key]);
      }
    }
    
    return sanitized;
  }
  
  return null;
}

/**
 * Validate and sanitize request body
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return {};
  }
  
  return sanitizeJson(body);
}

/**
 * Sanitize URL parameters
 */
export function sanitizeUrlParams(params: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  params.forEach((value, key) => {
    const sanitizedKey = sanitizeString(key);
    const sanitizedValue = sanitizeString(value);
    
    if (sanitizedKey && sanitizedValue) {
      sanitized[sanitizedKey] = sanitizedValue;
    }
  });
  
  return sanitized;
}
