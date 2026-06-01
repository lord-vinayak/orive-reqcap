import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import {
  requirementService, notesService, fileService, proposalService,
} from '@/services'
import type { FileRecord, Note, Proposal, Requirement } from '@/types'

// ── Helpers ─────────────────────────────────────────────────────────────────

import { CLIENT_STATUS_LABEL, CLIENT_STATUS_COLOR } from '@/constants/clientStatus'
import { PRODUCT_COUNT_LABEL } from '@/utils/dropdownOptions'

const REQ_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-black/5 text-black/60 border-black/10',
  saved: 'bg-mustard-50 text-mustard-700 border-mustard-200',
  proposal_ready: 'bg-green-50 text-green-700 border-green-200',
}

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {text}
    </span>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RequirementView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Track which proposal panels are expanded
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set())

  // Creating a new proposal
  const [creatingProposal, setCreatingProposal] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      requirementService.get(id),
      notesService.list(id),
      fileService.list(id),
      proposalService.listForRequirement(id),
    ])
      .then(([req, n, f, p]) => {
        setRequirement(req)
        setNotes(n)
        setFiles(f)
        setProposals(p)
      })
      .catch(() => setError('Failed to load requirement. Please try again.'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleProposal = (proposalId: string) => {
    setExpandedProposals((prev) => {
      const next = new Set(prev)
      if (next.has(proposalId)) next.delete(proposalId)
      else next.add(proposalId)
      return next
    })
  }

  const handleCreateNewProposal = async () => {
    if (!id) return
    setCreatingProposal(true)
    try {
      await proposalService.createNew(id)
      // Navigate to the requirement edit form — CatalogSuggestions there will
      // auto-pick the latest (newly created) proposal to add items into.
      navigate(`/requirements/${id}/proposal`)
    } catch {
      setCreatingProposal(false)
    }
  }

  if (loading) {
    return (
      <Layout title="View Requirement">
        <p className="text-black/60 dark:text-slate-400" role="status">Loading…</p>
      </Layout>
    )
  }

  if (error || !requirement) {
    return (
      <Layout title="View Requirement">
        <p role="alert" className="text-red-700 dark:text-red-400">{error || 'Requirement not found.'}</p>
      </Layout>
    )
  }

  const client = requirement.client_data

  return (
    <Layout title={`View — ${requirement.title}`}>
      {/* ── Page header with actions ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{requirement.title}</h1>
          <p className="text-xs text-black/60 dark:text-slate-400 mt-1">
            Last updated {new Date(requirement.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCreateNewProposal}
            disabled={creatingProposal}
            className="btn-secondary"
            aria-label="Create a new blank Client Costing for this requirement"
          >
            {creatingProposal ? 'Creating…' : '+ New Client Costing'}
          </button>
          <button
            onClick={() => navigate(`/requirements/${id}`)}
            className="btn-primary"
            aria-label="Edit this requirement"
          >
            ✏ Edit Requirement
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Client info ── */}
        <section className="card" aria-labelledby="view-client-heading">
          <h2 id="view-client-heading" className="text-lg font-semibold mb-4">Client Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            <InfoRow label="Client Name" value={client?.name} />
            <InfoRow label="Phone" value={client?.phone_no} />
            <InfoRow label="POC" value={client?.poc_name} />
            <InfoRow label="Target Audience Age" value={requirement.target_audience_age} />
            <InfoRow
              label="No. of Products"
              value={requirement.no_of_products != null
                ? (PRODUCT_COUNT_LABEL[requirement.no_of_products] ?? requirement.no_of_products.toString())
                : undefined}
            />
            <div>
              <dt className="text-xs font-medium text-black/60 dark:text-slate-400 mb-1">Requirement Status</dt>
              <dd>
                <Badge
                  text={requirement.status}
                  cls={REQ_STATUS_COLORS[requirement.status] || 'bg-black/5 text-black/60 border-black/10'}
                />
              </dd>
            </div>
            {client?.status && (
              <div>
                <dt className="text-xs font-medium text-black/60 dark:text-slate-400 mb-1">Client Status</dt>
                <dd>
                  <Badge
                    text={CLIENT_STATUS_LABEL[client.status as keyof typeof CLIENT_STATUS_LABEL] || client.status}
                    cls={CLIENT_STATUS_COLOR[client.status as keyof typeof CLIENT_STATUS_COLOR] || 'bg-black/5 text-black/60 border-black/10'}
                  />
                </dd>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Product requirements table (read-only) ── */}
        <section className="card p-0 overflow-hidden" aria-labelledby="view-products-heading">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <h2 id="view-products-heading" className="text-lg font-semibold">Product Requirements</h2>
            <span className="text-xs text-black/60 dark:text-slate-400">
              {requirement.products.length} row{requirement.products.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-mustard-50 dark:bg-slate-700 text-black/80 dark:text-slate-300 text-xs">
                  {['#', 'Body Part', 'Category', 'Sub Category', 'Key Benefits', 'Size',
                    'Packaging', 'Planned MRP', 'Rate Category', 'Specific Ingredient',
                    'Benchmark', 'Color', 'Fragrance'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requirement.products.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center text-sm text-black/60 dark:text-slate-400 py-6">
                      No product rows captured.
                    </td>
                  </tr>
                )}
                {requirement.products.map((p) => {
                  const mrp = p.planned_mrp
                  const rateCategory = mrp === null || mrp <= 0 ? '—'
                    : mrp <= 500 ? 'Basic Range'
                    : mrp <= 899 ? 'Premium Entry Range'
                    : mrp <= 1299 ? 'Premium High-End Range'
                    : mrp < 2100 ? 'Luxury Entry Range'
                    : 'Luxury High-End Range'
                  return (
                    <tr key={p.id} className="border-b border-black/5 dark:border-white/5">
                      <td className="px-3 py-2 text-center text-black/60 dark:text-slate-400 font-medium text-xs">{p.row_number}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{p.body_part || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{p.category || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{p.sub_category || '—'}</td>
                      <td className="px-3 py-2 text-xs dark:text-slate-300">{p.key_benefits.join(', ') || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{p.size || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{p.packaging_type || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap tabular-nums">
                        {p.planned_mrp !== null ? `₹${p.planned_mrp.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs dark:text-slate-300 whitespace-nowrap">{rateCategory}</td>
                      <td className="px-3 py-2 text-xs dark:text-slate-300 max-w-[180px] truncate" title={p.specific_ingredient}>{p.specific_ingredient || '—'}</td>
                      <td className="px-3 py-2 text-xs dark:text-slate-300 max-w-[150px] truncate" title={p.benchmark_product}>{p.benchmark_product || '—'}</td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">
                        {p.has_color === null ? '—' : p.has_color ? `Yes${p.color_details ? ` (${p.color_details})` : ''}` : 'No'}
                      </td>
                      <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">
                        {p.has_fragrance === null ? '—' : p.has_fragrance ? `Yes${p.fragrance_details ? ` (${p.fragrance_details})` : ''}` : 'No'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 3: Notes ── */}
        <section className="card" aria-labelledby="view-notes-heading">
          <h2 id="view-notes-heading" className="text-lg font-semibold mb-3">
            Notes <span className="text-sm font-normal text-black/60 dark:text-slate-400">({notes.length})</span>
          </h2>
          {notes.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-slate-400">No notes added.</p>
          ) : (
            <ol className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="border border-black/8 dark:border-white/8 rounded p-3">
                  <p className="text-sm dark:text-slate-200">{note.text}</p>
                  <p className="text-xs text-black/50 dark:text-slate-500 mt-1">
                    {note.added_by_name} · {new Date(note.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── Section 4: Files ── */}
        <section className="card" aria-labelledby="view-files-heading">
          <h2 id="view-files-heading" className="text-lg font-semibold mb-3">
            Files & Images <span className="text-sm font-normal text-black/60 dark:text-slate-400">({files.length})</span>
          </h2>
          {files.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-slate-400">No files uploaded.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((f) => (
                <li key={f.id} className="border border-black/8 dark:border-white/8 rounded p-3 flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">
                    {f.file_type === 'image' ? '🖼' : f.file_type === 'video' ? '🎬' : '📄'}
                  </span>
                  <div className="min-w-0">
                    <a
                      href={f.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate block hover:underline text-mustard-700 dark:text-mustard-400"
                      aria-label={`Open file: ${f.filename}`}
                    >
                      {f.filename}
                    </a>
                    <p className="text-xs text-black/50 dark:text-slate-500">
                      {f.uploaded_by_name} · {new Date(f.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Section 5: Proposals ── */}
        <section aria-labelledby="view-proposals-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="view-proposals-heading" className="text-lg font-semibold">
              Client Costings <span className="text-sm font-normal text-black/60 dark:text-slate-400">({proposals.length})</span>
            </h2>
            <button
              onClick={handleCreateNewProposal}
              disabled={creatingProposal}
              className="btn-primary text-sm"
              aria-label="Create a new blank Client Costing"
            >
              {creatingProposal ? 'Creating…' : '+ New Client Costing'}
            </button>
          </div>

          {proposals.length === 0 && (
            <div className="card text-sm text-black/60 dark:text-slate-400">
              No Client Costings created yet. Click "+ New Client Costing" to start one.
            </div>
          )}

          <div className="space-y-3">
            {proposals.map((proposal, idx) => {
              const isExpanded = expandedProposals.has(proposal.id)
              const proposalLabel = `Client Costing ${proposals.length - idx}`
              return (
                <div key={proposal.id} className="card p-0 overflow-hidden">
                  {/* Proposal header row */}
                  <button
                    type="button"
                    onClick={() => toggleProposal(proposal.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`proposal-items-${proposal.id}`}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-mustard-50/30 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-sm dark:text-slate-100">{proposalLabel}</span>
                      <Badge
                        text={proposal.status}
                        cls={proposal.status === 'exported'
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                          : 'bg-black/5 text-black/60 border-black/10 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'}
                      />
                      <span className="text-xs text-black/60 dark:text-slate-400">
                        Created {new Date(proposal.created_at).toLocaleString()}
                        {proposal.created_by_name ? ` by ${proposal.created_by_name}` : ''}
                      </span>
                      <span className="text-xs text-black/60 dark:text-slate-400">
                        {proposal.items.length} item{proposal.items.length === 1 ? '' : 's'}
                      </span>
                      {proposal.last_exported_at && (
                        <span className="text-xs text-black/60 dark:text-slate-400">
                          · Last exported {new Date(proposal.last_exported_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="text-black/40 dark:text-slate-500 text-xs ml-4" aria-hidden="true">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Proposal items (collapsible) */}
                  {isExpanded && (
                    <div id={`proposal-items-${proposal.id}`}>
                      <div className="overflow-x-auto border-t border-black/10 dark:border-white/10">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-mustard-50/60 dark:bg-slate-700/60 text-xs text-black/80 dark:text-slate-300">
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 w-8">#</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Body Part</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Product Type</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Sub Type</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Key Benefits</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Size</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Packaging</th>
                              <th scope="col" className="px-3 py-2 text-left font-medium border-b border-black/8 dark:border-white/8 whitespace-nowrap">Rate Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proposal.items.length === 0 && (
                              <tr>
                                <td colSpan={8} className="text-center text-sm text-black/60 dark:text-slate-400 py-4">
                                  No items in this proposal.
                                </td>
                              </tr>
                            )}
                            {proposal.items.map((item, i) => {
                              const c = item.catalog_data
                              const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
                              return (
                                <tr key={item.id} className={`border-b border-black/5 dark:border-white/5 ${i % 2 === 1 ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''}`}>
                                  <td className="px-3 py-2 text-center text-black/50 dark:text-slate-500 text-xs font-medium">{i + 1}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.body_part}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.product_type}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.sub_product_type}</td>
                                  <td className="px-3 py-2 text-xs dark:text-slate-300">{kb || '—'}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.size || '—'}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.packaging_type || '—'}</td>
                                  <td className="px-3 py-2 dark:text-slate-200 whitespace-nowrap">{c.rate_category || '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Link to full proposal page for editing/exporting */}
                      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 flex justify-end">
                        <button
                          onClick={() => navigate(`/requirements/${id}/proposal`)}
                          className="btn-secondary text-xs"
                          aria-label={`Open Client Costing editor for ${proposalLabel}`}
                        >
                          Open in Client Costing Editor →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Layout>
  )
}

// ── Small helper ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-black/60 dark:text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm dark:text-slate-200">{value || '—'}</dd>
    </div>
  )
}
