import { supabase } from "../lib/supabase";

export async function createProfile(
    id: string,
    displayName: string
) {

    const { error } = await supabase
        .from("profiles")
        .insert({

            id,

            display_name: displayName,

        });

    if (error) throw error;

}