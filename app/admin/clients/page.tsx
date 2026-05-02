'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy route — the clients table now lives on /admin (the overview).
 * Keep this as a redirect so old bookmarks and direct sidebar links work.
 */
export default function ClientsRedirect() {
 const router = useRouter()
 useEffect(() => { router.replace('/admin') }, [router])
 return null
}
