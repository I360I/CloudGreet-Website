/**
 * Secrets Management System
 * Handles secure storage, rotation, and access to application secrets
 */

import crypto from 'crypto';
import { logger } from './monitoring';

export interface SecretConfig {
  name: string;
  type: 'api_key' | 'jwt_secret' | 'webhook_secret' | 'database_url' | 'other';
  rotationInterval: number; // in days
  lastRotated?: Date;
  version: number;
  isActive: boolean;
  encryptedValue: string;
  metadata?: Record<string, unknown>;
}

export interface RotationResult {
  success: boolean;
  newVersion: number;
  oldVersion: number;
  rotatedAt: Date;
  error?: string;
}

export class SecretsManager {
  private static instance: SecretsManager;
  private secrets: Map<string, SecretConfig> = new Map();
  private encryptionKey: string;
  private rotationQueue: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.encryptionKey = process.env.SECRETS_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.initializeSecrets();
    this.scheduleRotations();
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Initialize secrets from environment variables
   */
  private initializeSecrets(): void {
    const secretMappings = [
      { envVar: 'JWT_SECRET', name: 'jwt_secret', type: 'jwt_secret' as const, rotationInterval: 90 },
      { envVar: 'SUPABASE_SERVICE_ROLE_KEY', name: 'supabase_service_key', type: 'api_key' as const, rotationInterval: 180 },
      { envVar: 'OPENAI_API_KEY', name: 'openai_api_key', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'RETELL_API_KEY', name: 'retell_api_key', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'RETELL_WEBHOOK_SECRET', name: 'retell_webhook_secret', type: 'webhook_secret' as const, rotationInterval: 90 },
      { envVar: 'TELNYX_API_KEY', name: 'telnyx_api_key', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'TELNYX_WEBHOOK_SECRET', name: 'telnyx_webhook_secret', type: 'webhook_secret' as const, rotationInterval: 90 },
      { envVar: 'STRIPE_SECRET_KEY', name: 'stripe_secret_key', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'STRIPE_WEBHOOK_SECRET', name: 'stripe_webhook_secret', type: 'webhook_secret' as const, rotationInterval: 90 },
      { envVar: 'RESEND_API_KEY', name: 'resend_api_key', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'GOOGLE_CLIENT_SECRET', name: 'google_client_secret', type: 'api_key' as const, rotationInterval: 365 },
      { envVar: 'SLACK_WEBHOOK_URL', name: 'slack_webhook_url', type: 'webhook_secret' as const, rotationInterval: 180 },
    ];

    secretMappings.forEach(({ envVar, name, type, rotationInterval }) => {
      const value = process.env[envVar];
      if (value) {
        this.setSecret(name, value, type, rotationInterval);
      }
    });
  }

  /**
   * Generate a new encryption key
   */
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated new encryption key. Store this securely:', { key });
    return key;
  }

  /**
   * Encrypt a secret value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a secret value
   */
  private decrypt(encryptedValue: string): string {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Set a secret
   */
  public setSecret(
    name: string, 
    value: string, 
    type: SecretConfig['type'], 
    rotationInterval: number,
    metadata?: Record<string, unknown>
  ): void {
    const encryptedValue = this.encrypt(value);
    const secret: SecretConfig = {
      name,
      type,
      rotationInterval,
      version: 1,
      isActive: true,
      encryptedValue,
      metadata
    };

    this.secrets.set(name, secret);
    logger.info('Secret stored', { name, type, rotationInterval });
  }

  /**
   * Get a secret value
   */
  public getSecret(name: string): string | null {
    const secret = this.secrets.get(name);
    if (!secret || !secret.isActive) {
      logger.warn('Secret not found or inactive', { name });
      return null;
    }

    try {
      return this.decrypt(secret.encryptedValue);
    } catch (error) {
      logger.error('Failed to decrypt secret', { name, error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  /**
   * Rotate a secret
   */
  public async rotateSecret(name: string, newValue: string): Promise<RotationResult> {
    const secret = this.secrets.get(name);
    if (!secret) {
      return {
        success: false,
        newVersion: 0,
        oldVersion: 0,
        rotatedAt: new Date(),
        error: 'Secret not found'
      };
    }

    try {
      const oldVersion = secret.version;
      const newVersion = oldVersion + 1;
      
      // Store old version for rollback
      const oldSecret = { ...secret };
      
      // Update secret
      secret.version = newVersion;
      secret.encryptedValue = this.encrypt(newValue);
      secret.lastRotated = new Date();
      
      this.secrets.set(name, secret);

      logger.info('Secret rotated successfully', { 
        name, 
        oldVersion, 
        newVersion, 
        rotatedAt: secret.lastRotated 
      });

      return {
        success: true,
        newVersion,
        oldVersion,
        rotatedAt: secret.lastRotated!
      };
    } catch (error) {
      logger.error('Failed to rotate secret', { 
        name, 
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      
      return {
        success: false,
        newVersion: 0,
        oldVersion: secret.version,
        rotatedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Schedule automatic rotations
   */
  private scheduleRotations(): void {
    this.secrets.forEach((secret, name) => {
      if (secret.rotationInterval > 0) {
        this.scheduleSecretRotation(name, secret.rotationInterval);
      }
    });
  }

  /**
   * Schedule rotation for a specific secret
   */
  private scheduleSecretRotation(name: string, intervalDays: number): void {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    
    const timeout = setTimeout(async () => {
      await this.performScheduledRotation(name);
    }, intervalMs);

    this.rotationQueue.set(name, timeout);
    logger.info('Scheduled secret rotation', { name, intervalDays });
  }

  /**
   * Perform scheduled rotation
   */
  private async performScheduledRotation(name: string): void {
    try {
      logger.info('Performing scheduled rotation', { name });
      
      // Generate new value based on secret type
      const newValue = await this.generateNewSecretValue(name);
      
      if (newValue) {
        await this.rotateSecret(name, newValue);
        
        // Reschedule next rotation
        const secret = this.secrets.get(name);
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

        if (secret) {
          this.scheduleSecretRotation(name, secret.rotationInterval);
        }
      }
    } catch (error) {
      logger.error('Scheduled rotation failed', { 
        name, 
        error: error instanceof Error ? error.message : 'Unknown' 
      });
    }
  }

  /**
   * Generate new secret value based on type
   */
  private async generateNewSecretValue(name: string): Promise<string | null> {
    const secret = this.secrets.get(name);
    if (!secret) return null;

    switch (secret.type) {
      case 'jwt_secret':
        return crypto.randomBytes(64).toString('hex');
      
      case 'webhook_secret':
        return crypto.randomBytes(32).toString('hex');
      
      case 'api_key':
        // For API keys, we need to generate new ones through the respective services
        // This would typically involve calling the service's API to generate a new key
        logger.warn('API key rotation requires manual intervention', { name });
        return null;
      
      default:
        return crypto.randomBytes(32).toString('hex');
    }
  }

  /**
   * Get all secrets metadata (without values)
   */
  public getSecretsMetadata(): Array<Omit<SecretConfig, 'encryptedValue'>> {
    return Array.from(this.secrets.values()).map(secret => ({
      name: secret.name,
      type: secret.type,
      rotationInterval: secret.rotationInterval,
      lastRotated: secret.lastRotated,
      version: secret.version,
      isActive: secret.isActive,
      metadata: secret.metadata
    }));
  }

  /**
   * Deactivate a secret
   */
  public deactivateSecret(name: string): boolean {
    const secret = this.secrets.get(name);
    if (!secret) return false;

    secret.isActive = false;
    this.secrets.set(name, secret);
    
    // Clear rotation schedule
    const timeout = this.rotationQueue.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.rotationQueue.delete(name);
    }

    logger.info('Secret deactivated', { name });
    return true;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.rotationQueue.forEach(timeout => clearTimeout(timeout));
    this.rotationQueue.clear();
  }
}

// Export singleton instance
export const secretsManager = SecretsManager.getInstance();







