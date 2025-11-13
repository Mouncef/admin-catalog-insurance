# Journal d'évolution Prévoyance

## 2025-11-13T11:32:23+0100
- Démarrage de l'analyse : création du journal de bord pour tracer chaque intervention sur la configuration Prévoyance.

## 2025-11-13T11:35:33+0100
- Mise à jour des spécifications (`docs/catalogue-prevoyance.md`) pour aligner la terminologie Modules/Actes/Sous-items et lister les métadonnées à livrer au client.
- Implémentation d’une modale `SubItemModal` et adaptation de `ModulePanelContainer`/`ReadonlyGroupMatrix` pour gérer la création/édition des sous-items Prévoyance avec suivi des options (base/option/surco).

## 2025-11-13T11:41:57+0100
- Application de la règle « Prévoyance = 1 seul niveau Base » : `ModulePanelContainer` et `ViewerModulePanel` tronquent désormais les niveaux à la première entrée, les options/surco sont automatiquement désactivées, la matrice ne reçoit plus qu’un seul niveau.
- Nettoyage corrélé côté visualisation (suppression des props `optionLevels` inutiles) pour éviter toute référence à `niveauxBase` hors contexte.

## 2025-11-13T12:08:30+0100
- Enrichissement du modèle de sous-items : chaque sous-item conserve désormais type de champ, unité, valeurs par défaut, min/max/pas et éventuelles listes d’options. `sanitizeGroupes` stocke ces métadonnées.
- Refactor du workflow d’édition des sous-items : `SubItemModal` expose les nouveaux champs (type, unité, options, etc.) et `ModulePanelContainer`/`ReadonlyGroupMatrix` passent l’acte parent pour ajouter/modifier une formule.

## 2025-11-13T12:55:06+0100
- Complément des spécifications dans `docs/catalogue-prevoyance.md` : description détaillée de chaque module (Décès, Obsèques, Rentes, Arrêt de travail) avec la liste des acts, types de champs attendus et valeurs proposées à livrer côté data provider.

## 2025-11-13T13:02:45+0100
- Ajout de la modale `ActSettingsModal` pour configurer chaque acte (libellé, description, type de champ, unité, options).
- `sanitizeMembres` conserve désormais le schéma UI des actes (`ui_schema`) et `ModulePanelContainer`/`ReadonlyGroupMatrix` exposent les boutons “Configurer” + “Ajouter sous-item” sur chaque ligne.
- Les sous-items utilisent le libellé du parent dans la modale, l’ensemble des métadonnées est stocké dans le store et linters OK.

## 2025-11-13T13:18:00+0100
- Ajustement UX : le bouton “Configurer” n’est plus visible sur les modules Santé, et côté Prévoyance la configuration se fait via les sous-items (le bouton n’apparaît que si une action `onEditActMeta` est fournie).

## 2025-11-13T13:13:41+0100
- Retrait définitif du bouton “Configurer” sur les actes (Santé et Prévoyance). La configuration passe exclusivement par les sous-items.
- Suppression de `ActSettingsModal` et des hooks associés pour éviter toute ambiguïté : la matrice affiche seulement les libellés de base et le bouton “+ Sous-item”.

## 2025-11-13T13:26:43+0100
- Simplification de la modale sous-item : on ne saisit plus que libellé / description / type de champ (radio, checkbox, select). Les sous-items stockent uniquement ces champs.
- Ajout de nouveaux value types (`percent_salary_reference_*`, `percent_salary_brut/net`, `franchise_days`, `amount_euros`) dans les fallback et dans `ref_value_types_v1` pour alimenter `ValueEditorTyped`.

## 2025-11-13T13:29:50+0100
- Mise à jour des value types % (brut/net/référence) avec min/max/pas et valeur par défaut issue du schéma.
- `ValueEditorTyped` initialise désormais les champs numériques/enum avec leurs valeurs par défaut afin de simplifier la saisie côté client.

## 2025-11-13T13:53:58+0100
- Ajout d’un merge intelligent des `value_types` (fallback vs storage) pour récupérer les nouveaux champs (min/max/default) même si le cache local est ancien.

## 2025-11-13T14:34:29+0100
- Le Value Editor propose désormais deux champs libres (« Valeur minimale / maximale ») stockés sur chaque cellule et restitués dans la matrice.
- `CellView` affiche ces min/max directement sous la valeur saisie, ce qui fournit l’information attendue côté tableau.

## 2025-11-13T15:18:16+0100
- Ajout d’un référentiel `prevoyance_catalogue_templates` dans `src/lib/settings/default.js` : modules Décès (actes + options), Frais d’obsèques et Rente éducation avec leurs sous-items et les value types associés.
