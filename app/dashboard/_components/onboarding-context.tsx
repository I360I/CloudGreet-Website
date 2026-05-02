'use client'

import { createContext, useContext } from 'react'

type Ctx = { needsSetup: boolean }

const OnboardingContext = createContext<Ctx>({ needsSetup: false })

export function OnboardingProvider({ value, children }: { value: Ctx; children: React.ReactNode }) {
 return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
 return useContext(OnboardingContext)
}
