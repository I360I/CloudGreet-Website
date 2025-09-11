import { Pool, PoolClient } from 'pg'

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cloudgreet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
}

// Create connection pool
const pool = new Pool(dbConfig)

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Database connection class
export class Database {
  private static instance: Database
  private pool: Pool

  private constructor() {
    this.pool = pool
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  // Get a client from the pool
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect()
      return client
    } catch (error) {
      console.error('Failed to get database client:', error)
      throw new Error('Database connection failed')
    }
  }

  // Execute a query with automatic client management
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient()
    try {
      const result = await client.query(text, params)
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Execute a transaction
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Transaction error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  // Close all connections
  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Export singleton instance
export const db = Database.getInstance()

// Database utility functions
export class DatabaseUtils {
  // Generate UUID
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Sanitize input for SQL
  static sanitizeInput(input: string): string {
    return input.replace(/'/g, "''")
  }

  // Build WHERE clause from filters
  static buildWhereClause(filters: Record<string, any>): { clause: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${paramIndex})`)
          params.push(value)
        } else if (typeof value === 'string' && value.includes('%')) {
          conditions.push(`${key} ILIKE $${paramIndex}`)
          params.push(value)
        } else {
          conditions.push(`${key} = $${paramIndex}`)
          params.push(value)
        }
        paramIndex++
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    }
  }

  // Build pagination
  static buildPagination(page: number = 1, limit: number = 20): { offset: number; limit: number } {
    const offset = (page - 1) * limit
    return { offset, limit }
  }

  // Format date for database
  static formatDate(date: Date): string {
    return date.toISOString()
  }

  // Parse database date
  static parseDate(dateString: string): Date {
    return new Date(dateString)
  }
}

// Database models
export interface User {
  id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  phone_number?: string
  email_verified: boolean
  two_factor_enabled: boolean
  two_factor_secret?: string
  last_login?: Date
  created_at: Date
  updated_at: Date
  deleted_at?: Date
}

export interface Business {
  id: string
  user_id: string
  name: string
  industry: string
  phone_number?: string
  email?: string
  website?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country: string
  timezone: string
  business_hours?: any
  services?: any
  ai_personality?: any
  created_at: Date
  updated_at: Date
  deleted_at?: Date
}

export interface Call {
  id: string
  business_id: string
  phone_number_id?: string
  call_connection_id: string
  caller_number?: string
  callee_number?: string
  direction: 'inbound' | 'outbound'
  status: string
  start_time?: Date
  end_time?: Date
  duration_seconds?: number
  recording_url?: string
  transcription?: string
  sentiment_score?: number
  topics?: any
  outcome?: string
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface Appointment {
  id: string
  business_id: string
  call_id?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  service_type?: string
  appointment_date: Date
  appointment_time: string
  duration_minutes: number
  status: string
  notes?: string
  reminder_sent: boolean
  created_at: Date
  updated_at: Date
}

// Repository pattern for database operations
export class UserRepository {
  async create(userData: Partial<User>): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const result = await db.query(query, [
      userData.email,
      userData.password_hash,
      userData.first_name,
      userData.last_name,
      userData.phone_number
    ])
    return result.rows[0]
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL'
    const result = await db.query(query, [id])
    return result.rows[0] || null
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL'
    const result = await db.query(query, [email])
    return result.rows[0] || null
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const query = `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`
    const values = [id, ...Object.values(updates)]
    const result = await db.query(query, values)
    return result.rows[0]
  }

  async delete(id: string): Promise<void> {
    const query = 'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1'
    await db.query(query, [id])
  }
}

export class BusinessRepository {
  async create(businessData: Partial<Business>): Promise<Business> {
    const query = `
      INSERT INTO businesses (user_id, name, industry, phone_number, email, website, 
                             address_line1, address_line2, city, state, postal_code, 
                             country, timezone, business_hours, services, ai_personality)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `
    const result = await db.query(query, [
      businessData.user_id,
      businessData.name,
      businessData.industry,
      businessData.phone_number,
      businessData.email,
      businessData.website,
      businessData.address_line1,
      businessData.address_line2,
      businessData.city,
      businessData.state,
      businessData.postal_code,
      businessData.country,
      businessData.timezone,
      JSON.stringify(businessData.business_hours),
      JSON.stringify(businessData.services),
      JSON.stringify(businessData.ai_personality)
    ])
    return result.rows[0]
  }

  async findByUserId(userId: string): Promise<Business[]> {
    const query = 'SELECT * FROM businesses WHERE user_id = $1 AND deleted_at IS NULL'
    const result = await db.query(query, [userId])
    return result.rows
  }

  async findById(id: string): Promise<Business | null> {
    const query = 'SELECT * FROM businesses WHERE id = $1 AND deleted_at IS NULL'
    const result = await db.query(query, [id])
    return result.rows[0] || null
  }

  async update(id: string, updates: Partial<Business>): Promise<Business> {
    const fields = Object.keys(updates).map((key, index) => {
      if (typeof updates[key] === 'object') {
        return `${key} = $${index + 2}::jsonb`
      }
      return `${key} = $${index + 2}`
    }).join(', ')
    const query = `UPDATE businesses SET ${fields} WHERE id = $1 RETURNING *`
    const values = [id, ...Object.values(updates)]
    const result = await db.query(query, values)
    return result.rows[0]
  }
}

// Export repositories
export const userRepo = new UserRepository()
export const businessRepo = new BusinessRepository()
