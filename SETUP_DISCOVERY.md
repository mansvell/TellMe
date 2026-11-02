# Découverte des utilisateurs et langues

## Mise à jour Supabase

Exécuter `supabase/migrations/20261102_user_discovery.sql` dans le SQL Editor du projet Supabase existant.

Cette migration ajoute le répertoire et ses invitations. Elle réutilise les tables `profiles`, `groups`, `group_members` ainsi que la fonction existante `create_group(group_name, group_color, group_lifetime_minutes)`. Le code SQL a été testé dans une base locale reproduisant les colonnes utilisées par le projet ; le schéma réel doit correspondre à ces éléments.

Le bouton « Trouver d’autres utilisateurs » est accessible sur Accueil et Invitations. La recherche affiche les pseudonymes et les couleurs des autres utilisateurs autorisant les invitations. Les invitations envoyées et reçues sont regroupées dans l’onglet Invitations. Une acceptation crée une conversation commune, un refus ne crée aucun groupe.

Le réglage « Autoriser les invitations » couvre aussi la découverte. Les messages existants et les invitations depuis le chat continuent d’utiliser leur parcours actuel.

## Langues

Français, anglais et allemand sont disponibles dès l’accueil et dans les paramètres. Le choix est enregistré sur l’appareil et, lorsqu’un compte existe, dans `profiles.language`. Les textes d’interface, les questions proposées, les dates et les unités sont localisés. Les pseudonymes, messages, noms de groupes et sondages rédigés par les utilisateurs sont conservés tels quels.

Les traductions se trouvent dans `src/i18n/catalog.ts` et les fonctions de langue dans `src/i18n/runtime.ts`.
