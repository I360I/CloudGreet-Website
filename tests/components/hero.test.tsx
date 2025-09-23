import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Hero from '@/app/components/Hero'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  }
}))

// Mock WaveBackground component
vi.mock('@/app/components/WaveBackground', () => ({
  default: ({ className }: any) => <div data-testid="wave-background" className={className} />
}))

describe('Hero Component', () => {
  it('should render hero section with main heading', () => {
    render(<Hero />)
    
    const heading = screen.getByText('Never Miss a Call Again')
    expect(heading).toBeInTheDocument()
  })

  it('should render hero section with description', () => {
    render(<Hero />)
    
    const description = screen.getByText(/CloudGreet answers, qualifies, and books jobs/)
    expect(description).toBeInTheDocument()
  })

  it('should render pricing information', () => {
    render(<Hero />)
    
    const pricing = screen.getByText(/Simple pricing: \$200\/mo \+ \$50 per booking/)
    expect(pricing).toBeInTheDocument()
  })

  it('should render call-to-action button', () => {
    render(<Hero />)
    
    const ctaButton = screen.getByText('Test for Free')
    expect(ctaButton).toBeInTheDocument()
  })

  it('should render wave background', () => {
    render(<Hero />)
    
    const waveBackground = screen.getByTestId('wave-background')
    expect(waveBackground).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<Hero />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Never Miss a Call Again')
  })
})
