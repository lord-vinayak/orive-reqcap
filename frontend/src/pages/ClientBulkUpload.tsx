import { useId, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { clientService } from '@/services'
import type { BulkUploadResult } from '@/services'

export default function ClientBulkUpload() {
  const fileInputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const [error, setError] = useState('')
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    setError('')
    try {
      const res = await clientService.bulkUpload(file)
      setResult(res)
      // Reset file input so same file can be re-uploaded after edits
      if (inputRef.current) inputRef.current.value = ''
      setFile(null)
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      await clientService.downloadTemplate()
    } catch {
      setError('Could not download template.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  return (
    <Layout title="Import Clients">
      <div className="max-w-2xl space-y-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Import Clients from Excel</h1>
          <p className="text-sm text-black/60 dark:text-slate-400 mt-1">
            Upload a <code className="bg-black/5 dark:bg-white/10 px-1 rounded">.xlsx</code> file to bulk-create clients.
            The logged-in user is automatically set as the POC for all imported clients.
          </p>
        </div>

        {/* ── Column reference ── */}
        <section aria-labelledby="columns-heading" className="bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-lg p-4 text-sm space-y-2">
          <h2 id="columns-heading" className="font-semibold text-black dark:text-white">Expected columns</h2>
          <table className="w-full text-xs" aria-label="Required and optional column names">
            <thead>
              <tr className="text-left text-black/50 dark:text-slate-500 border-b border-black/10 dark:border-white/10">
                <th className="pb-1 pr-4 font-semibold">Column name (header row)</th>
                <th className="pb-1 pr-4 font-semibold">Required?</th>
                <th className="pb-1 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {[
                ['full_name',    'Required', 'Client\'s full name'],
                ['phone_number', 'Required', 'Any format containing 10 digits, e.g. p:+919876543210'],
                ['email',        'Optional', 'Stored as-is; invalid emails are flagged with a warning'],
                ['company_name', 'Optional', ''],
                ['city',         'Optional', ''],
                ['status',       'Optional', 'Call Back · Catalogue Shared · Costing Shared · Interested · Language Barrier · Not Interested · Not Responding after Multiple Attempts · Unanswered  (defaults to Unanswered)'],
              ].map(([col, req, note]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-black dark:text-white">{col}</td>
                  <td className={`py-1.5 pr-4 font-medium ${req === 'Required' ? 'text-red-600 dark:text-red-400' : 'text-black/50 dark:text-slate-500'}`}>{req}</td>
                  <td className="py-1.5 text-black/60 dark:text-slate-400">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-black/50 dark:text-slate-500 pt-1">
            Rows with an existing phone number, missing name, or unreadable phone are skipped and shown in the Skipped section below.
          </p>
        </section>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-end gap-4">
          {/* File picker */}
          <div className="flex-1 min-w-[240px]">
            <label
              htmlFor={fileInputId}
              className="block text-sm font-medium text-black dark:text-white mb-1"
            >
              Select Excel file
            </label>
            <input
              id={fileInputId}
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-black dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-mustard file:text-black hover:file:bg-mustard/80 cursor-pointer"
              aria-label="Select an Excel file to upload"
            />
            {file && (
              <p className="text-xs text-black/50 dark:text-slate-500 mt-1" aria-live="polite">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary"
            aria-busy={uploading}
          >
            {uploading ? 'Importing…' : 'Import Clients'}
          </button>

          {/* Template download */}
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="btn-secondary text-sm"
            aria-label="Download blank Excel template"
          >
            {downloadingTemplate ? 'Downloading…' : '↓ Download Template'}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-6" aria-live="polite" aria-label="Import results">

            {/* Summary banner */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[140px] p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">{result.created.length}</div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-0.5">Clients created</div>
              </div>
              <div className="flex-1 min-w-[140px] p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{result.skipped.length}</div>
                <div className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">Rows skipped</div>
              </div>
            </div>

            {/* Created list */}
            {result.created.length > 0 && (
              <section aria-labelledby="created-heading">
                <h2 id="created-heading" className="text-base font-semibold text-black dark:text-white mb-2">
                  ✓ Created ({result.created.length})
                </h2>
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm" aria-label="Successfully created clients">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 text-left">
                        <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-400">Row</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-400">Name</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-400">Phone</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-400">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {result.created.map((r) => (
                        <tr key={r.row}>
                          <td className="px-3 py-2 text-black/50 dark:text-slate-500 tabular-nums">{r.row}</td>
                          <td className="px-3 py-2 text-black dark:text-white font-medium">{r.name}</td>
                          <td className="px-3 py-2 text-black/70 dark:text-slate-300 font-mono">{r.phone}</td>
                          <td className="px-3 py-2 text-amber-600 dark:text-amber-400 text-xs">{r.warning ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Skipped list */}
            {result.skipped.length > 0 && (
              <section aria-labelledby="skipped-heading">
                <h2 id="skipped-heading" className="text-base font-semibold text-black dark:text-white mb-2">
                  ⚠ Skipped ({result.skipped.length})
                </h2>
                <div className="overflow-x-auto rounded border border-amber-200 dark:border-amber-800">
                  <table className="w-full text-sm" aria-label="Skipped rows with reasons">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-amber-900/20 text-left">
                        <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Row</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Name</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Phone</th>
                        <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Reason skipped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                      {result.skipped.map((r) => (
                        <tr key={r.row}>
                          <td className="px-3 py-2 text-black/50 dark:text-slate-500 tabular-nums">{r.row}</td>
                          <td className="px-3 py-2 text-black dark:text-white">{r.name}</td>
                          <td className="px-3 py-2 text-black/70 dark:text-slate-300 font-mono">{r.phone}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {result.created.length > 0 && result.skipped.length === 0 && (
              <p className="text-sm text-green-700 dark:text-green-400 font-medium" role="status">
                All rows imported successfully — no errors.
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
