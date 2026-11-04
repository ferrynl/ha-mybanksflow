import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

declare global {
  interface Window {
    MYBANKSFLOW_LOCAL?: { anonKey: string };
  }
}

const config = window.MYBANKSFLOW_LOCAL;
if (!config?.anonKey) throw new Error("Lokale configuratie ontbreekt");
const apiUrl = new URL(".", document.baseURI);

export const supabase = createClient<Database>(apiUrl.href, config.anonKey, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true, storageKey: "mybanksflow-local-auth" },
});