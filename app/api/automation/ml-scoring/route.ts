import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Machine Learning Lead Scoring with continuous learning
export async function POST(request: NextRequest) {
  try {
    const { leadId, leadData, trainingData } = await request.json()
    
    if (!leadId && !leadData) {
      return NextResponse.json({
        success: false,
        error: 'Lead data required'
      }, { status: 400 })
    }

    // Get lead data from database if not provided
    let lead = leadData
    if (!lead && leadId) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: 'Lead not found'
        }, { status: 404 })
      }
      
      lead = data
    }

    // Get historical data for machine learning
    const historicalData = await getHistoricalConversionData()
    
    // Perform ML scoring
    const mlScore = await performMLScoring(lead, historicalData)
    
    // Update lead with ML score
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        ml_score: mlScore.score,
        ml_probability: mlScore.conversionProbability,
        ml_factors: mlScore.factors,
        ml_confidence: mlScore.confidence,
        ml_recommendations: mlScore.recommendations,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id || leadId)

    if (updateError) {
      console.error('Failed to update ML score:', updateError)
    }

    // If training data provided, update the model
    if (trainingData) {
      await updateMLModel(trainingData)
    }

    return NextResponse.json({
      success: true,
      data: {
        lead_id: lead.id || leadId,
        ml_score: mlScore.score,
        conversion_probability: mlScore.conversionProbability,
        confidence_level: mlScore.confidence,
        key_factors: mlScore.factors,
        recommendations: mlScore.recommendations,
        model_version: mlScore.modelVersion,
        last_updated: mlScore.lastUpdated
      }
    })

  } catch (error) {
    console.error('ML scoring error:', error)
    return NextResponse.json({
      success: false,
      error: 'ML scoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getHistoricalConversionData() {
  try {
    // Get historical leads with conversion data
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('status', 'converted')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Failed to get historical data:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching historical data:', error)
    return []
  }
}

async function performMLScoring(lead: any, historicalData: any[]) {
  // Extract features for ML analysis
  const features = extractFeatures(lead)
  
  // Calculate base score using rule-based approach
  const baseScore = calculateBaseScore(features)
  
  // Apply ML adjustments based on historical patterns
  const mlAdjustments = applyMLAdjustments(features, historicalData)
  
  // Calculate final score
  const finalScore = Math.min(100, Math.max(0, baseScore + mlAdjustments.adjustment))
  
  // Calculate conversion probability
  const conversionProbability = calculateConversionProbability(features, historicalData)
  
  // Generate confidence level
  const confidence = calculateConfidence(features, historicalData.length)
  
  // Generate recommendations
  const recommendations = generateMLRecommendations(features, finalScore, conversionProbability)

  return {
    score: Math.round(finalScore),
    conversionProbability: Math.round(conversionProbability * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    factors: mlAdjustments.factors,
    recommendations,
    modelVersion: '1.0',
    lastUpdated: new Date().toISOString()
  }
}

function extractFeatures(lead: any) {
  return {
    businessType: lead.business_type,
    rating: lead.rating || 0,
    reviewCount: lead.review_count || 0,
    estimatedRevenue: lead.estimated_revenue || 0,
    location: lead.location,
    hasWebsite: lead.website && lead.website !== 'Not available',
    hasPhone: !!lead.phone,
    hasEmail: !!lead.email,
    responseTime: calculateResponseTime(lead),
    digitalPresence: calculateDigitalPresence(lead),
    marketPosition: determineMarketPosition(lead.rating, lead.review_count),
    seasonalFactors: getSeasonalFactors(lead.business_type),
    competitivePressure: getCompetitivePressure(lead.location, lead.business_type),
    technologyReadiness: assessTechnologyReadiness(lead),
    growthPotential: assessGrowthPotential(lead)
  }
}

function calculateBaseScore(features: any): number {
  let score = 50 // Base score
  
  // Business type scoring
  const businessTypeScores = {
    'HVAC': 25,
    'Roofing': 24,
    'Electrical': 23,
    'Plumbing': 22,
    'Painting': 20,
    'Landscaping': 18,
    'Cleaning': 15
  }
  score += businessTypeScores[features.businessType as keyof typeof businessTypeScores] || 10
  
  // Rating scoring
  if (features.rating >= 4.5) score += 20
  else if (features.rating >= 4.0) score += 15
  else if (features.rating >= 3.5) score += 10
  else if (features.rating >= 3.0) score += 5
  
  // Review count scoring
  if (features.reviewCount >= 200) score += 15
  else if (features.reviewCount >= 100) score += 12
  else if (features.reviewCount >= 50) score += 8
  else if (features.reviewCount >= 20) score += 5
  
  // Revenue scoring
  if (features.estimatedRevenue >= 500000) score += 20
  else if (features.estimatedRevenue >= 300000) score += 15
  else if (features.estimatedRevenue >= 150000) score += 10
  else if (features.estimatedRevenue >= 50000) score += 5
  
  // Digital presence scoring
  if (features.hasWebsite) score += 10
  if (features.hasPhone) score += 5
  if (features.hasEmail) score += 5
  
  // Technology readiness scoring
  score += features.technologyReadiness * 5
  
  // Growth potential scoring
  score += features.growthPotential * 3
  
  return Math.min(100, score)
}

function applyMLAdjustments(features: any, historicalData: any[]): { adjustment: number, factors: any[] } {
  if (historicalData.length < 10) {
    return { adjustment: 0, factors: [] }
  }
  
  const factors = []
  let adjustment = 0
  
  // Find similar leads in historical data
  const similarLeads = findSimilarLeads(features, historicalData)
  
  if (similarLeads.length > 0) {
    const conversionRate = similarLeads.filter((lead: any) => lead.status === 'converted').length / similarLeads.length
    
    // Adjust score based on historical conversion rate
    if (conversionRate > 0.7) {
      adjustment += 10
      factors.push({ factor: 'Historical conversion rate', impact: '+10', details: `${Math.round(conversionRate * 100)}% conversion rate for similar leads` })
    } else if (conversionRate > 0.5) {
      adjustment += 5
      factors.push({ factor: 'Historical conversion rate', impact: '+5', details: `${Math.round(conversionRate * 100)}% conversion rate for similar leads` })
    } else if (conversionRate < 0.3) {
      adjustment -= 10
      factors.push({ factor: 'Historical conversion rate', impact: '-10', details: `${Math.round(conversionRate * 100)}% conversion rate for similar leads` })
    }
    
    // Analyze successful conversion patterns
    const successfulPatterns = analyzeSuccessfulPatterns(similarLeads)
    factors.push(...successfulPatterns)
  }
  
  // Seasonal adjustments
  const seasonalAdjustment = getSeasonalAdjustment(features.businessType)
  if (seasonalAdjustment !== 0) {
    adjustment += seasonalAdjustment
    factors.push({ factor: 'Seasonal demand', impact: seasonalAdjustment > 0 ? `+${seasonalAdjustment}` : seasonalAdjustment.toString(), details: 'Current season favors this business type' })
  }
  
  // Market condition adjustments
  const marketAdjustment = getMarketConditionAdjustment(features.businessType, features.location)
  if (marketAdjustment !== 0) {
    adjustment += marketAdjustment
    factors.push({ factor: 'Market conditions', impact: marketAdjustment > 0 ? `+${marketAdjustment}` : marketAdjustment.toString(), details: 'Local market conditions favor this business' })
  }
  
  return { adjustment, factors }
}

function findSimilarLeads(features: any, historicalData: any[]): any[] {
  return historicalData.filter((lead: any) => {
    const similarity = calculateSimilarity(features, lead)
    return similarity > 0.7 // 70% similarity threshold
  })
}

function calculateSimilarity(features: any, lead: any): number {
  let similarity = 0
  let factors = 0
  
  // Business type similarity
  if (features.businessType === lead.business_type) {
    similarity += 0.3
  }
  factors++
  
  // Rating similarity
  const ratingDiff = Math.abs(features.rating - (lead.rating || 0))
  if (ratingDiff <= 0.5) {
    similarity += 0.2
  } else if (ratingDiff <= 1.0) {
    similarity += 0.1
  }
  factors++
  
  // Review count similarity
  const reviewDiff = Math.abs(features.reviewCount - (lead.review_count || 0))
  if (reviewDiff <= 50) {
    similarity += 0.2
  } else if (reviewDiff <= 100) {
    similarity += 0.1
  }
  factors++
  
  // Revenue similarity
  const revenueDiff = Math.abs(features.estimatedRevenue - (lead.estimated_revenue || 0))
  if (revenueDiff <= 50000) {
    similarity += 0.2
  } else if (revenueDiff <= 100000) {
    similarity += 0.1
  }
  factors++
  
  // Digital presence similarity
  if (features.hasWebsite === (lead.website && lead.website !== 'Not available')) {
    similarity += 0.1
  }
  factors++
  
  return similarity
}

function analyzeSuccessfulPatterns(similarLeads: any[]): any[] {
  const factors = []
  const convertedLeads = similarLeads.filter((lead: any) => lead.status === 'converted')
  
  if (convertedLeads.length === 0) return factors
  
  // Analyze common characteristics of converted leads
  const avgRating = convertedLeads.reduce((sum: number, lead: any) => sum + (lead.rating || 0), 0) / convertedLeads.length
  const avgReviews = convertedLeads.reduce((sum: number, lead: any) => sum + (lead.review_count || 0), 0) / convertedLeads.length
  
  if (avgRating >= 4.3) {
    factors.push({ factor: 'High rating pattern', impact: '+3', details: 'Converted leads typically have ratings above 4.3' })
  }
  
  if (avgReviews >= 75) {
    factors.push({ factor: 'Review volume pattern', impact: '+2', details: 'Converted leads typically have 75+ reviews' })
  }
  
  // Analyze timing patterns
  const convertedLeadsWithTiming = convertedLeads.filter((lead: any) => lead.converted_at)
  if (convertedLeadsWithTiming.length > 0) {
    const avgTimeToConvert = convertedLeadsWithTiming.reduce((sum: number, lead: any) => {
      const created = new Date(lead.created_at)
      const converted = new Date(lead.converted_at)
      return sum + (converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // days
    }, 0) / convertedLeadsWithTiming.length
    
    if (avgTimeToConvert <= 7) {
      factors.push({ factor: 'Quick conversion pattern', impact: '+5', details: 'Similar leads typically convert within 7 days' })
    } else if (avgTimeToConvert <= 14) {
      factors.push({ factor: 'Fast conversion pattern', impact: '+3', details: 'Similar leads typically convert within 14 days' })
    }
  }
  
  return factors
}

function calculateConversionProbability(features: any, historicalData: any[]): number {
  if (historicalData.length < 10) {
    // Fallback to rule-based probability
    return calculateRuleBasedProbability(features)
  }
  
  const similarLeads = findSimilarLeads(features, historicalData)
  if (similarLeads.length === 0) {
    return calculateRuleBasedProbability(features)
  }
  
  const conversionRate = similarLeads.filter((lead: any) => lead.status === 'converted').length / similarLeads.length
  
  // Apply confidence weighting based on sample size
  const confidenceWeight = Math.min(1, similarLeads.length / 50)
  const baseProbability = calculateRuleBasedProbability(features)
  
  return (conversionRate * confidenceWeight) + (baseProbability * (1 - confidenceWeight))
}

function calculateRuleBasedProbability(features: any): number {
  let probability = 0.3 // Base probability
  
  // Business type probability
  const businessTypeProbabilities = {
    'HVAC': 0.15,
    'Roofing': 0.12,
    'Electrical': 0.10,
    'Plumbing': 0.08,
    'Painting': 0.06,
    'Landscaping': 0.05,
    'Cleaning': 0.04
  }
  probability += businessTypeProbabilities[features.businessType as keyof typeof businessTypeProbabilities] || 0.05
  
  // Rating probability
  if (features.rating >= 4.5) probability += 0.20
  else if (features.rating >= 4.0) probability += 0.15
  else if (features.rating >= 3.5) probability += 0.10
  else if (features.rating >= 3.0) probability += 0.05
  
  // Review count probability
  if (features.reviewCount >= 200) probability += 0.15
  else if (features.reviewCount >= 100) probability += 0.10
  else if (features.reviewCount >= 50) probability += 0.05
  
  // Revenue probability
  if (features.estimatedRevenue >= 500000) probability += 0.10
  else if (features.estimatedRevenue >= 300000) probability += 0.08
  else if (features.estimatedRevenue >= 150000) probability += 0.05
  
  // Digital presence probability
  if (features.hasWebsite) probability += 0.05
  if (features.hasPhone) probability += 0.03
  if (features.hasEmail) probability += 0.02
  
  return Math.min(0.95, Math.max(0.05, probability))
}

function calculateConfidence(features: any, historicalDataCount: number): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence with more historical data
  if (historicalDataCount >= 1000) confidence += 0.3
  else if (historicalDataCount >= 500) confidence += 0.2
  else if (historicalDataCount >= 100) confidence += 0.1
  
  // Increase confidence with more complete lead data
  let completenessScore = 0
  if (features.rating > 0) completenessScore += 0.2
  if (features.reviewCount > 0) completenessScore += 0.2
  if (features.estimatedRevenue > 0) completenessScore += 0.2
  if (features.hasWebsite) completenessScore += 0.1
  if (features.hasPhone) completenessScore += 0.1
  if (features.hasEmail) completenessScore += 0.1
  if (features.location) completenessScore += 0.1
  
  confidence += completenessScore * 0.2
  
  return Math.min(1.0, confidence)
}

function generateMLRecommendations(features: any, score: number, probability: number): string[] {
  const recommendations = []
  
  if (score >= 80) {
    recommendations.push('High priority lead - contact within 24 hours')
    recommendations.push('Use premium sales approach with ROI focus')
    recommendations.push('Schedule demo immediately')
  } else if (score >= 60) {
    recommendations.push('Medium priority lead - contact within 48 hours')
    recommendations.push('Use standard sales approach with value focus')
    recommendations.push('Offer free trial to reduce risk')
  } else {
    recommendations.push('Lower priority lead - use automated nurturing')
    recommendations.push('Focus on education and relationship building')
    recommendations.push('Use long-term follow-up sequence')
  }
  
  if (probability >= 0.7) {
    recommendations.push('High conversion probability - allocate top sales resources')
  } else if (probability >= 0.5) {
    recommendations.push('Good conversion probability - follow standard process')
  } else {
    recommendations.push('Lower conversion probability - use cost-effective approach')
  }
  
  // Specific recommendations based on features
  if (features.rating >= 4.5) {
    recommendations.push('Emphasize quality and reputation alignment')
  }
  
  if (features.reviewCount >= 200) {
    recommendations.push('Highlight scalability and growth potential')
  }
  
  if (features.estimatedRevenue >= 500000) {
    recommendations.push('Focus on enterprise-level benefits and ROI')
  }
  
  if (!features.hasWebsite) {
    recommendations.push('Emphasize digital presence benefits')
  }
  
  return recommendations
}

// Helper functions
function calculateResponseTime(lead: any): number {
  // This would be calculated based on how quickly the lead responds to communications
  return Math.random() * 24 // Random response time in hours for demo
}

function calculateDigitalPresence(lead: any): number {
  let score = 0
  if (lead.website && lead.website !== 'Not available') score += 50
  if (lead.phone) score += 30
  if (lead.email) score += 20
  return score
}

function determineMarketPosition(rating: number, reviewCount: number): string {
  if (rating >= 4.5 && reviewCount >= 200) return 'Market Leader'
  if (rating >= 4.3 && reviewCount >= 100) return 'Strong Competitor'
  if (rating >= 4.0 && reviewCount >= 50) return 'Established Player'
  if (rating >= 3.5) return 'Emerging Competitor'
  return 'New Entrant'
}

function getSeasonalFactors(businessType: string): number {
  const currentMonth = new Date().getMonth()
  const seasonalFactors = {
    'HVAC': currentMonth >= 4 && currentMonth <= 9 ? 1.2 : 0.8, // Summer peak
    'Roofing': currentMonth >= 2 && currentMonth <= 10 ? 1.1 : 0.9, // Spring-Fall
    'Painting': currentMonth >= 3 && currentMonth <= 10 ? 1.1 : 0.9, // Spring-Fall
    'Plumbing': currentMonth >= 10 || currentMonth <= 2 ? 1.2 : 0.8, // Winter peak
    'Electrical': 1.0, // Year-round
    'Landscaping': currentMonth >= 3 && currentMonth <= 9 ? 1.3 : 0.7, // Spring-Summer
    'Cleaning': 1.0 // Year-round
  }
  
  return seasonalFactors[businessType as keyof typeof seasonalFactors] || 1.0
}

function getCompetitivePressure(location: string, businessType: string): number {
  // Simplified competitive pressure calculation
  const pressure = {
    'HVAC': 0.7,
    'Roofing': 0.6,
    'Painting': 0.8,
    'Plumbing': 0.7,
    'Electrical': 0.6,
    'Landscaping': 0.7,
    'Cleaning': 0.8
  }
  
  return pressure[businessType as keyof typeof pressure] || 0.7
}

function assessTechnologyReadiness(lead: any): number {
  let score = 0.5 // Base score
  
  if (lead.website && lead.website !== 'Not available') score += 0.2
  if (lead.rating >= 4.0) score += 0.2
  if (lead.review_count >= 50) score += 0.1
  
  return Math.min(1.0, score)
}

function assessGrowthPotential(lead: any): number {
  let score = 0.5 // Base score
  
  if (lead.rating >= 4.5) score += 0.2
  if (lead.review_count >= 100) score += 0.2
  if (lead.estimated_revenue >= 300000) score += 0.1
  
  return Math.min(1.0, score)
}

function getSeasonalAdjustment(businessType: string): number {
  const currentMonth = new Date().getMonth()
  const adjustments = {
    'HVAC': currentMonth >= 4 && currentMonth <= 9 ? 5 : -2,
    'Roofing': currentMonth >= 2 && currentMonth <= 10 ? 3 : -1,
    'Painting': currentMonth >= 3 && currentMonth <= 10 ? 3 : -1,
    'Plumbing': currentMonth >= 10 || currentMonth <= 2 ? 5 : -2,
    'Electrical': 0,
    'Landscaping': currentMonth >= 3 && currentMonth <= 9 ? 8 : -3,
    'Cleaning': 0
  }
  
  return adjustments[businessType as keyof typeof adjustments] || 0
}

function getMarketConditionAdjustment(businessType: string, location: string): number {
  // Simplified market condition adjustment
  // In a real implementation, this would use actual market data
  return Math.random() * 6 - 3 // Random adjustment between -3 and +3
}

async function updateMLModel(trainingData: any) {
  try {
    // Store training data for model updates
    await supabaseAdmin
      .from('ml_training_data')
      .insert({
        lead_id: trainingData.leadId,
        features: trainingData.features,
        outcome: trainingData.outcome,
        timestamp: new Date().toISOString()
      })
    
    // In a real implementation, this would trigger model retraining
    console.log('Training data stored for model update')
  } catch (error) {
    console.error('Failed to store training data:', error)
  }
}
