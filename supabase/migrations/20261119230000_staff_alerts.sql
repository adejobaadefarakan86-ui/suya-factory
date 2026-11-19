-- Suya Factory: Telegram staff alerts
-- Stamped when the "new paid order" alert has been sent, so Paystack's double
-- confirmation (customer return + webhook) never sends it twice.
alter table public.orders add column paid_alert_sent_at timestamptz;

-- Orders paid before alerts existed: treat as already announced.
update public.orders set paid_alert_sent_at = now()
where status in ('paid', 'preparing', 'out_for_delivery', 'delivered');
