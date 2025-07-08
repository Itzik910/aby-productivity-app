#!/bin/bash

echo "🚀 Setting up ABY Productivity App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment files
echo "🔧 Setting up environment files..."

# Server environment
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server environment file..."
    cp server/env.example server/.env
    echo "⚠️  Please update server/.env with your actual configuration values"
else
    echo "✅ Server environment file already exists"
fi

# Client environment
if [ ! -f "client/.env" ]; then
    echo "📝 Creating client environment file..."
    cp client/env.example client/.env
    echo "⚠️  Please update client/.env with your actual configuration values"
else
    echo "✅ Client environment file already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads

# Create build directories
echo "📁 Creating build directories..."
mkdir -p client/build

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your configuration values"
echo "2. Update client/.env with your configuration values"
echo "3. Start MongoDB (local or Atlas)"
echo "4. Run 'npm start' to start both frontend and backend"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   API Health: http://localhost:5000/api/health"
echo ""
echo "📚 For more information, see README.md" 