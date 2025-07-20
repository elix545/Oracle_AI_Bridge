@echo off
echo ========================================
echo CHECKING DEPENDENCIES
echo ========================================

echo.
echo 1. Checking if node_modules exists in node-service...
if exist "node-service\node_modules" (
    echo ✓ node_modules exists
) else (
    echo ✗ node_modules missing - installing dependencies...
    cd node-service
    npm install
    cd ..
)

echo.
echo 2. Checking if dist folder exists in node-service...
if exist "node-service\dist" (
    echo ✓ dist folder exists
) else (
    echo ✗ dist folder missing - building TypeScript...
    cd node-service
    npm run build
    cd ..
)

echo.
echo 3. Checking if package.json has correct scripts...
findstr "start" node-service\package.json
findstr "build" node-service\package.json

echo.
echo 4. Checking if main file exists...
if exist "node-service\dist\index.js" (
    echo ✓ dist/index.js exists
) else (
    echo ✗ dist/index.js missing
)

echo.
echo ========================================
echo DEPENDENCY CHECK COMPLETE
echo ========================================
pause 