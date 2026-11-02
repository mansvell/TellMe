import { Capacitor } from "@capacitor/core";
import { nativeAuthStorage } from "../mobile/storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Les variables Supabase sont manquantes dans .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { storage: Capacitor.isNativePlatform() ? nativeAuthStorage : undefined },
});
