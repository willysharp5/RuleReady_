#!/usr/bin/env node

/**
 * Test Chat API: Test the compliance chat API endpoint directly
 * 
 * This script tests the chat API to verify Gemini integration
 * Run with: node scripts/test-chat-api.js
 */

async function main() {
  console.log("🤖 TESTING COMPLIANCE CHAT API");
  console.log("======================================================================");

  try {
    // Test the chat API endpoint
    console.log("📤 Sending test message to chat API...");
    
    const testMessage = {
      messages: [
        {
          role: 'user',
          content: 'What are the minimum wage requirements in California?'
        }
      ],
      jurisdiction: 'California',
      topic: 'minimum_wage'
    };
    
    const response = await fetch('http://localhost:3000/api/compliance-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });
    
    console.log(`📊 API Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log("✅ Chat API is working!");
      
      // Read the streaming response
      const reader = response.body?.getReader();
      if (reader) {
        console.log("\n🤖 AI Response (streaming):");
        let responseText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          responseText += chunk;
          process.stdout.write(chunk);
        }
        
        console.log("\n\n✅ Streaming response completed");
        console.log(`📊 Response length: ${responseText.length} characters`);
      }
      
    } else {
      const errorText = await response.text();
      console.log("❌ Chat API failed:");
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }
    
    console.log("\n======================================================================");
    console.log("🎯 CHAT API TEST COMPLETE");
    console.log("======================================================================");
    
  } catch (error) {
    console.error("❌ Chat API test failed:", error);
    
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("   • Make sure the app is running: npm run dev");
    console.log("   • Check that Gemini API key is set");
    console.log("   • Verify Convex deployment is active");
    console.log("   • Check network connectivity");
    
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

