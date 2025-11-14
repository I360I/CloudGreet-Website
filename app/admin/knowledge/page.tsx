'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Edit3, Trash2, Search } from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type KnowledgeEntry = {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

type FormState = {
  title: string
  content: string
  tags: string
}

export default function KnowledgeBasePage() {
  const { showError, showSuccess } = useToast()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>({ title: '', content: '', tags: '' })
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ title: '', content: '', tags: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadEntries = async (query?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (query) {
        params.set('search', query)
      }
      const response = await fetch(`/api/admin/knowledge${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: {
        }
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to load knowledge entries (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to load knowledge entries')
      }
      setEntries(data.entries)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load knowledge entries'
      showError('Something went wrong', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      showError('Missing details', 'Please add a title and supporting content.')
      return
    }

    try {
      setCreating(true)
      const response = await fetchWithAuth('/api/admin/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          tags: form.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to create knowledge entry (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to create knowledge entry')
      }
      setEntries((prev) => [data.entry, ...prev])
      setForm({ title: '', content: '', tags: '' })
      showSuccess('Entry saved', 'We will feed this context into the agent prompt on the next refresh.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create knowledge entry'
      showError('Could not save knowledge', message)
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setEditForm({
      title: entry.title,
      content: entry.content,
      tags: entry.tags.join(', ')
    })
  }

  const handleUpdate = async () => {
    if (!editingEntry) return
    try {
      setSavingEdit(true)
      const response = await fetch(`/api/admin/knowledge/${editingEntry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
          tags: editForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to update knowledge entry (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to update knowledge entry')
      }

      setEntries((prev) => prev.map((entry) => (entry.id === data.entry.id ? data.entry : entry)))
      setEditingEntry(null)
      showSuccess('Entry updated', 'Prompt context refreshed.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update entry'
      showError('Could not update knowledge', message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      setDeletingId(entryId)
      const response = await fetch(`/api/admin/knowledge/${entryId}`, {
        method: 'DELETE',
        headers: {
        }
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to delete entry')
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      showSuccess('Deleted', 'Removed from the agent knowledge base.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete entry'
      showError('Could not delete entry', message)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    return entries.filter((entry) => {
      const query = search.toLowerCase()
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    })
  }, [entries, search])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-8">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            AI knowledge base
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Arm the agent with real knowledge</h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Feed policies, FAQs, offer details, and nuanced process steps. Every entry is versioned per tenant and
              synced into the Retell agent prompt so our receptionist sounds like a veteran teammate.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="After-hours emergency workflow"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Tags</span>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="after-hours, emergency, hvac"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Content</span>
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                rows={6}
                placeholder="When an after-hours HVAC emergency comes in, greet empathetically, explain there is an emergency diagnostics fee ($189), and schedule the on-call tech in the next available slot..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add knowledge entry
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">Knowledge library</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => {
                  const value = event.target.value
                  setSearch(value)
                  loadEntries(value)
                }}
                placeholder="Search titles, content, or tags"
                className="w-full rounded-full border border-white/10 bg-slate-900/70 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-12 text-center text-slate-400">
              No knowledge entries yet. Capture FAQs, policies, pricing notes, and anything the agent should know.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-6 transition hover:border-blue-400/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">{entry.title}</h3>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(entry)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Updated {new Date(entry.updated_at).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={Boolean(editingEntry)} onClose={() => setEditingEntry(null)} title="Edit knowledge entry">
        <div className="space-y-4">
          <label className="space-y-1 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Title</span>
            <input
              value={editForm.title}
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Tags</span>
            <input
              value={editForm.tags}
              onChange={(event) => setEditForm((prev) => ({ ...prev, tags: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Content</span>
            <textarea
              value={editForm.content}
              onChange={(event) => setEditForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={savingEdit}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

