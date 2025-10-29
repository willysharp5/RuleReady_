import { mutation } from "./_generated/server";

// Migration: Update jurisdiction codes to 2-letter postal codes
export const migrateToPostalCodes = mutation({
  handler: async (ctx) => {
    console.log("🔄 Starting jurisdiction code migration...");
    
    // Mapping from old underscore format to 2-letter postal codes
    const codeMapping: { [key: string]: string } = {
      'federal': 'US',
      'alabama': 'AL',
      'alaska': 'AK',
      'arizona': 'AZ',
      'arkansas': 'AR',
      'california': 'CA',
      'colorado': 'CO',
      'connecticut': 'CT',
      'delaware': 'DE',
      'florida': 'FL',
      'georgia': 'GA',
      'hawaii': 'HI',
      'idaho': 'ID',
      'illinois': 'IL',
      'indiana': 'IN',
      'iowa': 'IA',
      'kansas': 'KS',
      'kentucky': 'KY',
      'louisiana': 'LA',
      'maine': 'ME',
      'maryland': 'MD',
      'massachusetts': 'MA',
      'michigan': 'MI',
      'minnesota': 'MN',
      'mississippi': 'MS',
      'missouri': 'MO',
      'montana': 'MT',
      'nebraska': 'NE',
      'nevada': 'NV',
      'new_hampshire': 'NH',
      'new_jersey': 'NJ',
      'new_mexico': 'NM',
      'new_york': 'NY',
      'north_carolina': 'NC',
      'north_dakota': 'ND',
      'ohio': 'OH',
      'oklahoma': 'OK',
      'oregon': 'OR',
      'pennsylvania': 'PA',
      'rhode_island': 'RI',
      'south_carolina': 'SC',
      'south_dakota': 'SD',
      'tennessee': 'TN',
      'texas': 'TX',
      'utah': 'UT',
      'vermont': 'VT',
      'virginia': 'VA',
      'washington': 'WA',
      'west_virginia': 'WV',
      'wisconsin': 'WI',
      'wyoming': 'WY',
      'district_of_columbia': 'DC',
    };
    
    const jurisdictions = await ctx.db.query("jurisdictions").collect();
    console.log(`Found ${jurisdictions.length} jurisdictions to migrate`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const jurisdiction of jurisdictions) {
      const oldCode = jurisdiction.code.toLowerCase();
      const newCode = codeMapping[oldCode];
      
      if (newCode && newCode !== jurisdiction.code) {
        // Determine level based on type
        let level: 'federal' | 'state' | 'city';
        if (jurisdiction.type === 'federal') {
          level = 'federal';
        } else if (jurisdiction.type === 'state') {
          level = 'state';
        } else {
          level = 'city';
        }
        
        await ctx.db.patch(jurisdiction._id, {
          code: newCode,
          level: level,
          parentCode: level === 'state' ? 'US' : undefined,
          displayName: jurisdiction.name,
          isActive: true,
          hasEmploymentLaws: true,
        });
        updated++;
        console.log(`Updated: ${oldCode} → ${newCode} (${jurisdiction.name})`);
      } else {
        skipped++;
      }
    }
    
    console.log(`✅ Migration complete: ${updated} updated, ${skipped} skipped`);
    
    return {
      success: true,
      updated,
      skipped,
      total: jurisdictions.length
    };
  },
});

