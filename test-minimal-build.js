// Test if we can at least run a simple Next.js API route
const { NextRequest, NextResponse } = require('next/server')

console.log('Testing minimal Next.js functionality...')

// Test if we can create a simple response
const testResponse = NextResponse.json({ test: 'working' })
console.log('✅ NextResponse working:', testResponse.status)

// Test if we can create a request
const testRequest = new NextRequest('https://test.com')
console.log('✅ NextRequest working:', testRequest.url)

console.log('✅ Minimal Next.js functionality working')
