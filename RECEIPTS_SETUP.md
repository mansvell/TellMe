# Accusés de réception et liste des lecteurs

Exécuter une fois `supabase/migrations/20261122_message_receipts.sql` dans le SQL Editor du projet Supabase existant. La migration peut être exécutée de nouveau sans dupliquer les accusés.

- Horloge : l'envoi est en cours, sans confirmation du serveur.
- Une coche grise : le message a été enregistré par le serveur.
- Deux coches grises : tous les destinataires présents lors de l'envoi l'ont reçu dans leur application connectée.
- Deux coches bleues : tous ces destinataires ont affiché la bulle dans leur conversation active.

Le client accuse réception des messages récupérés, y compris depuis Accueil. Il ne signale une lecture que lorsque la bulle est visible pendant au moins 350 ms, dans un onglet actif, sans fenêtre de dialogue ouverte. Une réception ne signifie donc pas une lecture.

Cliquer sur les coches d'un message envoyé, ou ouvrir ses actions puis **Informations du message**, affiche les pseudos sous **Lu par**, **Reçu par** et **En attente de réception**. Les heures ne sont affichées que lorsqu'elles sont connues.

Les destinataires sont enregistrés au moment de l'envoi : rejoindre le groupe plus tard ne change pas le statut d'un ancien message. Les lecteurs existants sont repris dans la liste, sans inventer les heures manquantes. Les doubles coches de réception/lecture complète sont disponibles pour les nouveaux messages envoyés après application de la migration ; l'ensemble exact des anciens destinataires n'est pas reconstruit arbitrairement.

Les tables d'accusés sont protégées par RLS. Seul l'auteur actif peut consulter les informations de ses propres messages. Un destinataire peut confirmer uniquement ses propres réceptions et lectures dans ses groupes actifs. Le code ne permet pas au client de renseigner les accusés d'une autre personne.

Avant l'application SQL, le chat conserve son fonctionnement et les lecteurs déjà enregistrés restent consultables. Les nouveaux accusés de réception nécessitent cette migration.
