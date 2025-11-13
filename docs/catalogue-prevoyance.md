## Spécifications requises pour la configuration Prévoyance

1. **Organisation Modules / Actes / Sous-items**
   - Les *garanties client* correspondent à nos **modules** Prévoyance.
   - Les *actes* représentent les garanties affichées (ex. « Capital quelle que soit la situation de famille », « Rente éducation 8/18/26 ans »).
   - Les *formules* visibles côté client sont nos **sous-items** : pour chaque acte nous devons fournir toutes les variantes (ex. « Capital en fonction de la situation familiale », « Option capital substitutif ») avec leurs métadonnées.

2. **Données à exposer pour chaque acte**
   - Libellé client, description, position dans l’onglet.
   - Type de saisie attendu côté client (radio exclusif, case à cocher, champ numérique, liste déroulante).
   - Liste des sous-items (formules) avec :
     - libellé,
     - type de champ (select, input, toggle),
     - unités (%, salaire brut, salaire net…),
     - contraintes (min/max/pas),
     - valeurs suggérées ou listes (100 %, 125 %, 150 %, etc.).

3. **Exemples de champs à couvrir**
   - Décès en capital : pourcentages par situation familiale, majoration par enfant, PTIA, décès accidentel, double effet.
   - Frais d’obsèques : niveau de couverture (50 %, 100 %, 150 %, 200 %).
   - Rente éducation : tranches d’âge avec taux distincts.
   - Rente conjoint : formules temporaires/viagères, paramètres X/Y, option capital substitutif.
   - Arrêt de travail / Invalidité : franchises (nombre de jours + type), prestations IT/IP par catégorie.

4. **Franchises et paramètres temporels**
   - Stocker explicitement la franchise (valeur numérique) et les types de franchise possibles.
   - Associer les paramètres aux actes concernés (IT/IP).

5. **Options additionnelles**
   - Les cases à cocher côté client (PTIA, capital accidentel, double effet, rente viagère enfants handicapés, etc.) doivent être modélisées comme des sous-items optionnels attachés à l’acte principal, avec leurs propres valeurs/conditions.

6. **Mapping UI**
   - Pour chaque module, fournir l’ordre des actes afin que le client puisse construire ses onglets.
   - Pour chaque acte, exposer un identifiant stable, le type de composant attendu et la liste complète des sous-items/valeurs afin que le client puisse appliquer ses propres choix (activation/désactivation, sélection d’une formule, etc.).

> Important : notre rôle est de livrer l’intégralité des données nécessaires (toutes formules, valeurs proposées, unités, contraintes). L’activation finale des garanties/formules reste à la main du client, nous ne filtrons donc rien côté configuration.

## Modélisation détaillée par module/acte

### Décès en capital
- **Actes principaux (radios)**
  1. *Capital quelle que soit la situation de famille* — select de pourcentage du salaire de référence  
     - valeurs proposées : 100 %, 125 %, 150 %, 175 %, 200 %, 250 %.
  2. *Capital en fonction de la situation de famille* — champ “tableau” avec pourcentage par statut :
     - Célibataire/veuf sans enfant (select %),
     - Marié sans enfant ou CVDS avec personne à charge (input %),
     - Majoration par enfant/personne à charge supplémentaire (input %).
  3. *Capital + rente* (préparation : même logique que 1 + champs rente).
- **Sous-items optionnels (checkbox)**
  - PTIA (versement par anticipation) – booléen.
  - Décès accidentel incluant AVC – booléen (avec texte 100 % du capital).
  - Double effet – booléen.

### Frais d’obsèques
- **Actes radio**
  - Salarié / Conjoint & enfants / Salarié+conjoint+enfants (3 options mutuellement exclusives).
- **Sous-item de valeur**
  - Pour chaque option sélectionnée : select du % de la Sécurité Sociale (50 %, 100 %, 150 %, 200 %).

### Rente éducation
- **Actes radio**
  1. 8 ans / 18 ans / 26 ans,
  2. 18 ans / 26 ans,
  3. 12 ans / 18 ans / 26 ans avec capital substitutif,
  4. Linéaire quel que soit l’âge.
- **Sous-items par tranche** (inputs %)
  - Jusqu’à 8 ans, 9‑18 ans, 19‑26 ans : chacun doit pouvoir recevoir un pourcentage du salaire de référence (sélecteur 4 % à 10 % avec incrément de 1 %).
  - Options additionnelles : rente viagère enfants handicapés, double effet (checkbox + valeur % éventuelle).

### Rente de conjoint
- **Actes radio**
  - Rente viagère + temporaire / Rente temporaire / Rente viagère.
- **Paramètres**
  - Rente temporaire : champ formule `(X-25)*Y` avec select sur Y (0,30 % à 0,50 %).
  - Rente viagère : `(65 - X)*Y` avec select Y (0,75 %, 1 %, etc.).
  - Option capital substitutif : checkbox + input % (ex. 250 %).

### Arrêt de travail / Invalidité
- **Section IT**
  - Franchise (nombre de jours) : select (15, 30, 60, 90).
  - Type de franchise : liste (standard, écourtée à 3 jours si hospitalisation, etc.).
  - Prestation IT : select % (60 %, 70 %, 80 % du salaire brut).
- **Section IP**
  - Catégorie 1 / 2 / 3 : input % du salaire net (valeurs par défaut 48 %, 80 %, 80 %).

### Métadonnées communes aux sous-items
- `field_type` : radio, checkbox, select, number, text.
- `unit` : %, salaire de référence, salaire brut, salaire net, jours, montant fixe.
- `default_value`, `min`, `max`, `step`.
- `options[]` : pour les champs select/radio (libellé + valeur).
- `description` : texte explicatif pour l’UI client.

Ces structures doivent être instanciées pour chaque module afin de pré-fournir la totalité des formules, paramètres et listes de valeurs au client, qui n’aura plus qu’à activer/choisir ses options.

Ces exigences doivent être intégrées dans l’écran de configuration Prévoyance afin que le catalogue produit soit directement exploitable par le parcours client final illustré dans `catalog-prev-client-side/`.
