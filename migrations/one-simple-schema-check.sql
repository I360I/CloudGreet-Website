-- One Simple Database Schema Check (No Timeout)
-- This single query will show us everything we need

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('calls', 'businesses', 'toll_free_numbers', 'ai_agents')
ORDER BY t.table_name, c.ordinal_position;
