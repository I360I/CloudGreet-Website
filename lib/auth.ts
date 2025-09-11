import { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // REMOVED DEMO LOGIN - REAL AUTH ONLY

        // Real database authentication
        try {
          console.log('🔍 Looking for user:', credentials.email)
          
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()

          console.log('📊 Database response:', { user, error })

          if (error) {
            console.log('❌ Database error:', error.message)
            return null
          }

          if (!user) {
            console.log('❌ User not found:', credentials.email)
            return null
          }

          console.log('✅ User found, checking password...')
          const isValidPassword = await bcrypt.compare(credentials.password, user.hashed_password)
          
          if (!isValidPassword) {
            console.log('❌ Invalid password for:', credentials.email)
            return null
          }

          console.log('✅ Database authentication successful for:', credentials.email)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.business_name,
            business_name: user.business_name,
            business_type: user.business_type,
            // Multi-tenant data
            tenant_id: user.id, // Each user is their own tenant
            calendar_provider: user.calendar_provider,
            calendar_id: user.calendar_id,
            phone_number: user.phone_number,
            retell_agent_id: user.retell_agent_id,
            stripe_customer_id: user.stripe_customer_id
          }
        } catch (error) {
          console.error('💥 Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.business_name = user.business_name
        token.business_type = user.business_type
        token.tenant_id = user.tenant_id
        token.calendar_provider = user.calendar_provider
        token.calendar_id = user.calendar_id
        token.phone_number = user.phone_number
        token.retell_agent_id = user.retell_agent_id
        token.stripe_customer_id = user.stripe_customer_id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.business_name = token.business_name
        session.user.business_type = token.business_type
        session.user.tenant_id = token.tenant_id
        session.user.calendar_provider = token.calendar_provider
        session.user.calendar_id = token.calendar_id
        session.user.phone_number = token.phone_number
        session.user.retell_agent_id = token.retell_agent_id
        session.user.stripe_customer_id = token.stripe_customer_id
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

export async function getServerSessionWrapper() {
  return await getServerSession(authOptions)
}

// Additional utility functions that are being imported
export async function findUserById(id: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error finding user by ID:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  }
}

export async function findUserByEmail(email: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error finding user by email:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error finding user by email:', error)
    return null
  }
}

export async function updateUser(id: string, updates: any) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error updating user:', error)
    return null
  }
}