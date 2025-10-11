Write-Host "🚀 Final Deploy - Blue Waves with Animation" -ForegroundColor Green
Write-Host "Building project..." -ForegroundColor Yellow
npm run build

Write-Host "Adding changes to git..." -ForegroundColor Yellow
git add .

Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "feat: Blue waves with purple fade and smooth animation at button height"

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ DEPLOYED! Check your landing page for beautiful animated waves!" -ForegroundColor Green
