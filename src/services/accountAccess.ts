import { supabase } from "../lib/supabase";
import { publicLink } from "../mobile/links";
import { t } from "../i18n/runtime";

// Une identité vérifiée est ajoutée à l'utilisateur actuel : aucun profil n'est créé.
export async function recoveryUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error(t("Ce compte est introuvable."));
    return user;
}

export async function linkRecoveryEmail(email: string) {
    await recoveryUser();
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, {
        emailRedirectTo: publicLink("/account"),
    });
    if (error) throw error;
}

export async function verifyRecoveryEmail(email: string, token: string) {
    const original = await recoveryUser();
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email_change" });
    if (error) throw error;
    if (!data.user || data.user.id !== original.id) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(t("La confirmation ne correspond pas à ce compte."));
    }
    return recoveryUser();
}

export async function setRecoveryPassword(password: string) {
    const user = await recoveryUser();
    if (user.is_anonymous || !user.email_confirmed_at) throw new Error(t("Confirme d’abord ton adresse e-mail."));
    if (password.length < 10) throw new Error(t("Choisis un mot de passe d’au moins 10 caractères."));
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
}

export async function signInExistingAccount(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(t("Connexion impossible. Vérifie ton adresse, ton mot de passe et la confirmation de ton e-mail."));
    if (!data.user) throw new Error(t("Ce compte est introuvable."));
    const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(t("Ce compte est introuvable."));
    }
}

export async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: publicLink("/account") });
    if (error) throw error;
}
