// Check connection status
function updateConnectionStatus() {
    if (navigator.onLine) {
        window.location.href = '/';
    }
}

// Listen for online event
window.addEventListener('online', updateConnectionStatus);

// Check connection periodically
setInterval(updateConnectionStatus, 5000);

// Add some interactivity
document.addEventListener('DOMContentLoaded', function() {
    const retryButton = document.querySelector('.retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            this.textContent = 'Checking...';
            this.disabled = true;
            
            setTimeout(() => {
                this.textContent = 'Try Again';
                this.disabled = false;
            }, 2000);
        });
    }
});
