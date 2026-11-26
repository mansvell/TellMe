# TellMe 1.0.5

Branche : `version-1.0.5`. Aucun changement automatique du projet Supabase ni de la production.

## 1. Seuil de récompense

Exécuter `supabase/migrations/20261126_reward_threshold_500.sql` dans le SQL Editor, après les migrations 1.0.4 dont `20261125_story_top_five.sql`.
Le seuil devient **500 points** pour les trois premiers : 30 €, 20 €, 15 €. Le classement reste réel et nominatif. Les plafonds quotidiens sont inchangés. Les résultats déjà clôturés ne sont pas recalculés.

## 2. Retrouver le même compte dans Safari et depuis l’icône

L’ajout à l’écran d’accueil ne copie pas le localStorage dans lequel Supabase conserve la session. Aucune session n’est exportée dans un lien, un cookie ou une table publique.

**L’inscription reste sous pseudo, sans e-mail ni mot de passe obligatoire.** La sauvegarde est proposée uniquement à la demande dans les paramètres : elle n’est pas nécessaire pour publier, discuter ou gagner des points.

La récupération facultative ajoute une identité e-mail vérifiée à l’utilisateur Supabase existant. Elle conserve son UUID, son pseudo, ses groupes et ses points. Aucun nouvel utilisateur n’est inscrit par le formulaire de connexion.

Configurer dans **Supabase → Authentication** :

1. Activer le fournisseur Email et conserver la confirmation des adresses. Activer **Allow manual linking** dans les paramètres d’authentification pour la conversion des utilisateurs anonymes.
2. URL du site : `https://tellmeall.vercel.app`. Autoriser exactement `https://tellmeall.vercel.app/account` dans Redirect URLs. Pour tester sur une préversion, autoriser aussi son URL `/account` exacte, puis la retirer si elle n’est plus utilisée.
3. Configurer un fournisseur SMTP adapté à la production. Le service d’e-mail de test Supabase est limité ; il ne suffit pas pour tous les membres.
4. Les modèles Change Email et Reset Password doivent conserver leur lien `{{ .ConfirmationURL }}`. Pour permettre la saisie du code dans TellMe, ajouter aussi `{{ .Token }}` au modèle Change Email. Ne jamais publier de clé service_role dans Vercel côté client.

Parcours :

- Ouvrir **la version où le compte existe déjà**, puis Paramètres → Sauvegarder mon compte.
- Saisir son adresse privée, suivre le lien de confirmation reçu, puis revenir dans cette version et cliquer « J’ai confirmé mon adresse ». Un code peut aussi être saisi si le modèle d’e-mail l’inclut.
- Choisir un mot de passe d’au moins 10 caractères. Attendre la confirmation « Ton compte est prêt ».
- Depuis l’icône TellMe : **J’ai déjà un compte**, puis la même adresse et le même mot de passe.
- « Mot de passe oublié ? » envoie un lien permettant de définir un nouveau mot de passe sur `/account`.

L’adresse n’est pas écrite dans le profil public. Un pseudo seul ne permet pas de prouver la propriété d’un compte. Les comptes distincts créés précédemment ne sont pas fusionnés. Un compte anonyme dont on a perdu toutes les sessions et qui n’a jamais été sécurisé n’est pas récupérable par ce mécanisme.

## 3. Invitations dans la version installée

Les web-apps iOS ne disposent pas de la capture des liens externes des applications natives. Le manifeste possède déjà un `id`, un `scope` et un `start_url` cohérents ; les modifier ne force pas l’ouverture de l’icône depuis WhatsApp ou Safari.

Sur iPhone/iPad, la page d’invitation ouverte dans le navigateur propose **Copier l’invitation**. Ouvrir ensuite l’icône TellMe et utiliser le bouton à icône de lien, **Rejoindre avec un lien**, dans Accueil. Coller le code ou le lien : l’aperçu puis l’adhésion utilisent le compte de cette version. L’utilisateur confirme toujours l’adhésion. Aucun accès au presse-papiers n’est demandé automatiquement.

La page d’invitation et l’inscription proposent aussi « J’ai déjà un compte » : la connexion reprend l’invitation initiale. Les liens d’un autre domaine, les protocoles dangereux et les redirections arbitraires sont refusés. Sur une préversion, les liens de production restent acceptés pour ouvrir l’aperçu dans la version courante.

## 4. Publicité : prête à configurer, désactivée par défaut

Aucun compte AdSense n’étant encore disponible, aucune publicité réelle ni revenu ne sont activés par cette mise à jour. Aucun script publicitaire n’est demandé avec la configuration par défaut.

Avant activation :

1. Créer un compte AdSense et faire valider le domaine de production et le contenu par Google. L’approbation et les revenus ne sont pas garantis. Faire vérifier l’éligibilité du contenu communautaire et du programme de récompenses.
2. Créer un bloc Display responsive. Désactiver les annonces automatiques : le seul emplacement prévu par TellMe est sous la liste des discussions dans Accueil, séparé et marqué Publicité. Aucune annonce dans les chats, les messages anonymes ou les formulaires de connexion.
3. Installer une **CMP certifiée Google, compatible TCF 2**, avec le code exact fourni par son tableau de bord. Elle doit être chargée indépendamment du script AdSense pour exposer `window.__tcfapi`. Configurer le consentement et un accès permanent à sa modification. Le gestionnaire Google peut exposer `googlefc.showRevocationMessage()` ; le bloc affiche alors le bouton correspondant. Pour une autre CMP, ajouter son bouton de gestion des choix à l’emplacement imposé par cette CMP avant activation.
4. Ajouter l’entrée `ads.txt` fournie par Google à `public/ads.txt`, avec le véritable identifiant éditeur. Aucun identifiant fictif n’est livré.
5. Dans Vercel, ajouter les variables ci-dessous pour **Production seulement**, puis redéployer. Ne pas activer de vraies annonces dans les préversions et les tests.

```dotenv
VITE_ADS_ENABLED=true
VITE_ADSENSE_CLIENT=ca-pub-VOTRE_IDENTIFIANT_16_CHIFFRES
VITE_ADSENSE_HOME_SLOT=VOTRE_BLOC_10_CHIFFRES
```

La publicité reste masquée si les identifiants sont invalides, si la CMP manque, si le consentement n’est pas finalisé/autorisé ou si le chargement échoue. Les signaux TCF pour Google, les finalités et les restrictions éditeur sont pris en compte. L’application choisit de ne pas charger de publicité en l’absence de signaux TCF, y compris hors Europe. Révoquer le consentement après chargement recharge la page pour interrompre le script. Le chargement du bloc est différé jusqu’à son apparition à l’écran. La version Capacitor ne charge pas AdSense : une éventuelle application native nécessitera une intégration publicitaire adaptée.

**Ne jamais rémunérer les vues/clics publicitaires ni leur attribuer des points** : les récompenses TellMe restent liées uniquement aux actions utiles existantes. Ne pas demander aux membres de cliquer pour soutenir l’application. Ne pas cliquer soi-même sur ses annonces pour les tester.

La politique de confidentialité de l’app précise l’e-mail de récupération et la publicité facultative. Compléter les informations opérateur/consentement exigées pour le compte et les territoires concernés avant activation.

## Validation réelle à faire avant fusion

- Deux sessions isolées sur un véritable iPhone/iPad : sécuriser le compte existant, se connecter depuis l’icône et vérifier même pseudo, groupes et score.
- Confirmer un e-mail puis créer le mot de passe ; tester un code invalide et un mot de passe incorrect. Tester la réinitialisation avec le SMTP configuré.
- Ouvrir une invitation depuis WhatsApp, copier son code, puis coller depuis l’icône et rejoindre le bon groupe avec le bon compte.
- Les tests automatisés et la préversion ne remplacent pas la vérification de Safari installé ni de l’envoi réel d’e-mails.

Sources : [WebKit sur l’isolation des données](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/), [limites de capture des liens PWA iOS](https://github.com/WICG/pwa-url-handler/blob/main/explainer.md), [Supabase : conversion d’un compte anonyme](https://supabase.com/docs/guides/auth/auth-anonymous), [CMP Google](https://support.google.com/adsense/answer/13554020), [règles AdSense](https://support.google.com/adsense/answer/48182).
