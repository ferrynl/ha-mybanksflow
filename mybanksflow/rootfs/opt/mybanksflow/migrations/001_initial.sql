-- =============================================================
-- MyBanksFlow — Database Schema for Self-Hosted Setup
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── Helper Functions ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ─── Role System ─────────────────────────────────────────────

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ─── Profiles ────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Encryption ──────────────────────────────────────────────

CREATE TABLE public.encryption_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  encryption_key TEXT NOT NULL
);
GRANT ALL ON public.encryption_config TO service_role;
ALTER TABLE public.encryption_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.encryption_config FROM PUBLIC, anon, authenticated;

-- Insert encryption key (will be replaced by env var during init)
INSERT INTO public.encryption_config (id, encryption_key)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'));

CREATE OR REPLACE FUNCTION public.encrypt_text(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE key TEXT;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL; END IF;
  SELECT encryption_key INTO key FROM public.encryption_config WHERE id = 1;
  RETURN encode(pgp_sym_encrypt(plaintext, key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_text(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE key TEXT;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  SELECT encryption_key INTO key FROM public.encryption_config WHERE id = 1;
  BEGIN
    RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
  EXCEPTION WHEN OTHERS THEN
    RETURN ciphertext;
  END;
END;
$$;

-- ─── Bank Accounts ───────────────────────────────────────────

CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  iban TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '210 100% 55%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  account_type TEXT NOT NULL DEFAULT 'betaalrekening',
  starting_balance NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- ─── Categories ──────────────────────────────────────────────

CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT '210 100% 55%',
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_category_id UUID REFERENCES public.categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- ─── Contacts ────────────────────────────────────────────────

CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  iban TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Encrypt contact IBAN on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.iban IS DISTINCT FROM OLD.iban THEN
    NEW.iban = public.encrypt_text(NEW.iban);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions';

CREATE TRIGGER encrypt_contacts_before_write
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_contact_fields();

-- Decrypted view for contacts
CREATE OR REPLACE VIEW public.contacts_decrypted WITH (security_invoker = true) AS
SELECT
  id, user_id, name,
  public.decrypt_text(iban) AS iban,
  created_at, updated_at
FROM public.contacts;

-- ─── Transactions ────────────────────────────────────────────

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  type TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  contact_id UUID REFERENCES public.contacts(id),
  transaction_code TEXT,
  transaction_type TEXT,
  payment_reference TEXT,
  original_description TEXT,
  is_planned BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT,
  end_date TEXT,
  planned_transaction_id UUID REFERENCES public.transactions(id),
  bank TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Encrypt sensitive transaction fields
CREATE OR REPLACE FUNCTION public.encrypt_transaction_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.original_description IS DISTINCT FROM OLD.original_description THEN
    NEW.original_description = public.encrypt_text(NEW.original_description);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
    NEW.payment_reference = public.encrypt_text(NEW.payment_reference);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions';

CREATE TRIGGER encrypt_transactions_before_write
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_transaction_fields();

-- Decrypted view for transactions
CREATE OR REPLACE VIEW public.transactions_decrypted WITH (security_invoker = true) AS
SELECT
  id, user_id, description, amount, currency, type,
  category_id, date, bank_account_id, contact_id,
  transaction_code, transaction_type,
  public.decrypt_text(payment_reference) AS payment_reference,
  public.decrypt_text(original_description) AS original_description,
  is_planned, frequency, end_date, planned_transaction_id,
  bank, is_recurring, created_at
FROM public.transactions;

-- ─── Categorization Rules ────────────────────────────────────

CREATE TABLE public.categorization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pattern)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorization_rules TO authenticated;
GRANT ALL ON public.categorization_rules TO service_role;

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules" ON public.categorization_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON public.categorization_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.categorization_rules FOR DELETE USING (auth.uid() = user_id);

-- ─── Budgets ─────────────────────────────────────────────────

CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  contact_id UUID REFERENCES public.contacts(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- ─── Feature Requests ────────────────────────────────────────

CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'feature',
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_requests TO authenticated;
GRANT ALL ON public.feature_requests TO service_role;

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feature requests" ON public.feature_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feature requests" ON public.feature_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update feature requests" ON public.feature_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any feature request" ON public.feature_requests FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ─── Feature Request Votes ───────────────────────────────────

CREATE TABLE public.feature_request_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_request_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_request_votes TO authenticated;
GRANT ALL ON public.feature_request_votes TO service_role;

ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view votes" ON public.feature_request_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own votes" ON public.feature_request_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.feature_request_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── Import Errors ───────────────────────────────────────────

CREATE TABLE public.import_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank TEXT NOT NULL,
  file_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  file_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.import_errors TO authenticated;
GRANT ALL ON public.import_errors TO service_role;

ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own import errors" ON public.import_errors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own import errors" ON public.import_errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all import errors" ON public.import_errors FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own import errors" ON public.import_errors FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any import error" ON public.import_errors FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ─── Admin RPC Functions ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_tx_counts()
RETURNS TABLE(user_id UUID, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.user_id, COUNT(*) as count
  FROM public.transactions t
  GROUP BY t.user_id
$$;

CREATE OR REPLACE FUNCTION public.admin_rule_counts()
RETURNS TABLE(user_id UUID, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.user_id, COUNT(*) as count
  FROM public.categorization_rules r
  GROUP BY r.user_id
$$;

-- ─── Storage Buckets ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-logos', 'bank-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-files', 'contract-files', false)
ON CONFLICT (id) DO NOTHING;

-- ─── Contract Attachments ────────────────────────────────────


CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  name text NOT NULL, start_date date NOT NULL, end_date date,
  cancellation_period text NOT NULL DEFAULT 'maand', status text NOT NULL DEFAULT 'actief',
  payment_frequency text NOT NULL DEFAULT 'maand', amount numeric NOT NULL DEFAULT 0,
  customer_number text, policy_number text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  planned_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own contracts" ON public.contracts TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.contract_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_attachments TO authenticated;
GRANT ALL ON public.contract_attachments TO service_role;

ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract attachments" ON public.contract_attachments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contract attachments" ON public.contract_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contract attachments" ON public.contract_attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for bank-logos bucket
CREATE POLICY "Anyone can view bank logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-logos');

CREATE POLICY "Admins can upload bank logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bank logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bank logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'bank-logos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for contract-files bucket
CREATE POLICY "Users can upload contract files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own contract files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own contract files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT ON public.contacts_decrypted, public.transactions_decrypted TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_tx_counts(), public.admin_rule_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tx_counts(), public.admin_rule_counts() TO service_role;
REVOKE EXECUTE ON FUNCTION public.encrypt_text(text), public.decrypt_text(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encrypt_text(text), public.decrypt_text(text) TO authenticated, service_role;
