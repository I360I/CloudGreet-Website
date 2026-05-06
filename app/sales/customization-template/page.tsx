'use client'

import { FORM_SECTIONS } from '@/lib/customization/form-config'

/**
 * Print-friendly version of the customization form. The rep can save
 * this as PDF (Cmd-P → Save as PDF) and hand it to a client who'd
 * rather fill it out on paper, or use it as a reference during the
 * demo. No login required - it's just the questions.
 */

export default function CustomizationTemplatePage() {
  return (
    <main className="bg-white text-gray-900 min-h-screen print:bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-4">
        <header className="mb-8 pb-6 border-b border-gray-200">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            CloudGreet · Agent customization
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            Tell us how to build your agent.
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xl">
            This is a printable copy. The fastest way is the web form your rep emailed you - it autosaves, validates, and sends straight to our team.
          </p>
        </header>

        <div className="mb-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="space-y-8">
          {FORM_SECTIONS.map((section, sIdx) => (
            <section key={section.id} className="break-inside-avoid">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
                Section {sIdx + 1}
              </div>
              <h2 className="text-lg font-medium tracking-tight mb-1">{section.title}</h2>
              <p className="text-xs text-gray-500 italic mb-4">{section.blurb}</p>
              <div className="space-y-4">
                {section.fields.map((f) => (
                  <div key={f.id} className="break-inside-avoid">
                    <div className="text-sm font-medium">
                      {f.label}
                      {f.required && <span className="text-rose-500 ml-1">*</span>}
                    </div>
                    {f.hint && <div className="text-xs text-gray-500 italic mt-0.5">{f.hint}</div>}
                    <div className="mt-2 border-b border-dashed border-gray-300 h-6 print:h-8" />
                    {f.kind === 'longtext' && (
                      <>
                        <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
                        <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
                      </>
                    )}
                    {f.kind === 'list' && (
                      <>
                        <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
                        <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
                      </>
                    )}
                    {f.kind === 'kv-list' && (
                      <div className="mt-1 space-y-1">
                        {[1,2,3,4,5].map((i) => (
                          <div key={i} className="grid grid-cols-2 gap-2">
                            <div className="border-b border-dashed border-gray-300 h-6 print:h-7" />
                            <div className="border-b border-dashed border-gray-300 h-6 print:h-7" />
                          </div>
                        ))}
                      </div>
                    )}
                    {f.kind === 'time-grid' && (
                      <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-gray-500">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                          <div key={d} className="border border-gray-200 rounded p-1.5 h-12 flex flex-col items-center">
                            <div>{d}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {f.kind === 'select' && f.options && (
                      <div className="mt-1 text-xs text-gray-500">
                        Options: {f.options.join(' · ')}
                      </div>
                    )}
                    {f.kind === 'yesno' && (
                      <div className="mt-1 text-xs text-gray-500 flex gap-4">
                        <span>☐ Yes</span><span>☐ No</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-4 border-t border-gray-200 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-400">
          CloudGreet · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  )
}
