"use client"

export default function TestStylingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white p-8">
      <h1 className="text-4xl font-bold text-white mb-4">CloudGreet Test Page</h1>
      <p className="text-xl text-gray-300 mb-6">Testing Tailwind CSS classes</p>
      
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-white mb-4">Glass Card</h2>
        <p className="text-gray-300">This should have a glass effect background.</p>
      </div>
      
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
        Test Button
      </button>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-500 text-white p-4 rounded">Red</div>
        <div className="bg-green-500 text-white p-4 rounded">Green</div>
        <div className="bg-blue-500 text-white p-4 rounded">Blue</div>
      </div>
    </div>
  )
}
