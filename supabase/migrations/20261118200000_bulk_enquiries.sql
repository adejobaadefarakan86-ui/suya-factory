-- =====================================================================
-- Suya Factory: BULK & CUSTOM ORDER ENQUIRIES (1kg and above)
-- =====================================================================
-- Customers (guests too) can SEND an enquiry but can never READ any.
-- Staff read them and move them along: new -> contacted -> converted / closed.
-- Plain ASCII only (see the encoding note in the fix migration).
-- =====================================================================

create type public.enquiry_status as enum ('new', 'contacted', 'converted', 'closed');

create table public.bulk_enquiries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null default auth.uid(),
  country      public.country_code not null,
  name         text not null check (length(btrim(name)) between 1 and 100),
  phone        text not null check (
                 phone ~ '^[0-9+()\s-]+$'
                 and length(regexp_replace(phone, '\D', '', 'g')) between 7 and 15),
  email        text check (email is null or (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200)),
  quantity_kg  numeric(8, 1) not null check (quantity_kg >= 1 and quantity_kg <= 100000),
  needed_by    date,
  location     text not null check (length(btrim(location)) between 1 and 200),
  message      text check (message is null or length(message) <= 1000),
  status       public.enquiry_status not null default 'new',
  staff_notes  text check (staff_notes is null or length(staff_notes) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index bulk_enquiries_status_idx on public.bulk_enquiries (status, created_at desc);

create trigger bulk_enquiries_updated_at before update on public.bulk_enquiries
  for each row execute function public.set_updated_at();

alter table public.bulk_enquiries enable row level security;

-- Anyone may send ONE kind of row: a brand-new enquiry, with no staff fields
-- filled in, linked to themselves (or to nobody, for guests).
create policy "enquiries: anyone can send" on public.bulk_enquiries
  for insert to anon, authenticated
  with check (
    status = 'new'
    and staff_notes is null
    and user_id is not distinct from (select auth.uid())
  );

-- Only staff can read and update them. (Nobody can delete: keep the history.)
create policy "enquiries: staff read" on public.bulk_enquiries
  for select to authenticated using (public.is_staff());
create policy "enquiries: staff update" on public.bulk_enquiries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
