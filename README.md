## Catalogue Admin — Aperçu

Proof-of-concept Next.js 13 (App Router) dedicated to la gestion des catalogues Santé / Prévoyance.  
L’application manipule l’ensemble des référentiels (modules, groupes, garanties/actes, niveaux, collèges, etc.) côté client et persiste l’état via `localStorage`.

## Démarrage rapide

```bash
npm install      # dépendances locales
npm run dev      # serveur Next.js (Turbopack) http://localhost:3000

npm run lint     # vérification ESLint (next/core-web-vitals)
npm run build && npm run start   # build + preview prod
```

> ⚠️ Aucun backend : toutes les mutations (création de modules, catalogues, valeurs de niveaux…) sont écrites dans `localStorage`. Utiliser les boutons d’export/import (navbar) pour partager un dump.

## Architecture fonctionnelle

- **Routes App Router** (`src/app/*`) : pages référentiels (`/modules`, `/groupes`, `/garanties`, `/catalogues/...`) + configuration inline pour Santé/Prévoyance. Chaque `page.jsx` reste un composant **server** qui délègue la logique interactive à un `*PageClient.jsx` co-localisé (pattern smart/dumb).
- **Composants partagés** (`src/components`) : tables, formulaires, navbar/sidebar, catalogue widgets (sélection des collèges, matrices Santé avec Base/Options/Surco, etc.).
- **Providers & hooks** (`src/providers`) :
  - `AppDataProvider` construit les sources à partir de `defaultSettings` et les injecte dans `MultiStorageProvider`.
  - Hooks dédiés (`useRefModules`, `useRefActs`, `useRefCatalogues`, `useRefNiveauSets`, etc.) retournent `{ data, set, patch, reset }` pour chaque référentiel.
- **Librairie métier** (`src/lib`) :
  - `lib/settings/default.js` : vérité terrain mockée (catalogues, modules, tarification, value types).
  - `lib/utils/StringUtil.js` : helpers `normalizeRisk` / `sanitizeUpperKeep`.
  - `lib/utils/CatalogueInline.js` : logique de matrice Santé (fallback Base→Options, désactivation surcomplémentaire en Prévoyance, etc.).

## Flux de données & persistance

1. Au boot, `AppDataProvider` découpe `defaultSettings` en blocs (`settings`, `ref_modules_v1`, `ref_cat_personnel_v1`, `catalogues_v1`, …) via `sourcesFromDefault`.
2. `MultiStorageProvider` hydrate chaque bloc depuis `localStorage` (ou fallback défaut), expose `set/patch/reset`, puis synchronise entre onglets.
3. Les pages appellent les hooks référentiels pour lister/filtrer et créent directement dans l’état local.
4. La navbar propose :
   - Export `app-like-default`: JSON aligné sur `defaultSettings`.
   - Import `app:` / `grp:` (legacy) ou `defaultSettings`-like afin de recharger un playground.

## Domain rules synthétiques

- Chaque entité référentiel appartient soit au risque `sante`, soit `prevoyance`. La création hérite du risque parent et masque les options incompatibles (ex : surcomplémentaire désactivée côté Prévoyance).
- Les catalogues imposent le choix de catégories de collèges (`ref_cat_personnel_v1`), affichées en badges sur les écrans de configuration/visualisation.
- Santé : matrices Base + Options configurables + Surco avec séparateurs visuels. Les Options récupèrent la Base du niveau supérieur (modifiable manuellement).
- Prévoyance : niveau unique (`set-prevoyance-unique`) par acte aujourd’hui, tout en anticipant le multi-niveaux.
- Les garanties « Sans groupe » restent rattachées au module (`ref_module_id`) via une catégorie virtuelle pour pouvoir être sélectionnées côté catalogue.

## Structure des dossiers

```
src/app/                    # pages Next.js (app router)
src/components/             # layout + composants métiers
src/providers/              # MultiStorageProvider + hooks data
src/hooks/                  # hooks spécifiques UI (selon besoin)
src/lib/api/                # placeholders API (offres/catal./…)
src/lib/utils/              # helpers métier (catalogue inline, strings, dépendances)
public/data.json            # arbre offre/catalogue pour démonstrations
docs/, OCCEA_*.pdf          # ressources design/fonctionnelles
```

## Bonnes pratiques

- Toujours monter `AppDataProvider` avant de consommer un référentiel (déjà fait dans `src/app/layout.js`).
- Utiliser `normalizeRisk` pour les champs `risque` ; `sanitizeUpperKeep` pour générer les codes propres.
- Avant commit : `npm run lint`. Aucun test automatique pour l’instant → prévoir Jest + RTL pour les filtres de risque, la désactivation Surco, la saisie Prévoyance et la sélection de collèges.

## Ressources utiles

- `AGENTS.md` : consignes détaillées (structure, règles métier, TODO qualité).
- `context.md` : mémoire projet des décisions/fixes.
- Maquettes `OCCEA_page-*.png` : référence visuelle.

Toute contribution doit synchroniser `AGENTS.md` / `context.md` avec les évolutions notables pour garder la trace des conventions.

