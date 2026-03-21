-- Clean up all test data

-- Delete confirmations for test activities
DELETE FROM confirmations WHERE activity_id IN (SELECT id FROM activities);

-- Delete all activities
DELETE FROM activities;

-- Delete product_clients
DELETE FROM product_clients;

-- Delete client_assignments
DELETE FROM client_assignments;

-- Delete organization_clients
DELETE FROM organization_clients;

-- Delete all clients
DELETE FROM clients;

-- Delete all products
DELETE FROM products;

-- Delete all packages
DELETE FROM packages;

-- Delete all media_plans
DELETE FROM media_plans;

-- Delete all campaign_types
DELETE FROM campaign_types;

-- Delete notifications
DELETE FROM notifications;

-- Delete audit_log entries
DELETE FROM audit_log;

-- Delete system_logs
DELETE FROM system_logs;

-- Delete trash_registry
DELETE FROM trash_registry;