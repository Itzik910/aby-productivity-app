# ABY Productivity App 🚀

An emotionally engaging, innovative, and intuitive full-stack productivity and smart task assistant app for mobile and web. It helps users organize tasks, receive AI-powered suggestions, track performance, and interact with sponsors for motivation and rewards.

## ✨ Features

### 🧍 User Onboarding & Profile
- Friendly welcome screen with "Let's Begin" CTA
- Registration with personal info (name, age, location, profession)
- User segmentation (student, parent, freelancer, etc.)
- Evolving user profile and preferences

### ✅ Smart Task Creation + AI-Powered Suggestions
- AI receives full context (user profile, location, past behavior)
- Returns 5 personalized suggestions (DIY, location-based, coworking)
- Step-by-step breakdown upon selection
- Adaptive personalization based on usage patterns

### 📍 Location-Based Task Suggestions & Notifications
- Live location matching for nearby tasks
- Contextual notifications for actionable tasks
- Geofencing and routine-based suggestions
- Location-aware productivity optimization

### 📆 Annual Task Calendar
- Interactive year-view with filtering
- Drag/drop task management
- Visual status indicators (completed/overdue)
- Cloud sync across sessions

### 📊 Daily Reflections & Analytics
- Daily check-ins (mood, productivity, focus)
- Productivity streaks and completion rates
- Category breakdowns and time tracking
- Shareable infographics

### 🏆 Achievements & Social Sharing
- Milestone badges and rewards
- Social media integration (FB, IG, X)
- Shareable banner images
- Gamification elements

### 🔔 Smart Notifications
- Task due reminders
- Streak maintenance alerts
- Location-triggered opportunities
- Weekly progress digests

### 🤝 Sponsorship Challenges
- Brand-sponsored task challenges
- Custom task flows and visuals
- Points and rewards system
- Progress tracking

### 💳 Monetization (Pro Plan)
- Free tier with core features
- Pro features: unlimited AI, advanced stats, premium themes
- Stripe-based billing
- Early access to sponsored challenges

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **React Query** for data fetching
- **Zustand** for state management
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **React Hook Form** for forms
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **OpenAI API** for AI features
- **Stripe** for payments
- **Socket.IO** for real-time features
- **Multer** for file uploads
- **Nodemailer** for emails

### AI & Analytics
- **OpenAI GPT-4** integration
- **Modular prompt system**
- **Usage tracking and feedback loops**
- **Personalized suggestions**

### Infrastructure
- **MongoDB Atlas** for database
- **Cloudinary** for file storage
- **Stripe** for payment processing
- **Nodemailer** for email services

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- OpenAI API key
- Stripe account (for payments)
- SMTP service (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aby-productivity-app.git
   cd aby-productivity-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Create `.env` files in both `server/` and `client/` directories:

   **Server (.env)**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/aby-productivity
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   OPENAI_API_KEY=your-openai-api-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   SMTP_FROM=noreply@abyproductivity.com
   CLIENT_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   ```

   **Client (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm start
   
   # Or start individually
   npm run server  # Backend on port 5000
   npm run client  # Frontend on port 3000
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - API Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
aby-productivity-app/
├── server/                 # Backend Node.js/Express
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── uploads/           # File uploads
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── stores/        # Zustand stores
│   │   ├── services/      # API services
│   │   ├── styles/        # Global styles
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── admin/                 # Admin dashboard (future)
└── docs/                  # Documentation
```

## 🔧 Development

### Available Scripts

```bash
# Root level
npm start              # Start both frontend and backend
npm run server         # Start backend only
npm run client         # Start frontend only
npm run install-all    # Install all dependencies
npm run build          # Build for production
npm run test           # Run tests

# Backend (server/)
npm run dev            # Start with nodemon
npm run test           # Run backend tests
npm run seed           # Seed database

# Frontend (client/)
npm start              # Start development server
npm run build          # Build for production
npm run test           # Run frontend tests
npm run lint           # Run ESLint
```

### Code Style

- **Backend**: ESLint + Prettier
- **Frontend**: TypeScript + ESLint + Prettier
- **Database**: Mongoose schemas with validation
- **API**: RESTful endpoints with proper error handling

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas
2. Configure environment variables
3. Deploy to Heroku/Vercel/Railway
4. Set up domain and SSL

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel/Netlify
3. Configure environment variables
4. Set up custom domain

### Database Setup
1. Create MongoDB Atlas cluster
2. Set up database user and network access
3. Configure connection string
4. Run initial seed script

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Task Endpoints
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### AI Endpoints
- `POST /api/ai/suggestions/:taskId` - Get AI suggestions
- `POST /api/ai/feedback/:usageId` - Submit feedback

### Analytics Endpoints
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/analytics/productivity` - Productivity insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Stripe for payment processing
- MongoDB for database
- React and Node.js communities
- All contributors and supporters

## 📞 Support

- **Email**: support@abyproductivity.com
- **Documentation**: [docs.abyproductivity.com](https://docs.abyproductivity.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/aby-productivity-app/issues)

---

Made with ❤️ by the ABY Team 