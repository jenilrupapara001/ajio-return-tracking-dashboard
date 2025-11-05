# Delhivery API Integration & Enhanced Dashboard

This document outlines the implementation of Delhivery API integration and enhanced dashboard features for the Ajio Seller Central Dashboard.

## Features Implemented

### 1. Delhivery API Integration
- **API Key**: `b0acf3cacb9f778456d1639c3dd26f9ff5a35af1`
- **Base URL**: `https://track.delhivery.com`
- **Webhook Support**: Real-time status updates via webhooks
- **Batch Tracking**: Support for tracking multiple AWB numbers simultaneously

### 2. Enhanced Database Models
- **DropshipOrder Model**: Extended with tracking fields
  - `deliveryStatus`: Standardized delivery status
  - `currentLocation`: Current location of the shipment
  - `lastTrackingUpdate`: Timestamp of last tracking update
  - `trackingData`: Raw tracking data from Delhivery
  - `estimatedDeliveryDate`: Estimated delivery date
  - `actualDeliveryDate`: Actual delivery date

- **RtvReturn Model**: Extended with similar tracking fields

### 3. Status Mapping Service
- **Comprehensive Status Mapping**: Maps various status formats to standardized statuses
- **Order Statuses**: `pending`, `picked_up`, `dispatched`, `in_transit`, `out_for_delivery`, `delivered`, `exception`, `undelivered`, `rto`, `rto_delivered`
- **Return Statuses**: `initiated`, `pickup_scheduled`, `in_transit`, `delivered_to_warehouse`, `quality_check`, `refunded`, `replaced`, `rejected`
- **UI Support**: Color coding and icons for different statuses

### 4. Enhanced Dashboard Charts
- **Multiple Chart Types**: Pie charts, bar charts, line charts, area charts, scatter plots, radial charts
- **Real-time Data**: Live updates from tracking services
- **Comprehensive Metrics**: Order distribution, return status, partner performance, delivery trends
- **Interactive Visualizations**: Responsive charts with tooltips and legends

### 5. Real-time Tracking System
- **Automatic Updates**: Background service updates tracking status every 5 minutes
- **Webhook Processing**: Real-time updates via Delhivery webhooks
- **Manual Updates**: API endpoints for manual status updates
- **Status Monitoring**: Track pending updates and sync status

### 6. Order Reports Table
- **Comprehensive Display**: All order report headers as specified
- **Advanced Filtering**: Search by order number, AWB, seller, product
- **Status Filtering**: Filter by delivery status and carrier
- **Real-time Updates**: Live status updates with refresh functionality
- **Detailed View**: Modal with complete order information

## API Endpoints

### Tracking Endpoints
- `GET /tracking-status?awbNumbers=awb1,awb2` - Get tracking status for multiple AWBs
- `POST /update-status` - Manually update order status
- `GET /realtime-dashboard` - Get real-time dashboard data

### Webhook Endpoints
- `POST /api/webhooks/delhivery` - Delhivery webhook endpoint
- `POST /api/webhooks/update-status` - Manual status update

## Order Report Headers Supported

The system now supports all the order report headers you specified:

- **Customer Information**: Cust Order No, Cust Order Date
- **Forward Order Information**: FWD Seller Order NO, FWD PO NO, FWD PO Date
- **Invoice Information**: Seller Invoice No, Seller Invoice Date, Cust Invoice No, Cust Invoice Date
- **Status & Tracking**: Status, JioCode, HSN, FWD Shipment ID, FWD Shipment Date, FWD Carrier, FWD AWB
- **Product Information**: Seller Style Code, Seller SKU, EAN, Description, Brand
- **Quantity Information**: Order Qty, Shipped QTY, Cancelled Qty, Customer Cancelled QTY, Seller Cancelled QTY
- **Financial Information**: Listing MRP, Seller TD, Selling Price, Base Price, Total Price, Total Value, Invoice Value
- **Tax Information**: CGST, SGST, IGST percentages and amounts
- **Business Information**: Fulfillment Type, POB ID, Seller Name

## Status Mapping

The system maps various status formats to standardized statuses:

### Delhivery Statuses → Standardized Statuses
- "In Transit" → `in_transit`
- "Delivered" → `delivered`
- "Out for Delivery" → `out_for_delivery`
- "Picked Up" → `picked_up`
- "Dispatched" → `dispatched`
- "Exception" → `exception`
- "Undelivered" → `undelivered`
- "RTO" → `rto`
- "RTO Delivered" → `rto_delivered`

### Order Statuses → Standardized Statuses
- "Shipped" → `in_transit`
- "Processing" → `pending`
- "Ready to Ship" → `pending`
- "Cancelled" → `cancelled`
- "Returned" → `returned`
- "Refunded" → `refunded`

## Real-time Updates

### Automatic Updates
- Background service runs every 5 minutes
- Updates orders with AWB numbers that haven't been updated in the last hour
- Processes up to 50 orders per update cycle to avoid API limits

### Webhook Updates
- Real-time updates when Delhivery sends webhook notifications
- Immediate status updates for critical events
- Automatic status mapping and database updates

### Manual Updates
- API endpoints for manual status updates
- Dashboard interface for triggering updates
- Bulk update capabilities

## Chart Types Implemented

1. **Pie Charts**: Order distribution, return status distribution
2. **Bar Charts**: Partner performance, delivery time distribution
3. **Line Charts**: Monthly trends, revenue trends
4. **Area Charts**: Revenue by status
5. **Scatter Plots**: Partner orders vs success rate
6. **Radial Charts**: Fulfillment rate
7. **Composed Charts**: Combined performance overview

## Usage

### Starting the Service
The real-time update service starts automatically when the server starts. It will:
1. Connect to the database
2. Initialize default data
3. Start the real-time update service
4. Set up webhook endpoints

### Monitoring
- Check `/health` endpoint for service status
- Monitor logs for tracking update activities
- Use dashboard to view real-time status updates

### Configuration
Set environment variables:
- `DELHIVERY_API_KEY`: Your Delhivery API key
- `WEBHOOK_URL`: Your webhook URL for Delhivery
- `JWT_SECRET`: JWT secret for authentication

## Security

- All endpoints require authentication
- API keys are stored securely
- Webhook endpoints validate incoming data
- Rate limiting on API calls

## Performance

- Database indexes on frequently queried fields
- Batch processing for tracking updates
- Caching of status mappings
- Optimized queries for dashboard metrics

This implementation provides a comprehensive solution for order tracking and management with real-time updates from Delhivery and enhanced visualization capabilities.
