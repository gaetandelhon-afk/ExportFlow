# ExportFlow - Guide d'Installation Cursor

## 📦 Contenu du Package

```
exportflow-v4/
├── .cursorrules                    # Règles Cursor (copier à la racine)
└── docs/
    ├── CURSOR_AUDIT_PROMPT.md      # Prompt d'audit à copier dans Cursor
    ├── NEW_FEATURES.md             # Specs des nouvelles fonctionnalités
    ├── MULTI_TENANT_ARCHITECTURE.md # Architecture multi-tenant détaillée
    ├── PRISMA_SCHEMA.md            # Schéma base de données
    ├── ICP_SCORECARD.md            # Scorecard qualification clients
    └── VALIDATION_PLAN.md          # Plan de validation 6 semaines
```

---

## 🛠️ Installation Rapide

### 1. Copier les fichiers

```bash
# Depuis le dossier extrait
cp .cursorrules /chemin/vers/ton/projet/
cp -r docs/* /chemin/vers/ton/projet/docs/
```

### 2. Structure finale

```
ton-projet/
├── .cursorrules                    ← NOUVEAU
├── docs/
│   ├── CURSOR_AUDIT_PROMPT.md      ← NOUVEAU
│   ├── NEW_FEATURES.md             ← NOUVEAU
│   ├── MULTI_TENANT_ARCHITECTURE.md ← NOUVEAU
│   ├── PRISMA_SCHEMA.md            ← NOUVEAU
│   └── ...
├── src/
└── ...
```

### 3. Ouvrir dans Cursor

```bash
cd /chemin/vers/ton/projet
cursor .
```

---

## 🔍 Lancer l'Audit

### Copie ce prompt dans Cursor:

```
Le projet a été renommé de "OrderBridge" à "ExportFlow".

Domaines:
- exportflow.io (marketing)
- [slug].exportflow.io (portails clients)

Lis ces fichiers:
1. .cursorrules
2. docs/NEW_FEATURES.md
3. docs/MULTI_TENANT_ARCHITECTURE.md

Puis fais un audit complet:
- État de chaque page/composant
- Nouvelles features à implémenter
- Plan d'action recommandé

Les nouvelles features:
1. Multi-tenant + sous-domaines auto
2. Import Excel super-tolérant
3. Workflow Substitution
4. Suivi Paiements T/T
5. Branding personnalisable
6. Domaine custom (premium)
7. Modification commande + Diff
8. Site marketing
```

---

## 🎯 Priorités de Développement

| # | Feature | Priorité | Estimé |
|---|---------|----------|--------|
| 1 | Multi-tenant + Middleware | 🔴 | 1 sem |
| 2 | Import Excel | 🔴 | 1-2 sem |
| 3 | Substitutions | 🔴 | 4 jours |
| 4 | Paiements T/T | 🔴 | 3 jours |
| 5 | Branding | 🟠 | 3 jours |
| 6 | Domaine custom | 🟠 | 2 jours |
| 7 | Diff commande | 🟠 | 3-4 jours |
| 8 | Site marketing | 🟡 | 1 sem |

---

## 📝 Changements Clés

### Renommage
- **OrderBridge** → **ExportFlow**
- Domaine: `exportflow.io`

### Nouvelles URLs
```
exportflow.io                    → Site marketing
swiftboats.exportflow.io         → Portail Swift Boats
nordicmarine.exportflow.io       → Portail Nordic Marine
orders.clientsite.com            → Domaine custom (premium)
```

### Nouvelle Architecture
- Multi-tenant avec wildcard DNS
- Sous-domaines générés automatiquement à l'inscription
- Branding personnalisable par client
- TenantContext pour charger/appliquer le tenant

---

## ✅ Checklist

- [ ] `.cursorrules` copié à la racine
- [ ] Dossier `docs/` avec tous les fichiers
- [ ] Cursor ouvert sur le projet
- [ ] Prompt d'audit collé et exécuté
- [ ] Plan d'action établi

Bonne continuation ! 🚀
