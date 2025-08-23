# Ajio Return Tracking Dashboard

A comprehensive multifunctional dashboard for tracking returns across different shipping partners.

## Features

- 📊 Real-time return tracking dashboard
- 🚚 Multiple shipping partner support (Blue Dart, Delhivery, FedEx, DTDC, Ecom Express)
- 🔍 Advanced filtering and search capabilities
- 📈 Key metrics and analytics
- 📋 Return status workflow management
- 📤 Export functionality (CSV)
- 📱 Fully responsive design
- 🎨 Modern UI with smooth animations

## Prerequisites

Make sure you have the following installed:
- Node.js (version 16 or higher)
- npm or yarn

## Local Setup Instructions

### 1. Navigate to the project directory
```bash
cd ajio-return-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```

### 4. Open your browser
Navigate to `http://localhost:5173` to view the dashboard.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   └── Dashboard/
│       ├── MetricsCard.tsx          # Metrics display cards
│       ├── StatusBadge.tsx          # Return status indicators
│       ├── PriorityBadge.tsx        # Priority level indicators
│       ├── ReturnsTable.tsx         # Main returns data table
│       ├── SearchAndFilters.tsx     # Search and filter controls
│       ├── ShippingPartners.tsx     # Partner management panel
│       └── ReturnDetailsModal.tsx   # Detailed return view modal
├── data/
│   └── mockData.ts                  # Sample data for development
├── types/
│   └── dashboard.ts                 # TypeScript type definitions
├── App.tsx                          # Main application component
├── main.tsx                         # Application entry point
└── index.css                        # Global styles with Tailwind
```

## Dashboard Features

### Metrics Overview
- Total returns count
- Pending returns
- Success rate percentage
- Total refund amount
- Average processing time
- Completed returns

### Return Management
- View all returns in a sortable table
- Filter by status, shipping partner, priority, and date range
- Search across return IDs, order IDs, customer names, and products
- View detailed return information in modal
- Track return status progression

### Shipping Partner Integration
- Support for 5 major shipping partners
- Partner-wise performance metrics
- Active return counts per partner
- Success rates and delivery times

### Export & Reporting
- Export filtered data to CSV
- Real-time data refresh
- Comprehensive return tracking

## Customization

### Connecting to Real APIs
Replace the mock data in `src/data/mockData.ts` with actual API calls:

```typescript
// Example API integration
const fetchReturns = async () => {
  const response = await fetch('/api/returns');
  return response.json();
};
```

### Adding New Shipping Partners
Update the `mockShippingPartners` array in `src/data/mockData.ts` and add the new partner to the type definitions.

### Styling Customization
The project uses Tailwind CSS. Modify styles in component files or extend the Tailwind configuration in `tailwind.config.js`.

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Vite** - Build tool

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for demonstration purposes.