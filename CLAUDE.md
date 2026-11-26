# Bloc City — app d'escalade motivante (PWA)

App iPhone/Android installable (PWA) pour suivre ses séances d'escalade, faire des séances guidées à la maison, faire grandir une ville avec des packs et se comparer à ses amis. Interface et code en **français**. Utilisateur principal : iPhone 15 Pro.

- En ligne : https://gdinisi.github.io/bloc-city/ (GitHub Pages, déploiement auto à chaque push sur `main` via `.github/workflows/deploy.yml`)
- Dépôt : https://github.com/gdinisi/bloc-city (branche `main`, on pousse directement)
- Cadrage initial : Claude Doc « Cadrage : app d'escalade motivante » (id 0ef8f192-6e8f-4aea-b4de-fac9fce003e9)

## Stack
React 19 + Vite 8 + TypeScript 7, vite-plugin-pwa (autoUpdate, base `/bloc-city/`), Supabase (`@supabase/supabase-js`), sharp (scripts d'images). Pas de lib UI : tout est dans `src/styles.css`.

## Commandes (Windows)
- Node n'est pas dans le PATH du Bash : préfixer `export PATH="/c/Program Files/nodejs:$PATH" &&`
- `npx tsc -b` (vérif types, noUnusedLocals actif) · `npm run build` · serveur de dev via le Browser pane (`preview_start` nom `bloc-city`, port 5173)
- Images : `node scripts/make-images.mjs` (photos `assets/*` → `public/img/*.webp`), `npm run icons` (icônes depuis `assets/icon-source.webp`)
- Attendre le déploiement : boucle curl sur `api.github.com/repos/gdinisi/bloc-city/actions/runs?per_page=1` (User-Agent `bloc-city-deploy-check`), comparer `head_sha`. Une erreur 500/502 de `deploy-pages` est passagère : relancer par commit vide.
- Pièges : `python3` bloque (utiliser node) ; dans `node -e "…"` ou heredoc non quoté, les backticks/`${}` sont mangés par bash → écrire un script `.cjs` dans le scratchpad avec heredoc `<<'EOF'`, ou corriger au Edit.

## Structure
- `src/App.tsx` : écran de connexion obligatoire (gate), en-tête (barre d'XP `TopXp`, bouton thème, bouton Amis), onglets Calendrier / Séances / Accueil (centre) / Ville / Stats + écran Amis.
- `src/screens/` : `HomeScreen` (accueil sur un écran : bandeau photo + anneau d'objectif + semaine, boutons « Séance maison » / « Enregistrer une séance », cartes « Séances proposées »), `CalendarScreen`, `HomeWorkoutScreen` (bandeau « Séance du jour », réglages, menus déroulants Ta séance / Fiches / Ton matériel), `StatsScreen` (grades d'XP en menu déroulant en haut), `FriendsScreen` (connexion, pseudo, classement, invitation, compte, `NewPassword`), `FriendView` (fiche ami : stats comparées, calendrier, ville), `FriendDemo` (démo `?amidemo`).
- `src/workout/` : catalogue d'exercices, générateur de séance, niveau adaptatif 1–10, `Player` (séance guidée : écran de mise en place de 30 s sans exercice, une seule pause par séance (entre exercices et entre séries, sauf protocoles de poutre) selon le niveau : 40 s au niveau 1 → 20 s au niveau 10, `pauseDuNiveau` ; reps et maintiens augmentent avec le niveau, échauffement compris, anti double-tape, confirmation de sortie y compris geste retour), animations SVG des exercices (`skeleton.ts`, `scenes.tsx`, `Figure.tsx`).
- `src/city/` : ville 2D isométrique SVG (`CityMap` : pincement pour zoomer de ×0,5 à ×14, pas de rotation ni de boutons +/−), économie (packs, coffre, fragments, boutique), quêtes (dans l'onglet Ville). Île = ensemble libre de cases (`land`, sinon carré selon le niveau) : outil « Terrain » pour ajouter (« + » au bord) ou enlever une case. Cases côte à côte (plus de chemins), sol non surélevé au niveau de la mer (motif périodique `mer-motif` en `<pattern>`, visible à tout zoom) ; une rangée de cases de rivage (`rivage-<masque 8 voisins>`, 46 cas : bords, angles, trou d'une case) fait la plage entre l'île et la mer ; en hauteur, falaises Blender (`falaise-g|d-h`, `falaise-c-hG-hD` angle fermé) dessinées par-dessus l'herbe de la case (bord d'herbe arrondi qui retombe en festons) ; leur pied (`pied-g|d` : éboulis, herbes hautes) est dessiné au niveau du sol d'en bas, juste après lui (clé `x+y+1.0002`). Rivage = plage organique (ligne d'eau ondulée, écume, eau turquoise et caustiques), motifs périodiques de période une case (bruit 4D sur tore) pour des raccords sans couture. Les `<image>` ont `pointer-events: none` : zones de toucher en losange (cases) ou emprise prolongée (bâtiments). En plein écran, tout le cadre de la ville (outils compris) passe en plein écran. Le cadrage de la carte est figé au premier affichage (ajouter/enlever des cases ne la fait pas sauter). Bouton plein écran (⛶) sur la carte ; en plein écran : outils Relief / Terrain, bouton « Bâtiments » (inventaire) et actions du bâtiment sélectionné. Caméra de départ cadrée sur toute l'île (cases réelles), recadrée si l'île change (synchro) tant qu'on n'a pas bougé la carte. Grands bâtiments : cases à la même altitude. Bâtiments = rendus Blender (`public/img/ville/<id>-<d|g>.webp`, `hd/` chargé dès ×2,2, `mini/` pour les vignettes ; tailles et origines dans `sprites.ts`, généré par `node atelier-ville/sprites-appli.mjs` ; sols et rues : `public/img/ville/sol/`, rendus par `atelier-ville/sols.py`). Le sens est choisi avant la pose (`flip`).
- `src/screens/Onboarding.tsx` : questionnaire après la première connexion (matériel, condition → `settings.startLevel`, niveau de départ de `computeLevel`), affiché une fois les données du cloud reçues (`sync.recu`) tant que `settings.onboarded` n'est pas vrai.
- `src/lib/` : `store.ts` (localStorage `blocCity.v1`, `updatedAt`), `sync.ts` (sync cloud « la plus récente gagne », profil mis en cache `blocCity.profile`), `cloud.ts` (Supabase : auth email+mot de passe, profils, amis, classement, `shared_sessions`), `xp.ts` (10 grades selon les heures de sport), `theme.ts` (sombre/clair, `blocCity.theme`), stats.
- `src/ui/` : `Icon` (icônes au trait), `MountainArt` (illustrations SVG), `FocusArt` (photo par type de séance, recadrage `card` pour petites cartes), `GradeLogo` (écusson par grade), `Ring`, `XpBar` (`XpBar`, `TopXp`, `XpGrades`).
- Pages de dev (DEV seulement) : `?galerie`, `?batiments`, `?amidemo`, `?villedemo` (écran Ville avec un inventaire de démo, sans compte), `?seancedemo` (lecteur de séance guidée), `?bienvenue` (questionnaire de départ).
- Atelier graphismes `atelier-ville/` (hors appli) : rendus Blender des bâtiments (`batiments.py`, 2 orientations : `-g` façade à gauche = `flip: true`, `-d` façade à droite = `flip: false`), catalogue `catalogue.html`.

## Supabase
Projet `xxrtaetfuaxamzgvdlrx`. Clé **publishable** seulement dans `.env` (commité, sans risque). Ne jamais utiliser/stocker la clé secret/service_role.
Schéma dans `supabase/schema.sql` (relançable) : `profiles`, `friendships`, `user_data` (sauvegarde privée), `cities`, `shared_sessions` (séances sans notes, visibles par les amis), fonctions `add_friend`, `remove_friend`, `is_friend`, RLS partout. Les modifs de schéma se font dans le SQL Editor du dashboard (Browser pane, l'utilisateur s'y connecte lui-même ; injecter le SQL via `window.monaco`).
Auth : email + mot de passe avec confirmation par e-mail (modèles d'e-mail non modifiables sans SMTP), flux `implicit`, Site URL = l'app. « Confirm email » ne doit pas être désactivé par Claude (réglage de sécurité).

## Design « Sommet »
Thème sombre par défaut (tokens `:root` : `--bg #0d0e10`, `--card`, `--accent #f0782d`, `--grad` orange du couchant, `--accent-2` teal) + mode clair (`[data-theme='light']`, fond blanc). Zones toujours sombres (photos, lecteur) forcent leurs jetons. Les styles récents sont **ajoutés en fin de `styles.css`** et priment sur les anciens.
Contraintes : l'accueil doit tenir sur un écran d'iPhone sans défiler (vérifier en 390×750/790), champs de formulaire en 16 px (pas de zoom iOS), `touch-action: manipulation`.

## Méthode de travail attendue
Après chaque demande : vérifier dans le Browser pane au format mobile, `tsc -b`, build, commit (message en français + ligne Co-Authored-By), push, attendre le déploiement, puis résumer en français. Remettre l'état du pane comme avant les tests (objectif « Complet », pas de matériel coché, thème sombre).

## Pistes en attente
- Atelier « graphismes de la ville » séparé de l'app : style pixel art isométrique détaillé. Recommandé : Blender (à installer, `winget install --id BlenderFoundation.Blender -e`) piloté par scripts + kits 3D CC0 de Kenney → rendus iso convertis en pixel art (palette, contour), puis PixiJS pour animer. Option IA locale possible (RTX 5060 8 Go, ComfyUI). En attente de la décision de l'utilisateur.
- Tirage des packs côté serveur (prévu au cadrage, non fait). Rappels/notifications non faits.
