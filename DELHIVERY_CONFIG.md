# Delhivery Tracking Configuration

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Delhivery Tracking API Configuration

# Set to 'true' to use mock data instead of real API calls
# Useful for development and testing
VITE_USE_DELHIVERY_MOCK=false

# API request timeout in milliseconds (default: 10000)
VITE_DELHIVERY_TIMEOUT=10000

# Your existing environment variables
MONGODB_URI=mongodb://localhost:27017/ajio_dashboard
JWT_SECRET=your_jwt_secret_here
DELHIVERY_API_KEY=your_delhivery_api_key_here
```

## Configuration Options

### Mock Data Mode

Set `VITE_USE_DELHIVERY_MOCK=true` to use mock data for development:

```env
VITE_USE_DELHIVERY_MOCK=true
```

This will:
- Use mock data instead of real API calls
- Provide consistent test data
- Avoid API rate limits during development
- Allow offline development

### Timeout Configuration

Set a custom timeout for API requests:

```env
VITE_DELHIVERY_TIMEOUT=15000
```

Default timeout is 10 seconds (10000ms).

## Usage in Code

The configuration is automatically applied when using the tracking functions:

```typescript
import { trackDelhiveryShipmentWithMock } from './services/delhiveryMockData';

// This will automatically use mock data if VITE_USE_DELHIVERY_MOCK=true
const result = await trackDelhiveryShipmentWithMock('123456789012');
```

## Development vs Production

### Development
```env
VITE_USE_DELHIVERY_MOCK=true
VITE_DELHIVERY_TIMEOUT=5000
```

### Production
```env
VITE_USE_DELHIVERY_MOCK=false
VITE_DELHIVERY_TIMEOUT=10000
```
