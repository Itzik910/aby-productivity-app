@echo off
echo 🚀 Setting up ABY Productivity App...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install
cd ..

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
cd ..

REM Create environment files
echo 🔧 Setting up environment files...

REM Server environment
if not exist "server\.env" (
    echo 📝 Creating server environment file...
    copy "server\env.example" "server\.env"
    echo ⚠️  Please update server\.env with your actual configuration values
) else (
    echo ✅ Server environment file already exists
)

REM Client environment
if not exist "client\.env" (
    echo 📝 Creating client environment file...
    copy "client\env.example" "client\.env"
    echo ⚠️  Please update client\.env with your actual configuration values
) else (
    echo ✅ Client environment file already exists
)

REM Create uploads directory
echo 📁 Creating uploads directory...
if not exist "server\uploads" mkdir "server\uploads"

REM Create build directories
echo 📁 Creating build directories...
if not exist "client\build" mkdir "client\build"

echo.
echo 🎉 Installation complete!
echo.
echo 📋 Next steps:
echo 1. Update server\.env with your configuration values
echo 2. Update client\.env with your configuration values
echo 3. Start MongoDB (local or Atlas)
echo 4. Run 'npm start' to start both frontend and backend
echo.
echo 🌐 Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    API Health: http://localhost:5000/api/health
echo.
echo 📚 For more information, see README.md
pause 