# Admin Action Logging Implementation Guide

## Overview

This guide documents the admin action logging system and provides patterns for implementing logging across all admin-protected controllers.

## Setup Complete

### 1. Schema Updates
- `admin_action_logs.entity_id` changed from `integer` to `text` for UUID/serial flexibility
- Action types updated: `CREATE`, `UPDATE`, `DELETE`, `BULK_UPDATE`, `BULK_DELETE`
- Indexes added for efficient querying

### 2. Helper Functions Created
Location: `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/utils/adminActionLogger.ts`

Functions:
- `logAdminAction(ctx, params, trx?)` - Log single admin action
- `logAdminActions(ctx, logs[], trx?)` - Log multiple actions in bulk

Enums:
- `AdminAction` - Action types (from `adminActionLogger.ts`)
- `EntityName` - Entity types (from `activityLogger.ts` - the single source of truth)

### 3. Migrations
- `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/sql/update_admin_action_logs.sql` - Apply to existing databases
- Updated `initial_tables_and_sql.sql` with new schema

## Implementation Pattern

### Step 1: Add Import to Controller

```typescript
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
```

### Step 2: Add Logging to Controller Functions

#### CREATE Operations

```typescript
export async function createEntity(ctx: ProtectedContext, params: any) {
	const created = await entityQueries.createEntity(ctx, params);

	// Log admin action
	await logAdminAction(ctx, {
		entityId: created.id,
		entityName: EntityName.ENTITY_TYPE,
		action: AdminAction.CREATE,
		value: { /* relevant created fields */ },
	});

	return created;
}
```

#### BULK CREATE Operations

```typescript
export async function createEntities(ctx: ProtectedContext, items: any[]) {
	const created = await entityQueries.createEntities(ctx, items);

	// Log admin actions in bulk
	await logAdminActions(
		ctx,
		created.map((item) => ({
			entityId: item.id,
			entityName: EntityName.ENTITY_TYPE,
			action: AdminAction.CREATE,
			value: { /* relevant fields */ },
		}))
	);

	return created;
}
```

#### UPDATE Operations

```typescript
export async function updateEntity(ctx: ProtectedContext, id: number, params: any) {
	const updated = await entityQueries.updateEntity(ctx, id, params);

	// Log admin action
	await logAdminAction(ctx, {
		entityId: id,
		entityName: EntityName.ENTITY_TYPE,
		action: AdminAction.UPDATE,
		value: params, // Log what was changed
	});

	return updated;
}
```

#### DELETE Operations

```typescript
export async function deleteEntity(ctx: ProtectedContext, id: number) {
	// Get entity info BEFORE deletion for logging
	const entity = await entityQueries.getEntity(ctx, id);

	await entityQueries.deleteEntity(ctx, id);

	// Log admin action AFTER successful deletion
	if (entity) {
		await logAdminAction(ctx, {
			entityId: id,
			entityName: EntityName.ENTITY_TYPE,
			action: AdminAction.DELETE,
			value: { /* key identifying fields */ },
		});
	}
}
```

#### Within Transactions

```typescript
export async function complexOperation(ctx: ProtectedContext, params: any) {
	await db.transaction().execute(async (trx) => {
		const result = await trx.insertInto('table')...

		// Log within the same transaction
		await logAdminAction(ctx, {
			entityId: result.id,
			entityName: EntityName.ENTITY_TYPE,
			action: AdminAction.CREATE,
		}, trx); // Pass transaction as 3rd argument

		return result;
	});
}
```

## Controllers Requiring Implementation

### Completed ✅
- [x] **userController.ts** (3 operations)
  - createUsers → EntityName.USER, AdminAction.CREATE (bulk)
  - updateUser → EntityName.USER, AdminAction.UPDATE
  - deleteUser → EntityName.USER, AdminAction.DELETE

### Pending Implementation

#### High Priority (Core Template Management)

1. **pageController.ts** (5 operations)
   - `createPage` → EntityName.PAGE, AdminAction.CREATE
     - Also creates PAGE_INSTANCE - log both or just PAGE?
   - `copyPageTemplate` → EntityName.PAGE, AdminAction.CREATE (duplicate)
   - `createPageInstance` → EntityName.PAGE_INSTANCE, AdminAction.CREATE
   - `modifyPage` → EntityName.PAGE, AdminAction.UPDATE
   - `deletePageInstance` → EntityName.PAGE_INSTANCE, AdminAction.DELETE

2. **questionController.ts** (4 operations)
   - `createQuestion` → EntityName.QUESTION, AdminAction.CREATE
   - `copyQuestion` → EntityName.QUESTION, AdminAction.CREATE (duplicate with answers)
   - `modifyQuestion` → EntityName.QUESTION, AdminAction.UPDATE
   - `deleteQuestion` → EntityName.QUESTION, AdminAction.DELETE

3. **answerController.ts** (4 operations)
   - `createAnswer` → EntityName.ANSWER, AdminAction.CREATE
   - `copyAnswer` → EntityName.ANSWER, AdminAction.CREATE (duplicate)
   - `modifyAnswer` → EntityName.ANSWER, AdminAction.UPDATE
   - `deleteAnswer` → EntityName.ANSWER, AdminAction.DELETE

#### Medium Priority (Configuration & Management)

4. **checklistController.ts** (3 operations)
   - `createChecklist` → EntityName.CHECKLIST, AdminAction.CREATE
   - `modifyChecklist` → EntityName.CHECKLIST, AdminAction.UPDATE
   - `deleteChecklist` → EntityName.CHECKLIST, AdminAction.DELETE

5. **feedController.ts** (3 operations)
   - `createFeed` → EntityName.FEED, AdminAction.CREATE
   - `updateFeed` → EntityName.FEED, AdminAction.UPDATE
   - `deleteFeed` → EntityName.FEED, AdminAction.DELETE

6. **claimController.ts** (2 operations)
   - `createClaims` → EntityName.CLAIM, AdminAction.CREATE (bulk)
   - `assignClaim` → EntityName.CHECKLIST_CLAIM, AdminAction.UPDATE

7. **actionController.ts** (1 operation)
   - `upsertAction` → EntityName.ACTION, AdminAction.UPDATE
     - Always updates (uses onConflict), so treat as UPDATE

8. **recoveryController.ts** (5 operations)
   - **Recovery Events:**
     - `createRecoveryEvent` → EntityName.RECOVERY_EVENT, AdminAction.CREATE
       - Also updates claim.actual_recovery
     - `deleteRecoveryEvent` → EntityName.RECOVERY_EVENT, AdminAction.DELETE
       - Also recalculates claim.actual_recovery
   - **Deadlines:**
     - `createDeadline` → EntityName.DEADLINE, AdminAction.CREATE
     - `updateDeadlineStatus` → EntityName.DEADLINE, AdminAction.UPDATE
     - `deleteDeadline` → EntityName.DEADLINE, AdminAction.DELETE

#### Lower Priority (Not Admin-Only or Has Separate Audit)

9. **docController.ts** (2 operations)
   - `createDoc` → EntityName.DOCUMENT, AdminAction.CREATE
   - `deleteDoc` → EntityName.DOCUMENT, AdminAction.DELETE
   - **Note:** NOT admin-only currently (no requireRole in router)

10. **responseController.ts**
    - `upsertQuestionResponses` - Already has response_audit_logs
    - Skip for now

11. **commentController.ts**
    - `createComment`, `deleteComment` - Not admin-only
    - Skip for now

## Entity Names Reference

Available in `EntityName` enum (updated):

```typescript
export enum EntityName {
	// Core entities
	USER = 'user',
	CLIENT = 'client',
	CHECKLIST = 'checklist',
	CLAIM = 'claim',
	CHECKLIST_CLAIM = 'checklist_claim',

	// Template entities
	PAGE = 'page',
	PAGE_INSTANCE = 'page_instance',
	QUESTION = 'question',
	ANSWER = 'answer',

	// Response entities
	QUESTION_RESPONSE = 'question_response',
	COMMENT = 'comment',

	// Configuration entities
	FEED = 'feed',
	ACTION = 'action',
	DOCUMENT = 'document',

	// Recovery & deadline entities
	RECOVERY_EVENT = 'recovery_event',
	DEADLINE = 'deadline',
}
```

## What to Log in the `value` Field

Log enough information to understand:
1. **What changed** (for UPDATE operations)
2. **What was created** (for CREATE operations - key identifying fields)
3. **What was deleted** (for DELETE operations - key identifying fields before deletion)

### Examples:

**CREATE User:**
```typescript
value: { email: u.email, first: u.first, last: u.last, role: u.role }
```

**UPDATE User:**
```typescript
value: params // Log all fields that can be changed
```

**DELETE User:**
```typescript
value: { email: user.email, first: user.first, last: user.last }
```

**CREATE Page:**
```typescript
value: { title: page.title, checklistId: page.checklist_id }
```

**UPDATE Question:**
```typescript
value: { text: params.text, type: params.type, position: params.position }
```

**CREATE RecoveryEvent:**
```typescript
value: { claimId: event.claim_id, recoveryAmount: event.recovery_amount, recoveryDate: event.recovery_date }
```

**CREATE Deadline:**
```typescript
value: { claimId: deadline.claim_id, deadlineDate: deadline.deadline_date, deadlineType: deadline.deadline_type }
```

**UPDATE Feed:**
```typescript
value: params // All updated fields (name, schedule, feed_type, connection_options, status, last_synced_at)
```

## Testing

After implementation, verify logging works:

1. Run migrations to update schema
2. Perform admin operations (create, update, delete)
3. Query admin_action_logs:

```sql
SELECT * FROM admin_action_logs
WHERE client_id = 'your-client-id'
ORDER BY created_at DESC
LIMIT 20;
```

4. Verify:
   - entity_id is populated correctly
   - entity_name matches operation
   - action is correct (CREATE/UPDATE/DELETE)
   - value JSONB contains relevant information
   - user_id matches admin who performed action

## Next Steps

1. Apply the pattern to remaining controllers in priority order
2. Test each controller after implementation
3. Consider creating admin UI to view admin_action_logs
4. Set up retention/archival policy for old logs
5. Add indices if specific query patterns emerge

## Notes

- Logging happens AFTER successful operations (don't log failures)
- For DELETE operations, fetch entity data BEFORE deleting
- Use `logAdminActions()` for bulk operations to reduce DB roundtrips
- Pass transaction parameter when logging within existing transactions
- The `value` field is JSONB - it can store any relevant data structure
