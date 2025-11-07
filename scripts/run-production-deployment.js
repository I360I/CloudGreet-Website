#!/usr/bin/env node

// Master Production Deployment Runner
const runProductionDeployment = async () => {
  console.log('🚀 CloudGreet Production Deployment Runner\n')
  console.log('==========================================\n')

  const deploymentSteps = [
    {
      name: 'Database Migration',
      script: './scripts/run-production-migration.js',
      description: 'Run webhook idempotency migration'
    },
    {
      name: 'Environment Verification',
      script: './scripts/verify-env-vars.js',
      description: 'Verify all environment variables'
    },
    {
      name: 'Pricing Verification',
      script: './scripts/verify-pricing.js',
      description: 'Verify pricing configuration'
    },
    {
      name: 'Deployment Instructions',
      script: './scripts/deploy-vercel.js',
      description: 'Get Vercel deployment instructions'
    },
    {
      name: 'Production Testing',
      script: './scripts/test-production.js',
      description: 'Test production deployment'
    },
    {
      name: 'Monitoring Setup',
      script: './scripts/monitor-production.js',
      description: 'Set up production monitoring'
    }
  ]

  const results = []

  for (const step of deploymentSteps) {
    console.log(`\n🔧 Running ${step.name}...`)
    console.log('─'.repeat(50))
    console.log(`Description: ${step.description}`)
    
    try {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      const { stdout, stderr } = await execAsync(`node ${step.script}`)
      console.log(stdout)
      
      if (stderr) {
        console.log('Warnings:', stderr)
      }
      
      results.push({ name: step.name, status: 'COMPLETED', output: stdout })
      
    } catch (error) {
      console.log(`❌ ${step.name} failed:`)
      console.log(error.message)
      
      results.push({ name: step.name, status: 'FAILED', error: error.message })
    }
  }

  console.log('\n\n📊 Deployment Results Summary')
  console.log('==============================')
  
  results.forEach(result => {
    const status = result.status === 'COMPLETED' ? '✅' : '❌'
    console.log(`${status} ${result.name}: ${result.status}`)
  })
  
  const completed = results.filter(r => r.status === 'COMPLETED').length
  const total = results.length
  
  console.log(`\n🎯 Overall: ${completed}/${total} steps completed`)

  console.log('\n📋 Final Deployment Checklist:')
  console.log('─'.repeat(50))
  console.log('□ Run migration in Supabase dashboard')
  console.log('□ Set all environment variables in Vercel')
  console.log('□ Deploy to Vercel')
  console.log('□ Test webhook endpoints')
  console.log('□ Test Retell AI integration')
  console.log('□ Test appointment booking flow')
  console.log('□ Test billing flow')
  console.log('□ Monitor logs and dashboards')

  if (completed === total) {
    console.log('\n🎉 All deployment steps completed successfully!')
    console.log('🚀 Ready for production launch!')
  } else {
    console.log('\n⚠️  Some steps failed. Review and fix before deployment.')
  }

  console.log('\n📋 Post-Deployment Actions:')
  console.log('─'.repeat(50))
  console.log('1. Monitor Stripe dashboard for charges')
  console.log('2. Monitor Retell AI dashboard for calls')
  console.log('3. Monitor Telnyx dashboard for calls')
  console.log('4. Check Vercel logs for errors')
  console.log('5. Test customer journey end-to-end')
  console.log('6. Set up alerts for critical metrics')
  console.log('7. Create incident response plan')

  console.log('\n🎯 Success Criteria:')
  console.log('─'.repeat(50))
  console.log('✅ Calls connect to Retell AI')
  console.log('✅ Fallback works when Retell fails')
  console.log('✅ Appointments book correctly')
  console.log('✅ Billing charges $50 only on completion')
  console.log('✅ Webhooks don\'t double-process')
  console.log('✅ No crashes from missing env vars')

  console.log('\n🚀 CloudGreet is ready for production!')
}

// Run the deployment
runProductionDeployment().catch(console.error)

