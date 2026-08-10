-- ============================================
-- SUPPORT SYSTEM ENHANCED SCHEMA (REFERENCE)
-- This file documents the current support system structure
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Support Tickets - Main conversation container
-- Columns: id, user_id, subject, status, assigned_admin_id, created_at, updated_at
-- Status: 'open', 'pending', 'replied', 'closed'

-- Support Messages - Individual messages within a ticket
-- Columns: id, ticket_id, sender_type, sender_id, message, created_at
-- sender_type: 'user' | 'admin'

-- ============================================
-- 2. VIEW: support_tickets_summary
-- ============================================
-- Provides enriched ticket data for admin listing:
-- - User info (name, email, avatar)
-- - Assigned admin name
-- - Message count
-- - Last message preview
-- - Last message sender type
-- - Last message timestamp

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- support_tickets:
--   "Users view own tickets" - SELECT - user_id = auth.uid()
--   "Users create tickets" - INSERT - user_id = auth.uid()
--   "Admins full access tickets" - ALL - is_admin()

-- support_messages:
--   "Users view own ticket messages" - SELECT - ticket belongs to user
--   "Users insert to own tickets" - INSERT - ticket belongs to user AND sender_type = 'user'
--   "Admins full access messages" - ALL - is_admin()

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- on_new_support_ticket:
--   Creates in-app notification for all admins when new ticket is created

-- on_support_reply:
--   Creates in-app notification for user when admin replies

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- get_open_tickets_count() -> integer
--   Returns count of tickets with status = 'open'
--   Used for admin dashboard badge
