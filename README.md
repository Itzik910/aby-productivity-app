# ABY - Smart Productivity & Task Assistant

A comprehensive full-stack productivity application with AI-powered suggestions, location-based features, task management, analytics, gamification, and premium features unlocked through profile completion.

## 🌟 Features

### Core Features
- **Smart Task Management** - Create, organize, and track tasks with AI-powered suggestions
- **AI Integration** - OpenAI GPT-powered task optimization and productivity insights
- **Location-Based Features** - Context-aware task suggestions based on your location
- **Analytics Dashboard** - Comprehensive productivity analytics and progress tracking
- **Gamification** - Points, streaks, achievements, and challenges to keep you motivated
- **Real-time Notifications** - Instant updates and reminders
- **Offline Support** - Work seamlessly even without internet connection
- **Accessibility** - Designed with accessibility in mind

### Premium Features (Unlocked via Profile Completion)
- **Advanced AI** - Unlimited AI-powered task suggestions and insights
- **Unlimited Tasks** - Create unlimited tasks and projects
- **Priority Support** - Get faster response times from our support team
- **Custom Themes** - Personalize your app with custom themes and colors
- **Data Export** - Export your data in various formats
- **Advanced Analytics** - Detailed insights into your productivity patterns
- **Team Features** - Collaborate with team members on shared projects
- **API Access** - Access to our API for custom integrations

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Zustand** for state management
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **OpenAI API** for AI features
- **Socket.IO** for real-time features
- **Multer** for file uploads
- **Cloudinary** for image storage

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- OpenAI API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ABY
   ```

2. **Install dependencies**
   ```bash
   # On Windows
   install.bat
   
   # On macOS/Linux
   ./install.sh
   ```

3. **Configure environment variables**
   
   **Server (.env)**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   OPENAI_API_KEY=your-openai-api-key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   CLIENT_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   ```

   **Client (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_PREMIUM_ENABLED=true
   REACT_APP_PREMIUM_UPGRADE_METHOD=profile_completion
   REACT_APP_GA_TRACKING_ID=your-google-analytics-id
   REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
   REACT_APP_WEATHER_API_KEY=your-weather-api-key
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - API Health: http://localhost:5000/api/health

## 🎯 Premium Upgrade System

Instead of traditional payment processing, ABY uses a **profile completion system** to unlock premium features:

### Required Profile Fields for Premium
- Phone number
- Date of birth
- Address (city and country)
- Interests (at least one)
- Goals (at least one)
- Work schedule
- Stress level
- Sleep pattern

### How It Works
1. Users complete their basic profile during registration
2. To unlock premium features, users must provide additional personal details
3. Once all required fields are completed, users automatically get premium access
4. Premium status is permanent and includes all advanced features

## 🔧 Development

### Project Structure
```
ABY/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── services/      # API services
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── models/            # MongoDB models
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   └── uploads/           # File uploads
└── docs/                  # Documentation
```

### Available Scripts

**Root level:**
- `npm start` - Start both frontend and backend
- `npm run dev` - Start in development mode
- `npm run build` - Build for production
- `npm test` - Run tests

**Server:**
- `npm run dev` - Start with nodemon
- `npm test` - Run server tests
- `npm run seed` - Seed database

**Client:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run client tests
- `npm run lint` - Run ESLint

## 🔐 Environment Variables

### Required for Production
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh secret
- `OPENAI_API_KEY` - OpenAI API key
- `CLOUDINARY_*` - Cloudinary credentials for file uploads

### Optional
- `SMTP_*` - Email configuration for notifications
- `GOOGLE_MAPS_API_KEY` - For location features
- `WEATHER_API_KEY` - For weather-based suggestions
- `GA_TRACKING_ID` - Google Analytics

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `npm start`

### Frontend Deployment
1. Set up environment variables
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Deploy the `build` folder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `docs/` folder
- Contact the development team

## 🔄 Updates

### Recent Changes
- **Removed Stripe payment processing**
- **Implemented profile-based premium system**
- **Added comprehensive premium upgrade interface**
- **Updated user model with premium details**
- **Enhanced security and validation**

### Upcoming Features
- Team collaboration features
- Advanced AI integrations
- Mobile app development
- API documentation
- Performance optimizations

---

**ABY** - Transform your productivity with AI-powered insights and smart task management! 🚀 