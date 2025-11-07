import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from './monitoring';

export interface JWTPayload {
  userId: string;
  businessId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface JWTResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Centralized JWT utility for consistent token handling across the application
 */
export class JWTManager {
  private static readonly JWT_SECRET = process.env.JWT_SECRET;
  private static readonly DEFAULT_EXPIRES_IN = '24h';

  /**
   * Verify a JWT token and return the payload
   */
  static verifyToken(token: string): JWTResult {
    try {
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

      if (!this.JWT_SECRET) {
        logger.error('JWT_SECRET not configured');
        return { success: false, error: 'JWT_SECRET not configured' };
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


      if (!token) {
        logger.error('No token provided');
        return { success: false, error: 'No token provided' };
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      const secret = this.JWT_SECRET as string; // Type assertion after null check
      const payload = jwt.verify(cleanToken, secret) as JWTPayload;
      
      logger.info('JWT token verified successfully', { 
        userId: payload.userId, 
        businessId: payload.businessId 
      });
      
      return { success: true, payload };
    } catch (error) {
      logger.error('JWT token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        token: token.substring(0, 20) + '...' // Log partial token for debugging
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      };
    }
  }

  /**
   * Sign a JWT token with the provided payload
   */
  static signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn?: string): string {
    try {
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

      if (!this.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }

      const secret = this.JWT_SECRET as string; // Type assertion after null check
      const expiresInValue = expiresIn || this.DEFAULT_EXPIRES_IN;
      const options: unknown = {
        expiresIn: expiresInValue
      };
      const token = jwt.sign(payload, secret, options);

      logger.info('JWT token signed successfully', { 
        userId: payload.userId, 
        businessId: payload.businessId,
        expiresIn: expiresIn || this.DEFAULT_EXPIRES_IN
      });

      return token;
    } catch (error) {
      logger.error('JWT token signing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
        businessId: payload.businessId
      });
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify token from request headers
   */
  static verifyTokenFromRequest(request: Request): JWTResult {
    const authHeader = request.headers.get('authorization');
    const token = this.extractTokenFromHeader(authHeader);
    
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

    
    if (!token) {
      return { success: false, error: 'No authorization token found' };
    }

    return this.verifyToken(token);
  }

  /**
   * Create a token for admin users
   */
  static createAdminToken(adminId: string): string {
    return this.signToken({
      userId: adminId,
      businessId: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@cloudgreet.com',
      role: 'admin'
    }, '1h'); // Admin tokens expire in 1 hour
  }

  /**
   * Create a token for regular users
   */
  static createUserToken(userId: string, businessId: string, email: string): string {
    return this.signToken({
      userId,
      businessId,
      email,
      role: 'user'
    });
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
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

      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
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

      if (!decoded || !decoded.exp) {
        return null;
      }
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

/**
 * Convenience functions for backward compatibility
 */
export const verifyJWT = (token: string): JWTResult => JWTManager.verifyToken(token);
/**
 * signJWT - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await signJWT(param1, param2)
 * ```
 */
export const signJWT = (payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn?: string): string => 
  JWTManager.signToken(payload, expiresIn);
/**
 * extractToken - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await extractToken(param1, param2)
 * ```
 */
export const extractToken = (authHeader: string | null): string | null => 
  JWTManager.extractTokenFromHeader(authHeader);
/**
 * verifyTokenFromRequest - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await verifyTokenFromRequest(param1, param2)
 * ```
 */
export const verifyTokenFromRequest = (request: Request): JWTResult => 
  JWTManager.verifyTokenFromRequest(request);