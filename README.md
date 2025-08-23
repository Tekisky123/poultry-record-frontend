# Poultry Farm Management System

A comprehensive Progressive Web App (PWA) that serves both administrators and supervisors in a poultry farm management system.

## Features

### 🏢 Admin Panel
- **Dashboard**: Overview of farm operations, statistics, and recent activities
- **Trip Management**: View and manage all trips across the farm
- **Vendor Management**: Manage chicken suppliers and vendors
- **Customer Management**: Track customer information and orders
- **Vehicle Management**: Monitor farm vehicles and their status
- **Reports**: Generate comprehensive reports and analytics
- **User Management**: Manage all system users and their roles

### 👨‍🌾 Supervisor PWA
- **Mobile-First Design**: Optimized for mobile devices and field work
- **Trip Management**: Create, view, and update trip details
- **Real-time Updates**: Track trip status and progress
- **Field Operations**: Manage purchase and delivery trips
- **Team Coordination**: Assign drivers and labor workers
- **Offline Capability**: Works even with poor internet connectivity

## Technology Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Chart.js + React-Chartjs-2
- **PWA**: Service Worker + Manifest
- **Routing**: React Router DOM

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd poultry-admin
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Build for production
```bash
npm run build
```

## User Roles & Access

### Admin Users
- Access to full admin panel with sidebar navigation
- Can manage all aspects of the farm operations
- Desktop-optimized interface

### Supervisor Users
- Access to mobile-optimized PWA interface
- Bottom navigation for easy mobile use
- Focused on field operations and trip management

## PWA Features

- **Installable**: Can be installed on mobile devices
- **Offline Support**: Basic offline functionality with service worker
- **Responsive Design**: Works on all device sizes
- **Fast Loading**: Optimized for performance

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx      # Admin header
│   ├── Sidebar.jsx     # Admin sidebar
│   ├── SupervisorHeader.jsx    # Supervisor header
│   └── BottomNavigation.jsx    # Mobile navigation
├── pages/              # Page components
│   ├── Dashboard.jsx   # Admin dashboard
│   ├── SupervisorDashboard.jsx # Supervisor dashboard
│   ├── Trips.jsx       # Admin trips view
│   ├── SupervisorTrips.jsx     # Supervisor trips view
│   └── ...            # Other admin pages
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication context
└── App.jsx            # Main app with role-based routing
```

## API Integration

The app integrates with a Node.js backend API for:
- User authentication and authorization
- Trip management and tracking
- Farm operations data
- Reports and analytics

## Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your web server
3. Ensure the service worker and manifest are accessible
4. Configure your backend API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
