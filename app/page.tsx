export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CG</span>
            </div>
            <span className="text-xl font-bold text-gray-900">CloudGreet</span>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#pricing" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Pricing</a>
            <a href="#demo" className="text-sm font-semibold text-gray-900 hover:text-blue-500">Demo</a>
            <a href="#faq" className="text-sm font-semibold text-gray-900 hover:text-blue-500">FAQ</a>
          </div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600">
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Never miss a job again.
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            CloudGreet answers every call and books estimates straight into your Google Calendar. Setup in 24 hours.
          </p>
          
          <div className="flex items-center justify-center gap-6 mb-8">
            <button className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600">
              Get Started
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50">
              ▶ Watch 60-sec Demo
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <span className="bg-gray-100 px-3 py-1 rounded-full">$200/mo + $50 per booking</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Setup in 24h</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">No contracts</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-blue-500 font-semibold mb-2">How It Works</h2>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Three simple steps to never miss a job
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-2xl">📞</span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-500 mr-2">01</span>
                <h4 className="text-lg font-semibold text-gray-900 inline">We answer calls</h4>
              </div>
              <p className="text-gray-600">AI receptionist handles every call professionally, qualifying leads and gathering details.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-2xl">📅</span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-500 mr-2">02</span>
                <h4 className="text-lg font-semibold text-gray-900 inline">We book estimates on your calendar</h4>
              </div>
              <p className="text-gray-600">Qualified leads get scheduled directly into your Google Calendar with all the details.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-6 flex items-center justify-center">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-500 mr-2">03</span>
                <h4 className="text-lg font-semibold text-gray-900 inline">You get daily summary + ROI</h4>
              </div>
              <p className="text-gray-600">Daily text/email summaries show calls handled, bookings made, and revenue generated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why service businesses choose CloudGreet
            </h3>
            <p className="text-lg text-gray-600">
              Built specifically for painters, HVAC, plumbers, and roofers who can't afford to miss calls.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">📵</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Stop losing leads to voicemail</h4>
              <p className="text-gray-600">Every missed call is money lost. We answer 24/7 so you never miss an opportunity.</p>
            </div>
            
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">📅</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Booked directly into Google Calendar</h4>
              <p className="text-gray-600">Qualified estimates appear in your calendar automatically with customer details and job info.</p>
            </div>
            
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">📧</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Daily text/email summaries</h4>
              <p className="text-gray-600">Get a daily digest of calls handled, bookings made, and revenue generated.</p>
            </div>
            
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Spam/duplicate filtering</h4>
              <p className="text-gray-600">We filter out spam calls and duplicate inquiries so you only get real opportunities.</p>
            </div>
            
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🎨</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Brand-matched tone</h4>
              <p className="text-gray-600">We learn your business style and represent your brand professionally on every call.</p>
            </div>
            
            <div className="border rounded-lg p-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">👥</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Booking caps so you're not overloaded</h4>
              <p className="text-gray-600">Set daily/weekly booking limits to maintain quality and avoid being overwhelmed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section id="calculator" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Calculate your ROI
            </h3>
            <p className="text-lg text-gray-600">
              See how much revenue CloudGreet could generate for your business.
            </p>
          </div>
          
          <div className="bg-white rounded-lg border p-8">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🧮</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900">ROI Calculator</h4>
              <p className="text-gray-600">Adjust the values below to see your potential return</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Average Job Value ($)</label>
                <input type="number" defaultValue="2500" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Close Rate (%)</label>
                <input type="number" defaultValue="30" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Bookings/Month</label>
                <input type="number" defaultValue="10" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Est. monthly revenue from CloudGreet bookings:</p>
                  <p className="text-2xl font-bold text-green-600">$7,500</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your CloudGreet fee:</p>
                  <p className="text-2xl font-bold text-gray-900">$700</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">Net profit:</p>
                <p className="text-3xl font-bold text-green-600">$6,800</p>
                <p className="text-sm text-gray-500 mt-1">ROI: 971%</p>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <button className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600">
                Start in 2 minutes
              </button>
              <p className="mt-2 text-sm text-gray-500">Start in 2 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Tiles */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Built for your industry
            </h3>
            <p className="text-lg text-gray-600">
              CloudGreet understands the unique needs of service businesses.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border rounded-lg p-8">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🎨</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Painters</h4>
              <p className="text-lg font-medium text-blue-500 mb-2">We fill your calendar with estimates.</p>
              <p className="text-gray-600">Interior, exterior, commercial painting jobs booked automatically.</p>
            </div>
            
            <div className="border rounded-lg p-8">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🔧</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">HVAC</h4>
              <p className="text-lg font-medium text-blue-500 mb-2">Peak season overflow? We've got it.</p>
              <p className="text-gray-600">Emergency repairs, maintenance, and installation appointments.</p>
            </div>
            
            <div className="border rounded-lg p-8">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">💧</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Plumbers</h4>
              <p className="text-lg font-medium text-blue-500 mb-2">Never miss same-day jobs.</p>
              <p className="text-gray-600">Emergency calls, repairs, and scheduled maintenance bookings.</p>
            </div>
            
            <div className="border rounded-lg p-8">
              <div className="h-12 w-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">🏠</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Roofers</h4>
              <p className="text-lg font-medium text-blue-500 mb-2">Every estimate is money on the table.</p>
              <p className="text-gray-600">Storm damage, repairs, and full roof replacement estimates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-blue-500">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Live by tomorrow. No Zoom calls.
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Setup takes 24 hours. Start capturing every lead and booking more jobs immediately.
          </p>
          <button className="bg-white text-blue-500 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100">
            Get Started
          </button>
          <p className="mt-4 text-sm text-blue-100">
            $200/mo + $50 per booking • No contracts • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CloudGreet</span>
            </div>
          </div>
          <div className="flex justify-center space-x-8 mb-8">
            <a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Demo</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">FAQ</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Privacy</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Terms</a>
          </div>
          <p className="text-center text-gray-500 text-sm">
            © 2024 CloudGreet. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  )
}

