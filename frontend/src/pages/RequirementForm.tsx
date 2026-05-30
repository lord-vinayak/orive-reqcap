import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ClientInfoForm from "@/components/ClientInfoForm";
import ProductTable, { validateProductRow } from "@/components/ProductTable";
import CatalogSuggestions from "@/components/CatalogSuggestions";
import NotesSection from "@/components/NotesSection";
import FileUploadSection from "@/components/FileUploadSection";
import {
  clientService, requirementService, notesService, proposalService,
  AUTO_NOTE_MARKER_RE, buildAutoNoteText,
} from "@/services";
import { useAuthStore } from "@/store/authStore";
import type { Client, Note, Requirement, RequirementProduct } from "@/types";

const DRAFT_KEY = "skinovation-draft-requirement";
const AUTOSAVE_DEBOUNCE_MS = 3000;

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasDraftProductContent(product: RequirementProduct) {
  return (
    hasText(product.body_part) ||
    hasText(product.category) ||
    hasText(product.sub_category) ||
    product.key_benefits.length > 0 ||
    hasText(product.size) ||
    hasText(product.packaging_type) ||
    hasText(product.packaging_notes) ||
    product.planned_mrp !== null ||
    hasText(product.specific_ingredient) ||
    hasText(product.benchmark_product) ||
    product.has_color !== null ||
    hasText(product.color_details) ||
    product.has_fragrance !== null ||
    hasText(product.fragrance_details)
  );
}

function hasMeaningfulDraft(
  client: Partial<Client>,
  targetAge: string,
  noOfProducts: number | null,
  products: RequirementProduct[],
) {
  return (
    hasText(client.name) ||
    hasText(client.phone_no) ||
    hasText(targetAge) ||
    noOfProducts !== null ||
    products.some(hasDraftProductContent)
  );
}

/**
 * Build the desired auto-mirror notes from the current product rows.
 * One note per non-empty (row, field) for packaging_notes / color_details / fragrance_details.
 */
function buildDesiredAutoNotes(products: RequirementProduct[]) {
  const out: { rowId: string; field: string; rowNumber: number; value: string; bodyPart: string; category: string; subCategory: string }[] = [];
  for (const p of products) {
    if (p.packaging_notes?.trim())   out.push({ rowId: p.id, field: 'packaging_notes',   rowNumber: p.row_number, value: p.packaging_notes.trim(), bodyPart: p.body_part, category: p.category, subCategory: p.sub_category });
    if (p.color_details?.trim())     out.push({ rowId: p.id, field: 'color_details',     rowNumber: p.row_number, value: p.color_details.trim(), bodyPart: p.body_part, category: p.category, subCategory: p.sub_category });
    if (p.fragrance_details?.trim()) out.push({ rowId: p.id, field: 'fragrance_details', rowNumber: p.row_number, value: p.fragrance_details.trim(), bodyPart: p.body_part, category: p.category, subCategory: p.sub_category });
  }
  return out;
}

/** Sync the auto-generated mirror notes for a requirement so they match the
 *  current values of packaging_notes / color_details / fragrance_details
 *  across every product row (item #9). Updates in place where possible. */
async function syncAutoNotes(reqId: string, products: RequirementProduct[]) {
  let existing: Note[] = [];
  try {
    existing = await notesService.list(reqId);
  } catch { return; }

  // Index existing auto-notes by (rowId, field)
  const byKey = new Map<string, Note>();
  for (const n of existing) {
    const m = AUTO_NOTE_MARKER_RE.exec(n.text);
    if (m) byKey.set(`${m[1]}|${m[2]}`, n);
  }

  const desired = buildDesiredAutoNotes(products);
  const desiredKeys = new Set(desired.map((d) => `${d.rowId}|${d.field}`));

  // Create or update
  for (const d of desired) {
    const key = `${d.rowId}|${d.field}`;
    const text = buildAutoNoteText(d.rowId, d.field, d.rowNumber, d.value, d.bodyPart, d.category, d.subCategory);
    const existingNote = byKey.get(key);
    if (existingNote) {
      if (existingNote.text !== text) {
        try { await notesService.update(existingNote.id, text); } catch { /* ignore */ }
      }
    } else {
      try { await notesService.add(reqId, text); } catch { /* ignore */ }
    }
  }
  // Delete auto-notes whose source field is now empty
  for (const [key, note] of byKey.entries()) {
    if (!desiredKeys.has(key)) {
      try { await notesService.delete(note.id); } catch { /* ignore */ }
    }
  }
}

export default function RequirementForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const currentUser = useAuthStore((s) => s.user);

  const [client, setClient] = useState<Partial<Client>>({});
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [products, setProducts] = useState<RequirementProduct[]>(() => {
    if (id) return [];
    return [
      {
        id: `tmp-${Date.now()}`,
        row_number: 1,
        body_part: "", category: "", sub_category: "", key_benefits: [],
        size: "", packaging_type: "", packaging_notes: "", planned_mrp: null,
        specific_ingredient: "", benchmark_product: "",
        has_color: null, color_details: "",
        has_fragrance: null, fragrance_details: "",
      },
    ];
  });
  const [targetAge, setTargetAge] = useState("");
  const [noOfProducts, setNoOfProducts] = useState<number | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  const [manualSaving, setManualSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loadingRequirement, setLoadingRequirement] = useState(false);

  const [error, setError] = useState("");
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Show per-row validation messages once user has attempted a save.
  const [showValidation, setShowValidation] = useState(false);

  // Pending-selection state bubbled up from CatalogSuggestions so the bulk action
  // button can live in the sticky bottom bar.
  const [pendingCatalog, setPendingCatalog] = useState<{ count: number; busy: boolean; add: () => Promise<void> } | null>(null);

  // Tracks which product row is currently being added directly to the Client Costing.
  const [addingRowToCostingIndex, setAddingRowToCostingIndex] = useState<number | null>(null);

  // Bumped after each Save so NotesSection refetches and surfaces auto-mirror notes.
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  // Bumped when a product row is added to the Client Costing so CatalogSuggestions refetches.
  const [proposalRefreshKey, setProposalRefreshKey] = useState(0);

  const dirtyProductsRef = useRef<Set<string>>(new Set());
  const dirtyMetaRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) {
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (!rawDraft) return;
      try {
        const draft = JSON.parse(rawDraft);
        const hasSavedDraft = hasMeaningfulDraft(
          draft.client || {},
          draft.targetAge || "",
          draft.noOfProducts ?? null,
          draft.products || [],
        );
        if (hasSavedDraft) setShowDraftBanner(true);
        else localStorage.removeItem(DRAFT_KEY);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
      return;
    }
    setLoadingRequirement(true);
    requirementService.get(id)
      .then((r) => {
        setRequirement(r);
        if (r.client_data) setClient(r.client_data);
        setTargetAge(r.target_audience_age || "");
        setNoOfProducts(r.no_of_products);
        setProducts(r.products || []);
        setSavedAt(new Date(r.updated_at));
        dirtyProductsRef.current.clear();
        dirtyMetaRef.current = false;
      })
      .catch(() => setError("Failed to load requirement."))
      .finally(() => setLoadingRequirement(false));
  }, [id]);

  const restoreDraft = () => {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    if (draft.client) setClient(draft.client);
    if (draft.targetAge) setTargetAge(draft.targetAge);
    if (draft.noOfProducts !== undefined) setNoOfProducts(draft.noOfProducts);
    if (draft.products) setProducts(draft.products);
    setShowDraftBanner(false);
  };
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  };

  useEffect(() => {
    if (isEdit) return;
    if (!hasMeaningfulDraft(client, targetAge, noOfProducts, products)) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ client, targetAge, noOfProducts, products }));
  }, [client, targetAge, noOfProducts, products, isEdit]);

  const scheduleAutoSave = useCallback(() => {
    if (!requirement) return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(async () => {
      const dirtyIds = Array.from(dirtyProductsRef.current);
      const metaDirty = dirtyMetaRef.current;
      if (dirtyIds.length === 0 && !metaDirty) return;
      setAutoSaving(true);
      try {
        const tasks: Promise<unknown>[] = [];
        if (metaDirty) {
          tasks.push(requirementService.patch(requirement.id, {
            target_audience_age: targetAge,
            no_of_products: noOfProducts,
          }));
          dirtyMetaRef.current = false;
        }
        for (const pid of dirtyIds) {
          if (pid.startsWith("tmp-")) continue;
          const p = products.find((x) => x.id === pid);
          if (!p) continue;
          const { id: _i, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p;
          tasks.push(requirementService.updateProduct(requirement.id, pid, rest));
        }
        dirtyProductsRef.current.clear();
        await Promise.all(tasks);
        setSavedAt(new Date());
      } catch { /* silent — manual Save surfaces errors */ }
      finally { setAutoSaving(false); }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [requirement, targetAge, noOfProducts, products]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
  }, []);

  const markMetaDirty = () => { dirtyMetaRef.current = true; scheduleAutoSave(); };
  const markProductDirty = (id: string) => { dirtyProductsRef.current.add(id); scheduleAutoSave(); };

  const handleTargetAgeChange = (v: string) => { setTargetAge(v); markMetaDirty(); };
  const handleNoOfProductsChange = (v: number | null) => { setNoOfProducts(v); markMetaDirty(); };

  const handleRowChange = (idx: number, patch: Partial<RequirementProduct>) => {
    setProducts((cur) => cur.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    const row = products[idx];
    if (row) markProductDirty(row.id);
    setActiveRowIndex(idx);
  };

  const handleAddRow = async () => {
    if (requirement) {
      try {
        const newP = await requirementService.addProduct(requirement.id);
        setProducts((cur) => { setActiveRowIndex(cur.length); return [...cur, newP]; });
      } catch { setError("Could not add row. Please try again."); }
    } else {
      const tempRow: RequirementProduct = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        row_number: products.length + 1,
        body_part: "", category: "", sub_category: "", key_benefits: [],
        size: "", packaging_type: "", packaging_notes: "", planned_mrp: null,
        specific_ingredient: "", benchmark_product: "",
        has_color: null, color_details: "",
        has_fragrance: null, fragrance_details: "",
      };
      setProducts((cur) => { setActiveRowIndex(cur.length); return [...cur, tempRow]; });
    }
  };

  const handleInsertAfter = async (afterIdx: number) => {
    const insertAt = afterIdx + 1;
    if (requirement) {
      try {
        const newP = await requirementService.addProduct(requirement.id);
        setProducts((cur) => {
          const next = [...cur];
          next.splice(insertAt, 0, newP);
          return next.map((p, i) => ({ ...p, row_number: i + 1 }));
        });
        setActiveRowIndex(insertAt);
      } catch { setError("Could not insert row. Please try again."); }
    } else {
      const tempRow: RequirementProduct = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        row_number: insertAt + 1,
        body_part: "", category: "", sub_category: "", key_benefits: [],
        size: "", packaging_type: "", packaging_notes: "", planned_mrp: null,
        specific_ingredient: "", benchmark_product: "",
        has_color: null, color_details: "",
        has_fragrance: null, fragrance_details: "",
      };
      setProducts((cur) => {
        const next = [...cur];
        next.splice(insertAt, 0, tempRow);
        return next.map((p, i) => ({ ...p, row_number: i + 1 }));
      });
      setActiveRowIndex(insertAt);
    }
  };

  const handleRowDelete = async (idx: number) => {
    const row = products[idx];
    if (!row) return;
    if (requirement && !row.id.startsWith("tmp-")) {
      try { await requirementService.deleteProduct(requirement.id, row.id); }
      catch { setError("Could not delete row."); return; }
    }
    dirtyProductsRef.current.delete(row.id);
    setProducts((cur) => cur.filter((_, i) => i !== idx));
  };

  const handleExtract = (fields: Partial<RequirementProduct>) => {
    if (products.length === 0) {
      handleAddRow().then(() => {
        setProducts((cur) => {
          if (cur.length === 0) return cur;
          const updated = cur.map((p, i) => i === 0 ? { ...p, ...fields } : p);
          markProductDirty(updated[0].id);
          return updated;
        });
        setActiveRowIndex(0);
      });
      return;
    }
    setProducts((cur) => {
      const updated = cur.map((p, i) => i === activeRowIndex ? { ...p, ...fields } : p);
      const target = updated[activeRowIndex];
      if (target) markProductDirty(target.id);
      return updated;
    });
  };

  // Persist client + requirement + products + auto-mirror notes.
  const saveAll = useCallback(async (opts: { skipValidation?: boolean } = {}): Promise<Requirement | null> => {
    setError("");

    if (!client.phone_no || !client.name) {
      setError("Client name and phone number are required.");
      return null;
    }
    if (!/^\d{10}$/.test(client.phone_no)) {
      setError("Phone number must be exactly 10 digits.");
      return null;
    }

    // ---- Product row validation (item #8) ----
    if (!opts.skipValidation) {
      const rowProblems = products.map((p, i) => ({ i, errs: validateProductRow(p) })).filter((x) => x.errs.length > 0);
      if (rowProblems.length > 0) {
        setShowValidation(true);
        setError(`Please fix ${rowProblems.length} product row${rowProblems.length === 1 ? '' : 's'} with missing required fields before saving.`);
        return null;
      }
      setShowValidation(false);
    }

    setManualSaving(true);
    try {
      const clientPayload = {
        phone_no: client.phone_no,
        name: client.name,
        poc: currentUser?.id || null,
        status: client.status,
      };
      try {
        await clientService.update(client.phone_no, clientPayload);
      } catch (e: any) {
        if (e.response?.status === 404) await clientService.create(clientPayload);
        else throw e;
      }

      let req = requirement;
      if (!req) {
        req = await requirementService.create({
          client: client.phone_no,
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        } as any);
        setRequirement(req);
        const created: RequirementProduct[] = [];
        for (const p of products) {
          const { id: _i, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p;
          const newP = await requirementService.addProduct(req.id, rest);
          created.push(newP);
        }
        setProducts(created);
        localStorage.removeItem(DRAFT_KEY);
      } else {
        await requirementService.patch(req.id, {
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        });
        const tmpProducts = products.filter((p) => p.id.startsWith("tmp-"));
        const createdPromises = tmpProducts.map(async (p) => {
          const { id: _i, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p;
          const newP = await requirementService.addProduct(req!.id, rest);
          return { oldId: p.id, newP };
        });
        if (tmpProducts.length > 0) {
          const newlyCreated = await Promise.all(createdPromises);
          setProducts((cur) => {
            let next = [...cur];
            for (const { oldId, newP } of newlyCreated) next = next.map((x) => (x.id === oldId ? newP : x));
            return next;
          });
        }
        const dirtyIds = Array.from(dirtyProductsRef.current);
        const tasks = dirtyIds.flatMap((pid) => {
          if (pid.startsWith("tmp-")) return [];
          const p = products.find((x) => x.id === pid);
          if (!p) return [];
          const { id: _i, requirement: _r, row_number: _rn, created_at: _c, updated_at: _u, ...rest } = p;
          return [requirementService.updateProduct(req!.id, pid, rest)];
        });
        await Promise.all(tasks);
      }
      dirtyProductsRef.current.clear();
      dirtyMetaRef.current = false;

      // ---- Sync auto-mirror notes (item #9) ----
      // Use the in-memory products list (post-save IDs may have changed for tmp rows above,
      // but auto-mirror notes only need stable IDs to correlate runs — newly created server IDs are fine).
      try { await syncAutoNotes(req.id, products); } catch { /* non-blocking */ }
      setNotesRefreshKey((k) => k + 1);

      setSavedAt(new Date());
      return req;
    } catch (err: any) {
      // DRF field-level errors come as {field: [msg, ...]} — no top-level 'detail' key.
      // Flatten them into a readable string so the user sees the real cause.
      const data = err.response?.data;
      let msg = "Save failed.";
      if (data) {
        if (typeof data.detail === "string") {
          msg = data.detail;
        } else if (typeof data === "object") {
          const parts = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          if (parts.length) msg = parts.join(" | ");
        }
      }
      setError(msg);
      return null;
    } finally {
      setManualSaving(false);
    }
  }, [client, requirement, products, targetAge, noOfProducts, currentUser?.id]);

  const handleSave = async () => {
    const req = await saveAll();
    if (req && !isEdit) navigate(`/requirements/${req.id}`, { replace: true });
  };

  const handleCreateProposal = async () => {
    const req = await saveAll();
    if (req) navigate(`/requirements/${req.id}/proposal`);
  };

  // ---- Add a single product row directly to the Client Costing as a freeform item (item #6) ----
  const handleAddRowToCosting = async (idx: number) => {
    const row = products[idx];
    if (!row) return;
    const rowErrs = validateProductRow(row);
    if (rowErrs.length > 0) {
      setShowValidation(true);
      setError(`Row ${row.row_number} has missing required fields: ${rowErrs.join('; ')}`);
      return;
    }
    setAddingRowToCostingIndex(idx);
    setError("");
    try {
      let req = requirement;
      if (!req) {
        // Auto-save just to get a requirement ID — we already validated this
        // specific row above, so don't block because other rows are incomplete.
        req = await saveAll({ skipValidation: true });
        if (!req) return;
      }
      // Find or create the most recent Client Costing
      const proposal = await proposalService.getForRequirement(req.id);
      // Build snapshot fields from the requirement row.
      const kb = (row.key_benefits || []).slice(0, 3);
      const snapshot: Record<string, unknown> = {
        body_part: row.body_part,
        product_type: row.category,
        sub_product_type: row.sub_category,
        kb_tag1: kb[0] || '',
        kb_tag2: kb[1] || '',
        kb_tag3: kb[2] || '',
        size: row.size,
        packaging_type: row.packaging_type,
        color: row.has_color === true ? (row.color_details || 'Yes') : (row.has_color === false ? 'No' : ''),
        fragrance: row.has_fragrance === true ? (row.fragrance_details || 'Yes') : (row.has_fragrance === false ? 'No' : ''),
        specific_ingredients: row.specific_ingredient,
        potential_mrp: row.planned_mrp,
      };
      await proposalService.addFreeformItem(proposal.id, snapshot as any);
      setProposalRefreshKey((k) => k + 1);
      setSavedAt(new Date());
    } catch (e: any) {
      const data = e.response?.data;
      let msg = "Could not add row to Client Costing.";
      if (data) {
        if (typeof data.detail === "string") msg = data.detail;
        else if (typeof data === "object") {
          const parts = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          if (parts.length) msg = parts.join(" | ");
        }
      }
      setError(msg);
    } finally {
      setAddingRowToCostingIndex(null);
    }
  };

  const statusText = (() => {
    if (autoSaving) return "Saving draft…";
    if (savedAt) return `Saved ${savedAt.toLocaleTimeString()}`;
    return null;
  })();

  // Alt+R global keyboard shortcut for audio capture.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const btn = document.querySelector<HTMLButtonElement>('[data-audio-capture-btn]');
        btn?.click();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Layout title={isEdit ? "Edit Requirement" : "New Requirement"}>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit requirement" : "Capture new requirement"}
          </h1>
          {statusText && (
            <p className="text-xs text-black/60 dark:text-slate-400 mt-1" aria-live="polite" role="status">
              {statusText}
            </p>
          )}
        </div>
      </div>

      {showDraftBanner && (
        <div role="region" aria-label="Draft recovery" className="border border-mustard dark:border-mustard/60 bg-mustard-50 dark:bg-mustard-800/70 rounded p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-black dark:text-mustard-50">You have an unsaved draft from a previous session.</span>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="btn-primary text-sm">Restore</button>
            <button onClick={discardDraft} className="btn-secondary text-sm">Discard</button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-4">
          {error}
        </div>
      )}

      {loadingRequirement ? (
        <p className="text-black/60">Loading requirement…</p>
      ) : (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0">
            <div className="xl:col-span-8 min-w-0">
              <ClientInfoForm
                client={client}
                onClientChange={(next) => { setClient(next); if (requirement) markMetaDirty(); }}
                targetAge={targetAge}
                onTargetAgeChange={handleTargetAgeChange}
                noOfProducts={noOfProducts}
                onNoOfProductsChange={handleNoOfProductsChange}
                readOnlyPhone={isEdit}
                onExtract={handleExtract}
              />
            </div>
            <aside className="xl:col-span-4 space-y-6 min-w-0">
              {requirement ? (
                <>
                  <NotesSection requirementId={requirement.id} refreshKey={notesRefreshKey} />
                  <FileUploadSection requirementId={requirement.id} />
                </>
              ) : (
                <div className="card text-sm text-black/60 dark:text-slate-400">
                  <p className="font-medium text-black dark:text-slate-100 mb-1">Notes &amp; files</p>
                  <p>Save the requirement first to add notes or upload files.</p>
                </div>
              )}
            </aside>
          </div>

          <ProductTable
            products={products}
            onChange={handleRowChange}
            onDelete={handleRowDelete}
            onAddRow={handleAddRow}
            onInsertAfter={handleInsertAfter}
            activeIndex={activeRowIndex}
            onActiveChange={setActiveRowIndex}
            showValidation={showValidation}
            onAddRowToCosting={handleAddRowToCosting}
            addingRowToCostingIndex={addingRowToCostingIndex}
          />

          <CatalogSuggestions
            products={products}
            activeRowIndex={activeRowIndex}
            requirementId={requirement?.id}
            refreshKey={proposalRefreshKey}
            onAutoSave={async () => {
              const req = await saveAll();
              if (req && !isEdit) navigate(`/requirements/${req.id}`, { replace: true });
              return req?.id ?? null;
            }}
            onPendingChange={setPendingCatalog}
          />
        </div>
      )}

      {/* Sticky action bar */}
      <div className="flex items-center gap-2 pt-4 mt-6 sticky bottom-0 bg-white dark:bg-slate-900 py-3 border-t border-black/10 dark:border-white/10">
        <button onClick={handleSave} disabled={manualSaving} className="btn-primary">
          {manualSaving ? "Saving…" : "Save requirements"}
        </button>
        <button onClick={handleCreateProposal} disabled={manualSaving} className="btn-secondary">
          Open Client Costing →
        </button>
        {/* Bulk "Add to Client Costing" — lifted up from CatalogSuggestions (item #3) */}
        {pendingCatalog && pendingCatalog.count > 0 && (
          <button
            type="button"
            onClick={() => pendingCatalog.add()}
            disabled={pendingCatalog.busy}
            className="btn-primary"
            aria-live="polite"
          >
            {pendingCatalog.busy ? "Adding…" : `Add ${pendingCatalog.count} selected to Client Costing`}
          </button>
        )}
      </div>
    </Layout>
  );
}
