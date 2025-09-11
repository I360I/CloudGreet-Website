# CloudGreet Production Deployment Script for Windows
param(
    [switch]$SkipBackup,
    [switch]$Force
)

# Configuration
$AppName = "cloudgreet"
$DockerComposeFile = "docker-compose.production.yml"
$BackupDir = "C:\backups\cloudgreet"
$LogFile = "C:\logs\cloudgreet-deploy.log"

# Create directories if they don't exist
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force
}

if (!(Test-Path (Split-Path $LogFile))) {
    New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log $Message "ERROR"
    exit 1
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log $Message "WARNING"
}

# Check if Docker is installed and running
try {
    docker --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Docker is not installed or not in PATH"
    }
} catch {
    Write-Error-Log "Docker is not installed"
}

try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Docker is not running"
    }
} catch {
    Write-Error-Log "Docker is not running"
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Docker Compose is not installed"
    }
} catch {
    Write-Error-Log "Docker Compose is not installed"
}

# Check required environment variables
$RequiredVars = @(
    "DB_HOST",
    "DB_PASSWORD", 
    "AZURE_COMMUNICATION_CONNECTION_STRING",
    "STRIPE_SECRET_KEY",
    "RETELL_API_KEY",
    "NEXTAUTH_SECRET"
)

foreach ($Var in $RequiredVars) {
    if (-not (Get-Item "env:$Var" -ErrorAction SilentlyContinue)) {
        Write-Error-Log "Required environment variable $Var is not set"
    }
}

Write-Log "Starting CloudGreet deployment..."

# Create database backup
if (-not $SkipBackup) {
    Write-Log "Creating database backup..."
    try {
        $BackupFile = "$BackupDir\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
        docker-compose -f $DockerComposeFile exec -T postgres pg_dump -U $env:DB_USER $env:DB_NAME > $BackupFile
        Write-Log "Database backup created: $BackupFile"
    } catch {
        Write-Warning-Log "Failed to create database backup: $_"
    }
}

# Pull latest images
Write-Log "Pulling latest Docker images..."
try {
    docker-compose -f $DockerComposeFile pull
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Failed to pull Docker images"
    }
} catch {
    Write-Error-Log "Failed to pull Docker images: $_"
}

# Stop current services
Write-Log "Stopping current services..."
try {
    docker-compose -f $DockerComposeFile down
} catch {
    Write-Warning-Log "Failed to stop services: $_"
}

# Start services
Write-Log "Starting services..."
try {
    docker-compose -f $DockerComposeFile up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Failed to start services"
    }
} catch {
    Write-Error-Log "Failed to start services: $_"
}

# Wait for services to be healthy
Write-Log "Waiting for services to be healthy..."
Start-Sleep -Seconds 30

# Check if application is responding
Write-Log "Checking application health..."
$MaxRetries = 30
$RetryCount = 0

do {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
        if ($Response.StatusCode -eq 200) {
            Write-Log "Application is healthy"
            break
        }
    } catch {
        # Continue to retry
    }
    
    $RetryCount++
    if ($RetryCount -eq $MaxRetries) {
        Write-Error-Log "Application failed to start after 5 minutes"
    }
    
    Write-Log "Waiting for application to start... ($RetryCount/$MaxRetries)"
    Start-Sleep -Seconds 10
} while ($RetryCount -lt $MaxRetries)

# Run database migrations
Write-Log "Running database migrations..."
try {
    docker-compose -f $DockerComposeFile exec app npm run migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Warning-Log "Database migrations may have failed"
    }
} catch {
    Write-Warning-Log "Failed to run database migrations: $_"
}

# Check if all services are running
Write-Log "Checking service status..."
$Services = @("app", "postgres", "redis", "nginx")
foreach ($Service in $Services) {
    try {
        $Status = docker-compose -f $DockerComposeFile ps $Service
        if ($Status -match "Up") {
            Write-Log "$Service is running"
        } else {
            Write-Error-Log "$Service is not running"
        }
    } catch {
        Write-Error-Log "Failed to check status of $Service"
    }
}

# Run final health check
Write-Log "Running final health check..."
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
    $HealthData = $Response.Content | ConvertFrom-Json
    if ($HealthData.status -eq "healthy") {
        Write-Log "Deployment successful!"
        Write-Log "Application is available at: http://localhost:3000"
    } else {
        Write-Error-Log "Health check failed: $($Response.Content)"
    }
} catch {
    Write-Error-Log "Final health check failed: $_"
}

# Clean up old Docker images
Write-Log "Cleaning up old Docker images..."
try {
    docker image prune -f
} catch {
    Write-Warning-Log "Failed to clean up Docker images: $_"
}

# Clean up old backups (keep last 7 days)
Write-Log "Cleaning up old backups..."
try {
    $OldBackups = Get-ChildItem -Path $BackupDir -Name "backup-*.sql" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) }
    foreach ($Backup in $OldBackups) {
        Remove-Item -Path "$BackupDir\$Backup" -Force
        Write-Log "Removed old backup: $Backup"
    }
} catch {
    Write-Warning-Log "Failed to clean up old backups: $_"
}

Write-Log "Deployment completed successfully!"

# Send notification (if webhook URL is provided)
if ($env:SLACK_WEBHOOK_URL) {
    try {
        $Body = @{
            text = "✅ CloudGreet deployment completed successfully!"
        } | ConvertTo-Json
    
        Invoke-WebRequest -Uri $env:SLACK_WEBHOOK_URL -Method POST -Body $Body -ContentType "application/json"
    } catch {
        Write-Warning-Log "Failed to send Slack notification: $_"
    }
}
