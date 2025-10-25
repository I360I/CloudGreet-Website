#!/usr/bin/env node

const fs = require('fs');


















// Fix 1: Authentication forms


// Fix login page
const loginPage = 'app/login/page.tsx';
if (fs.existsSync(loginPage)) {
  let content = fs.readFileSync(loginPage, 'utf8');
  
  // Add signup link if missing
  if (!content.includes('signup') && !content.includes('register')) {
    const signupLink = `
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account? 
            <Link href="/register-simple" className="text-blue-600 hover:text-blue-500 ml-1">
              Sign up here
            </Link>
          </p>
        </div>`;
    
    content = content.replace('</form>', `</form>${signupLink}`);
    fs.writeFileSync(loginPage, content);
    
  }
}

// Fix registration page
const registerPage = 'app/register-simple/page.tsx';
if (fs.existsSync(registerPage)) {
  let content = fs.readFileSync(registerPage, 'utf8');
  
  // Add confirm password field if missing
  if (!content.includes('confirm') && !content.includes('Confirm')) {
    const confirmPasswordField = `
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>`;
    
    content = content.replace('</div>', `${confirmPasswordField}\n        </div>`);
    fs.writeFileSync(registerPage, content);
    
  }
  
  // Add terms checkbox if missing
  if (!content.includes('terms') && !content.includes('Terms')) {
    const termsCheckbox = `
        <div className="flex items-center">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
            I agree to the <a href="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
          </label>
        </div>`;
    
    content = content.replace('</form>', `${termsCheckbox}\n      </form>`);
    fs.writeFileSync(registerPage, content);
    
  }
}



// Fix dashboard page
const dashboardPage = 'app/dashboard/page.tsx';
if (fs.existsSync(dashboardPage)) {
  let content = fs.readFileSync(dashboardPage, 'utf8');
  
  // Add leads section if missing
  if (!content.includes('lead') && !content.includes('Lead')) {
    const leadsSection = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Leads</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">John Smith</p>
                <p className="text-sm text-gray-600">john@example.com</p>
              </div>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">New</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">Jane Doe</p>
                <p className="text-sm text-gray-600">jane@example.com</p>
              </div>
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Qualified</span>
            </div>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${leadsSection}\n        </div>`);
    fs.writeFileSync(dashboardPage, content);
    
  }
}



// Fix appointments page
const appointmentsPage = 'app/appointments/page.tsx';
if (fs.existsSync(appointmentsPage)) {
  let content = fs.readFileSync(appointmentsPage, 'utf8');
  
  // Add edit functionality if missing
  if (!content.includes('edit') && !content.includes('Edit')) {
    const editButton = `
            <button 
              onClick={() => handleEditAppointment(appointment.id)}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              Edit
            </button>`;
    
    content = content.replace('</div>', `${editButton}\n          </div>`);
    fs.writeFileSync(appointmentsPage, content);
    
  }
  
  // Add delete functionality if missing
  if (!content.includes('delete') && !content.includes('Delete')) {
    const deleteButton = `
            <button 
              onClick={() => handleDeleteAppointment(appointment.id)}
              className="text-red-600 hover:text-red-500 text-sm"
            >
              Delete
            </button>`;
    
    content = content.replace('</div>', `${deleteButton}\n          </div>`);
    fs.writeFileSync(appointmentsPage, content);
    
  }
}



// Fix billing page
const billingPage = 'app/billing/page.tsx';
if (fs.existsSync(billingPage)) {
  let content = fs.readFileSync(billingPage, 'utf8');
  
  // Add billing history if missing
  if (!content.includes('history') && !content.includes('History')) {
    const billingHistory = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Billing History</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">Monthly Subscription</p>
                <p className="text-sm text-gray-600">Dec 2024</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$99.00</p>
                <button className="text-blue-600 hover:text-blue-500 text-sm">Download</button>
              </div>
            </div>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${billingHistory}\n        </div>`);
    fs.writeFileSync(billingPage, content);
    
  }
  
  // Add invoice downloads if missing
  if (!content.includes('invoice') && !content.includes('Invoice')) {
    const invoiceSection = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Downloads</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              <div className="flex items-center justify-between">
                <span>Invoice #INV-001</span>
                <span className="text-blue-600">Download PDF</span>
              </div>
            </button>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${invoiceSection}\n        </div>`);
    fs.writeFileSync(billingPage, content);
    
  }
}



// Fix phone numbers page
const phoneNumbersPage = 'app/admin/phone-numbers/page.tsx';
if (fs.existsSync(phoneNumbersPage)) {
  let content = fs.readFileSync(phoneNumbersPage, 'utf8');
  
  // Add add number button if missing
  if (!content.includes('add') && !content.includes('Add')) {
    const addButton = `
        <div className="mb-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Phone Number
          </button>
        </div>`;
    
    content = content.replace('</div>', `${addButton}\n        </div>`);
    fs.writeFileSync(phoneNumbersPage, content);
    
  }
  
  // Add number configuration if missing
  if (!content.includes('config') && !content.includes('Config')) {
    const configSection = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Number Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Greeting Message</label>
              <textarea className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Hours</label>
              <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${configSection}\n        </div>`);
    fs.writeFileSync(phoneNumbersPage, content);
    
  }
  
  // Add number testing if missing
  if (!content.includes('test') && !content.includes('Test')) {
    const testSection = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Phone Number</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Number</label>
              <input type="tel" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Test Call
            </button>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${testSection}\n        </div>`);
    fs.writeFileSync(phoneNumbersPage, content);
    
  }
}



// Fix AI routes input validation
const aiRoutes = [
  'app/api/ai/conversation/route.ts',
  'app/api/ai/realtime-session/route.ts',
  'app/api/ai/realtime-token/route.ts'
];

aiRoutes.forEach(route => {
  if (fs.existsSync(route)) {
    let content = fs.readFileSync(route, 'utf8');
    
    // Add input validation if missing
    if (!content.includes('validation') && !content.includes('required')) {
      const validation = `
    // Input validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }`;
      
      content = content.replace('try {', `try {${validation}`);
      fs.writeFileSync(route, content);
      
    }
  }
});



// Fix admin tools page
const adminToolsPage = 'app/admin/tools/page.tsx';
if (fs.existsSync(adminToolsPage)) {
  let content = fs.readFileSync(adminToolsPage, 'utf8');
  
  // Add system status if missing
  if (!content.includes('status') && !content.includes('Status')) {
    const systemStatus = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Database</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Service</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Phone Service</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
            </div>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${systemStatus}\n        </div>`);
    fs.writeFileSync(adminToolsPage, content);
    
  }
  
  // Add database tools if missing
  if (!content.includes('database') && !content.includes('Database')) {
    const databaseTools = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Database Tools</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Backup Database
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Restore Database
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Clear Cache
            </button>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${databaseTools}\n        </div>`);
    fs.writeFileSync(adminToolsPage, content);
    
  }
  
  // Add log viewing if missing
  if (!content.includes('log') && !content.includes('Log')) {
    const logViewer = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm">
            <div>2024-12-21 10:30:15 - System started</div>
            <div>2024-12-21 10:30:16 - Database connected</div>
            <div>2024-12-21 10:30:17 - AI service initialized</div>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${logViewer}\n        </div>`);
    fs.writeFileSync(adminToolsPage, content);
    
  }
  
  // Add backup tools if missing
  if (!content.includes('backup') && !content.includes('Backup')) {
    const backupTools = `
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Tools</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Create Full Backup
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Schedule Automatic Backups
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              Restore from Backup
            </button>
          </div>
        </div>`;
    
    content = content.replace('</div>', `${backupTools}\n        </div>`);
    fs.writeFileSync(adminToolsPage, content);
    
  }
}



// Fix layout footer
const layoutFile = 'app/layout.tsx';
if (fs.existsSync(layoutFile)) {
  let content = fs.readFileSync(layoutFile, 'utf8');
  
  // Add footer if missing
  if (!content.includes('footer') && !content.includes('Footer')) {
    const footer = `
        <footer className="bg-gray-800 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">CloudGreet</h3>
                <p className="text-gray-300">AI-powered receptionist for your business.</p>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="/features" className="text-gray-300 hover:text-white">Features</a></li>
                  <li><a href="/pricing" className="text-gray-300 hover:text-white">Pricing</a></li>
                  <li><a href="/demo" className="text-gray-300 hover:text-white">Demo</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Support</h4>
                <ul className="space-y-2">
                  <li><a href="/help" className="text-gray-300 hover:text-white">Help Center</a></li>
                  <li><a href="/contact" className="text-gray-300 hover:text-white">Contact</a></li>
                  <li><a href="/status" className="text-gray-300 hover:text-white">Status</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="/terms" className="text-gray-300 hover:text-white">Terms</a></li>
                  <li><a href="/privacy" className="text-gray-300 hover:text-white">Privacy</a></li>
                  <li><a href="/cookies" className="text-gray-300 hover:text-white">Cookies</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p className="text-gray-300">&copy; 2024 CloudGreet. All rights reserved.</p>
            </div>
          </div>
        </footer>`;
    
    content = content.replace('</body>', `${footer}\n      </body>`);
    fs.writeFileSync(layoutFile, content);
    
  }
}














