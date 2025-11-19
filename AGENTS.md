# Repository Guidelines

## Structure du projet
- Application Next.js 13 (app router) avec React, Tailwind et DaisyUI; routes dans `src/app`, composants partagés dans `src/components`, hooks/providers dans `src/hooks` et `src/providers`. `src/app/layout.js` embarque Navbar/Sidebar/Breadcrumbs/Footer autour de chaque écran.
- Chaque `page.jsx` reste un composant **server** (sans `use client`) qui se contente de rendre un `*PageClient.jsx` co-localisé. Toute logique interactive, hooks `useRef*` et state résident dans ces Smart components; les sous-composants purement visuels restent dumb/presentational.
- Données mockées dans `src/lib/settings/default.js` puis injectées dans `MultiStorageProvider` via `AppDataProvider` (`sourcesFromDefault`). `public/data.json` illustre une arborescence Offre → Catalogue → Modules pour les écrans de démonstration.
- `MultiStorageProvider` hydrate/persiste chaque référentiel (`ref_*`, `catalogues_v1`, `offres_v1`, …) dans `localStorage`, offre `set/patch/reset`, et synchronise entre onglets; il doit toujours être monté avant d’utiliser les hooks référentiels.
- Helpers `sanitize*` sécurisent les gros jeux de données (unicité des codes, tri) et s’appuient sur `normalizeRisk` pour aligner l’orthographe des risques.

## Persistance & import/export
- L’état applicatif vit uniquement dans `localStorage` (namespace `app:`). Toute mutation UI (création de modules, configuration des niveaux, sélection des collèges, etc.) est écrite via les hooks `useRef*`.
- La Navbar expose l’export « app-like-default » (snapshot calqué sur `defaultSettings`) ainsi que l’import de dumps récents ou legacy (`app:`/`grp:`). Toujours passer par ces flux pour partager ou remettre l’environnement à zéro.

## Commandes build & dev
- `npm run dev` : serveur Next.js (Turbopack) sur http://localhost:3000.
- `npm run lint` : ESLint `next/core-web-vitals`, à surveiller notamment pour `src/lib/api/offreService.js`.
- `npm run build` puis `npm run start` : build de production et démarrage du serveur.

## Style de code
- Composants fonctionnels avec indentation 2 espaces et props JSX en double quotes.
- Préfixer les hooks personnalisés par `use`; préférer les helpers de `StringUtil` (`normalizeRisk`, `sanitizeUpperKeep`) pour gérer les valeurs référentiel.
- Pas de formatteur automatique configuré : garder un code lisible et commenté uniquement pour les blocs complexes.

## Règles fonctionnelles
- Les référentiels (modules, groupes de garanties, garanties/actes, groupes de niveaux, niveaux) sont exclusifs à un risque : Santé ou Prévoyance, jamais les deux. Toute création hérite du risque parent et verrouille les champs incompatibles.
- La création/édition d’un catalogue impose de sélectionner les catégories de collèges (référentiel `ref_cat_personnel_v1`) qui définissent son périmètre d’application.
- Les écrans de configuration et de visualisation reprennent les collèges sélectionnés (badges) afin de garantir la traçabilité du périmètre.
- En Santé, la grille de garanties affiche Base, Option(s) et Surco : le nombre d’options est configurable par module, chaque Option peut être saisie (avec fallback sur la Base des niveaux supérieurs) et l’en-tête/corps affichent des séparateurs pour chaque colonne.
- Les garanties peuvent être déclarées « Sans groupe » : elles portent `ref_module_id` et une catégorie virtuelle, ce qui permet de les retrouver dans la configuration catalogue selon le module choisi.
- Les listes référentiel exposent un filtre de risque et, selon la page, des filtres module/catégorie; la surcomplémentaire est automatiquement coupée côté Prévoyance (`allow_surco=false`) et retirée de l’UI.
- Côté configuration catalogue (`src/app/catalogues/[catalogueId]/configure/inline/page.jsx`), seuls les éléments alignés sur le risque sélectionné sont proposés; un catalogue Prévoyance gère aujourd’hui un niveau unique par acte tout en préparant l’arrivée du multi-niveaux.

## Tests & qualité
- Aucune suite de tests active : prévoir Jest + React Testing Library pour vérifier les filtres de risque, la désactivation de la surcomplémentaire et la saisie des valeurs Prévoyance.
- Activer `npm run lint` avant chaque commit pour éviter les régressions de typage ou d’accessibilité.

## Points d’attention
- Surveiller la cohérence des IDs (générés via `crypto.randomUUID` lorsque disponible) et l’ordre d’initialisation des hooks pour éviter les `ReferenceError`.
- Mettre à jour ce document et `context.md` à chaque évolution significative afin de garder une mémoire projet exploitable lors des prochaines sessions.


codex resume 019a4eed-1d41-7391-8b7b-27e9ab918039
codex resume 019a7860-e049-7c21-83f6-5a844dc660e2
codex resume 019a7860-e049-7c21-83f6-5a844dc660e2
