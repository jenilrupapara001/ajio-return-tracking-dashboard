# Delhivery Public Tracking API Integration

A comprehensive React + TypeScript integration for Delhivery's public tracking API with built-in error handling, mock data support, and React hooks.

## 🚀 Features

- ✅ **TypeScript Support**: Full type safety with comprehensive interfaces
- ✅ **Error Handling**: Robust error handling with meaningful error messages
- ✅ **React Hooks**: Easy-to-use hooks for state management
- ✅ **Mock Data**: Built-in mock data for development and testing
- ✅ **Validation**: AWB number validation and formatting
- ✅ **Production Ready**: Clean, well-commented, production-ready code
- ✅ **Flexible**: Works with both real API and mock data

## 📦 Installation

The integration is already set up in your project. All files are located in:

```
src/
├── types/
│   └── delhivery.ts              # TypeScript interfaces
├── services/
│   ├── delhiveryTracking.ts      # Main API service
│   ├── delhiveryMockData.ts      # Mock data for development
│   └── index.ts                  # Main exports
├── hooks/
│   └── useDelhiveryTracking.ts   # React hooks
└── components/
    └── DelhiveryTrackingDemo.tsx # Demo component
```

## 🎯 Quick Start

### 1. Basic Usage with React Hook

```typescript
import { useDelhiveryTracking } from './hooks/useDelhiveryTracking';

function TrackingComponent() {
  const { data, loading, error, trackAWB } = useDelhiveryTracking();

  const handleTrack = () => {
    trackAWB('123456789012');
  };

  return (
    <div>
      <button onClick={handleTrack} disabled={loading}>
        {loading ? 'Tracking...' : 'Track Package'}
      </button>
      
      {error && <div>Error: {error.message}</div>}
      
      {data?.shipment && (
        <div>
          <h3>Status: {data.shipment.status}</h3>
          <p>Location: {data.shipment.currentLocation}</p>
        </div>
      )}
    </div>
  );
}
```

### 2. Direct API Usage

```typescript
import { trackDelhiveryShipment } from './services/delhiveryTracking';

async function trackPackage(awbNumber: string) {
  try {
    const result = await trackDelhiveryShipment(awbNumber);
    
    if (result.success) {
      console.log('Status:', result.shipment?.status);
      console.log('Location:', result.shipment?.currentLocation);
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Tracking failed:', error);
  }
}
```

### 3. Using Mock Data for Development

```typescript
import { trackDelhiveryShipmentWithMock } from './services/delhiveryMockData';

// Force mock data
const result = await trackDelhiveryShipmentWithMock('123456789012', {}, true);

// Auto-detect (uses mock if available in development)
const result = await trackDelhiveryShipmentWithMock('123456789012');
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Force mock data usage
VITE_USE_DELHIVERY_MOCK=true

# API timeout (optional)
VITE_DELHIVERY_TIMEOUT=15000
```

### API Options

```typescript
import { trackDelhiveryShipment } from './services/delhiveryTracking';

const result = await trackDelhiveryShipment('123456789012', {
  timeout: 15000,                    // Request timeout in ms
  includeRawResponse: true,          // Include raw API response
  headers: {                         // Custom headers
    'Custom-Header': 'value'
  }
});
```

## 🎭 Mock Data

The integration includes comprehensive mock data for development:

### Available Mock AWB Numbers

- `123456789012` - Delivered package
- `987654321098` - In transit package  
- `555555555555` - Pending package

### Using Mock Data

```typescript
import { getMockAWBNumbers, hasMockData } from './services/delhiveryMockData';

// Get all available mock AWB numbers
const mockAWBs = getMockAWBNumbers();

// Check if an AWB has mock data
const hasMock = hasMockData('123456789012');
```

## 🧪 Testing

### Demo Component

Use the included demo component to test the integration:

```typescript
import { DelhiveryTrackingDemo } from './components/DelhiveryTrackingDemo';

function App() {
  return (
    <div>
      <DelhiveryTrackingDemo useMock={true} />
    </div>
  );
}
```

### Unit Testing

```typescript
import { trackDelhiveryShipment, isValidAWBFormat } from './services/delhiveryTracking';

// Test AWB validation
expect(isValidAWBFormat('123456789012')).toBe(true);
expect(isValidAWBFormat('invalid')).toBe(false);

// Test with mock data
const result = await trackDelhiveryShipment('123456789012');
expect(result.success).toBe(true);
```

## 📚 API Reference

### Main Functions

#### `trackDelhiveryShipment(awbNumber, options?)`

Tracks a shipment using Delhivery's public API.

**Parameters:**
- `awbNumber: string` - The AWB number to track
- `options?: DelhiveryTrackingOptions` - Optional configuration

**Returns:** `Promise<DelhiveryApiResponse>`

#### `useDelhiveryTracking(initialAWB?, options?)`

React hook for tracking shipments with built-in state management.

**Parameters:**
- `initialAWB?: string` - Optional initial AWB to track
- `options?: DelhiveryTrackingOptions` - Optional configuration

**Returns:** `UseDelhiveryTrackingReturn`

### Types

#### `DelhiveryApiResponse`

```typescript
interface DelhiveryApiResponse {
  success: boolean;
  shipment?: DelhiveryShipmentDetails;
  error?: string;
  rawResponse?: any;
}
```

#### `DelhiveryShipmentDetails`

```typescript
interface DelhiveryShipmentDetails {
  awbNumber: string;
  status: string;
  currentLocation: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  expectedDeliveryDate?: string;
  deliveredDate?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneePhone?: string;
  trackingHistory: DelhiveryTrackingEvent[];
  lastUpdated: string;
}
```

## 🚨 Error Handling

The integration provides comprehensive error handling:

### Error Types

- `INVALID_AWB` - Invalid AWB number format
- `EMPTY_AWB` - Empty AWB number
- `INVALID_AWB_FORMAT` - AWB doesn't match expected format
- `TIMEOUT` - Request timeout
- `NETWORK_ERROR` - Network connectivity issues
- `HTTP_ERROR` - HTTP status errors
- `NO_DATA` - No tracking data found
- `UNKNOWN_ERROR` - Unexpected errors

### Error Handling Example

```typescript
import { useDelhiveryTracking } from './hooks/useDelhiveryTracking';

function TrackingComponent() {
  const { data, loading, error, trackAWB } = useDelhiveryTracking();

  const handleTrack = async () => {
    try {
      await trackAWB('123456789012');
    } catch (err) {
      // Error is automatically handled by the hook
      console.log('Error code:', error?.code);
      console.log('Error message:', error?.message);
    }
  };

  return (
    <div>
      {error && (
        <div className="error">
          <strong>Error {error.code}:</strong> {error.message}
        </div>
      )}
      {/* ... rest of component */}
    </div>
  );
}
```

## 🔄 Real-time Updates

For real-time tracking updates, you can use the hook with a polling mechanism:

```typescript
import { useEffect } from 'react';
import { useDelhiveryTracking } from './hooks/useDelhiveryTracking';

function RealTimeTracking({ awbNumber }: { awbNumber: string }) {
  const { data, trackAWB } = useDelhiveryTracking();

  useEffect(() => {
    // Track immediately
    trackAWB(awbNumber);

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      trackAWB(awbNumber);
    }, 30000);

    return () => clearInterval(interval);
  }, [awbNumber, trackAWB]);

  return (
    <div>
      {data?.shipment && (
        <div>
          <h3>Status: {data.shipment.status}</h3>
          <p>Last Updated: {new Date(data.shipment.lastUpdated).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
```

## 🎨 Styling

The demo component uses Tailwind CSS classes. You can customize the styling by:

1. Modifying the component classes
2. Using your own CSS framework
3. Creating custom styled components

## 🚀 Production Deployment

### Environment Setup

1. **Remove mock data** in production:
   ```env
   VITE_USE_DELHIVERY_MOCK=false
   ```

2. **Set appropriate timeout**:
   ```env
   VITE_DELHIVERY_TIMEOUT=10000
   ```

3. **Handle CORS** if needed (Delhivery's public API should handle this)

### Performance Considerations

- The API has rate limits, so implement proper caching
- Use the `timeout` option to prevent hanging requests
- Consider implementing retry logic for failed requests
- Use mock data during development to avoid API limits

## 🤝 Contributing

To extend the integration:

1. Add new types to `src/types/delhivery.ts`
2. Extend the API service in `src/services/delhiveryTracking.ts`
3. Add new mock scenarios in `src/services/delhiveryMockData.ts`
4. Update the demo component for testing

## 📄 License

This integration is part of your project and follows the same license terms.

---

**Happy Tracking! 🚚📦**
