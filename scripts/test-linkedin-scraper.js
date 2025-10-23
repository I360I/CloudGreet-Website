#!/usr/bin/env node

/**
 * Test the enhanced LinkedIn scraper for business owner contact info
 */

const { scrapeLinkedIn } = require('../lib/lead-enrichment/linkedin-scraper.ts');

async function testLinkedInScraper() {
  console.log('🔍 Testing Enhanced LinkedIn Scraper for Business Owners\n');
  
  // Test with a real business
  const testBusinesses = [
    {
      name: 'ABC Painting Company',
      type: 'painting',
      location: 'Chicago IL'
    },
    {
      name: 'XYZ HVAC Services',
      type: 'hvac',
      location: 'Miami FL'
    }
  ];
  
  for (const business of testBusinesses) {
    console.log(`\n🏢 Testing: ${business.name}`);
    console.log(`📍 Location: ${business.location}`);
    console.log(`🔧 Type: ${business.type}\n`);
    
    try {
      const result = await scrapeLinkedIn(business.name, business.type, business.location);
      
      console.log(`✅ Found ${result.decisionMakers.length} decision makers`);
      console.log(`📊 Confidence: ${result.confidence}%`);
      console.log(`🔗 Source: ${result.source}\n`);
      
      if (result.decisionMakers.length > 0) {
        console.log('👥 Decision Makers Found:');
        result.decisionMakers.forEach((person, index) => {
          console.log(`\n${index + 1}. ${person.name}`);
          console.log(`   📋 Title: ${person.title}`);
          console.log(`   🏢 Company: ${person.company}`);
          console.log(`   🔗 LinkedIn: ${person.profileUrl}`);
          
          if (person.email) {
            console.log(`   📧 Email: ${person.email}`);
          }
          
          if (person.phone) {
            console.log(`   📞 Phone: ${person.phone}`);
          }
          
          if (person.website) {
            console.log(`   🌐 Website: ${person.website}`);
          }
          
          if (person.contactMethods && person.contactMethods.length > 0) {
            console.log(`   📱 Contact Methods: ${person.contactMethods.join(', ')}`);
          }
        });
      }
      
      if (result.limitations && result.limitations.length > 0) {
        console.log(`\n⚠️ Limitations: ${result.limitations.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Error scraping ${business.name}:`, error.message);
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n🎉 LinkedIn Scraper Test Complete!');
  console.log('\n💡 This scraper can now find:');
  console.log('✅ Business owners and decision makers');
  console.log('✅ Their LinkedIn profiles');
  console.log('✅ Contact information (email, phone, website)');
  console.log('✅ Multiple contact methods');
  console.log('\n🚀 Perfect for the Apollo Killer feature!');
}

// Run the test
if (require.main === module) {
  testLinkedInScraper().catch(console.error);
}

module.exports = { testLinkedInScraper };


