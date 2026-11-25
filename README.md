# Bloc City

Web app installable (PWA) pour suivre ses séances d'escalade, s'entraîner à la maison et faire grandir une ville virtuelle.

## Lancer en local

```
npm install
npm run dev
```

Puis ouvrir http://localhost:5173/bloc-city/ (ou l'adresse « Network » affichée, depuis un téléphone sur le même Wi-Fi).

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml`, qui construit l'app et la publie sur GitHub Pages :
https://gdinisi.github.io/bloc-city/

Réglage à faire une seule fois sur GitHub : **Settings → Pages → Source : GitHub Actions**.

## Installer sur iPhone

Ouvrir l'adresse dans **Safari** → bouton Partager → **Sur l'écran d'accueil**.

## Avancement du MVP

- [x] Étape 1 : calendrier, saisie des séances (type, durée, ressenti, cotations), objectif hebdo, série hebdo
- [ ] Étape 2 : séances maison guidées, adaptées au matériel de chacun
- [ ] Étape 3 : ville isométrique et packs de bâtiments
- [ ] Étape 4 : comptes Supabase, amis et classement

Les icônes sont générées depuis `public/logo.svg` avec `npm run icons`.
