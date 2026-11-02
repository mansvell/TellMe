# TellMe sur Android et iOS

Le même projet React produit le site Vercel et les applications Capacitor. Le code de l'interface est embarqué dans l'application ; la base Supabase existante reste commune.

## Ce qui est intégré

- Projets Android et iOS, nom TellMe, identifiant `com.mansvell.tellme`, icônes et écran de lancement avec le logo existant.
- Navigation sans écran « Vérification du compte » à chaque changement de page. Le compte reste contrôlé au démarrage, à la navigation, au retour au premier plan et périodiquement.
- Session Supabase mobile enregistrée avec Preferences, plus conservation de la langue et du thème.
- Partage natif d'image avec le lien en texte et copie dans le presse-papiers.
- Retour Android, gestion du clavier et ouverture des liens `tellme://join/CODE` et `tellme://b/CODE`.
- Liens partagés par l'app vers `https://tellmeall.vercel.app`, et non vers l'adresse locale de la WebView. `VITE_PUBLIC_SITE_URL` permet de changer le domaine public lors de la compilation.

## Récupérer les changements

Depuis le dossier du dépôt, sauvegarder les modifications locales avant de changer de branche, puis récupérer la branche de la demande d'intégration et lancer :

```sh
npm ci
npm run test:mobile
npm run mobile:sync
```

Les dossiers `dist` et les copies de ressources web dans les projets natifs sont générés par ces commandes et ne sont pas versionnés.

## Android sans Play Store

La demande d'intégration lance **TellMe mobile builds** dans GitHub Actions. Quand le travail `android` réussit, télécharger l'artefact **TellMe-Android-debug**, extraire `app-debug.apk`, puis le transférer sur un téléphone Android. L'installation demande d'autoriser cette source sur le téléphone.

Pour construire ou lancer sur le PC : installer Android Studio avec le SDK Android 36 et Java 21, ouvrir le dossier `android` avec Android Studio, ou lancer :

```sh
npm run mobile:android
```

Lancer avec un appareil ou un émulateur configuré :

```sh
npm run mobile:run:android
```

L'APK GitHub est une version d'essai signée avec une clé debug. Pour distribuer durablement des mises à jour qui conservent l'installation et sa session, garder une même clé de signature privée de release. Le workflow met la clé debug en cache pour les essais, mais ce cache peut expirer.

## iPhone / iPad

Le projet iOS utilise Swift Package Manager. Sur un Mac avec Xcode 26 ou plus récent :

```sh
npm ci
npm run mobile:ios
```

Dans Xcode, sélectionner la cible **App**, ouvrir **Signing & Capabilities**, choisir une équipe Apple et un iPhone connecté, puis lancer l'app. Un compte Apple et une signature sont nécessaires pour l'installer sur un iPhone physique ; aucune signature ni compte développeur n'est embarqué dans le dépôt.

Le workflow manuel GitHub **TellMe mobile builds** peut aussi construire une application pour simulateur iOS en cochant `build_ios`. L'artefact simulateur ne s'installe pas sur un iPhone. Pour distribuer à des testeurs avec TestFlight, il faudra configurer le compte Apple Developer et la signature de distribution.

## Points restant à configurer avec les comptes du propriétaire

- Notifications natives : le Web Push actuel continue sur le site. Les notifications des applications natives nécessitent Firebase/FCM et APNs, avec leurs identifiants et le service d'envoi côté backend. Le réglage mobile est désactivé tant que cette configuration n'est pas faite.
- Ouverture automatique des liens HTTPS dans l'application : les liens publics fonctionnent déjà sur le site. Les liens vérifiés Android/iOS nécessitent les empreintes de signature Android et l'identifiant d'équipe Apple pour publier `assetlinks.json` et `apple-app-site-association`. Ces valeurs ne sont pas inventées.
- La session native est distincte de celle du navigateur : la première installation demande un enregistrement. Elle reste ensuite conservée dans l'app. Un transfert de compte depuis le navigateur demanderait un parcours supplémentaire.

Les modifications de l'interface web ne mettent pas automatiquement à jour un APK déjà installé. Après une modification, reconstruire puis distribuer la nouvelle application native.

## Vérifications

`npm run test:mobile` couvre les liens publics, les liens entrants autorisés, le partage d'image et sa légende, l'annulation, le stockage de session et la continuité de navigation pendant le contrôle du compte. La compilation native et le partage WhatsApp doivent aussi être essayés sur de vrais appareils avant une diffusion publique.
