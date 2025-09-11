import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user?.email !== 'admin@cloudgreet.com' && session.user?.email !== 'aedwards424242@gmail.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()
    const { action } = body

    // In a real app, you would update the client in your database
    console.log(`Performing action "${action}" on client ${id}`)

    let message = ''
    switch (action) {
      case 'suspend':
        message = 'Client suspended successfully'
        break
      case 'activate':
        message = 'Client activated successfully'
        break
      case 'delete':
        message = 'Client deleted successfully'
        break
      default:
        message = 'Client updated successfully'
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user?.email !== 'admin@cloudgreet.com' && session.user?.email !== 'aedwards424242@gmail.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = params

    // In a real app, you would delete the client from your database
    console.log(`Deleting client ${id}`)

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
