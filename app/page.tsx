import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to landing page - root route should go to main landing
  redirect('/landing')
}