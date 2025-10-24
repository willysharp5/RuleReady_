import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient('https://friendly-octopus-467.convex.cloud');

async function activateAllWebsites() {
  try {
    console.log('🔍 Getting all websites...');
    
    const websites = await convex.query('websites:getUserWebsites');
    const inactiveWebsites = websites.filter(w => !w.isActive);
    
    console.log(`Found ${websites.length} total websites`);
    console.log(`Found ${inactiveWebsites.length} inactive websites`);
    
    if (inactiveWebsites.length === 0) {
      console.log('✅ All websites are already active!');
      return;
    }
    
    console.log('\n🔄 Activating inactive websites...');
    
    let activated = 0;
    let failed = 0;
    
    for (const website of inactiveWebsites) {
      try {
        await convex.mutation('websites:toggleWebsiteActive', {
          websiteId: website._id
        });
        
        console.log(`✅ Activated: ${website.name}`);
        activated++;
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Failed to activate: ${website.name} - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n🎉 Activation complete:`);
    console.log(`✅ Activated: ${activated} websites`);
    console.log(`❌ Failed: ${failed} websites`);
    console.log(`\n🎯 All websites should now respond to "Check Now" buttons!`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

activateAllWebsites();
