# Activer Fun dans TellMe

Appliquer supabase/migrations/20261123_fun_secrets_storytimes.sql dans le SQL Editor du projet Supabase existant. La migration peut être exécutée plusieurs fois. Elle ajoute les Storytimes, les boîtes Secrets et leurs fonctions. Elle conserve les tables des groupes, Buzz, invitations et profils.

Pour renommer un groupe depuis ses informations, appliquer aussi supabase/migrations/20261123_group_name.sql. Seul son créateur peut modifier le nom d'un groupe encore actif, entre 2 et 40 caractères.

Appliquer supabase/migrations/20261123_storytime_views.sql pour les compteurs et spectateurs de Storytimes. La liste et le nombre sont réservés à l'auteur, dans Mes Storytimes. Chaque compte ne compte qu'une fois ; les lectures de l'auteur sont exclues. Les vues déjà enregistrées restent prises en compte. Les comptes supprimés disparaissent du compteur et de la liste. La liste charge 50 personnes à la fois.

Pour un projet déjà activé, appliquer supabase/migrations/20261123_secrets_public_anonymity.sql. La validation du lien Secrets ne renvoie plus le pseudo du destinataire. La page publique conserve uniquement le titre d'envoi anonyme, le champ et la langue, avec la palette bleu/cyan de la page publique des sondages.

Les Storytimes sont visibles pendant 4 jours aux utilisateurs inscrits. La liste publique ne renvoie aucun identifiant d'auteur. Chaque auteur peut avoir cinq histoires actives et dix publications par jour. Seul l'auteur peut supprimer son histoire. Les signalements se consultent avec les droits administrateur dans tellme_private.storytime_reports.

Chaque boîte possède un identifiant public aléatoire stable. Le lien utilise le domaine du site sur le web et le domaine public configuré sur l'application native. L'envoi public ne crée pas de compte. Il utilise une vérification cryptographique légère dans un worker, un champ anti-robot et des limites côté serveur. Les adresses IP sont utilisées sous forme d'empreintes salées dans les tables privées. Les limites sont de dix messages par tranche de dix minutes par empreinte et cinquante messages par heure par boîte. Les répétitions d'une même requête ne créent pas de doublon.

Le contenu d'un Secret est accessible à son seul destinataire. Les actions de lecture, réponse et suppression vérifient le propriétaire côté serveur. Une réponse est enregistrée uniquement avec « Enregistrer la réponse ». La carte peut être transmise à la feuille de partage du système ou enregistrée en PNG 1080 × 1920. La publication dans le Statut/Story de l'application choisie reste à effectuer par l'utilisateur.

Les cartes Secrets ne contiennent ni l'URL ni la mention « lien en description » dans l'image. Le lien reste transmis en légende au partage. La couleur d'une Storytime indique son thème ; le bouton d'information détaille les couleurs et les limites. La lecture occupe tout l'écran et avance après cinq secondes, avec pause lors d'un appui prolongé, du signalement ou du passage en arrière-plan.

Le bouton Partager le lien dans Fun transmet une affiche PNG 1080 × 1920 avec « Dis moi tout en anonyme », le logo, TellMe, un appel à cliquer et deux flèches. Le PNG est préparé avant l'appui pour préserver le geste requis par le partage système. Sur un navigateur sans partage de fichiers, l'image est téléchargée et le lien est partagé ou copié. Les accès Copier le lien et Trouver une question ne sont plus affichés dans Fun ; les questions restent dans Buzz. Les affiches Buzz et Questions affichent TellMe sans étoiles ; l'affiche des sondages n'affiche plus de feu.

Les questions et sondages du chat sont affichés au centre, sans bulle personnelle, pseudo, actions d'expéditeur ni coches personnelles. Les citations utilisent un intitulé neutre. Les messages ordinaires gardent leurs bulles et accusés de réception.

Palette Storytimes : vert/Quotidien, violet doux/Confidences, rose pastel/Amour et relations, bleu/Mystère, rouge/Drôle, jaune/Privé. Le jaune indique un secret personnel révélé anonymement ; la visibilité reste commune à tous les utilisateurs. Les clés enregistrées des couleurs sont conservées pour les histoires existantes. La palette des cartes Secrets reste indépendante. Les paramètres affichent Version 1.0.4 en bas de page.

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

## Version 1.0.4 : réponses, notifications et défi mensuel

### Activation sur le projet Supabase existant

1. Appliquer `supabase/migrations/20261125_story_threads_rewards.sql`, puis `supabase/migrations/20261125_story_threads_ui.sql` et enfin `supabase/migrations/20261125_story_top_five.sql`, après les migrations précédentes. Le script est réexécutable. Les Storys encore actives passent à quatre jours à compter de leur publication ; les Storys expirées ne réapparaissent pas.
2. Déployer `supabase/functions/notify-story/index.ts` sur le même projet : `supabase functions deploy notify-story`. Cette fonction réutilise les mêmes secrets VAPID et `FUN_WEBHOOK_SECRET` que `notify-secret` ; ne jamais les mettre dans le code client.
3. Créer un Database Webhook sur `public.story_notifications`, événement **INSERT**, vers `notify-story`, avec l’en-tête `x-tellme-hook` égal à `FUN_WEBHOOK_SECRET`. La vérification JWT est désactivée pour cette fonction, mais son secret partagé reste obligatoire et vérifié côté serveur.
4. Si `pg_cron` est actif, la migration programme le nettoyage des Storys expirées toutes les heures et la clôture mensuelle à 00 h UTC le premier. Sinon, activer cette extension dans Supabase puis relancer ces trois migrations dans le même ordre. Les RPC bloquent immédiatement l’accès aux Storys expirées, même avant le nettoyage physique.
5. Fusionner `version-1.0.4` vers la branche de production après activation du SQL. Vercel déploie ensuite la version habituelle du site.

Les commentaires principaux et leurs réponses sont paginés séparément. Chaque réponse apparaît sous son véritable parent, avec un décalage limité pour rester lisible sur téléphone. Le texte du parent n’est plus répété. « Voir les X autres commentaires » affiche progressivement les réponses masquées. Supprimer un parent conserve les réponses, devenues commentaires principaux. Le compteur inclut toutes les réponses et le champ reste au-dessus de la liste défilante. « En Story » ouvre la publication avec le commentaire accroché, son préfixe de pseudo et sa couleur. Le serveur valide la source et son expiration ; la citation disparaît si la source est supprimée ou expirée.

La cloche dans Storys affiche les notifications et ouvre la Story concernée. L’auteur est informé des nouveaux commentaires ; l’auteur d’un commentaire est informé d’une réponse ou d’une citation en Story. Une personne ne reçoit pas de notification pour sa propre action et un même destinataire ne reçoit pas deux notifications pour une réponse qui concerne à la fois sa Story et son commentaire. Les commentaires ne sont jamais exposés dans les push système. Les envois répétés avec le même identifiant ne créent ni commentaire, ni notification, ni point supplémentaires.

Un son discret est disponible au premier plan, après une interaction avec l’app, pour les notifications des Storys, les Secrets et les nouveaux messages du chat ouvert. Le réglage **Sons des notifications** permet de le couper. En arrière-plan, le son est celui du système et dépend des autorisations, du mode silencieux et de Concentration ; un son personnalisé sur iPhone n’est pas garanti. Le service worker évite la double alerte système/son interne quand TellMe est déjà visible. Les notifications push nécessitent le webhook ci-dessus et les abonnements existants ; le fonctionnement de l’app ouverte ne dépend pas de ce webhook.

### Points et récompenses

Le trophée dans Storys ouvre le classement réel. Les règles figurent aussi dans Infos, en français, anglais et allemand. Une Story publiée, un commentaire/réponse et une réaction au commentaire d’autrui valent chacun **1 point**. Il n’y a ni multiplicateur ni concurrent fictif. Les plafonds journaliers UTC sont 10 publications, 20 commentaires/réponses cumulés et 10 réactions. Une réaction modifiée ou retirée puis remise ne peut jamais cumuler plusieurs points. Un texte de Story identique dans le mois ou un commentaire identique sous la même Story ne rapporte pas de point supplémentaire. Les réactions à son propre commentaire ne rapportent rien.

Supprimer volontairement sa Story ou son commentaire annule son point du mois courant. Supprimer sa Story annule aussi ses propres points de commentaires/réactions supprimés avec elle ; les autres personnes ne sont pas pénalisées. Retirer sa réaction annule le point de cette réaction ; la remettre peut seulement restaurer le même point. Les quotas consommés ne sont pas libérés par une suppression. L’expiration automatique et ses suppressions par cascade ne retirent pas les points acquis. Les mois déjà clôturés restent fixes.

Les points sont calculés uniquement par des fonctions privées côté serveur. Le client ne peut pas écrire dans le registre. Chaque mois UTC commence avec un nouveau score. Les égalités sont départagées par la première attribution du score, puis par un ordre stable. Les cinq premiers pseudos, positions et scores réels sont visibles par tous les utilisateurs inscrits, y compris sans point ; chaque personne voit aussi sa propre position réelle, même hors top 5. Une place sans participant reste libre.

Les trois premières positions sont fixes : **Gold / 30 €**, **Silver / 20 €**, **Bronze / 15 €**. Les quatrième et cinquième positions sont finalistes sans récompense en argent. Le budget est donc **65 € par mois complet avec trois gagnants éligibles**. Les versements ne sont pas automatisés : l’organisateur doit réellement les effectuer. Aucun paiement n’est simulé ou marqué versé par l’app.

Les résultats des mois terminés sont archivés dans `tellme_private.monthly_results`, inaccessible aux utilisateurs. L’administration peut les consulter depuis SQL Editor et organiser les versements :

```sql
select month, position, user_id, points, reward_eur, payment_status
from tellme_private.monthly_results
order by month desc, position;
```

Après un versement réel uniquement, l’administration peut changer `payment_status` de `pending` à `paid` pour le mois et la position concernés. Le gagnant voit le statut de son dernier résultat ; l’app ne collecte ni coordonnées bancaires ni données de paiement. Les récompenses et les règles de participation doivent être assumées par l’organisateur avant la mise en production.

### Vérifications de la version

`npm run test:fun` couvre les fils de réponses, les citations, les compteurs, les destinataires et droits des notifications, le retrait des points, les anti-doublons, les quotas, le vrai top 5, les archives mensuelles, les push et le son. Les vérifications mobiles, des accusés de lecture et le build restent inclus dans les contrôles habituels.

### Ajustement des fils et des récompenses

Après `20261125_story_threads_rewards.sql`, appliquer aussi `supabase/migrations/20261125_story_threads_ui.sql`, puis redéployer `notify-story`. Les commentaires principaux et les réponses sont paginés séparément : deux réponses affichées au départ, puis dix à chaque ouverture de « Voir les X autres commentaires ». Une réponse à une réponse reste sous son véritable parent. Le texte du parent n’est plus répété dans la réponse ; les citations dans une Story sont conservées.

Le trophée garde le top 5, avec une présentation plus compacte. Les règles figurent uniquement dans Infos, dans la section Récompenses séparée de Storytimes. Il faut **au moins 800 points** pour recevoir un gain. Les nouvelles clôtures attribuent **30 €, 20 € et 15 €** aux trois premières positions uniquement si le score atteint 800 ; sinon la récompense est de zéro et le versement est `not_applicable`. Les résultats des mois déjà clôturés ne sont pas modifiés. Le classement reste visible sous ce seuil et aucun faux concurrent n’est ajouté.

Les notifications affichent désormais le pseudo réel enregistré de la personne qui a commenté ou répondu, par exemple « Alex a commenté ta Story ». Ce nom est calculé dans la base, jamais choisi par l’appelant du webhook. Il est visible uniquement par les destinataires concernés ; le texte du commentaire reste absent des push. Cette visibilité du pseudo est expliquée dans Infos.

### Seuil de 800 points et top 5 nominatif

Appliquer `supabase/migrations/20261125_story_top_five.sql` en dernier. Si les scripts précédents sont déjà appliqués, seul ce nouveau fichier est nécessaire pour cet ajustement. Il fait passer l’éligibilité des gains à **800 points par mois**, côté serveur, sans changer les résultats déjà clôturés. Le seuil figure seulement dans Infos. Les pseudos des cinq premiers sont renvoyés aux utilisateurs inscrits, même sans point et hors top 5 ; aucun identifiant de profil supplémentaire n’est exposé. Le trophée affiche des badges distincts Gold, Silver et Bronze avec leurs fonds doré, argenté et cuivré.

Les plafonds d’actions et la limite de cinq Storys actives restent inchangés. Les 40 points correspondent à la somme des plafonds journaliers, pas à un gain net garanti tous les jours : la limite de cinq Storys actives pendant quatre jours réduit les publications comptabilisables sans suppression. Le seuil de 800 ne garantit donc pas une qualification en vingt journées d’activité.

### Préparation du son et réactivité

La création d’`AudioContext` est préparée hors des événements d’entrée, dans une tâche de temps libre ou un minuteur de repli. Le premier geste utilisateur reprend uniquement le contexte déjà préparé ; aucun moteur audio n’est construit dans `pointerdown` ou dans le clic. Les écouteurs d’activation sont retirés quand le son fonctionne, puis réarmés si le navigateur suspend le contexte. Les préparations sont annulées au démontage et respectent le réglage muet et l’arrière-plan.

Ce correctif réduit un traitement évitable au premier appui après rechargement. Une capture INP ciblant un SVG `path` ne permet pas à elle seule d’attribuer tout le ralentissement à l’audio ou au SQL. La préparation hors clic et l’activation du son ont été vérifiées dans le navigateur et par des tests de cycle de vie. Aucun SQL supplémentaire n’est nécessaire pour ce correctif audio.


## Version 1.0.5 : comptes multi-appareils et invitations

Le seuil courant est désormais **500 points**, après application de `supabase/migrations/20261126_reward_threshold_500.sql`. Les indications de 800 points ci-dessus décrivent l’ancienne version 1.0.4. Aucun résultat clôturé n’est modifié. Voir [UPDATE_1.0.5.md](UPDATE_1.0.5.md) pour l’activation de la récupération facultative du compte, les limites iOS et la préparation AdSense (désactivée sans compte approuvé et CMP).

Le transfert **sans e-mail** utilise désormais `supabase/migrations/20261126_account_transfer.sql`. Il est indépendant de la sauvegarde facultative par e-mail : Paramètres → Transférer mon compte, puis Saisir mon code de transfert depuis l’icône TellMe. Code à usage unique de 5 minutes ; même utilisateur Supabase, déconnexion locale de la source après consommation. Voir la section 5 du guide 1.0.5 avant activation.
