/**
 * Test script for tracking API
 */

const axios = require('axios');

async function testTrackingAPI() {
  try {
    console.log('🧪 Testing Tracking API...\n');

    // Test 1: Health check
    console.log('1. Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:5000/health');
      console.log('✅ Server is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server not running:', error.message);
      return;
    }

    // Test 2: Test Delhivery API directly
    console.log('\n2. Testing Delhivery API directly...');
    try {
      const testAWB = '14187450227363'; // Use a real AWB from your data
      const delhiveryResponse = await axios.get(`https://www.delhivery.com/api/unified-tracking?wbn=${testAWB}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      console.log('✅ Delhivery API response:', JSON.stringify(delhiveryResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️  Delhivery API test:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }

    // Test 3: Test our live tracking endpoint (without auth for now)
    console.log('\n3. Testing live tracking endpoint...');
    try {
      const testOrderId = 'FN0908605590'; // Use a real order ID from your data
      const trackingResponse = await axios.get(`http://localhost:5000/api/live-tracking/${testOrderId}`);
      console.log('✅ Live tracking response:', JSON.stringify(trackingResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Authentication required (expected)');
      } else {
        console.log('❌ Live tracking test failed:', error.message);
        if (error.response) {
          console.log('Response status:', error.response.status);
          console.log('Response data:', error.response.data);
        }
      }
    }

    console.log('\n🎉 Tracking API Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Login to get authentication token');
    console.log('2. Test with real order IDs from your database');
    console.log('3. Check the frontend dashboard for live tracking');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTrackingAPI();
