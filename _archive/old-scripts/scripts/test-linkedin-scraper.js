#!/usr/bin/env node

/**
 * Test the enhanced LinkedIn scraper for business owner contact info
 */

const { scrapeLinkedIn } = require('../lib/lead-enrichment/linkedin-scraper.ts');

async function testLinkedInScraper() {
  
  
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
    
    
    
    
    try {
      const result = await scrapeLinkedIn(business.name, business.type, business.location);
      
      
      
      
      
      if (result.decisionMakers.length > 0) {
        
        result.decisionMakers.forEach((person, index) => {
          
          
          
          
          
          if (person.email) {
            
          }
          
          if (person.phone) {
            
          }
          
          if (person.website) {
            
          }
          
          if (person.contactMethods && person.contactMethods.length > 0) {
            }`);
          }
        });
      }
      
      if (result.limitations && result.limitations.length > 0) {
        }`);
      }
      
    } catch (error) {
      console.error(`❌ Error scraping ${business.name}:`, error.message);
    }
    
    );
  }
  
  
  
  
  
  ');
  
  
}

// Run the test
if (require.main === module) {
  testLinkedInScraper().catch(console.error);
}

module.exports = { testLinkedInScraper };


