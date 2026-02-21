# ExportFlow - Prompt d'Audit pour Cursor

**Copie et colle ce prompt dans Cursor pour faire l'état des lieux complet.**

---

## 🔍 PROMPT À COPIER

```
Le projet a été renommé de "OrderBridge" à "ExportFlow".

Les domaines sont:
- exportflow.io (site marketing)
- app.exportflow.io (app legacy/fallback)
- [slug].exportflow.io (portails clients auto-générés)

**ÉTAPE 1 - Lis attentivement ces fichiers:**

1. `.cursorrules` - Architecture multi-tenant, data models, règles
2. `docs/NEW_FEATURES.md` - Toutes les nouvelles fonctionnalités détaillées

**ÉTAPE 2 - Fais un audit complet du projet:**

Parcours toute la structure et crée un rapport avec ce format:

---

## 📊 ÉTAT ACTUEL DU PROJET

### Renommage OrderBridge → ExportFlow
- [ ] Tous les fichiers renommés
- [ ] Variables/constantes mises à jour
- [ ] Textes UI mis à jour

### Architecture Multi-Tenant
- [ ] middleware.ts (détection sous-domaine)
- [ ] TenantContext.tsx
- [ ] API /api/tenant
- [ ] API /api/signup (création auto sous-domaine)

### Site Marketing (exportflow.io)
- [ ] Homepage
- [ ] /features
- [ ] /pricing
- [ ] /contact
- [ ] Layout marketing

### Portail Distributeur
- [ ] /catalog
- [ ] /cart
- [ ] /checkout
- [ ] /my-quotes
- [ ] /my-orders
- [ ] /my-orders/[id]
- [ ] /my-orders/[id]/modify (Diff view) - NOUVEAU
- [ ] /approvals (Substitutions) - NOUVEAU
- [ ] /account

### Portail Admin
- [ ] Layout + Navigation
- [ ] /dashboard
- [ ] /products (liste)
- [ ] /products/new
- [ ] /products/[id]
- [ ] /products/import (Excel) - NOUVEAU
- [ ] /customers
- [ ] /customers/[id]
- [ ] /orders
- [ ] /orders/[id]
- [ ] /invoices
- [ ] /payments - NOUVEAU
- [ ] /settings/company
- [ ] /settings/branding - NOUVEAU
- [ ] /settings/domain - NOUVEAU

### Portail Warehouse (CN)
- [ ] /warehouse/orders
- [ ] Interface chinoise
- [ ] Pas de prix visible

### Nouvelles Fonctionnalités
1. **Multi-tenant + Sous-domaines**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

2. **Import Excel Super-Tolérant**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

3. **Workflow Substitution**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

4. **Suivi Paiements T/T**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

5. **Branding Personnalisable**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

6. **Domaine Custom**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

7. **Modification Commande + Diff**
   - État: [Non commencé / En cours / Terminé]
   - Fichiers manquants: [liste]

### Base de Données (Prisma)
- [ ] Model Company (tenant)
- [ ] Model CompanyBranding
- [ ] Model SubstitutionRequest
- [ ] Model OrderPayment
- [ ] Model PaymentRecord

---

## 📋 PLAN D'ACTION RECOMMANDÉ

En fonction de l'audit, liste les tâches dans l'ordre de priorité:

1. [Tâche] - [Temps estimé]
2. [Tâche] - [Temps estimé]
...

---

Commence l'audit maintenant. Sois exhaustif.
```

---

## 🎯 APRÈS L'AUDIT

Une fois l'audit terminé, utilise ces prompts pour démarrer le développement:

### Pour le Multi-Tenant

```
Implémente l'architecture multi-tenant:

1. Crée src/middleware.ts pour détecter les sous-domaines
2. Crée src/contexts/TenantContext.tsx pour charger le tenant et appliquer le branding
3. Crée src/app/api/tenant/route.ts pour résoudre le tenant
4. Crée src/app/api/signup/route.ts pour créer un tenant avec sous-domaine auto

Suis les specs de .cursorrules et docs/NEW_FEATURES.md
```

### Pour le Branding

```
Implémente le système de branding personnalisable:

1. Crée la page /dashboard/settings/branding avec:
   - Upload logo (principal, petit, factures)
   - Color picker pour couleur primaire
   - Champs infos (nom, email support, etc.)
   - Toggle "Powered by ExportFlow"
   - Prévisualisation en temps réel

2. Le branding doit s'appliquer via CSS variables dans TenantContext

Suis les specs de docs/NEW_FEATURES.md section 5.
```

### Pour l'Import Excel

```
Crée le wizard d'import Excel super-tolérant:

1. Page principale: /dashboard/products/import
2. Composants pour chaque étape:
   - FileUpload.tsx
   - SheetSelector.tsx (Excel multi-feuilles)
   - ColumnMapper.tsx (auto-détection + manuel)
   - RowClassifier.tsx (produit/header/skip)
   - VariantDetector.tsx (grouper les variantes)
   - ValidationReview.tsx (erreurs/warnings)
   - ImportConfirmation.tsx

3. Lib helpers:
   - fuzzyMatch.ts (Levenshtein pour SKU)
   - normalizeUnits.ts
   - detectVariants.ts

Suis les specs de docs/NEW_FEATURES.md section 2.
```

### Pour les Substitutions

```
Implémente le workflow de substitution:

ADMIN:
1. Dans /orders/[id], ajoute un bouton "Article indisponible" par ligne
2. Modal pour créer SubstitutionRequest:
   - Raison (rupture, discontinué, etc.)
   - Proposer substitut (recherche produit)
   - Ou backorder (date dispo)
   - Message au client
3. Envoie notification email

DISTRIBUTEUR:
1. Crée /approvals pour lister les demandes pending
2. Page d'approbation avec:
   - Détails article original
   - Proposition(s)
   - Boutons: Accepter / Refuser / Attendre backorder
3. Update automatique de la commande

Suis les specs de docs/NEW_FEATURES.md section 3.
```

### Pour les Paiements

```
Implémente le suivi des paiements T/T:

1. Crée /dashboard/payments avec:
   - Cards: Acomptes en attente, Reçus, Soldes en attente, Payés
   - Liste des commandes avec statut paiement
   - Filtres

2. Dans /orders/[id], onglet Paiements:
   - Vue des paiements attendus vs reçus
   - Formulaire pour enregistrer un paiement
   - Upload preuve de paiement

3. Composants:
   - PaymentStatusBadge.tsx
   - PaymentRecordForm.tsx
   - PaymentTimeline.tsx

Suis les specs de docs/NEW_FEATURES.md section 4.
```

### Pour le Site Marketing

```
Crée le site marketing exportflow.io:

1. Layout marketing avec:
   - Header (logo, nav, CTA login/signup)
   - Footer (liens, legal, social)

2. Pages:
   - Homepage: Hero, features highlights, testimonials, CTA
   - /features: Détail de chaque feature avec screenshots
   - /pricing: Cards Starter/Growth/Pro avec features
   - /contact: Formulaire contact

3. Design moderne, cohérent avec l'app (mêmes CSS variables)

Le signup doit créer le tenant et rediriger vers [slug].exportflow.io
```

---

## 📝 NOTES IMPORTANTES

1. **Le projet s'appelle maintenant ExportFlow** (pas OrderBridge)
2. **Multi-tenant first**: Toute requête DB doit filtrer par `companyId`
3. **CSS Variables**: Utiliser `--color-brand-primary` etc. pour permettre le branding
4. **Warehouse = NO PRICES**: Triple-check que les prix ne s'affichent jamais pour role WAREHOUSE
