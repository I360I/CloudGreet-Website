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
    .replace(/[&<>"']/g, (match) => {
      // HTML entity encoding for XSS prevention
      const entities: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[match] || match;
    })
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
    .replace(/<link\b[^>]*>/gi, '') // Remove link tags
    .replace(/<meta\b[^>]*>/gi, '') // Remove meta tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:text\/html/gi, '') // Remove data: HTML
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize SQL input to prevent injection
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/union\s+select/gi, '') // Remove UNION SELECT
    .replace(/drop\s+table/gi, '') // Remove DROP TABLE
    .replace(/delete\s+from/gi, '') // Remove DELETE FROM
    .replace(/insert\s+into/gi, '') // Remove INSERT INTO
    .replace(/update\s+set/gi, '') // Remove UPDATE SET
    .replace(/create\s+table/gi, '') // Remove CREATE TABLE
    .replace(/alter\s+table/gi, '') // Remove ALTER TABLE
    .replace(/exec\s*\(/gi, '') // Remove EXEC
    .replace(/execute\s*\(/gi, '') // Remove EXECUTE
    .replace(/xp_cmdshell/gi, '') // Remove xp_cmdshell
    .replace(/sp_executesql/gi, '') // Remove sp_executesql
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[\/\\]/g, '/') // Normalize path separators
    .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe characters
    .replace(/^\/+/, '') // Remove leading slashes
    .substring(0, 255); // Limit length
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
export function sanitizeJson(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (typeof input === 'boolean') {
    return Boolean(input);
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (Array.isArray(input)) {
    return input.map(sanitizeJson).slice(0, 100); // Limit array size
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    const keys = Object.keys(input).slice(0, 50); // Limit object keys
    
    for (const key of keys) {
      const sanitizedKey = sanitizeString(key);
      /**

       * if - Add description here

       * 

       * @param {...any} args - Method parameters

       * @returns {Promise<any>} Method return value

       * @throws {Error} When operation fails

       * 

       * @example

       * ```typescript

       * await this.if(param1, param2)

       * ```

       */

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
export function sanitizeRequestBody(body: unknown): unknown {
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

/**
 * Comprehensive input validation and sanitization
 */
export function validateAndSanitizeInput(input: unknown, type: 'string' | 'email' | 'phone' | 'number' | 'boolean' | 'url' | 'json' | 'html' | 'sql' | 'filepath'): unknown {
  if (input === null || input === undefined) {
    return type === 'boolean' ? false : (type === 'number' ? 0 : '');
  }

  switch (type) {
    case 'string':
      return sanitizeString(String(input));
    case 'email':
      return sanitizeEmail(String(input));
    case 'phone':
      return sanitizePhone(String(input));
    case 'number':
      const num = Number(input);
      return isNaN(num) ? 0 : num;
    case 'boolean':
      return Boolean(input);
    case 'url':
      try {
        const url = new URL(String(input));
        return url.toString();
      } catch {
        return '';
      }
    case 'json':
      return sanitizeJson(input);
    case 'html':
      return sanitizeHtml(String(input));
    case 'sql':
      return sanitizeSql(String(input));
    case 'filepath':
      return sanitizeFilePath(String(input));
    default:
      return sanitizeString(String(input));
  }
}

/**
 * Validate and sanitize API request body
 */
export function validateApiRequestBody(body: unknown, schema?: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return {};
  }

  // If schema is provided, validate against it first
  if (schema && typeof schema === 'object' && 'parse' in schema && typeof (schema as { parse: (data: unknown) => unknown }).parse === 'function') {
    try {
      const validated = (schema as { parse: (data: unknown) => unknown }).parse(body);
      return sanitizeJson(validated);
    } catch (error) {
      throw new Error('Invalid request body: ' + (error as Error).message);
    }
  }

  return sanitizeJson(body);
}

/**
 * Check for potential SQL injection patterns
 */
export function detectSqlInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+set/gi,
    /create\s+table/gi,
    /alter\s+table/gi,
    /exec\s*\(/gi,
    /execute\s*\(/gi,
    /xp_cmdshell/gi,
    /sp_executesql/gi,
    /--/g,
    /\/\*/g,
    /'\s*or\s*'/gi,
    /"\s*or\s*"/gi,
    /'\s*and\s*'/gi,
    /"\s*and\s*"/gi
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for potential XSS patterns
 */
export function detectXss(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for potential path traversal patterns
 */
export function detectPathTraversal(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const pathPatterns = [
    /\.\./g,
    /\.\.\//g,
    /\.\.\\/g,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /\.\.%252f/gi,
    /\.\.%255c/gi
  ];

  return pathPatterns.some(pattern => pattern.test(input));
}
