import { redirect } from 'next/navigation'

/**
 * Stripe sends prospects here after a successful checkout. We just
 * bounce them to the login page with a flag so the login form can
 * show a small "Payment received" banner. The real confirmation is
 * the email that fires from the webhook with their login + receipt.
 */
export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { close?: string; session_id?: string }
}) {
  const params = new URLSearchParams({ paid: '1' })
  if (searchParams?.close) params.set('close', searchParams.close)
  redirect(`/login?${params.toString()}`)
}
