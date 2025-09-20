@echo off
echo Building...
npm run build
echo Committing...
git add .
git commit -m "feat: Add blue waves with purple fade and smooth animation at button height"
echo Pushing...
git push origin main
echo Done!
pause
