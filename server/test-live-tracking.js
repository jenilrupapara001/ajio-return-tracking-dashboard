/**
 * Test script for Live Tracking System
 * 
 * This script tests the live tracking functionality
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_ORDER_ID = 'TEST-ORDER-123'; // Replace with a real order ID from your database

async function testLiveTracking() {
  try {
    console.log('🧪 Testing Live Tracking System...\n');

    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server is running:', response.data);
    } catch (error) {
      console.log('❌ Server connection failed:', error.message);
      return;
    }

    // Test 2: Test authentication (you'll need to get a real token)
    console.log('\n2. Testing authentication...');
    console.log('⚠️  Note: You need to login first to get a valid token');
    console.log('   Use: POST /api/auth/login with your credentials');

    // Test 3: Test live tracking endpoint (without auth for now)
    console.log('\n3. Testing live tracking endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/api/live-tracking/${TEST_ORDER_ID}`);
      console.log('✅ Live tracking response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Authentication required (expected)');
      } else {
        console.log('❌ Live tracking test failed:', error.message);
      }
    }

    // Test 4: Test pending orders endpoint
    console.log('\n4. Testing pending orders endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/api/live-tracking/pending`);
      console.log('✅ Pending orders response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Authentication required (expected)');
      } else {
        console.log('❌ Pending orders test failed:', error.message);
      }
    }

    // Test 5: Test Delhivery API directly
    console.log('\n5. Testing Delhivery API directly...');
    try {
      const testAWB = '123456789012'; // Test AWB
      const response = await axios.get(`https://www.delhivery.com/api/unified-tracking?wbn=${testAWB}`, {
        timeout: 10000
      });
      console.log('✅ Delhivery API response:', response.data);
    } catch (error) {
      console.log('⚠️  Delhivery API test (expected to fail with test AWB):', error.message);
    }

    console.log('\n🎉 Live Tracking System Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Login to get authentication token');
    console.log('3. Test with real order IDs from your database');
    console.log('4. Check the frontend dashboard for live tracking');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLiveTracking();
