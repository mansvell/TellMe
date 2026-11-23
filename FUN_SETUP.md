# Activer Fun dans TellMe

Appliquer supabase/migrations/20261123_fun_secrets_storytimes.sql dans le SQL Editor du projet Supabase existant. La migration peut être exécutée plusieurs fois. Elle ajoute les Storytimes, les boîtes Secrets et leurs fonctions. Elle conserve les tables des groupes, Buzz, invitations et profils.

Les Storytimes sont visibles pendant 24 heures aux utilisateurs inscrits. La liste publique ne renvoie aucun identifiant d'auteur. Chaque auteur peut avoir cinq histoires actives et dix publications par jour. Seul l'auteur peut supprimer son histoire. Les signalements se consultent avec les droits administrateur dans tellme_private.storytime_reports.

Chaque boîte possède un identifiant public aléatoire stable. Le lien utilise le domaine du site sur le web et le domaine public configuré sur l'application native. L'envoi public ne crée pas de compte. Il utilise une vérification cryptographique légère dans un worker, un champ anti-robot et des limites côté serveur. Les adresses IP sont utilisées sous forme d'empreintes salées dans les tables privées. Les limites sont de dix messages par tranche de dix minutes par empreinte et cinquante messages par heure par boîte. Les répétitions d'une même requête ne créent pas de doublon.

Le contenu d'un Secret est accessible à son seul destinataire. Les actions de lecture, réponse et suppression vérifient le propriétaire côté serveur. Une réponse est enregistrée uniquement avec « Enregistrer la réponse ». La carte peut être transmise à la feuille de partage du système ou enregistrée en PNG 1080 × 1920. La publication dans le Statut/Story de l'application choisie reste à effectuer par l'utilisateur.

## Notifications système des Secrets

Le compteur Fun et l'alerte dans TellMe fonctionnent avec Realtime dès application de la migration. Aucun message n'est envoyé à la communauté lorsqu'une Storytime est publiée.

Pour les notifications en arrière-plan, déployer supabase/functions/notify-secret/index.ts sur le même projet Supabase. Le fichier supabase/config.toml désactive la vérification JWT pour ce webhook. La fonction vérifie elle-même son secret partagé dans l'en-tête x-tellme-hook.

Configurer dans les secrets de l'Edge Function les variables suivantes.

- FUN_WEBHOOK_SECRET, une valeur aléatoire d'au moins 32 caractères.
- VAPID_PUBLIC_KEY, identique à VITE_VAPID_PUBLIC_KEY du site.
- VAPID_PRIVATE_KEY, la clé privée correspondante déjà utilisée par le service d'envoi des notifications de messages.
- VAPID_SUBJECT, le contact VAPID existant sous forme mailto ou URL HTTPS.

SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par l'environnement Supabase. Les clés privées restent dans Supabase.

Créer ensuite un Database Webhook sur public.secrets, événement INSERT, vers l'Edge Function notify-secret. Ajouter l'en-tête x-tellme-hook avec la valeur de FUN_WEBHOOK_SECRET. Le webhook attend le format standard Supabase avec type, schema, table et record.id. La fonction relit le destinataire dans la base, respecte son réglage de notifications et utilise ses abonnements existants. Le contenu du Secret n'est pas affiché sur l'écran verrouillé. Les abonnements expirés sont supprimés.

Sur iPhone et iPad, ouvrir le site depuis l'icône d'écran d'accueil et autoriser les notifications. Les limites des sessions Safari et des applications natives sont détaillées dans MOBILE_SETUP.md. Les notifications natives FCM/APNs demandent leur configuration séparée.

## Vérification

npm run test:fun exécute la migration dans PostgreSQL/PGlite sur un schéma de test et vérifie les droits d'accès, l'expiration, les limites et les envois sans compte. npm run test:mobile, npm run test:receipts, npm run build et npm run lint complètent les vérifications.
