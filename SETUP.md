# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Start Development Server
```bash
npm run dev
```

## Step 3: Open Browser
Go to `http://localhost:5173`

That's it! Your Ajio Return Tracking Dashboard should now be running locally.

## Troubleshooting

### Port Already in Use
If port 5173 is busy, Vite will automatically use the next available port (5174, 5175, etc.).

### Dependencies Issues
If you encounter dependency issues, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Issues
For production build:
```bash
npm run build
npm run preview
```

## Next Steps

1. **Customize Data**: Replace mock data in `src/data/mockData.ts` with your actual API endpoints
2. **Add Authentication**: Implement user authentication if needed
3. **Connect APIs**: Integrate with real shipping partner APIs
4. **Deploy**: Build and deploy to your preferred hosting platform

## Development Tips

- Use browser dev tools to inspect the responsive design
- Check the console for any errors
- The app includes hot reload for instant updates during development
- All components are modular and can be easily customized
