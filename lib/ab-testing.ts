/**
 * A/B Testing System for Campaigns
 * Enables testing of different email/SMS templates, subject lines, and sequences
 */

export interface ABTest {
  id: string
  name: string
  description: string
  testType: 'email_template' | 'sms_template' | 'subject_line' | 'send_time' | 'sequence_order'
  status: 'draft' | 'active' | 'paused' | 'completed'
  variants: ABTestVariant[]
  trafficSplit: number // Percentage of traffic to test (0-100)
  startDate: string
  endDate?: string
  targetAudience: {
    businessTypes: string[]
    leadStatuses: string[]
    minScore?: number
    maxScore?: number
  }
  successMetric: 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate' | 'revenue'
  minimumSampleSize: number
  confidenceLevel: number // 0-100
  createdAt: string
  createdBy: string
}

export interface ABTestVariant {
  id: string
  name: string
  description: string
  content: {
    templateId?: string
    subjectLine?: string
    messageBody?: string
    sendTime?: string
    sequenceOrder?: number[]
  }
  trafficPercentage: number
  isControl: boolean
  results: ABTestResults
}

export interface ABTestResults {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalConverted: number
  openRate: number
  clickRate: number
  replyRate: number
  conversionRate: number
  revenue: number
  averageValue: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  statisticalSignificance: number
  isWinner: boolean
}

export interface ABTestAnalysis {
  testId: string
  totalParticipants: number
  duration: number // days
  statisticalSignificance: number
  confidenceLevel: number
  winner: ABTestVariant | null
  improvement: number // Percentage improvement
  recommendation: 'continue' | 'stop' | 'extend' | 'inconclusive'
  insights: string[]
}

export class ABTestingManager {
  private tests: Map<string, ABTest> = new Map()
  private testResults: Map<string, ABTestResults[]> = new Map()

  /**
   * Create a new A/B test
   */
  async createTest(test: Omit<ABTest, 'id' | 'createdAt'>): Promise<ABTest> {
    const newTest: ABTest = {
      ...test,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    }

    this.tests.set(newTest.id, newTest)
    return newTest
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    const test = this.tests.get(testId)
    if (!test) {
      throw new Error('Test not found')
    }

    if (test.status !== 'draft') {
      throw new Error('Test must be in draft status to start')
    }

    test.status = 'active'
    test.startDate = new Date().toISOString()
    this.tests.set(testId, test)
  }

  /**
   * Pause an A/B test
   */
  async pauseTest(testId: string): Promise<void> {
    const test = this.tests.get(testId)
    if (test) {
      test.status = 'paused'
      this.tests.set(testId, test)
    }
  }

  /**
   * Complete an A/B test
   */
  async completeTest(testId: string): Promise<void> {
    const test = this.tests.get(testId)
    if (test) {
      test.status = 'completed'
      test.endDate = new Date().toISOString()
      this.tests.set(testId, test)
    }
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTest | null {
    return this.tests.get(testId) || null
  }

  /**
   * Get all tests
   */
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values())
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'active')
  }

  /**
   * Record test result
   */
  async recordResult(
    testId: string,
    variantId: string,
    result: Partial<ABTestResults>
  ): Promise<void> {
    const test = this.tests.get(testId)
    if (!test) {
      throw new Error('Test not found')
    }

    const variant = test.variants.find(v => v.id === variantId)
    if (!variant) {
      throw new Error('Variant not found')
    }

    // Update variant results
    variant.results = { ...variant.results, ...result }

    // Calculate rates
    if (variant.results.totalSent > 0) {
      variant.results.openRate = (variant.results.totalOpened / variant.results.totalSent) * 100
      variant.results.clickRate = (variant.results.totalClicked / variant.results.totalSent) * 100
      variant.results.replyRate = (variant.results.totalReplied / variant.results.totalSent) * 100
      variant.results.conversionRate = (variant.results.totalConverted / variant.results.totalSent) * 100
    }

    if (variant.results.totalConverted > 0) {
      variant.results.averageValue = variant.results.revenue / variant.results.totalConverted
    }

    this.tests.set(testId, test)
  }

  /**
   * Analyze test results
   */
  analyzeTest(testId: string): ABTestAnalysis | null {
    const test = this.tests.get(testId)
    if (!test) return null

    const variants = test.variants
    if (variants.length < 2) return null

    // Calculate statistical significance
    const controlVariant = variants.find(v => v.isControl)
    const testVariants = variants.filter(v => !v.isControl)

    if (!controlVariant) return null

    let winner: ABTestVariant | null = null
    let improvement = 0
    let recommendation: 'continue' | 'stop' | 'extend' | 'inconclusive' = 'inconclusive'
    const insights: string[] = []

    // Find the best performing variant
    let bestVariant = controlVariant
    let bestMetric = this.getMetricValue(controlVariant, test.successMetric)

    testVariants.forEach(variant => {
      const metricValue = this.getMetricValue(variant, test.successMetric)
      if (metricValue > bestMetric) {
        bestVariant = variant
        bestMetric = metricValue
      }
    })

    if (bestVariant !== controlVariant) {
      winner = bestVariant
      improvement = ((bestMetric - this.getMetricValue(controlVariant, test.successMetric)) / 
                    this.getMetricValue(controlVariant, test.successMetric)) * 100
    }

    // Determine recommendation
    const totalParticipants = variants.reduce((sum, v) => sum + v.results.totalSent, 0)
    const duration = test.endDate ? 
      (new Date(test.endDate).getTime() - new Date(test.startDate).getTime()) / (1000 * 60 * 60 * 24) : 0

    if (totalParticipants < test.minimumSampleSize) {
      recommendation = 'extend'
      insights.push('Test needs more participants to reach statistical significance')
    } else if (winner && improvement > 10) {
      recommendation = 'stop'
      insights.push(`Winner found with ${improvement.toFixed(1)}% improvement`)
    } else if (duration > 30) {
      recommendation = 'stop'
      insights.push('Test has run for sufficient duration')
    } else {
      recommendation = 'continue'
      insights.push('Test needs more data to determine winner')
    }

    return {
      testId,
      totalParticipants,
      duration,
      statisticalSignificance: 85, // Would be calculated using proper statistical methods
      confidenceLevel: test.confidenceLevel,
      winner,
      improvement,
      recommendation,
      insights
    }
  }

  /**
   * Get metric value for a variant
   */
  private getMetricValue(variant: ABTestVariant, metric: string): number {
    switch (metric) {
      case 'open_rate': return variant.results.openRate
      case 'click_rate': return variant.results.clickRate
      case 'reply_rate': return variant.results.replyRate
      case 'conversion_rate': return variant.results.conversionRate
      case 'revenue': return variant.results.revenue
      default: return 0
    }
  }

  /**
   * Get test performance summary
   */
  getTestSummary(testId: string): {
    test: ABTest
    analysis: ABTestAnalysis | null
    variants: ABTestVariant[]
  } | null {
    const test = this.tests.get(testId)
    if (!test) return null

    return {
      test,
      analysis: this.analyzeTest(testId),
      variants: test.variants
    }
  }

  /**
   * Get all test summaries
   */
  getAllTestSummaries(): Array<{
    test: ABTest
    analysis: ABTestAnalysis | null
    variants: ABTestVariant[]
  }> {
    return Array.from(this.tests.keys()).map(testId => this.getTestSummary(testId)).filter(Boolean) as any[]
  }

  /**
   * Create email template test
   */
  async createEmailTemplateTest(
    name: string,
    controlTemplateId: string,
    testTemplateId: string,
    targetAudience: ABTest['targetAudience']
  ): Promise<ABTest> {
    return this.createTest({
      name,
      description: `Test email template performance`,
      testType: 'email_template',
      status: 'draft',
      variants: [
        {
          id: 'control',
          name: 'Control',
          description: 'Original template',
          content: { templateId: controlTemplateId },
          trafficPercentage: 50,
          isControl: true,
          results: this.createEmptyResults()
        },
        {
          id: 'test',
          name: 'Test',
          description: 'New template',
          content: { templateId: testTemplateId },
          trafficPercentage: 50,
          isControl: false,
          results: this.createEmptyResults()
        }
      ],
      trafficSplit: 100,
      startDate: '',
      targetAudience,
      successMetric: 'conversion_rate',
      minimumSampleSize: 100,
      confidenceLevel: 95,
      createdBy: 'system'
    })
  }

  /**
   * Create subject line test
   */
  async createSubjectLineTest(
    name: string,
    controlSubject: string,
    testSubject: string,
    templateId: string,
    targetAudience: ABTest['targetAudience']
  ): Promise<ABTest> {
    return this.createTest({
      name,
      description: `Test subject line performance`,
      testType: 'subject_line',
      status: 'draft',
      variants: [
        {
          id: 'control',
          name: 'Control',
          description: 'Original subject line',
          content: { templateId, subjectLine: controlSubject },
          trafficPercentage: 50,
          isControl: true,
          results: this.createEmptyResults()
        },
        {
          id: 'test',
          name: 'Test',
          description: 'New subject line',
          content: { templateId, subjectLine: testSubject },
          trafficPercentage: 50,
          isControl: false,
          results: this.createEmptyResults()
        }
      ],
      trafficSplit: 100,
      startDate: '',
      targetAudience,
      successMetric: 'open_rate',
      minimumSampleSize: 200,
      confidenceLevel: 95,
      createdBy: 'system'
    })
  }

  /**
   * Create send time test
   */
  async createSendTimeTest(
    name: string,
    templateId: string,
    controlTime: string,
    testTime: string,
    targetAudience: ABTest['targetAudience']
  ): Promise<ABTest> {
    return this.createTest({
      name,
      description: `Test optimal send time`,
      testType: 'send_time',
      status: 'draft',
      variants: [
        {
          id: 'control',
          name: 'Control',
          description: `Send at ${controlTime}`,
          content: { templateId, sendTime: controlTime },
          trafficPercentage: 50,
          isControl: true,
          results: this.createEmptyResults()
        },
        {
          id: 'test',
          name: 'Test',
          description: `Send at ${testTime}`,
          content: { templateId, sendTime: testTime },
          trafficPercentage: 50,
          isControl: false,
          results: this.createEmptyResults()
        }
      ],
      trafficSplit: 100,
      startDate: '',
      targetAudience,
      successMetric: 'open_rate',
      minimumSampleSize: 150,
      confidenceLevel: 95,
      createdBy: 'system'
    })
  }

  /**
   * Create empty results object
   */
  private createEmptyResults(): ABTestResults {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalReplied: 0,
      totalConverted: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      conversionRate: 0,
      revenue: 0,
      averageValue: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      statisticalSignificance: 0,
      isWinner: false
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const abTestingManager = new ABTestingManager()

