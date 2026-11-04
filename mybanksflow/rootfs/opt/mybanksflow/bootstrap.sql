-- Infrastructure owned by this isolated appliance, never run against Cloud.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
CREATE ROLE supabase_auth_admin LOGIN CREATEROLE;
CREATE ROLE supabase_storage_admin LOGIN BYPASSRLS;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
GRANT USAGE ON SCHEMA public, extensions, auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, extensions TO supabase_auth_admin, supabase_storage_admin;
GRANT CREATE ON SCHEMA public TO supabase_storage_admin;
ALTER ROLE supabase_auth_admin SET search_path TO auth, public, extensions;
ALTER ROLE supabase_storage_admin SET search_path TO storage, public, extensions;
-- Auth creates and owns its JWT helper functions during its own migrations.
GRANT USAGE ON SCHEMA auth TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role, authenticated;