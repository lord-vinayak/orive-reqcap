# Bug Report — Orive Requirement Tool — 2026-06-22

## Summary
- Critical: 3 open, 0 fixed
- Intermediate: 9 open, 0 fixed
- Normal: 1 open, 0 fixed

## 🔴 Critical

### BUG-001: Duplicate Row Numbering on Deletion
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** `handleRowDelete` removes a product row from the `products` array state but does not recalculate the `row_number` of subsequent rows.
- **Trigger:** If a row is deleted (e.g., deleting row 2 out of 3), the remaining rows keep their original indices. Adding a new row then assigns it `row_number: products.length + 1` (which calculates to 3), resulting in multiple rows sharing `row_number: 3`. 
- **Impact:** Corrupts the `row_number` ordering in the UI.
- **Suggested Fix:** Re-map and update `row_number` for all remaining rows after a deletion.
- **Status:** Open

### BUG-002: WebSocket Authentication Bypass
- **File:** backend/apps/crm_projects/consumers.py:11
- **Issue:** `TaskUpdateConsumer.connect()` unconditionally calls `self.accept()` without checking if the user is authenticated. Because SimpleJWT does not automatically populate WebSocket auth state from headers, `AnonymousUser` is allowed to connect.
- **Trigger:** Any client connects to the `/ws/tasks/` endpoint.
- **Impact:** Complete auth bypass. Any unauthenticated user can listen to the `task_updates` group and receive sensitive internal broadcasts (client names, phone numbers, task statuses).
- **Suggested Fix:** Add an explicit auth check (e.g. `if not self.scope['user'].is_authenticated: self.close()`) or implement a token-based handshake in `connect`.
- **Status:** Open

### BUG-003: Form Data Boolean Parsing Flaw (Always True)
- **File:** backend/apps/crm_projects/views.py:444
- **Issue:** `request.data.get('approved')` is checked for truthiness directly. When data is submitted as `multipart/form-data` or `application/x-www-form-urlencoded`, boolean values are parsed as strings. `bool("false")` evaluates to `True`. The same flaw exists for `is_complete` (line 375) and `order_booked` (line 514).
- **Trigger:** A client submits `approved=false` via form data to reject a sample.
- **Impact:** The system evaluates `"false"` as True and incorrectly approves the sample (or completes a stage/books an order), causing severe data corruption in the workflow.
- **Suggested Fix:** Use DRF serializers for boolean validation, or explicitly check `str(val).lower() == 'true'`.
- **Status:** Open

## 🟡 Intermediate

### BUG-004: Stale State Mutation for Auto-Notes
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** In `saveAll`, newly created `tmp-` product rows are successfully saved via the API, resolving with real IDs. However, immediately after `requirementService.addProduct`, `syncAutoNotes(req.id, products)` is called using the *old* `products` array reference that still contains `tmp-` IDs.
- **Trigger:** Saving a requirement with new products that have `tmp-` IDs.
- **Impact:** Results in the note being created in the database with an `[AUTO|tmp-12345|...]` marker, only for it to be redundantly deleted and recreated with the true ID on the next save execution.
- **Suggested Fix:** Await the response of the product creation and use the returned product IDs for the `syncAutoNotes` call.
- **Status:** Open

### BUG-005: Null Costing Data Treated as Zero
- **File:** frontend/src/pages/Proposal.tsx
- **Issue:** Inside `computedCosts()`, missing numerical inputs parsed via `Number(c.cost_per_kg)` evaluate to `0` because `Number(null)` and `Number('')` return `0`.
- **Trigger:** Leaving manufacturing or packaging costs empty (null/undefined).
- **Impact:** Consequently, `!isNaN(0)` is strictly `true`, allowing the application to bypass intentional `null` fallbacks. Missing costs are falsely represented and calculated as a $0 cost in the total `mrp` instead of flagging them as missing/empty.
- **Suggested Fix:** explicitly check for `null` or `''` before coercing with `Number()`.
- **Status:** Open

### BUG-006: Batched Requests Bail Out without `Promise.allSettled`
- **File:** frontend/src/components/BulkEmailModal.tsx
- **Issue:** The `handleConfirm` handler uses `Promise.all()` to map `clientService.patch` operations. 
- **Trigger:** If a single patch rejects due to a network or validation error.
- **Impact:** The entire Promise immediately throws. This traps the workflow in the `catch` block without invoking `sendWelcomeEmail`, discarding any successful client email patches within that batch.
- **Suggested Fix:** Use `Promise.allSettled` and handle rejections individually.
- **Status:** Open

### BUG-007: UI Render Misalignment for Enumerated Data
- **File:** frontend/src/pages/RequirementSearch.tsx
- **Issue:** `RequirementSearch.tsx` displays the raw ID `{r.no_of_products ?? '—'}` in the table, creating a UI data inconsistency.
- **Trigger:** Viewing the requirement search table.
- **Impact:** Raw IDs are shown instead of user-friendly labels (like "10 and more") that are correctly shown in `RequirementView.tsx`.
- **Suggested Fix:** Use the same `PRODUCT_COUNT_LABEL` mapping used in `RequirementView.tsx`.
- **Status:** Open

### BUG-008: Comment Partial Update Failure (Logic Error)
- **File:** backend/apps/crm_projects/serializers.py:40
- **Issue:** `TaskCommentSerializer.validate()` enforces that either `stage_task` or `standalone_task` is provided. In `partial_update` (PATCH requests), these fields are omitted from `request.data`.
- **Trigger:** A user edits their comment via PATCH to `/api/comments/<id>/` providing only `{"text": "new text"}`.
- **Impact:** The validation hook raises a `ValidationError` because it checks `data.get()` instead of accounting for the existing `instance` state, completely breaking comment editing.
- **Suggested Fix:** Modify `validate` to check if `self.instance` exists, or merge `data` with `self.instance` state before enforcing required fields.
- **Status:** Open

### BUG-009: Project Number Generation Race Condition
- **File:** backend/apps/crm_projects/models.py:116
- **Issue:** The `save` method computes `project_no` in a `while` loop using `.exists()`. This is not thread-safe and is vulnerable to race conditions under concurrent requests.
- **Trigger:** Two requests create a project for the same client on the same day at the exact same time.
- **Impact:** Both transactions pass the `exists()` check with the same number, leading to a DB `IntegrityError` (500 crash) when attempting to insert the duplicate `project_no`.
- **Suggested Fix:** Use a sequence table, `select_for_update()`, or wrap the generation in a loop that catches `IntegrityError`.
- **Status:** Open

### BUG-010: State Management Desync on Stage Completion
- **File:** backend/apps/crm_projects/views.py:381
- **Issue:** `complete_stage` sets `is_complete=True` and `completed_at`, but fails to update the associated `task_status` to `'closed'` or set `actual_closure_date` for the task representation.
- **Trigger:** A user marks a stage complete using the `complete_stage` action.
- **Impact:** The stage shows as completed in the project timeline, but its associated task remains permanently stuck in "Pending" or "WIP" in the Task Tracker.
- **Suggested Fix:** When marking a stage as complete, also update `task_status = 'closed'` and set `actual_closure_date`.
- **Status:** Open

### BUG-011: Unvalidated Date String Assignment
- **File:** backend/apps/crm_projects/views.py:613
- **Issue:** `planned_closure_date` is read directly from `request.data` and assigned to a `DateField` on the model in `update_planned_date` and `assign_stage` without validation.
- **Trigger:** A user submits a malformed date string (e.g. `"not-a-date"`) as the planned date.
- **Impact:** The unvalidated string causes a DB adapter crash (500 Error) when Django's `save()` method attempts to format it for the database.
- **Suggested Fix:** Validate the date string using a DRF serializer or `datetime.strptime` before assigning it to the model.
- **Status:** Open

### BUG-012: Swallowed Exception on Invoice Upload
- **File:** backend/apps/crm_projects/views.py:944
- **Issue:** A bare `except Exception: pass` swallows any failure occurring during Google Drive invoice upload.
- **Trigger:** A Google Drive API error, network failure, or missing credentials occurs when creating a payment with an invoice.
- **Impact:** The payment is successfully created in the DB without the invoice file attached, and the user is never notified that the file upload failed.
- **Suggested Fix:** Log the error and return a warning in the response, or use a proper DRF validation flow to fail the transaction.
- **Status:** Open

## 🟢 Normal

### BUG-013: Missing Promise Await Validation in Error Recovery
- **File:** frontend/src/pages/RequirementForm.tsx
- **Issue:** Within `handleExtract`, a failed `handleAddRow` execution will swallow the API error via a silent `catch`, resolving successfully. 
- **Trigger:** Audio extraction overlay trying to add a row when API fails.
- **Impact:** The subsequent `.then` resolves assuming a row was added, operating on a potentially stale `products` length and silently completing the audio extraction overlay with no new row.
- **Suggested Fix:** Rethrow or handle the error in the `catch` block properly to prevent the `.then` chain from executing blindly.
- **Status:** Open

## ✅ Resolved
