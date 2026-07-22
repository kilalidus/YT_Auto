'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  File as FileIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Download,
  Copy,
  Trash2,
  MoreVertical,
  Search,
  LayoutGrid,
  List as ListIcon,
  HardDrive,
  Loader2,
  FolderOpen,
  AlertCircle,
  CloudUpload,
  FileImage,
  FileVideo,
  FileAudio,
  FileText as FileDoc,
  Box,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { apiFetch, formatBytes, timeAgo } from '@/lib/api-client'

interface Project {
  id: string
  name: string
  color: string
}

interface FileAsset {
  id: string
  name: string
  type: string
  mimeType: string
  size: number
  url: string
  data: string | null
  createdAt: string
  projectId: string | null
  project: { id: string; name: string; color: string } | null
}

type TypeFilter =
  | 'all'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'thumbnail'
  | 'asset'

const MAX_SIZE = 3 * 1024 * 1024 // 3MB
const STORAGE_QUOTA = 2 * 1024 * 1024 * 1024 // 2GB fake quota

const TYPE_ICON: Record<
  string,
  { icon: typeof FileIcon; gradient: string; label: string }
> = {
  image: { icon: FileImage, gradient: 'from-fuchsia-500 to-pink-500', label: 'Image' },
  thumbnail: { icon: FileImage, gradient: 'from-rose-500 to-orange-500', label: 'Thumbnail' },
  video: { icon: FileVideo, gradient: 'from-sky-500 to-indigo-500', label: 'Video' },
  audio: { icon: FileAudio, gradient: 'from-emerald-500 to-teal-500', label: 'Audio' },
  document: { icon: FileDoc, gradient: 'from-violet-500 to-purple-500', label: 'Document' },
  asset: { icon: Box, gradient: 'from-amber-500 to-orange-500', label: 'Asset' },
}

function getTypeMeta(type: string) {
  return (
    TYPE_ICON[type] ?? {
      icon: FileIcon,
      gradient: 'from-slate-500 to-slate-600',
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }
  )
}

function getExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase().slice(0, 4) : 'FILE'
}

function FileThumbnail({
  file,
  className,
}: {
  file: FileAsset
  className?: string
}) {
  const meta = getTypeMeta(file.type)
  const Icon = meta.icon
  const isImage = file.type === 'image' || file.type === 'thumbnail'

  if (isImage && file.data && file.data.startsWith('data:')) {
    return (
       
      <img
        src={file.data}
        alt={file.name}
        className={className}
      />
    )
  }

  if (file.type === 'video') {
    return (
      <div
        className={`${className} relative flex items-center justify-center bg-gradient-to-br ${meta.gradient}`}
      >
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${className} relative flex items-center justify-center bg-gradient-to-br ${meta.gradient}`}
    >
      <div className="absolute inset-0 bg-dots opacity-20" />
      <Icon className="relative w-10 h-10 text-white/90" />
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileIcon
  label: string
  value: string
  color: string
}) {
  return (
    <div className="glass rounded-xl px-4 py-3 lift flex items-center gap-3 min-w-0">
      <div
        className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-lg font-bold leading-tight truncate">{value}</p>
      </div>
    </div>
  )
}

export function FilesView() {
  const [files, setFiles] = useState<FileAsset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [fRes, pRes] = await Promise.all([
        apiFetch<{ files: FileAsset[] }>('/api/files'),
        apiFetch<{ projects: Project[] }>('/api/projects'),
      ])
      setFiles(fRes.files)
      setProjects(pRes.projects)
    } catch {
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (typeFilter !== 'all' && f.type !== typeFilter) return false
      if (projectFilter === 'none' && f.projectId) return false
      if (
        projectFilter !== 'all' &&
        projectFilter !== 'none' &&
        f.projectId !== projectFilter
      )
        return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!f.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [files, typeFilter, projectFilter, search])

  const stats = useMemo(() => {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    const byType: Record<string, number> = {}
    for (const f of files) byType[f.type] = (byType[f.type] ?? 0) + 1
    return {
      total: files.length,
      totalSize,
      byType,
    }
  }, [files])

  const storagePct = Math.min(
    (stats.totalSize / STORAGE_QUOTA) * 100,
    100
  )

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const file = fileList[0]
      if (file.size > MAX_SIZE) {
        toast.error('File too large', {
          description: `Maximum size is 3MB. Your file is ${formatBytes(
            file.size
          )}.`,
        })
        return
      }

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (projectFilter !== 'all' && projectFilter !== 'none') {
          formData.append('projectId', projectFilter)
        }
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(
            (data && (data.error || data.message)) || 'Upload failed'
          )
        }
        toast.success('File uploaded', {
          description: file.name,
        })
        await load()
      } catch (err) {
        toast.error('Upload failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
        })
      } finally {
        setUploading(false)
      }
    },
    [projectFilter, load]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }

  const copyUrl = useCallback((f: FileAsset) => {
    const url = f.url || f.data || ''
    if (!url) {
      toast.error('No URL available for this file')
      return
    }
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('URL copied to clipboard'))
      .catch(() => toast.error('Failed to copy URL'))
  }, [])

  const download = useCallback((f: FileAsset) => {
    const src = f.url || f.data
    if (!src) {
      toast.error('No file data available')
      return
    }
    const a = document.createElement('a')
    a.href = src
    a.download = f.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    const prev = files
    setFiles((cur) => cur.filter((f) => f.id !== deleteId))
    setDeleteId(null)
    try {
      await apiFetch(`/api/files/${deleteId}`, { method: 'DELETE' })
      toast.success('File deleted')
    } catch {
      setFiles(prev)
      toast.error('Failed to delete file')
    }
  }, [deleteId, files])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-10 w-56 rounded-xl glass shimmer" />
        <div className="h-32 rounded-2xl glass shimmer" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl glass shimmer" />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl glass shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onInputChange}
        accept="image/*,video/*,audio/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Library
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            File <span className="text-gradient">Manager</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, organize, and manage your thumbnails, assets, and documents.
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="grad-primary text-white rounded-xl glow-primary font-semibold"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CloudUpload className="w-4 h-4 mr-2" />
          )}
          {uploading ? 'Uploading…' : 'Upload File'}
        </Button>
      </motion.div>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all overflow-hidden ${
          dragOver
            ? 'grad-primary border-transparent text-white glow-primary'
            : 'glass border-border hover:border-primary/50'
        }`}
      >
        <div
          className={`absolute inset-0 bg-dots opacity-30 pointer-events-none ${
            dragOver ? 'opacity-50' : ''
          }`}
        />
        <div className="relative flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              dragOver
                ? 'bg-white/20 backdrop-blur'
                : 'grad-primary glow-primary'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <CloudUpload className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <p className="font-semibold">
              {uploading
                ? 'Uploading your file…'
                : dragOver
                ? 'Drop to upload'
                : 'Drag & drop a file here, or click to browse'}
            </p>
            <p
              className={`text-xs mt-1 ${
                dragOver ? 'text-white/80' : 'text-muted-foreground'
              }`}
            >
              Images, video, audio, and documents · Max 3MB per file
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatChip
          icon={FileIcon}
          label="Total files"
          value={String(stats.total)}
          color="grad-primary"
        />
        <StatChip
          icon={HardDrive}
          label="Total size"
          value={formatBytes(stats.totalSize)}
          color="grad-cool"
        />
        <StatChip
          icon={ImageIcon}
          label="Images"
          value={String(
            (stats.byType.image ?? 0) + (stats.byType.thumbnail ?? 0)
          )}
          color="grad-warm"
        />
        <StatChip
          icon={VideoIcon}
          label="Videos"
          value={String(stats.byType.video ?? 0)}
          color="grad-success"
        />
      </motion.div>

      {/* Storage bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="glass rounded-2xl p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Storage</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatBytes(stats.totalSize)} of {formatBytes(STORAGE_QUOTA)} used
          </span>
        </div>
        <Progress
          value={storagePct}
          className="h-2.5"
        />
        <p className="text-[11px] text-muted-foreground mt-2">
          {storagePct.toFixed(2)}% of your 2GB storage quota used
        </p>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-3 flex flex-col lg:flex-row lg:items-center gap-3"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-background/40"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-[140px] rounded-xl bg-background/40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="thumbnail">Thumbnails</SelectItem>
              <SelectItem value="asset">Assets</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[160px] rounded-xl bg-background/40">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="glass rounded-xl p-0.5 flex items-center">
            <button
              onClick={() => setView('grid')}
              className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
                view === 'grid'
                  ? 'grad-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
                view === 'list'
                  ? 'grad-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Files */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-12 sm:p-16 text-center"
        >
          <div className="relative mx-auto w-28 h-28 mb-5">
            <div className="absolute inset-0 grad-primary rounded-full opacity-20 blur-2xl" />
            <div className="relative w-28 h-28 rounded-3xl glass-strong flex items-center justify-center float-slow">
              <FolderOpen className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {files.length === 0
              ? 'Upload your first file'
              : 'No files match your filters'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            {files.length === 0
              ? 'Drag a thumbnail, asset, or document into the upload zone to get started.'
              : 'Try adjusting your search or filters to find what you need.'}
          </p>
          {files.length === 0 && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="grad-primary text-white rounded-xl glow-primary"
            >
              <CloudUpload className="w-4 h-4 mr-2" />
              Choose a file
            </Button>
          )}
        </motion.div>
      ) : view === 'grid' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((f, i) => {
              const meta = getTypeMeta(f.type)
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="glass card-3d rounded-2xl overflow-hidden group"
                >
                  {/* Preview */}
                  <div className="relative aspect-video overflow-hidden">
                    <FileThumbnail
                      file={f}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/50 backdrop-blur text-white border-0 text-[10px] py-0.5 px-1.5"
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    {f.project && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2 py-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: f.project.color }}
                        />
                        <span className="text-[10px] text-white font-medium max-w-[80px] truncate">
                          {f.project.name}
                        </span>
                      </div>
                    )}
                    {/* Extension badge for non-image */}
                    {f.type !== 'image' && f.type !== 'thumbnail' && (
                      <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur rounded-md px-1.5 py-0.5">
                        <span className="text-[10px] font-mono font-bold text-white">
                          {getExtension(f.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm font-medium truncate flex-1"
                        title={f.name}
                      >
                        {f.name}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-lg hover:bg-primary/15 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => download(f)}>
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyUrl(f)}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(f.id)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatBytes(f.size)}</span>
                      <span>{timeAgo(f.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto scroll-styled">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[220px]">Name</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[90px]">Size</TableHead>
                  <TableHead className="w-[160px]">Project</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const meta = getTypeMeta(f.type)
                  const Icon = meta.icon
                  return (
                    <TableRow
                      key={f.id}
                      className="border-border/40 hover:bg-primary/5"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span
                            className="text-sm font-medium truncate"
                            title={f.name}
                          >
                            {f.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBytes(f.size)}
                      </TableCell>
                      <TableCell>
                        {f.project ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: f.project.color }}
                            />
                            <span className="text-xs truncate">
                              {f.project.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {timeAgo(f.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-7 h-7 rounded-lg hover:bg-primary/15 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ml-auto">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => download(f)}>
                              <Download className="w-3.5 h-3.5 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyUrl(f)}>
                              <Copy className="w-3.5 h-3.5 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(f.id)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete this file?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently removed
              from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
