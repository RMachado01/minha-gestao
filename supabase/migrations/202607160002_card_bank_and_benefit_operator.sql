-- Identidade visual: banco emissor do cartão de crédito.
alter table public.credit_cards add column if not exists bank text;
