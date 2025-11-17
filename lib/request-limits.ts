/**
 * Request Size Limits
 * Enforces maximum request body size to prevent DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server'

// Maximum request body size (1MB)
export const MAX_BODY_SIZE = 1024 * 1024

// Maximum request body size for file uploads (10MB)
export const MAX_FILE_UPLOAD_SIZE = 10 * 1024 * 1024

/**
 * Check if request body size exceeds limit
 * Returns NextResponse with 413 status if exceeded, null otherwise
 */
export function checkRequestSize(
  request: NextRequest,
  maxSize: number = MAX_BODY_SIZE
): NextResponse | null {
  const contentLength = request.headers.get('content-length')
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    
    if (isNaN(size)) {
      return NextResponse.json(
        { error: 'Invalid Content-Length header' },
        { status: 400 }
      )
    }
    
    if (size > maxSize) {
      return NextResponse.json(
        { 
          error: `Request body too large. Maximum size is ${Math.round(maxSize / 1024)}KB.`,
          maxSize: maxSize,
          receivedSize: size
        },
        { status: 413 }
      )
    }
  }
  
  return null
}

/**
 * Middleware helper to enforce request size limits
 * Use this in API routes before reading request body
 */
export function enforceRequestSizeLimit(
  request: NextRequest,
  maxSize: number = MAX_BODY_SIZE
): { error: NextResponse } | { success: true } {
  const sizeCheck = checkRequestSize(request, maxSize)
  
  if (sizeCheck) {
    return { error: sizeCheck }
  }
  
  return { success: true }
}
