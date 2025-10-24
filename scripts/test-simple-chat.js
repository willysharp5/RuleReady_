#!/usr/bin/env node

/**
 * Simple Chat Test
 * 
 * Test the chat API with a simple request to see response structure
 */

async function testSimpleChat() {
  console.log('🔍 Testing simple chat functionality...\n');
  
  try {
    console.log('🎯 Testing chat API with simple question...');
    
    const chatResponse = await fetch('http://localhost:3001/api/compliance-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello, what can you help me with?' }]
      })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log(`✅ Chat API responded successfully`);
      console.log(`📝 Response content length: ${chatData.content?.length || 0}`);
      console.log(`📊 Sources in response: ${chatData.sources?.length || 0}`);
      console.log(`🏷️ Title: ${chatData.title || 'N/A'}`);
      
      console.log('\n📋 Full response structure:');
      console.log(JSON.stringify(chatData, null, 2));
      
    } else {
      console.log('❌ Chat API failed:', chatResponse.status);
      const errorText = await chatResponse.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleChat().catch(console.error);

