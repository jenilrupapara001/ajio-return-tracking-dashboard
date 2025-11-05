# Delhivery API Setup Guide

## Current Issue
The system is getting a **401 Unauthorized** error from the Delhivery API because the API key is invalid or expired.

## Error Details
- **Status:** 401 (Unauthorized)
- **Response:** "Login or API Key Required"
- **Current API Key:** `b0acf3cacb9f778456d1639c3dd26f9ff5a35af1`

## How to Fix

### Option 1: Get a Valid Delhivery API Key
1. Visit: https://www.delhivery.com/api/
2. Sign up for a Delhivery account
3. Get your API key from the dashboard
4. Set the environment variable:
   ```bash
   export DELHIVERY_API_KEY=your_actual_api_key_here
   ```

### Option 2: Disable Delhivery Tracking (Temporary)
If you don't have a Delhivery API key, the system will now work without it:
- The tracking features will be disabled
- Orders will still show in the dashboard
- No real-time status updates from Delhivery

### Option 3: Use Environment Variables
Create a `.env` file in the `server` directory:
```env
DELHIVERY_API_KEY=your_actual_api_key_here
MONGODB_URI=mongodb://localhost:27017/ajio_dashboard
JWT_SECRET=ajio_secret_key_2025
PORT=3001
```

## What's Fixed
✅ **API Key Validation:** System now checks if API key exists before making requests  
✅ **Graceful Degradation:** System continues to work even without valid API key  
✅ **Error Handling:** No more 401 errors crashing the service  
✅ **Logging:** Clear messages about API key status  

## Testing
After setting up the API key, restart the server:
```bash
cd server
npm start
```

The system will now:
- Use the API key if provided
- Skip Delhivery tracking if no valid key
- Continue working with your existing data
