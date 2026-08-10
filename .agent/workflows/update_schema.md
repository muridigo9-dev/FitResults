---
description: How to maintain the Database Schema Documentation
---

# Update Database Schema Documentation

This workflow describes the process for keeping `docs/DATABASE_SCHEMA.md` in sync with the actual Supabase migrations.

## When to Run
- After creating any new migration file in `supabase/migrations/`.
- After modifying an existing migration file.

## Steps

1. **Analyze the Migration**:
   - Open the new `.sql` file.
   - Identify `CREATE TABLE`, `ALTER TABLE`, or `DROP TABLE` statements.
   - Identify new columns, foreign keys, or constraints.

2. **Update `docs/DATABASE_SCHEMA.md`**:
   - If a new table is created, add a new section under the relevant Module (e.g., Nutrition, Fitness).
   - If columns are added/modified, update the table's list.
   - Mark "Pending" or "Planned" tables as "Active" once the migration is applied.

3. **Verify References**:
   - Ensure Foreign Keys point to existing tables documented in the file.
   - Check if any deleted tables are removed from the doc.

4. **Commit**:
   - Include the update to `docs/DATABASE_SCHEMA.md` in the same commit as the migration file.

## Key Schema Facts (Do Not Forget)
- **Roles**: There is NO `roles` table. Use `user_roles` table with `role` enum column (`app_role`).
- **Visibility**: Content (Workouts, Diets, Dishes) usually uses `visibility_type` ('global', 'academy', 'private') + `academy_id` / `owner_id`.
