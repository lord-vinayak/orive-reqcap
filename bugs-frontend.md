# Bug Report — Frontend — 2026-06-22

## Summary
- Critical: 1 open, 0 fixed
- Intermediate: 4 open, 0 fixed
- Normal: 0 open, 0 fixed

## 🔴 Critical

### BUG-001: Duplicate Row Numbering on Deletion
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** `handleRowDelete` removes a product row from the `products` array state but does not recalculate the `row_number` of subsequent rows.
- **Trigger:** If a row is deleted (e.g., deleting row 2 out of 3), the remaining rows keep their original indices. Adding a new row then assigns it `row_number: products.length + 1` (which calculates to 3), resulting in multiple rows sharing `row_number: 3`. 
- **Impact:** Corrupts the `row_number` ordering in the UI.
- **Suggested Fix:** Re-map and update `row_number` for all remaining rows after a deletion.
- **Status:** Open

## 🟡 Intermediate

### BUG-002: Stale State Mutation for Auto-Notes
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** In `saveAll`, newly created `tmp-` product rows are successfully saved via the API, resolving with real IDs. However, immediately after `requirementService.addProduct`, `syncAutoNotes(req.id, products)` is called using the *old* `products` array reference that still contains `tmp-` IDs.
- **Trigger:** Saving a requirement with new products that have `tmp-` IDs.
- **Impact:** Results in the note being created in the database with an `[AUTO|tmp-12345|...]` marker, only for it to be redundantly deleted and recreated with the true ID on the next save execution.
- **Suggested Fix:** Await the response of the product creation and use the returned product IDs for the `syncAutoNotes` call.
- **Status:** Open

### BUG-003: Null Costing Data Treated as Zero
- **File:** frontend/src/pages/Proposal.tsx
- **Issue:** Inside `computedCosts()`, missing numerical inputs parsed via `Number(c.cost_per_kg)` evaluate to `0` because `Number(null)` and `Number('')` return `0`.
- **Trigger:** Leaving manufacturing or packaging costs empty (null/undefined).
- **Impact:** Consequently, `!isNaN(0)` is strictly `true`, allowing the application to bypass intentional `null` fallbacks. Missing costs are falsely represented and calculated as a $0 cost in the total `mrp` instead of flagging them as missing/empty.
- **Suggested Fix:** explicitly check for `null` or `''` before coercing with `Number()`.
- **Status:** Open

### BUG-004: Batched Requests Bail Out without `Promise.allSettled`
- **File:** frontend/src/components/BulkEmailModal.tsx
- **Issue:** The `handleConfirm` handler uses `Promise.all()` to map `clientService.patch` operations. 
- **Trigger:** If a single patch rejects due to a network or validation error.
- **Impact:** The entire Promise immediately throws. This traps the workflow in the `catch` block without invoking `sendWelcomeEmail`, discarding any successful client email patches within that batch.
- **Suggested Fix:** Use `Promise.allSettled` and handle rejections individually.
- **Status:** Open

### BUG-005: UI Render Misalignment for Enumerated Data
- **File:** frontend/src/pages/RequirementSearch.tsx
- **Issue:** `RequirementSearch.tsx` displays the raw ID `{r.no_of_products ?? '—'}` in the table, creating a UI data inconsistency.
- **Trigger:** Viewing the requirement search table.
- **Impact:** Raw IDs are shown instead of user-friendly labels (like "10 and more") that are correctly shown in `RequirementView.tsx`.
- **Suggested Fix:** Use the same `PRODUCT_COUNT_LABEL` mapping used in `RequirementView.tsx`.
- **Status:** Open

## 🟢 Normal

### BUG-006: Missing Promise Await Validation in Error Recovery
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** Within `handleExtract`, a failed `handleAddRow` execution will swallow the API error via a silent `catch`, resolving successfully. 
- **Trigger:** Audio extraction overlay trying to add a row when API fails.
- **Impact:** The subsequent `.then` resolves assuming a row was added, operating on a potentially stale `products` length and silently completing the audio extraction overlay with no new row.
- **Suggested Fix:** Rethrow or handle the error in the `catch` block properly to prevent the `.then` chain from executing blindly.
- **Status:** Open
