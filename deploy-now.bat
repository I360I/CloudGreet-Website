@echo off
echo === CloudGreet Production Deployment ===
echo.
git add -A
git commit -m "deploy: Production ready - all features complete"
git push origin main
echo.
echo === Deployment triggered! Check Vercel dashboard ===
pause
