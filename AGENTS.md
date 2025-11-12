# Repository Guidelines

## Structure du projet
- Application Next.js 13 (app router) avec React, Tailwind et DaisyUI; routes dans `src/app`, composants partagés dans `src/components`, hooks/providers dans `src/hooks` et `src/providers`.
- Données mockées dans `public/data.json` complétées par `defaultSettings`; l’état persistant transite par `MultiStorageProvider` (localStorage) d’où la nécessité de monter les providers avant tout accès aux référentiels.
- Helpers `sanitize*` sécurisent les gros jeux de données (unicité des codes, tri) et s’appuient sur `normalizeRisk` pour aligner l’orthographe des risques.

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
