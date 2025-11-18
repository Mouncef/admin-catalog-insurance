# Règles fonctionnelles

## Référentiels par risque
- Chaque module, groupe de garanties, garantie/acte, groupe de niveaux et niveau appartient exclusivement à un risque (`sante` ou `prevoyance`) et n’est jamais partagé entre les deux.
- Toute création hérite automatiquement du risque du parent (module → catégorie → acte, etc.) et verrouille les champs incompatibles.
- Les helpers `normalizeRisk` et `sanitize*` doivent être utilisés pour fiabiliser les données en entrée (unicité, tri, mapping des risques).
- Les listes référentiel exposent systématiquement un filtre de risque et, selon la page, des filtres supplémentaires (module, catégorie). Côté Prévoyance, la surcomplémentaire est retirée (UI + données) via `allow_surco=false`.

## Catalogues
- La création/édition d’un catalogue impose de choisir au moins une catégorie de collège (`ref_cat_personnel_v1`). Ces catégories définissent le périmètre d’application du catalogue.
- Les badges de collèges sont affichés sur les écrans de configuration, de visualisation et dans les listings pour garantir la traçabilité du périmètre.
- Les catalogues conservent `cat_personnel_ids` triés selon l’ordre défini dans `ref_cat_personnel_v1`. Les ID sont uniques (utiliser `crypto.randomUUID` quand disponible).
- Les catalogues Prévoyance gèrent aujourd’hui un seul niveau par acte, mais l’UI prépare l’arrivée du multi-niveaux (structures communes avec Santé).

## Grille de garanties
- En Santé, la grille affiche Base, Option(s) et Surco. Le nombre d’options est configurable par module.
- Chaque option peut être saisie manuellement tout en proposant un fallback sur la Base du niveau supérieur (Option N1 = Base N2, etc.).
- Les en-têtes et corps de tableaux affichent des séparateurs visuels entre colonnes Base/Options/Surco.
- Les garanties peuvent être déclarées « Sans groupe » : elles conservent `ref_module_id` et une catégorie virtuelle pour être retrouvées lors de la configuration du catalogue selon le module.
- Côté Prévoyance, chaque groupe porte un « Type » (Bouton radio ou CheckBox) accessible via un bouton dédié dans la matrice. Le choix s’applique à un seul groupe à la fois via une modale et la valeur est persistée/affichée, y compris sur les écrans de visualisation.
- Les valeurs de Prévoyance peuvent dépendre d’autres garanties : le panneau d’édition propose une section « Dépendance » permettant soit de copier/pondérer une valeur, soit de construire une formule (addition/soustraction/multiplication/division) avec des termes renseignés (valeur, min, max). La cellule affiche automatiquement la valeur calculée ainsi que ses min/max dérivés.

## Tarification et restrictions Prévoyance
- La surcomplémentaire est automatiquement coupée côté Prévoyance (`allow_surco=false`) et l’interface supprime toute action liée à la Surco.
- Les catalogues Prévoyance exposent un seul niveau par acte via la configuration inline, mais stockent leurs valeurs dans la même structure (`value_type`/`data_json`) que Santé.
- Les niveaux Base et Surco sont filtrés par risque et ne proposent que les sets alignés sur le catalogue courant.

## Qualité et persistance
- Toute donnée persistante transite par `MultiStorageProvider` afin de synchroniser `localStorage` et contextualiser les hooks (`useMultiStorage`, `useRef*`).
- Les commandes à exécuter avant livraison : `npm run lint` (ESLint `next/core-web-vitals`), `npm run build`, `npm run start`.
- Aucune suite de tests automatisés n’est encore active : prévoir Jest + React Testing Library pour les cas critiques (filtres de risque, désactivation Surco, saisies Prévoyance).
