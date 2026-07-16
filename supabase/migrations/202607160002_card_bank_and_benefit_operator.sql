-- Identidade visual: banco emissor do cartão e operadora do benefício (VR/VA).
alter table public.credit_cards add column if not exists bank text;
alter table public.transactions add column if not exists benefit_operator text;
