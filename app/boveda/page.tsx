'use client'
// app/boveda/page.tsx — Módulo Bóveda: gestor de documentos personales

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { VaultCategoryItem, VaultDocumentItem } from '@/types'

const PRESET_COLORS = [
  '#1D9E75',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Category Modal ─────────────────────────────────────────────────────────────

interface CategoryModalProps {
  editing: VaultCategoryItem | null
  onClose: () => void
  onSave: (cat: VaultCategoryItem) => void
}

function CategoryModal({ editing, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? '📁')
  const [color, setColor] = useState(editing?.color ?? PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/vault/categories/${editing.id}` : '/api/vault/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error'); return }
      onSave({
        id: editing?.id ?? json.data.id,
        name: name.trim(),
        icon,
        color,
        documentCount: editing?.documentCount ?? 0,
        createdAt: editing?.createdAt ?? new Date(),
      })
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {editing ? 'Editar categoría' : 'Nueva categoría'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ícono (emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-lg text-center focus:outline-none focus:border-emerald-500"
              maxLength={4}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Documentos laborales"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Upload Modal ───────────────────────────────────────────────────────────────

interface UploadModalProps {
  categories: VaultCategoryItem[]
  defaultCategoryId?: string | null
  onClose: () => void
  onSuccess: (doc: VaultDocumentItem) => void
}

function UploadModal({ categories, defaultCategoryId, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? categories[0]?.id ?? '')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = tagInput.trim().toLowerCase()
      if (t && !tags.includes(t)) setTags([...tags, t])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    if (!title.trim()) { setError('El título es requerido'); return }
    if (!categoryId) { setError('Selecciona una categoría'); return }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      if (description.trim()) fd.append('description', description.trim())
      fd.append('categoryId', categoryId)
      fd.append('tags', JSON.stringify(tags))

      const res = await fetch('/api/vault/documents', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al subir'); return }
      onSuccess(json.data)
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 my-4">
        <h2 className="text-lg font-semibold text-white mb-4">Subir documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 transition"
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-32 mx-auto rounded object-contain" />
            ) : file ? (
              <div className="text-4xl mb-2">📄</div>
            ) : (
              <div className="text-gray-400">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm">Toca para seleccionar imagen o PDF</p>
              </div>
            )}
            {file && (
              <p className="text-xs text-gray-400 mt-2">{file.name} ({formatSize(file.size)})</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <div>
            <label className="block text-sm text-gray-400 mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del documento"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Categoría *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (Enter para agregar)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Ej: contrato, 2024..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-200">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-gray-400 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition text-sm font-medium disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Preview Modal ──────────────────────────────────────────────────────────────

interface PreviewModalProps {
  doc: VaultDocumentItem
  onClose: () => void
  onDelete: (id: string) => void
}

function PreviewModal({ doc, onClose, onDelete }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareMsg, setShareMsg] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetch(`/api/vault/documents/${doc.id}/url`)
      .then((r) => r.json())
      .then((j) => { if (j.data?.url) setUrl(j.data.url) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [doc.id])

  async function handleDownload() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = doc.fileName
    a.target = '_blank'
    a.click()
  }

  async function handleShare() {
    try {
      const res = await fetch(`/api/vault/documents/${doc.id}/share`, { method: 'POST' })
      const json = await res.json()
      if (json.data?.url) {
        await navigator.clipboard.writeText(json.data.url)
        setShareMsg('¡Link copiado! Válido por 24h')
        setTimeout(() => setShareMsg(''), 4000)
      }
    } catch {
      setShareMsg('Error al generar link')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/vault/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete(doc.id)
        onClose()
      }
    } catch {
      console.error('Error eliminando')
    } finally {
      setDeleting(false)
    }
  }

  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{doc.title}</h3>
          <p className="text-xs text-gray-400">{doc.fileName} · {formatSize(doc.sizeBytes)}</p>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={!url}
            title="Descargar"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition disabled:opacity-40 text-lg"
          >
            ⬇
          </button>
          <button
            onClick={handleShare}
            title="Compartir (24h)"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-lg"
          >
            🔗
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Eliminar"
              className="p-2 rounded-lg bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-400 transition text-lg"
            >
              🗑
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm transition disabled:opacity-50"
            >
              {deleting ? '...' : '¿Confirmar?'}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-lg"
          >
            ✕
          </button>
        </div>
      </div>

      {shareMsg && (
        <div className="px-4 py-2 bg-emerald-900/50 border-b border-emerald-700 text-emerald-300 text-sm text-center">
          {shareMsg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {loading ? (
          <div className="text-gray-400 text-sm">Cargando...</div>
        ) : !url ? (
          <div className="text-red-400 text-sm">Error al cargar el archivo</div>
        ) : isImage ? (
          <img src={url} alt={doc.title} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : isPdf ? (
          <iframe src={url} className="w-full h-full rounded-lg" title={doc.title} />
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-300 text-sm">{doc.fileName}</p>
            <button onClick={handleDownload} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition">
              Descargar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Document Card ──────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: VaultDocumentItem
  onPreview: (doc: VaultDocumentItem) => void
  onDelete: (id: string) => void
}

function DocCard({ doc, onPreview, onDelete }: DocCardProps) {
  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')

  return (
    <div
      className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-gray-600 transition"
      onClick={() => onPreview(doc)}
    >
      {/* Thumbnail */}
      <div className="h-28 flex items-center justify-center bg-gray-800 text-4xl">
        {isPdf ? '📄' : isImage ? '🖼️' : '📎'}
      </div>

      {/* Actions overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(doc) }}
          className="p-2 rounded-full bg-gray-900/80 text-white hover:bg-gray-800 text-lg"
          title="Vista previa"
        >
          👁
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white text-sm font-medium truncate">{doc.title}</p>
        <div className="flex items-center gap-1 mt-1">
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: doc.category.color + '33', color: doc.category.color }}
          >
            {doc.category.icon} {doc.category.name}
          </span>
        </div>
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {doc.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded-full text-gray-300">{t}</span>
            ))}
            {doc.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{doc.tags.length - 3}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
          <span className="text-xs text-gray-500">{formatSize(doc.sizeBytes)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BovedaPage() {
  const [categories, setCategories] = useState<VaultCategoryItem[]>([])
  const [documents, setDocuments] = useState<VaultDocumentItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [previewDoc, setPreviewDoc] = useState<VaultDocumentItem | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VaultCategoryItem | null>(null)

  // Load data
  async function loadCategories() {
    const res = await fetch('/api/vault/categories')
    const json = await res.json()
    if (json.data) setCategories(json.data)
  }

  async function loadDocuments() {
    const params = new URLSearchParams()
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId)
    if (activeTags.length) params.set('tags', activeTags.join(','))
    const res = await fetch(`/api/vault/documents?${params}`)
    const json = await res.json()
    if (json.data) setDocuments(json.data)
  }

  useEffect(() => {
    Promise.all([loadCategories(), loadDocuments()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [selectedCategoryId, activeTags])

  // Filtered docs (client-side search)
  const filteredDocs = search.trim()
    ? documents.filter((d) => {
        const q = search.toLowerCase()
        return (
          d.title.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    : documents

  // All unique tags from current docs
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags))).sort()

  function toggleTag(tag: string) {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function handleDeleteCategory(cat: VaultCategoryItem) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}" y todos sus documentos?`)) return
    const res = await fetch(`/api/vault/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      if (selectedCategoryId === cat.id) setSelectedCategoryId(null)
      setDocuments((prev) => prev.filter((d) => d.categoryId !== cat.id))
    }
  }

  function handleCategorySaved(cat: VaultCategoryItem) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cat
        return next
      }
      return [...prev, cat]
    })
  }

  function handleDocUploaded(doc: VaultDocumentItem) {
    setDocuments((prev) => [doc, ...prev])
    setCategories((prev) =>
      prev.map((c) => c.id === doc.categoryId ? { ...c, documentCount: c.documentCount + 1 } : c)
    )
  }

  function handleDocDeleted(id: string) {
    const doc = documents.find((d) => d.id === id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    if (doc) {
      setCategories((prev) =>
        prev.map((c) => c.id === doc.categoryId ? { ...c, documentCount: Math.max(0, c.documentCount - 1) } : c)
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">← Dashboard</Link>
        <span className="text-gray-700">|</span>
        <h1 className="text-white font-semibold">🔒 Bóveda</h1>
        <div className="ml-auto">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={categories.length === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={categories.length === 0 ? 'Primero crea una categoría' : ''}
          >
            + Subir documento
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar — Categories */}
        <aside className="w-52 border-r border-gray-800 bg-gray-900 flex flex-col flex-shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-3 flex-1">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition mb-1 ${
                selectedCategoryId === null
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>📂</span>
              <span className="flex-1 text-left">Todas</span>
              <span className="text-xs text-gray-500">{documents.length}</span>
            </button>

            <div className="space-y-0.5">
              {categories.map((cat) => (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      selectedCategoryId === cat.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    style={selectedCategoryId === cat.id ? { borderLeft: `3px solid ${cat.color}` } : {}}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat.documentCount}</span>
                  </button>
                  {/* Edit/delete on hover */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5 bg-gray-900">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setShowCategoryModal(true) }}
                      className="p-1 rounded text-gray-400 hover:text-white text-xs"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat) }}
                      className="p-1 rounded text-gray-400 hover:text-red-400 text-xs"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-gray-800">
            <button
              onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <span>+</span>
              <span>Nueva categoría</span>
            </button>
          </div>
        </aside>

        {/* Mobile category bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800">
          <div className="flex gap-2 px-3 py-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                selectedCategoryId === null ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              📂 Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                  selectedCategoryId === cat.id ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={selectedCategoryId === cat.id ? { backgroundColor: cat.color + '55' } : {}}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
            <button
              onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}
              className="flex-shrink-0 px-2 py-1 rounded-full text-xs text-emerald-400 border border-emerald-700 hover:bg-emerald-900/30 transition"
            >
              + Cat.
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* Search + tags */}
          <div className="px-4 pt-4 pb-2 space-y-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descripción o tag..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
            />
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded-full text-xs transition ${
                      activeTags.includes(tag)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    #{tag}
                    {activeTags.includes(tag) && <span className="ml-1">×</span>}
                  </button>
                ))}
                {activeTags.length > 0 && (
                  <button
                    onClick={() => setActiveTags([])}
                    className="px-2 py-0.5 rounded-full text-xs text-gray-500 hover:text-white transition"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Document grid */}
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">Cargando...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-5xl mb-3">🔒</div>
              <p className="text-gray-400 text-sm">
                {documents.length === 0 && categories.length === 0
                  ? 'Crea una categoría y sube tu primer documento'
                  : documents.length === 0
                  ? 'No hay documentos en esta categoría'
                  : 'No hay resultados para esta búsqueda'}
              </p>
              {categories.length === 0 && (
                <button
                  onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition"
                >
                  + Nueva categoría
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 py-3">
              {filteredDocs.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onPreview={setPreviewDoc}
                  onDelete={handleDocDeleted}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          editing={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }}
          onSave={handleCategorySaved}
        />
      )}

      {showUploadModal && (
        <UploadModal
          categories={categories}
          defaultCategoryId={selectedCategoryId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleDocUploaded}
        />
      )}

      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDelete={handleDocDeleted}
        />
      )}
    </div>
  )
}
