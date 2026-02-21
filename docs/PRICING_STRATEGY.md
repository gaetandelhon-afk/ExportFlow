# ExportFlow - Pricing Strategy

## 📋 Résumé

| Plan | Prix mensuel | Prix annuel/mois | Économie annuelle |
|------|--------------|------------------|-------------------|
| Starter | €49 | €42 | €84/an (15%) |
| Pro ⭐ | €149 | €127 | €264/an (15%) |
| Business | €299 | €254 | €540/an (15%) |
| Enterprise | - | €499 | Annuel uniquement |

---

## 🎯 Stratégie par tier

| Tier | Rôle | Cible |
|------|------|-------|
| **Starter** | Foot in the door | Petits exportateurs, test |
| **Pro** | Cash cow (70% des clients) | PME exportatrices |
| **Business** | Croissance | Exportateurs établis qui scalent |
| **Enterprise** | Premium haute valeur | 5-10 gros clients max |

---

## 📊 Limites par plan

| Feature | Starter | Pro | Business | Enterprise |
|---------|---------|-----|----------|------------|
| **Users** | 2 | 5 | 15 | ∞ |
| **Orders/mois** | 100 | 500 | 2000 | ∞ |
| **Produits** | 500 | ∞ | ∞ | ∞ |
| **Price tiers** | 1 | 3 | ∞ | ∞ |

---

## 💰 Feature "Price Tiers" (différenciateur clé)

### Qu'est-ce que c'est ?
Permet de définir des niveaux de prix différents par type de client.

### Exemple
```
Produit: Widget A
├── Price Tier "Distributor"    → €10.00/unité
├── Price Tier "Retailer"       → €12.50/unité
└── Price Tier "VIP"            → €8.00/unité
```

Chaque client est assigné à un tier. Il voit automatiquement SES prix dans le portail.

### Pourquoi c'est stratégique
```
Starter (1 tier): "On met tout le monde au même prix"
        │
        │  Le client grossit, veut différencier ses prix...
        │  "Je peux pas donner un meilleur prix à mon gros client 
        │   sans changer pour tout le monde"
        ▼
Pro (3 tiers): "Distri / Retail / VIP, ça couvre mes cas"
        │
        │  Encore plus de clients, prix négociés individuellement...
        ▼
Business (∞ tiers): "Prix custom par client"
```

**→ Force naturellement l'upgrade**

---

## 🔓 Features par plan

### Starter €49/mois
- ✅ Portail client basique
- ✅ Import catalogue (500 produits max)
- ✅ Réception commandes
- ✅ Notifications email
- ✅ 1 price tier (même prix pour tous)
- ❌ Branding
- ❌ Factures proforma
- ❌ Suivi paiements
- ❌ Domaine custom
- 📧 Support email

### Pro €149/mois ⭐ POPULAIRE
- ✅ Tout de Starter
- ✅ Produits illimités
- ✅ 500 orders/mois
- ✅ **3 price tiers**
- ✅ Branding complet (logo, couleurs, favicon)
- ✅ Factures proforma
- ❌ Suivi paiements T/T
- ❌ Domaine custom
- 📧 Support email prioritaire

### Business €299/mois
- ✅ Tout de Pro
- ✅ 15 users, 2000 orders/mois
- ✅ **Price tiers illimités** (prix par client)
- ✅ Suivi paiements T/T (deposit/balance)
- ✅ Domaine custom (orders.votresite.com)
- ⚡ Support prioritaire

### Enterprise €499/mois (annuel uniquement)
- ✅ Tout de Business
- ✅ Users et orders illimités
- ✅ **3 custom requests/an**
- ✅ Review trimestrielle (call 30min)
- 💬 Support WhatsApp/WeChat dédié

---

## 🛠️ Custom Requests (Enterprise)

### ✅ Ce qui est inclus
- Ajouter un champ custom dans un formulaire
- Modifier un template PDF (facture, packing list)
- Créer un rapport simple
- Webhook vers un système externe
- Petite personnalisation UI

### ❌ Ce qui n'est PAS inclus
- Nouvelle feature majeure
- Intégration ERP complète
- App mobile
- Refonte de l'UI
- API custom

---

## 🎁 Trial & Onboarding

| Élément | Détail |
|---------|--------|
| Durée trial | 14 jours |
| Carte bancaire | Non requise |
| Features pendant trial | Toutes (niveau Pro) |
| Onboarding | Personnalisé (on aide à setup) |
| Garantie | 30 jours satisfait ou remboursé |

### Stratégie d'onboarding (clé de conversion)

```
Jour 0:  Inscription → Email bienvenue + offre d'aide
Jour 1-3: Setup assisté (call/WhatsApp)
         → Import catalogue
         → Config branding
         → Inviter 1-2 clients test
Jour 7:  Check-in "Comment ça se passe?"
Jour 12: Closing "Ton trial finit dans 2 jours"
Jour 14: Décision → Paiement ou feedback
```

**Objectif : Qu'ils aient reçu au moins 1 commande avant la fin du trial.**

---

## 💳 Méthodes de paiement

| Méthode | Disponibilité |
|---------|---------------|
| Carte bancaire | Tous les plans |
| PayPal | Tous les plans |
| Virement bancaire | Annuel uniquement |
| Alipay/WeChat Pay | À considérer (marché chinois) |

---

## 📈 Objectifs business

| Métrique | Cible |
|----------|-------|
| Clients total | 100 |
| Répartition | 20% Starter, 60% Pro, 15% Business, 5% Enterprise |
| MRR cible | ~€13,000 |
| ARR cible | ~€156,000 |
| Trial → Paid | 25% |
| Churn mensuel | <5% |

### Projection revenus à 100 clients

```
20 × Starter  × €49  = €980
60 × Pro      × €149 = €8,940
15 × Business × €299 = €4,485
5  × Enterprise × €499 = €2,495
─────────────────────────────
TOTAL MRR           = €16,900
TOTAL ARR           = €202,800
```

---

## 🔄 Règles de changement de plan

| Action | Effet |
|--------|-------|
| Upgrade | Immédiat, prorata facturé |
| Downgrade | Effectif au prochain cycle |
| Annulation | Accès jusqu'à fin de période payée |
| Dépassement limites | Warning → Invitation à upgrader |

---

## 📝 Notes importantes

1. **Pas de free tier permanent** — 14 jours trial puis paiement
2. **Focus sur Pro à €149** — C'est là qu'on veut 70% des clients
3. **Price tiers = killer feature** — Force l'upgrade naturellement
4. **Onboarding personnel** — Clé de la conversion trial → paid
5. **Enterprise = engagement 12 mois** — Cash flow + clients sérieux
