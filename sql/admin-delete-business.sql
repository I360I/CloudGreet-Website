-- admin_delete_business(uuid): cascade-delete a client.
--
-- The admin "Delete client" route used to delete a hardcoded list of child
-- tables, then the businesses row. That list silently drifted: ~55 tables
-- have a NO ACTION / RESTRICT FK to businesses(id) and only ~13 were in the
-- list, so the final delete failed on a FK violation whenever the client had
-- rows in an un-listed table (usage_costs, billing_history, call_logs, ...).
-- That is the "delete button does nothing" bug.
--
-- This function dynamically clears every table whose FK to businesses is
-- NO ACTION ('a') or RESTRICT ('r') - the ones that block - then deletes the
-- business. CASCADE / SET NULL FKs resolve themselves. Self-maintaining: new
-- tables are picked up automatically. Runs in one transaction.
--
-- Idempotent: create or replace.

create or replace function admin_delete_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Null the business->owner link first so deleting the owner user can't
  -- trip a reverse FK.
  begin
    update businesses set owner_id = null where id = p_business_id;
  exception when others then null;
  end;

  for r in
    select con.conrelid::regclass::text as child_table, att.attname as fk_col
    from pg_constraint con
    join pg_class parent on parent.oid = con.confrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and parent.relname = 'businesses'
      and con.confdeltype in ('a','r')
  loop
    execute format('delete from %s where %I = $1', r.child_table, r.fk_col) using p_business_id;
  end loop;

  delete from businesses where id = p_business_id;
end;
$$;
