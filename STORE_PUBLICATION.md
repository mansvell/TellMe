# Publier TellMe 1.0.2

État vérifié le 23 novembre 2026. Préparation technique, pas une autorisation de publication. Le propriétaire publie en tant que personne physique et ne dispose pas encore de comptes développeur Apple ou Google. Aucune adhésion, clé de signature ou soumission n'a été créée pendant cette préparation.

## État du projet

| Élément | État constaté |
| --- | --- |
| Projets Android et iOS Capacitor | Présents, identifiant `com.mansvell.tellme` à réserver dans les comptes |
| Compilation de contrôle | Le workflow mobile du commit `3123d18a3c8b85b0a1019de7344845a59a7b2ddd` a réussi pour Android debug et iOS simulateur |
| Version préparée | 1.0.2, build natif 3 ; prochaine livraison : incrémenter le numéro de build |
| Android | SDK cible 36, minimum 24 |
| iOS | Minimum iOS 15 ; soumission à construire avec Xcode 26+ et SDK iOS 26+ selon les exigences actuelles |
| Signature de distribution | Pas encore configurée ; les binaires debug et simulateur ne sont pas des livrables pour les stores |
| Android App Bundle | Workflow manuel prêt ; aucun AAB signé n'a encore été produit |
| Notifications natives | FCM/APNs non configurés ; le réglage natif reste désactivé |
| Liens HTTPS ouvrant l'app | Associations à publier après obtention des empreintes et de l'équipe Apple |
| Code en production | La PR nº 2 reste ouverte ; la version finale doit être déployée sur le domaine public avant de diffuser les liens Secrets depuis les apps |
| Signalements | Storytimes : enregistrement privé présent ; consultation et traitement administrateur manuels. Pas de parcours équivalent complet pour les chats et Secrets |
| Blocage ciblé d'utilisateurs | Absent ; désactiver toutes les invitations ne remplace pas ce mécanisme |
| Suppression du compte par son propriétaire | Absente ; le contrôle d'un compte supprimé par l'administrateur ne remplace pas cette fonction |
| Confidentialité | Page publique existante, à compléter pour les traitements, durées, droits et coordonnées de publication |
| Protection des mineurs | Contrôle d'âge et standards de sécurité dédiés non implémentés |

## Décisions et fonctions à traiter avant soumission

Apple mentionne explicitement le chat aléatoire ou anonyme dans la règle 1.2. Comme cet usage est central dans TellMe, le risque de refus est élevé. Un habillage natif ou un meilleur descriptif ne garantit pas l'admission. Un éventuel changement de fonctionnement doit être décidé avec le propriétaire avant de modifier les fonctions de l'app.

Pour les contenus publiés par les utilisateurs, préparer un vrai parcours de signalement et de blocage, des contrôles de contenu adaptés et une organisation pour traiter les signalements. Les règles doivent couvrir les groupes, les Storytimes et les Secrets, y compris les envois sans compte. La manière de bloquer un expéditeur externe doit être définie en conservant l'anonymat de son identité publique.

Ajouter la suppression du compte et des données associées depuis les Paramètres. Pour Google Play, créer aussi une page web permettant d'en demander la suppression. Prévoir la suppression Supabase Auth et les données associées : supprimer seulement le profil ou désactiver le compte ne suffit pas.

Définir le public cible et un contrôle d'âge cohérent. Pour TellMe, les standards de sécurité des enfants de Google s'appliquent à la messagerie anonyme, même si le public annoncé est adulte. Il faut notamment une page publique adaptée à TellMe et un contact chargé de ces signalements.

## Comptes à créer par le propriétaire

| Store | Compte | Coût officiel de référence | Particularités |
| --- | --- | --- | --- |
| Google Play | Personnel | 25 USD à l'inscription, une fois | Vérification d'identité et d'un appareil Android ; test fermé requis pour ce nouveau compte |
| Apple | Apple Developer Program individuel | 99 USD par an, tarif local présenté à l'inscription | Authentification à deux facteurs et vérification d'identité ; le nom légal de la personne sera le nom du vendeur |

Créer le compte Google : https://play.google.com/console/signup

Informations Apple avant adhésion : https://developer.apple.com/programs/enroll/

Les paiements, documents d'identité et contrats sont à traiter par le propriétaire dans les interfaces officielles. Les secrets de signature se stockent dans GitHub Actions ou dans les outils locaux de signature.

## Android : préparer le fichier AAB

Le workflow `.github/workflows/android-store-bundle.yml` produit un App Bundle signé et ne l'envoie pas à Google. Après intégration de ce fichier dans la branche par défaut, ouvrir Actions, choisir **TellMe Android store bundle**, puis lancer le workflow sur la version destinée aux tests.

Créer une clé d'upload privée avec Android Studio : **Build → Generate Signed Bundle / APK → Android App Bundle → Create new**. Conserver le fichier JKS, l'alias et les mots de passe dans un emplacement durable et privé. La clé de debug déjà utilisée pour les essais n'est pas cette clé.

Dans GitHub, ouvrir **Settings → Secrets and variables → Actions**, puis ajouter :

- `TELLME_ANDROID_KEYSTORE_BASE64` : contenu du JKS encodé en base64.
- `TELLME_ANDROID_STORE_PASSWORD` : mot de passe du keystore.
- `TELLME_ANDROID_KEY_ALIAS` : alias de la clé.
- `TELLME_ANDROID_KEY_PASSWORD` : mot de passe de la clé.

Pour créer le base64 sous PowerShell sans l'afficher dans la console :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\chemin-prive\tellme-upload.jks")) | Set-Clipboard
```

Coller le résultat dans le secret GitHub, puis effacer le presse-papiers. Les noms de variables sont des instructions ; aucune valeur privée n'est fournie dans le dépôt.

Le workflow vérifie la présence des secrets, lance les contrôles, construit le web, synchronise Capacitor, crée le bundle release, vérifie sa signature et fournit l'artefact `TellMe-1.0.2-Android-AAB`. La clé temporaire n'est pas ajoutée à l'artefact. Récupérer `app-release.aab` et l'importer dans une piste de test de Play Console avec Play App Signing.

Une installation debug et une installation issue du store peuvent avoir des signatures différentes. Comme l'identité TellMe est liée à sa session locale, prévoir le parcours des testeurs déjà équipés et un éventuel transfert de compte avant de leur demander une réinstallation.

## Android : test fermé et production

Pour ce nouveau compte personnel, prévoir au moins 12 testeurs inscrits au test fermé de manière continue pendant 14 jours. Préparer les retours et corriger les problèmes constatés. Une fois les conditions remplies, demander l'accès à la production et répondre aux questions de Google ; la période de test n'est pas une approbation automatique.

Avant cette demande : fiche complète, classification d'âge fidèle, coordonnées de support, politique de confidentialité publique, déclarations de données, page de suppression du compte, standards de sécurité et fonctions de modération opérationnelles.

## iOS : préparer la distribution après décision sur l'admissibilité

Réserver le Bundle ID, créer TellMe dans App Store Connect et configurer l'équipe de signature. Utiliser un Mac ou un environnement de construction macOS avec Xcode 26+ et le SDK iOS 26+. Le numéro de build doit augmenter à chaque nouvel envoi.

Après vérification de l'app sur de vrais iPhone et iPad, créer une archive de distribution signée pour TestFlight. L'artefact iOS simulateur existant ne peut pas être envoyé comme application de distribution. Préparer ensuite le questionnaire de confidentialité, la classification d'âge, les captures et les instructions de test pour App Review, avec une description fidèle des fonctionnalités anonymes. La décision finale appartient à Apple.

## Dossier de fiche et déclarations

Les descriptions FR/EN/DE sont dans `store/listings/`. Elles n'annoncent pas les notifications natives, qui restent à configurer. Captures et visuels doivent représenter la version finale avec les fonctions de publication requises, avant leur envoi aux stores.

Inventaire technique à confronter aux formulaires des stores et au déploiement réel :

- Identifiant de compte Supabase, pseudo, préférences et acceptation des conditions.
- Groupes, invitations, messages, sondages, Storytimes, Secrets et accusés de lecture/vues.
- Photos, vidéos et fichiers choisis pour l'envoi dans le chat.
- Empreintes salées issues des en-têtes IP pour l'anti-abus des envois publics ; vérifier séparément la journalisation et la conservation chez les hébergeurs.
- Abonnements Web Push existants sur le site ; revoir les déclarations lors de l'ajout de FCM/APNs natifs.

L'anonymat de l'interface ne signifie pas absence de collecte. La durée de conservation, la suppression, les sous-traitants et les informations légales du responsable sont à confirmer. Le manifeste de confidentialité iOS existant ne remplace pas le questionnaire App Privacy.

## Sources officielles consultées le 23 novembre 2026

- Comptes Google : https://support.google.com/googleplay/android-developer/answer/6112435
- Tests des comptes personnels : https://support.google.com/googleplay/android-developer/answer/14151465
- Signature Android : https://developer.android.com/studio/publish/app-signing
- API cible Android : https://support.google.com/googleplay/android-developer/answer/11926878
- Modération Google : https://support.google.com/googleplay/android-developer/answer/9876937
- Sécurité des enfants : https://support.google.com/googleplay/android-developer/answer/14747720
- Suppression de compte Google : https://support.google.com/googleplay/android-developer/answer/13327111
- Inscription Apple : https://developer.apple.com/help/account/membership/program-enrollment/
- Règles Apple 1.2, 4.2 et 5.1.1 : https://developer.apple.com/app-store/review/guidelines/
- Suppression de compte Apple : https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Versions Xcode et SDK : https://developer.apple.com/news/upcoming-requirements/
