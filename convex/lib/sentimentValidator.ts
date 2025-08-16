import { SentimentAnalysisResult } from './claudeAPIClient'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedScore?: number
}

export interface ValidationStats {
  totalValidated: number
  validScores: number
  invalidScores: number
  sanitizedScores: number
  errors: string[]
}

export class SentimentValidator {
  private minScore: number = -1.0
  private maxScore: number = 1.0
  private minConfidence: number = 0.0
  private maxConfidence: number = 1.0

  validateScore(score: number): ValidationResult {
    const errors: string[] = []
    let isValid = true
    let sanitizedScore: number | undefined

    // Check if score is a valid number
    if (typeof score !== 'number' || isNaN(score)) {
      errors.push('Sentiment score must be a valid number')
      isValid = false
      sanitizedScore = 0 // Default neutral score
    } else {
      // Check if score is within bounds
      if (score < this.minScore || score > this.maxScore) {
        errors.push(`Sentiment score ${score} is outside valid range [${this.minScore}, ${this.maxScore}]`)
        isValid = false
        // Clamp score to valid range
        sanitizedScore = Math.max(this.minScore, Math.min(this.maxScore, score))
      } else {
        sanitizedScore = score
      }
    }

    return {
      isValid,
      errors,
      sanitizedScore
    }
  }

  validateConfidence(confidence: number): ValidationResult {
    const errors: string[] = []
    let isValid = true
    let sanitizedScore: number | undefined

    // Check if confidence is a valid number
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      errors.push('Confidence score must be a valid number')
      isValid = false
      sanitizedScore = 0.5 // Default moderate confidence
    } else {
      // Check if confidence is within bounds
      if (confidence < this.minConfidence || confidence > this.maxConfidence) {
        errors.push(`Confidence score ${confidence} is outside valid range [${this.minConfidence}, ${this.maxConfidence}]`)
        isValid = false
        // Clamp confidence to valid range
        sanitizedScore = Math.max(this.minConfidence, Math.min(this.maxConfidence, confidence))
      } else {
        sanitizedScore = confidence
      }
    }

    return {
      isValid,
      errors,
      sanitizedScore
    }
  }

  validateResult(result: SentimentAnalysisResult): {
    isValid: boolean
    errors: string[]
    sanitizedResult: SentimentAnalysisResult
  } {
    // Handle null/undefined/invalid objects
    if (!result || typeof result !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid result object - null, undefined, or not an object'],
        sanitizedResult: {
          messageId: 'unknown',
          sentimentScore: 0,
          confidence: 0.1,
          reasoning: 'Invalid result object provided to validator'
        }
      }
    }

    const errors: string[] = []
    let isValid = true

    // Validate message ID with stricter checks
    if (!result.messageId || typeof result.messageId !== 'string' || result.messageId.trim().length === 0) {
      errors.push('Message ID is required and must be a non-empty string')
      isValid = false
    }

    // Validate sentiment score
    const scoreValidation = this.validateScore(result.sentimentScore)
    if (!scoreValidation.isValid) {
      errors.push(...scoreValidation.errors)
      isValid = false
    }

    // Validate confidence
    const confidenceValidation = this.validateConfidence(result.confidence)
    if (!confidenceValidation.isValid) {
      errors.push(...confidenceValidation.errors)
      isValid = false
    }

    // Create sanitized result with better defaults
    const sanitizedResult: SentimentAnalysisResult = {
      messageId: result.messageId && typeof result.messageId === 'string' ? result.messageId.trim() : 'unknown',
      sentimentScore: scoreValidation.sanitizedScore ?? 0,
      confidence: confidenceValidation.sanitizedScore ?? 0.1, // Lower default confidence for uncertain results
      reasoning: result.reasoning && typeof result.reasoning === 'string' ? result.reasoning : undefined
    }

    return {
      isValid,
      errors,
      sanitizedResult
    }
  }

  validateBatch(results: SentimentAnalysisResult[]): {
    stats: ValidationStats
    sanitizedResults: SentimentAnalysisResult[]
  } {
    const stats: ValidationStats = {
      totalValidated: results.length,
      validScores: 0,
      invalidScores: 0,
      sanitizedScores: 0,
      errors: []
    }

    const sanitizedResults: SentimentAnalysisResult[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const validation = this.validateResult(result)

      if (validation.isValid) {
        stats.validScores++
      } else {
        stats.invalidScores++
        stats.errors.push(`Result ${i}: ${validation.errors.join(', ')}`)
      }

      // If sanitization occurred, count it
      if (validation.sanitizedResult.sentimentScore !== result.sentimentScore ||
          validation.sanitizedResult.confidence !== result.confidence) {
        stats.sanitizedScores++
      }

      sanitizedResults.push(validation.sanitizedResult)
    }

    return {
      stats,
      sanitizedResults
    }
  }

  setScoreRange(min: number, max: number): void {
    if (min >= max) {
      throw new Error('Minimum score must be less than maximum score')
    }
    if (max - min < 0.1) {
      throw new Error('Score range must be at least 0.1')
    }
    
    this.minScore = min
    this.maxScore = max
  }

  setConfidenceRange(min: number, max: number): void {
    if (min >= max) {
      throw new Error('Minimum confidence must be less than maximum confidence')
    }
    if (min < 0 || max > 1) {
      throw new Error('Confidence range must be within [0, 1]')
    }
    
    this.minConfidence = min
    this.maxConfidence = max
  }

  getScoreRange(): { min: number; max: number } {
    return { min: this.minScore, max: this.maxScore }
  }

  getConfidenceRange(): { min: number; max: number } {
    return { min: this.minConfidence, max: this.maxConfidence }
  }

  // Static utility methods
  static isValidSentimentScore(score: number): boolean {
    return typeof score === 'number' && 
           !isNaN(score) && 
           score >= -1.0 && 
           score <= 1.0
  }

  static sanitizeSentimentScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) {
      return 0 // Neutral fallback
    }
    return Math.max(-1.0, Math.min(1.0, score))
  }

  static isValidConfidence(confidence: number): boolean {
    return typeof confidence === 'number' && 
           !isNaN(confidence) && 
           confidence >= 0.0 && 
           confidence <= 1.0
  }

  static sanitizeConfidence(confidence: number): number {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      return 0.5 // Moderate confidence fallback
    }
    return Math.max(0.0, Math.min(1.0, confidence))
  }
}

export const createSentimentValidator = (): SentimentValidator => {
  return new SentimentValidator()
}