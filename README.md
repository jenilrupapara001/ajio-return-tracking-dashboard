# AJIO Return Tracking Dashboard

A modern dashboard for tracking return orders from AJIO. Built with React + TypeScript + Vite + TailwindCSS, this project helps visualise return records, shipping partner performance, statuses and metrics in one place.

---

## 🚀 Features

- Display return orders in a table, including details like order ID, ASIN/SKU, status, shipping partner, etc.  
- Summary Metric Cards: total returns, pending, delayed, on‑time, by partner.  
- Filters & Search: allow filtering by status, shipping partner and keyword search.  
- Modal View / Detail View: Clicking a row opens a modal with full return details.  
- Priority/Status Badges for quick visual cues (e.g., “High Priority”, “Delayed”, “Completed”).  
- Built with a frontend‑first approach; mock data file (`src/data/mockData.ts`) is used, making it API‑ready for future integration.  
- TailwindCSS for styling, Vite for fast development, and React + TypeScript for type‑safe components.

---

## 🛠 Tech Stack

| Layer         | Technology                                  |
|---------------|----------------------------------------------|
| Frontend      | React 18 + Vite                              |
| Language      | TypeScript                                   |
| Styling       | TailwindCSS                                  |
| Components    | Custom React components (Cards, Tables, Modals, Badges) |
| Data Source   | Mock data (`src/data/mockData.ts`)           |
| Icons/Helpers | (as per project)                             |

---

## 📁 Project Structure

```
ajio-return-tracking-dashboard/
├── src/
│   ├── components/
│   │   └── Dashboard/
│   │       ├── MetricsCard.tsx
│   │       ├── ReturnsTable.tsx
│   │       ├── SearchAndFilters.tsx
│   │       ├── ReturnDetailsModal.tsx
│   │       ├── PriorityBadge.tsx
│   │       ├── StatusBadge.tsx
│   │       └── ShippingPartners.tsx
│   ├── data/
│   │   └── mockData.ts
│   ├── types/
│   │   └── dashboard.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 📥 Installation & Setup

Follow these steps to get the project up and running locally:

```bash
# 1. Clone the repository
git clone https://github.com/jenilrupapara001/ajio-return-tracking-dashboard.git

# 2. Move into project folder
cd ajio-return-tracking-dashboard

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

After running `npm run dev`, open your browser at `http://localhost:5173/` (or whatever host/port Vite reports) to see the dashboard.

---

## 🧪 Usage & Workflow

- Use the search bar and filters to narrow down return records based on status or shipping partner.  
- Click a table row to open a modal with detailed information about that return.  
- Keep an eye on the metric cards at the top to monitor key KPIs (total returns, delayed returns, etc.).  
- The data is currently driven by `src/data/mockData.ts`. To integrate with a real API, replace/mock the data source accordingly.  
- TailwindCSS classes are used for styling; feel free to adjust styling for your brand or theme.

---

## 🌟 Future Enhancements

Here are some ideas you might want to implement next:

- ✅ Replace mock data with real API/backend integration (e.g., AJIO returns API).  
- ✅ Add export functionality (CSV/Excel) for the returns table.  
- ✅ Add user authentication / role‑based access (e.g., Admin vs Partner).  
- ✅ Add email alerts / notifications when a return is delayed.  
- ✅ Add graphs/charts for visualising trends (e.g., returns over time, by shipping partner).  
- ✅ Add filtering or grouping by warehouse / fulfilment centre (if applicable).  
- ✅ Improve mobile responsiveness and UI themes to suit brand identity.

---

## 🧑‍💻 Author

**Jenil Rupapara**  
Frontend Developer | Automation Enthusiast  
GitHub: [jenilrupapara001](https://github.com/jenilrupapara001)  
Email: jenilrupapara001@gmail.com

---

## 📄 License

This project is licensed under the MIT License.  
Feel free to use, modify and distribute it (just keep attribution).

---

⭐ If you found this project useful or like the codebase, please consider giving it a ⭐ on GitHub!
