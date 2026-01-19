import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Table,
  Users,
  Route,
  Timer,
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

type ExportFormat = 'csv' | 'xlsx'
type TemplateType = 'teams' | 'runners' | 'legs' | 'results'

interface ImportStats {
  teams: { created: number; updated: number }
  runners: { created: number; updated: number }
  legs: { created: number; updated: number }
  results: { created: number; updated: number }
  errors: string[]
}

export default function ImportExport() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx')
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    stats?: ImportStats
  } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importData(file),
    onSuccess: (response) => {
      queryClient.invalidateQueries()
      setImportResult({
        success: true,
        message: response.data?.data?.message || 'Data imported successfully!',
        stats: response.data?.data?.stats,
      })
      setImporting(false)
    },
    onError: (error: Error) => {
      setImportResult({
        success: false,
        message: error.message || 'Import failed',
      })
      setImporting(false)
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFile = (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls']
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

    if (!validExtensions.includes(ext)) {
      setImportResult({
        success: false,
        message: 'Invalid file type. Please upload a CSV or Excel file.',
      })
      return
    }

    setImporting(true)
    setImportResult(null)
    importMutation.mutate(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleExport = async () => {
    try {
      const response = await adminApi.exportData(exportFormat)
      // response.data is already a Blob when responseType: 'blob' is set
      const blob = response.data as Blob
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tir2026-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: Blob | { error?: string }, status?: number }, message?: string }
      let message = 'Export failed. Please try again.'

      if (axiosError.response?.status === 401) {
        message = 'Please log in as admin to export data'
      } else if (axiosError.response?.status === 403) {
        message = 'Admin access required to export data'
      } else if (axiosError.response?.data instanceof Blob) {
        // When responseType is blob, error responses also come as blobs
        try {
          const text = await axiosError.response.data.text()
          const json = JSON.parse(text)
          message = json.error || message
        } catch {
          // Couldn't parse blob as JSON, use default message
        }
      } else if (typeof axiosError.response?.data === 'object' && axiosError.response?.data?.error) {
        message = axiosError.response.data.error
      } else if (axiosError.message) {
        message = axiosError.message
      }

      setImportResult({
        success: false,
        message,
      })
    }
  }

  const handleDownloadTemplate = async (type: TemplateType) => {
    try {
      const response = await adminApi.downloadTemplate(type)
      // response.data is already a Blob when responseType: 'blob' is set
      const blob = response.data as Blob
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-template.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: Blob | { error?: string }, status?: number }, message?: string }
      let message = `Failed to download ${type} template`

      if (axiosError.response?.status === 401) {
        message = 'Please log in as admin to download templates'
      } else if (axiosError.response?.status === 403) {
        message = 'Admin access required to download templates'
      } else if (axiosError.response?.data instanceof Blob) {
        // When responseType is blob, error responses also come as blobs
        try {
          const text = await axiosError.response.data.text()
          const json = JSON.parse(text)
          message = json.error || message
        } catch {
          // Couldn't parse blob as JSON, use default message
        }
      } else if (typeof axiosError.response?.data === 'object' && axiosError.response?.data?.error) {
        message = axiosError.response.data.error
      } else if (axiosError.message) {
        message = axiosError.message
      }

      setImportResult({
        success: false,
        message,
      })
    }
  }

  const templates: { type: TemplateType; label: string; icon: typeof Users; description: string }[] = [
    { type: 'teams', label: 'Teams', icon: Users, description: 'Team names and cities' },
    { type: 'runners', label: 'Runners', icon: Users, description: 'Runner details by team' },
    { type: 'legs', label: 'Legs', icon: Route, description: 'Leg distances and info' },
    { type: 'results', label: 'Results', icon: Timer, description: 'Race time entries' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Import / Export Data</h2>
        <p className="text-muted-foreground">
          Import race data from CSV or Excel, or export current data for backup
        </p>
      </div>

      {/* Status message */}
      {importResult && (
        <Card className={importResult.success
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
          : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        }>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  importResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                )}>
                  {importResult.message}
                </p>

                {/* Show detailed stats */}
                {importResult.stats && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {importResult.stats.teams.created + importResult.stats.teams.updated > 0 && (
                      <Badge variant="secondary">
                        Teams: {importResult.stats.teams.created} new, {importResult.stats.teams.updated} updated
                      </Badge>
                    )}
                    {importResult.stats.runners.created + importResult.stats.runners.updated > 0 && (
                      <Badge variant="secondary">
                        Runners: {importResult.stats.runners.created} new, {importResult.stats.runners.updated} updated
                      </Badge>
                    )}
                    {importResult.stats.legs.created + importResult.stats.legs.updated > 0 && (
                      <Badge variant="secondary">
                        Legs: {importResult.stats.legs.created} new, {importResult.stats.legs.updated} updated
                      </Badge>
                    )}
                    {importResult.stats.results.created + importResult.stats.results.updated > 0 && (
                      <Badge variant="secondary">
                        Results: {importResult.stats.results.created} new, {importResult.stats.results.updated} updated
                      </Badge>
                    )}
                  </div>
                )}

                {/* Show errors */}
                {importResult.stats?.errors && importResult.stats.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {importResult.stats.errors.length} warning(s):
                    </p>
                    <ul className="mt-1 text-sm text-amber-600 dark:text-amber-400 space-y-1">
                      {importResult.stats.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {importResult.stats.errors.length > 5 && (
                        <li>• ...and {importResult.stats.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file to import teams, runners, legs, and race results.
            Existing records will be updated if they match.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <span className="text-primary font-medium">
                Click to upload or drag and drop
              </span>
              <span className="text-sm text-muted-foreground mt-1">
                CSV or Excel files (.csv, .xlsx, .xls)
              </span>
            </label>
          </div>

          {importing && (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span className="text-muted-foreground">Importing...</span>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Supported formats:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Excel files:</strong> Multiple sheets (Teams, Runners, Legs, Results)</li>
              <li>• <strong>CSV files:</strong> Single-type or sectioned with === TEAMS === headers</li>
              <li>• Column headers are flexible (e.g., "Team Name" or "name" both work)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Export section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download all race data including teams, runners, legs, and all submitted times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Format:</span>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                    exportFormat === 'xlsx'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <Table className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-l",
                    exportFormat === 'csv'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Download {exportFormat.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template section */}
      <Card>
        <CardHeader>
          <CardTitle>Excel Templates</CardTitle>
          <CardDescription>
            Download blank templates with sample data to help format your imports correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => handleDownloadTemplate(type)}
                className="flex flex-col items-center p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors text-center"
              >
                <Icon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground mt-1">{description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
