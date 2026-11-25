# Activer Fun dans TellMe

Appliquer supabase/migrations/20261123_fun_secrets_storytimes.sql dans le SQL Editor du projet Supabase existant. La migration peut être exécutée plusieurs fois. Elle ajoute les Storytimes, les boîtes Secrets et leurs fonctions. Elle conserve les tables des groupes, Buzz, invitations et profils.

Pour renommer un groupe depuis ses informations, appliquer aussi supabase/migrations/20261123_group_name.sql. Seul son créateur peut modifier le nom d'un groupe encore actif, entre 2 et 40 caractères.

Appliquer supabase/migrations/20261123_storytime_views.sql pour les compteurs et spectateurs de Storytimes. La liste et le nombre sont réservés à l'auteur, dans Mes Storytimes. Chaque compte ne compte qu'une fois ; les lectures de l'auteur sont exclues. Les vues déjà enregistrées restent prises en compte. Les comptes supprimés disparaissent du compteur et de la liste. La liste charge 50 personnes à la fois.

Pour un projet déjà activé, appliquer supabase/migrations/20261123_secrets_public_anonymity.sql. La validation du lien Secrets ne renvoie plus le pseudo du destinataire. La page publique conserve uniquement le titre d'envoi anonyme, le champ et la langue, avec la palette bleu/cyan de la page publique des sondages.

Les Storytimes sont visibles pendant 24 heures aux utilisateurs inscrits. La liste publique ne renvoie aucun identifiant d'auteur. Chaque auteur peut avoir cinq histoires actives et dix publications par jour. Seul l'auteur peut supprimer son histoire. Les signalements se consultent avec les droits administrateur dans tellme_private.storytime_reports.

Chaque boîte possède un identifiant public aléatoire stable. Le lien utilise le domaine du site sur le web et le domaine public configuré sur l'application native. L'envoi public ne crée pas de compte. Il utilise une vérification cryptographique légère dans un worker, un champ anti-robot et des limites côté serveur. Les adresses IP sont utilisées sous forme d'empreintes salées dans les tables privées. Les limites sont de dix messages par tranche de dix minutes par empreinte et cinquante messages par heure par boîte. Les répétitions d'une même requête ne créent pas de doublon.

Le contenu d'un Secret est accessible à son seul destinataire. Les actions de lecture, réponse et suppression vérifient le propriétaire côté serveur. Une réponse est enregistrée uniquement avec « Enregistrer la réponse ». La carte peut être transmise à la feuille de partage du système ou enregistrée en PNG 1080 × 1920. La publication dans le Statut/Story de l'application choisie reste à effectuer par l'utilisateur.

Les cartes Secrets ne contiennent ni l'URL ni la mention « lien en description » dans l'image. Le lien reste transmis en légende au partage. La couleur d'une Storytime indique son thème ; le bouton d'information détaille les couleurs et les limites. La lecture occupe tout l'écran et avance après cinq secondes, avec pause lors d'un appui prolongé, du signalement ou du passage en arrière-plan.

Le bouton Partager le lien dans Fun transmet une affiche PNG 1080 × 1920 avec « Dis moi tout en anonyme », le logo, TellMe, un appel à cliquer et deux flèches. Le PNG est préparé avant l'appui pour préserver le geste requis par le partage système. Sur un navigateur sans partage de fichiers, l'image est téléchargée et le lien est partagé ou copié. Les accès Copier le lien et Trouver une question ne sont plus affichés dans Fun ; les questions restent dans Buzz. Les affiches Buzz et Questions affichent TellMe sans étoiles ; l'affiche des sondages n'affiche plus de feu.

Les questions et sondages du chat sont affichés au centre, sans bulle personnelle, pseudo, actions d'expéditeur ni coches personnelles. Les citations utilisent un intitulé neutre. Les messages ordinaires gardent leurs bulles et accusés de réception.

Palette Storytimes : vert/Quotidien, violet doux/Confidences, rose pastel/Amour et relations, bleu/Mystère, rouge/Drôle, jaune/Privé. Le jaune indique un secret personnel révélé anonymement ; la visibilité reste commune à tous les utilisateurs. Les clés enregistrées des couleurs sont conservées pour les histoires existantes. La palette des cartes Secrets reste indépendante. Les paramètres affichent Version 1.0.3 en bas de page.

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

## Version 1.0.3 : Storys regroupées et commentaires

Appliquer `supabase/migrations/20261125_story_groups_comments.sql` dans le SQL Editor du même projet Supabase, après la migration Fun initiale. Ce script est réexécutable. Aucun secret ni nouvelle variable d’environnement n’est nécessaire. Sans lui, les nouveaux regroupements et commentaires ne peuvent pas se charger.

Chaque auteur occupe un seul cercle, avec toutes ses histoires actives classées par publication. La grille affiche quatre cercles par rangée sur téléphone, huit sur tablette et ordinateur, avec deux rangées au départ. Voir plus ajoute deux rangées. Les badges de nombre et les libellés sous les cercles personnels sont masqués. La clé publique de regroupement est une empreinte salée ; le pseudo et l’UUID du profil de l’auteur ne sont pas renvoyés. Les publications personnelles gardent leur cercle à droite de Publier.

En lecture : appui à gauche/précédente, à droite/suivante, au centre/pause. Un appui prolongé suspend aussi la lecture. Tirer vers le bas ferme la Story avec une animation ; les textes longs restent défilables. Signaler est placé à gauche de Pause, avec une icône seule sur téléphone. Le bouton Commentaires ouvre la Story concernée sous la grille.

Les commentaires sont accessibles aux utilisateurs inscrits uniquement tant que la Story est active. Ils affichent les deux premiers caractères alphanumériques du pseudo, avec normalisation des accents et sa couleur, sans pseudo complet ni identifiant de profil. Ils sont ordonnés du plus ancien au plus récent, avec vingt commentaires par page, chargement des précédents et raccourci haut/bas. Les nouvelles contributions sont rechargées toutes les quinze secondes lorsque l’onglet est visible.

Un commentaire contient au maximum 600 caractères ; un compte peut en envoyer vingt par tranche de cinq minutes. Les envois répétés après une erreur réseau utilisent un identifiant stable pour éviter les doublons. Chaque compte dispose d’une réaction par commentaire : aimer, ne pas aimer ou rire. Cliquer à nouveau la retire ; en choisir une autre la remplace. Un utilisateur peut supprimer ses propres commentaires. La suppression d’une Story ou d’un profil supprime les données associées par cascade. Les tables sont privées ; toutes les opérations passent par des fonctions qui contrôlent le compte et l’expiration.

`npm run test:fun` vérifie également le regroupement, la pagination, les préfixes de pseudos, l’idempotence, les réactions, les autorisations, les limites et l’expiration.

L’ouverture des commentaires ferme explicitement le lecteur et garde un seul écran actif avec l’histoire sélectionnée. Le champ de saisie est placé juste sous la carte, avant la liste défilante. La section des autres auteurs porte le titre TellMe-Storys. Dans Fun, les bulles décoratives sont discrètes, adaptées au thème et arrêtées si le système demande de réduire les animations. Ces ajustements ne demandent pas de nouvelle migration SQL.
