import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import AudioCaptureButton from "@/components/AudioCaptureButton";
import ClientInfoForm from "@/components/ClientInfoForm";
import ProductTable from "@/components/ProductTable";
import CatalogSuggestions from "@/components/CatalogSuggestions";
import NotesSection from "@/components/NotesSection";
import FileUploadSection from "@/components/FileUploadSection";
import { clientService, requirementService } from "@/services";
import { useAuthStore } from "@/store/authStore";
import type { Client, Requirement, RequirementProduct } from "@/types";

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

export default function RequirementForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const currentUser = useAuthStore((s) => s.user);

  const [client, setClient] = useState<Partial<Client>>({});
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [products, setProducts] = useState<RequirementProduct[]>(() => {
    // For new requirements, start with one blank row so the table isn't empty
    if (id) return [];
    return [
      {
        id: `tmp-${Date.now()}`,
        row_number: 1,
        body_part: "",
        category: "",
        sub_category: "",
        key_benefits: [],
        size: "",
        packaging_type: "",
        packaging_notes: "",
        planned_mrp: null,
        specific_ingredient: "",
        benchmark_product: "",
        has_color: null,
        color_details: "",
        has_fragrance: null,
        fragrance_details: "",
      },
    ];
  });
  const [targetAge, setTargetAge] = useState("");
  const [noOfProducts, setNoOfProducts] = useState<number | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  // Separate save states
  const [manualSaving, setManualSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loadingRequirement, setLoadingRequirement] = useState(false);

  const [error, setError] = useState("");
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Track which product IDs have unsaved changes (only for server-persisted rows)
  const dirtyProductsRef = useRef<Set<string>>(new Set());
  // Track requirement-metadata dirty flag separately
  const dirtyMetaRef = useRef(false);
  // Debounce timer for auto-save
  const autoSaveTimerRef = useRef<number | null>(null);

  // ---- LOAD existing requirement ----
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
        if (hasSavedDraft) {
          setShowDraftBanner(true);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
      return;
    }
    setLoadingRequirement(true);
    requirementService
      .get(id)
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

  // ---- DRAFT recovery (new mode only) ----
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

  // Local draft save (new mode)
  useEffect(() => {
    if (isEdit) return;
    if (!hasMeaningfulDraft(client, targetAge, noOfProducts, products)) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ client, targetAge, noOfProducts, products }),
    );
  }, [client, targetAge, noOfProducts, products, isEdit]);

  // ---- AUTO-SAVE (only saves DIRTY rows, runs in parallel, silent) ----
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
          tasks.push(
            requirementService.patch(requirement.id, {
              target_audience_age: targetAge,
              no_of_products: noOfProducts,
            }),
          );
          dirtyMetaRef.current = false;
        }

        for (const pid of dirtyIds) {
          if (pid.startsWith("tmp-")) continue; // not yet on server
          const p = products.find((x) => x.id === pid);
          if (!p) continue;
          const {
            id: _i,
            requirement: _r,
            row_number: _rn,
            created_at: _c,
            updated_at: _u,
            ...rest
          } = p;
          tasks.push(
            requirementService.updateProduct(requirement.id, pid, rest),
          );
        }
        dirtyProductsRef.current.clear();

        await Promise.all(tasks);
        setSavedAt(new Date());
      } catch (e) {
        // silent — manual Save will surface errors
      } finally {
        setAutoSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [requirement, targetAge, noOfProducts, products]);

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current)
        window.clearTimeout(autoSaveTimerRef.current);
    },
    [],
  );

  // ---- Mutators that mark dirty ----
  const markMetaDirty = () => {
    dirtyMetaRef.current = true;
    scheduleAutoSave();
  };
  const markProductDirty = (id: string) => {
    dirtyProductsRef.current.add(id);
    scheduleAutoSave();
  };

  const handleTargetAgeChange = (v: string) => {
    setTargetAge(v);
    markMetaDirty();
  };
  const handleNoOfProductsChange = (v: number | null) => {
    setNoOfProducts(v);
    markMetaDirty();
  };

  const handleRowChange = (idx: number, patch: Partial<RequirementProduct>) => {
    setProducts((cur) =>
      cur.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
    const row = products[idx];
    if (row) markProductDirty(row.id);
    setActiveRowIndex(idx);
  };

  const handleAddRow = async () => {
    if (requirement) {
      try {
        const newP = await requirementService.addProduct(requirement.id);
        setProducts((cur) => {
          setActiveRowIndex(cur.length);
          return [...cur, newP];
        });
      } catch {
        setError("Could not add row. Please try again.");
      }
    } else {
      const tempRow: RequirementProduct = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        row_number: products.length + 1,
        body_part: "",
        category: "",
        sub_category: "",
        key_benefits: [],
        size: "",
        packaging_type: "",
        packaging_notes: "",
        planned_mrp: null,
        specific_ingredient: "",
        benchmark_product: "",
        has_color: null,
        color_details: "",
        has_fragrance: null,
        fragrance_details: "",
      };
      setProducts((cur) => {
        setActiveRowIndex(cur.length);
        return [...cur, tempRow];
      });
    }
  };

  /** Insert a new blank row immediately after position `afterIdx`. */
  const handleInsertAfter = async (afterIdx: number) => {
    const insertAt = afterIdx + 1;
    if (requirement) {
      try {
        const newP = await requirementService.addProduct(requirement.id);
        setProducts((cur) => {
          const next = [...cur];
          next.splice(insertAt, 0, newP);
          // Re-number rows
          return next.map((p, i) => ({ ...p, row_number: i + 1 }));
        });
        setActiveRowIndex(insertAt);
      } catch {
        setError("Could not insert row. Please try again.");
      }
    } else {
      const tempRow: RequirementProduct = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        row_number: insertAt + 1,
        body_part: "",
        category: "",
        sub_category: "",
        key_benefits: [],
        size: "",
        packaging_type: "",
        packaging_notes: "",
        planned_mrp: null,
        specific_ingredient: "",
        benchmark_product: "",
        has_color: null,
        color_details: "",
        has_fragrance: null,
        fragrance_details: "",
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
      try {
        await requirementService.deleteProduct(requirement.id, row.id);
      } catch {
        setError("Could not delete row.");
        return;
      }
    }
    dirtyProductsRef.current.delete(row.id);
    setProducts((cur) => cur.filter((_, i) => i !== idx));
  };

  // ---- Audio extraction ----
  const handleExtract = (fields: Partial<RequirementProduct>) => {
    if (products.length === 0) {
      // Create a row then populate it
      handleAddRow().then(() => {
        setProducts((cur) => {
          if (cur.length === 0) return cur;
          const updated = cur.map((p, i) =>
            i === 0 ? { ...p, ...fields } : p,
          );
          markProductDirty(updated[0].id);
          return updated;
        });
        setActiveRowIndex(0);
      });
      return;
    }
    setProducts((cur) => {
      const updated = cur.map((p, i) =>
        i === activeRowIndex ? { ...p, ...fields } : p,
      );
      const target = updated[activeRowIndex];
      if (target) markProductDirty(target.id);
      return updated;
    });
  };

  // ---- Manual save (creates client + requirement if needed) ----
  const saveAll = useCallback(async (): Promise<Requirement | null> => {
    setError("");
    if (!client.phone_no || !client.name) {
      setError("Client name and phone number are required.");
      return null;
    }
    setManualSaving(true);
    try {
      const clientPayload = {
        phone_no: client.phone_no,
        name: client.name,
        poc: currentUser?.id || null,
      };
      try {
        await clientService.update(client.phone_no, clientPayload);
      } catch (e: any) {
        if (e.response?.status === 404) {
          await clientService.create(clientPayload);
        } else {
          throw e;
        }
      }

      let req = requirement;
      if (!req) {
        req = await requirementService.create({
          client: client.phone_no,
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        } as any);
        setRequirement(req);

        // Persist all in-memory product rows to the server
        const created: RequirementProduct[] = [];
        for (const p of products) {
          const {
            id: _i,
            requirement: _r,
            row_number: _rn,
            created_at: _c,
            updated_at: _u,
            ...rest
          } = p;
          const newP = await requirementService.addProduct(req.id, rest);
          created.push(newP);
        }
        setProducts(created);
        localStorage.removeItem(DRAFT_KEY);
      } else {
        // Save metadata
        await requirementService.patch(req.id, {
          target_audience_age: targetAge,
          no_of_products: noOfProducts,
        });

        // 1. Save any tmp- rows (if a previous save failed halfway)
        const tmpProducts = products.filter((p) => p.id.startsWith("tmp-"));
        const createdPromises = tmpProducts.map(async (p) => {
          const {
            id: _i,
            requirement: _r,
            row_number: _rn,
            created_at: _c,
            updated_at: _u,
            ...rest
          } = p;
          const newP = await requirementService.addProduct(req!.id, rest);
          return { oldId: p.id, newP };
        });

        if (tmpProducts.length > 0) {
          const newlyCreated = await Promise.all(createdPromises);
          setProducts((cur) => {
            let next = [...cur];
            for (const { oldId, newP } of newlyCreated) {
              next = next.map((x) => (x.id === oldId ? newP : x));
            }
            return next;
          });
        }

        // 2. Save any dirty existing rows
        const dirtyIds = Array.from(dirtyProductsRef.current);
        const tasks = dirtyIds.flatMap((pid) => {
          if (pid.startsWith("tmp-")) return [];
          const p = products.find((x) => x.id === pid);
          if (!p) return [];
          const {
            id: _i,
            requirement: _r,
            row_number: _rn,
            created_at: _c,
            updated_at: _u,
            ...rest
          } = p;
          return [requirementService.updateProduct(req!.id, pid, rest)];
        });
        await Promise.all(tasks);
      }
      dirtyProductsRef.current.clear();
      dirtyMetaRef.current = false;
      setSavedAt(new Date());
      return req;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed.");
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

  // ---- Status text for the indicator (NOT the button) ----
  const statusText = (() => {
    if (autoSaving) return "Saving draft…";
    if (savedAt) return `Saved ${savedAt.toLocaleTimeString()}`;
    return null;
  })();

  return (
    <Layout title={isEdit ? "Edit Requirement" : "New Requirement"}>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit requirement" : "Capture new requirement"}
          </h1>
          {statusText && (
            <p
              className="text-xs text-black/60 dark:text-slate-400 mt-1"
              aria-live="polite"
              role="status">
              {statusText}
            </p>
          )}
        </div>
        <AudioCaptureButton onExtract={handleExtract} />
      </div>

      {showDraftBanner && (
        <div
          role="region"
          aria-label="Draft recovery"
          className="border border-mustard dark:border-mustard/60 bg-mustard-50 dark:bg-mustard-800/70 rounded p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-black dark:text-mustard-50">
            You have an unsaved draft from a previous session.
          </span>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="btn-primary text-sm">
              Restore
            </button>
            <button onClick={discardDraft} className="btn-secondary text-sm">
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-4">
          {error}
        </div>
      )}

      {loadingRequirement ? (
        <p className="text-black/60">Loading requirement…</p>
      ) : (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0">
            {/* LEFT: Client info */}
            <div className="xl:col-span-8 min-w-0">
              <ClientInfoForm
                client={client}
                onClientChange={(next) => {
                  setClient(next);
                  if (requirement) markMetaDirty(); // client edits don't trigger autosave on first creation
                }}
                targetAge={targetAge}
                onTargetAgeChange={handleTargetAgeChange}
                noOfProducts={noOfProducts}
                onNoOfProductsChange={handleNoOfProductsChange}
                readOnlyPhone={isEdit}
              />
            </div>

            {/* RIGHT: Notes + Files — visible only after first save */}
            <aside className="xl:col-span-4 space-y-6 min-w-0">
              {requirement ? (
                <>
                  <NotesSection requirementId={requirement.id} />
                  <FileUploadSection requirementId={requirement.id} />
                </>
              ) : (
                <div className="card text-sm text-black/60 dark:text-slate-400">
                  <p className="font-medium text-black dark:text-slate-100 mb-1">
                    Notes &amp; files
                  </p>
                  <p>
                    Save the requirement first to add notes or upload files.
                  </p>
                </div>
              )}
            </aside>
          </div>

          {/* FULL WIDTH: Product table */}
          <ProductTable
            products={products}
            onChange={handleRowChange}
            onDelete={handleRowDelete}
            onAddRow={handleAddRow}
            onInsertAfter={handleInsertAfter}
            activeIndex={activeRowIndex}
            onActiveChange={setActiveRowIndex}
          />

          {/* FULL WIDTH: Matching catalog items (auto-filtered from latest requirement row) */}
          <CatalogSuggestions
            products={products}
            activeRowIndex={activeRowIndex}
            requirementId={requirement?.id}
            onAutoSave={async () => {
              const req = await saveAll();
              if (req && !isEdit)
                navigate(`/requirements/${req.id}`, { replace: true });
              return req?.id ?? null;
            }}
          />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-4 mt-6 sticky bottom-0 bg-white dark:bg-slate-900 py-3 border-t border-black/10 dark:border-white/10">
        <button
          onClick={handleSave}
          disabled={manualSaving}
          className="btn-primary">
          {manualSaving ? "Saving…" : "Save requirements"}
        </button>
        <button
          onClick={handleCreateProposal}
          disabled={manualSaving}
          className="btn-secondary">
          Create proposal →
        </button>
      </div>
    </Layout>
  );
}
