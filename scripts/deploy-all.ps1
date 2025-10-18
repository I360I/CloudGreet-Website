# PowerShell Deployment Script
Write-Host "🚀 DEPLOYING ALL REGISTRATION FIXES..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

try {
    Write-Host "`n1️⃣ Building application..." -ForegroundColor Yellow
    npm run build
    
    Write-Host "`n2️⃣ Deploying to production..." -ForegroundColor Yellow
    vercel --prod
    
    Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
    
    Write-Host "`n🧪 Testing registration after deployment..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30  # Wait for deployment to propagate
    
    # Test registration
    $testData = @{
        business_name = "PowerShell Test Business " + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        business_type = "HVAC Services"
        owner_name = "Test Owner"
        email = "test$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
        password = "testpassword123"
        phone = "5551234567"
        address = "123 Test St"
        website = "https://test.com"
        services = @("HVAC Repair")
        service_areas = @("Test City")
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://cloudgreet.com/api/auth/register" -Method POST -Body $testData -ContentType "application/json"
    
    if ($response.error) {
        Write-Host "❌ Registration still failing: $($response.error.message)" -ForegroundColor Red
    } else {
        Write-Host "🎉 Registration working! User ID: $($response.data.user.id)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
