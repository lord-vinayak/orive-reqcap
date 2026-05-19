import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import AudioCaptureButton from '@/components/AudioCaptureButton'
import ClientInfoForm from '@/components/ClientInfoForm'
import ProductRow from '@/components/ProductRow'
import NotesSection from '@/components/NotesSection'
import FileUploadSection from '@/components/FileUploadSection'
import { clientService, requirementService } from '@/services'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/authStore'
import type { Client, Requirement, RequirementProduct } from '@/types'

const DRAFT_KEY = 'skinovation-draft-requirement'

export default function RequirementForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [client, setClient] = useState<Partial<Client>>({})
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [products, setProducts] = useState<RequirementProduct[]>([])
  const [targetAge, setTargetAge] = useState('')
  const [noOfProducts, setNoOfProducts] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const activeProductIdxRef = useRef(0)
  const currentUser = useAuthStore((s) => s.user)

  // Load existing requirement (edit mode)
  useEffect(() => {
    if (!id) {
      // Check for local draft
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) setShowDraftBanner(true)
      return
    }
    requirementService.get(id).then((r) => {
      setRequirement(r)
      if (r.client_data) setClient(r.client_data)
      setTargetAge(r.target_audience_age || '')
      setNoOfProducts(r.no_of_products)
      setProducts(r.products || [])
    }).catch(() => setError('Failed to load requirement'))
  }, [id])

  const restoreDraft = () => {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
    if (draft.client) setClient(draft.client)
    if (draft.targetAge) setTargetAge(draft.targetAge)
    if (draft.noOfProducts) setNoOfProducts(draft.noOfProducts)
    if (draft.products) setProducts(draft.products)
    setShowDraftBanner(false)
  }
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setShowDraftBanner(false)
  }

  // Save draft locally on every change (only in 'new' mode)
  useEffect(() => {
    if (isEdit) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ client, targetAge, noOfProducts, products }))
  }, [client, targetAge, noOfProducts, products, isEdit])

  // Server auto-save (debounced) — only when there's a saved requirement
  const autoSave = useDebouncedCallback(async () => {
    if (!requirement) return
    setSaving(true)
    try {
      await requirementService.patch(requirement.id, {
        target_audience_age: targetAge,
        no_of_products: noOfProducts,
      })
      // Update each product row
      for (const p of products) {
        // Strip non-editable fields
        const { id: pid, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p
        await requirementService.updateProduct(requirement.id, pid, rest)
      }
      setSavedAt(new Date())
    } catch (e) {
      // silent
    } finally {
      setSaving(false)
    }
  }, 3000)

  useEffect(() => {
    if (requirement) autoSave()
  }, [targetAge, noOfProducts, products, requirement, autoSave])

  // Save (creates client + requirement if needed)
  const saveAll = useCallback(async (): Promise<Requirement | null> => {
    setError('')
    if (!client.phone_no || !client.name) {
      setError('Client name and phone number are required.')
      return null
    }
    setSaving(true)
    try {
      // Build the slim client payload per simplified PRD:
      //   name, phone_no, poc (= logged-in user), nothing else.
      const clientPayload = {
        phone_no: client.phone_no,
        name: client.name,
        poc: currentUser?.id || null,
      }
      // Upsert client
      try {
        await clientService.update(client.phone_no, clientPayload)
      } catch (e: any) {
        if (e.response?.status === 404) {
          await clientService.create(clientPayload)
        } else {
          throw e
        }
      }

      let req = requirement
      if (!req) {
        req = await requirementService.create({
          client: client.phone_no,
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        } as any)
        setRequirement(req)
        // Persist all in-memory product rows to the server
        const created: RequirementProduct[] = []
        for (const p of products) {
          const { id: _ignore, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p
          const newP = await requirementService.addProduct(req.id, rest)
          created.push(newP)
        }
        setProducts(created)
        localStorage.removeItem(DRAFT_KEY)
      } else {
        await requirementService.patch(req.id, {
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        })
      }
      setSavedAt(new Date())
      return req
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Save failed.')
      return null
    } finally {
      setSaving(false)
    }
  }, [client, requirement, products, targetAge, noOfProducts])

  const handleSave = async () => {
    const req = await saveAll()
    if (req && !isEdit) navigate(`/requirements/${req.id}`, { replace: true })
  }

  const handleAddRow = async () => {
    if (requirement) {
      const newP = await requirementService.addProduct(requirement.id)
      setProducts((cur) => [...cur, newP])
      activeProductIdxRef.current = products.length
    } else {
      // local-only row before first save
      const tempRow: RequirementProduct = {
        id: `tmp-${Date.now()}`,
        row_number: products.length + 1,
        body_part: '', category: '', sub_category: '', key_benefits: [],
        size: '', packaging_type: '', packaging_notes: '', planned_mrp: null,
        specific_ingredient: '', benchmark_product: '',
        has_color: null, color_details: '', has_fragrance: null, fragrance_details: '',
      }
      setProducts((cur) => [...cur, tempRow])
      activeProductIdxRef.current = products.length
    }
  }

  const handleRowChange = (idx: number, patch: Partial<RequirementProduct>) => {
    setProducts((cur) => cur.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
    activeProductIdxRef.current = idx
  }

  const handleRowDelete = async (idx: number) => {
    const row = products[idx]
    if (requirement && !row.id.startsWith('tmp-')) {
      await requirementService.deleteProduct(requirement.id, row.id)
    }
    setProducts((cur) => cur.filter((_, i) => i !== idx))
  }

  const handleExtract = (fields: Partial<RequirementProduct>) => {
    let idx = activeProductIdxRef.current
    if (products.length === 0) {
      handleAddRow().then(() => {
        setProducts((cur) => cur.map((p, i) => i === 0 ? { ...p, ...fields } : p))
      })
      return
    }
    setProducts((cur) => cur.map((p, i) => i === idx ? { ...p, ...fields } : p))
  }

  const handleCreateProposal = async () => {
    const req = await saveAll()
    if (req) navigate(`/requirements/${req.id}/proposal`)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? 'Edit Requirement' : 'Capture New Requirement'}
          </h1>
          {savedAt && (
            <p className="text-xs text-black/50 mt-1" aria-live="polite">
              {saving ? 'Saving…' : `Saved at ${savedAt.toLocaleTimeString()}`}
            </p>
          )}
        </div>
        <AudioCaptureButton onExtract={handleExtract} />
      </div>

      {showDraftBanner && (
        <div role="region" aria-label="Draft recovery" className="border border-mustard bg-mustard-50 rounded p-3 mb-4 flex items-center justify-between">
          <span className="text-sm">You have an unsaved draft from a previous session.</span>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="btn-primary text-sm">Restore</button>
            <button onClick={discardDraft} className="btn-secondary text-sm">Discard</button>
          </div>
        </div>
      )}

      {error && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-4">{error}</div>}

      <div className="space-y-6">
        <ClientInfoForm
          client={client}
          onClientChange={setClient}
          targetAge={targetAge}
          onTargetAgeChange={setTargetAge}
          noOfProducts={noOfProducts}
          onNoOfProductsChange={setNoOfProducts}
          readOnlyPhone={isEdit}
        />

        <section aria-labelledby="products-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="products-heading" className="text-lg font-semibold">Products</h2>
          </div>

          {products.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              onChange={(patch) => handleRowChange(i, patch)}
              onDelete={() => handleRowDelete(i)}
            />
          ))}

          <button type="button" onClick={handleAddRow} className="btn-secondary">
            + Add product row
          </button>
        </section>

        {requirement && (
          <>
            <NotesSection requirementId={requirement.id} />
            <FileUploadSection requirementId={requirement.id} />
          </>
        )}

        <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-white py-3 border-t border-black/10">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Requirements'}
          </button>
          <button onClick={handleCreateProposal} disabled={saving} className="btn-secondary">
            Create Proposal →
          </button>
        </div>
      </div>
    </Layout>
  )
}
