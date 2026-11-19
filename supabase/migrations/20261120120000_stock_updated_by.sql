-- Suya Factory: who last changed a supermarket's stock (shown to staff and in
-- the Telegram stock list, e.g. "out · Tolu (Telegram), 2:15pm").
alter table public.stores
  add column stock_updated_by text check (stock_updated_by is null or length(stock_updated_by) <= 100);

-- Staff changing stock from the website: record their name.
create or replace function public.set_store_stock(p_store_id uuid, p_in_stock boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'SF:not_staff';
  end if;
  update public.stores
  set in_stock = p_in_stock,
      stock_updated_at = now(),
      out_reported_at = null,
      stock_updated_by = (
        select left(coalesce(nullif(btrim(p.full_name), ''), 'Staff'), 100)
        from public.profiles p where p.id = (select auth.uid())
      )
  where id = p_store_id;
  if not found then
    raise exception 'SF:not_found';
  end if;
end;
$$;
