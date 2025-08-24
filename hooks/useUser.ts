import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useUser() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading
    if (!session) router.push("/login") // Not logged in
  }, [session, status, router])

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session
  }
}
