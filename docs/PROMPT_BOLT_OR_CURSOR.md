# 🚀 PROMPT À COPIER DANS BOLT.NEW OU CURSOR

---

## OPTION 1: BOLT.NEW (Recommandé - Plus rapide)

1. Va sur **bolt.new**
2. Colle ce prompt :

```
Build a modern SaaS marketing website for ExportFlow - a B2B order management platform for Chinese exporters.

TECH STACK:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- next-intl for i18n (5 languages: EN, 中文, FR, ES, ID)

DESIGN:
- Clean, minimal, premium SaaS aesthetic (like Linear, Vercel, Stripe)
- Primary color: #0071e3
- White backgrounds, subtle shadows, rounded corners
- Inter font
- Mobile-first responsive

PAGES TO CREATE:

1. HOMEPAGE (/)
- Hero: "Stop Losing Orders to Email Chaos" + CTA buttons
- Pain points section: Excel nightmare, lost emails, payment chaos
- Solution section with benefits
- Features preview (3 cards)
- Testimonials carousel
- Stats (50+ exporters, 10K orders/month, 70% time saved)
- How it works (3 steps)
- Final CTA

2. FEATURES (/features)
- All features with screenshots/illustrations:
  - Branded ordering portal
  - Smart product catalog
  - Order management
  - Payment tracking (T/T)
  - Export documents
  - Warehouse interface (Chinese)

3. PRICING (/pricing)
- 4 plans: 
  - Starter €49 (2 users, 100 orders, 1 price tier)
  - Pro €149 POPULAR (5 users, 500 orders, 3 price tiers, branding)
  - Business €299 (15 users, 2000 orders, unlimited price tiers, custom domain, payment tracking)
  - Enterprise €499 annual only (unlimited, 3 custom requests/year, WhatsApp support)
- Feature: "Price Tiers" = different prices for different customer types
- Toggle monthly/annual with 15% discount for annual
- Feature comparison table
- FAQ accordion
- 30-day guarantee badge

4. CUSTOMERS (/customers)
- Testimonials with metrics
- Case study cards
- Stats summary

5. CONTACT (/contact)
- Contact form (name, email, company, message)
- WeChat QR code
- Email address

6. SIGNUP (/signup)
- Company name, name, email, password
- Benefits list on the side
- Creates account and redirects to [slug].exportflow.io

7. LOGIN (/login)
- Email + password
- "Forgot password" link

HEADER:
- Logo "ExportFlow"
- Nav: Features, Pricing, Customers
- Language switcher (EN/中文/FR/ES/ID)
- Login + "Start Free" CTA button

FOOTER:
- 4 columns: Product, Resources, Company, Legal
- Social links
- Copyright
- "Made with ❤️ for exporters worldwide"

IMPORTANT:
- All text must be in 5 languages - create proper i18n setup
- SEO meta tags for each page
- Structured data (JSON-LD) for SoftwareApplication
- Smooth scroll animations on sections
- Mobile hamburger menu

The target audience is Chinese export companies who sell internationally. The messaging should emphasize: professionalism, efficiency, solving Excel/email chaos, and looking like a Fortune 500 company.
```

3. Clique "Generate" et laisse Bolt créer le site
4. Télécharge ou déploie directement

---

## OPTION 2: CURSOR

Si tu préfères Cursor (pour garder le code dans ton repo):

1. Ouvre Cursor dans un nouveau dossier
2. Colle ce prompt :

```
@workspace Create a complete marketing website based on the specs in docs/MARKETING_SITE_COMPLETE.md

Start by:
1. Setting up Next.js 14 with TypeScript and Tailwind
2. Configure next-intl for i18n (EN, ZH, FR, ES, ID)
3. Create the pages in order: Homepage, Features, Pricing, Signup, Login
4. Use the exact translations from the spec file
5. Make it beautiful - use Framer Motion for animations

Design requirements:
- Clean, premium SaaS look (Linear/Vercel style)
- Primary color #0071e3
- Inter font
- Mobile responsive
- Subtle animations on scroll

Create all components and pages. Start now.
```

3. Assure-toi d'avoir copié `MARKETING_SITE_COMPLETE.md` dans le dossier `docs/`

---

## 📋 APRÈS GÉNÉRATION - CHECKLIST

Une fois le site généré, vérifie :

- [ ] Homepage s'affiche correctement
- [ ] Les 5 langues fonctionnent (cliquer sur le switcher)
- [ ] Tous les liens de navigation marchent
- [ ] La page pricing affiche les 4 plans
- [ ] Le formulaire signup est fonctionnel
- [ ] Le site est responsive (teste sur mobile)
- [ ] Les animations sont fluides

---

## 🔧 SI TU UTILISES BOLT.NEW

**Avantages:**
- Gratuit
- Génère tout en 1 clic
- Preview live instantanée
- Deploy en 1 clic sur Netlify/Vercel

**Pour récupérer le code:**
- Clique sur "Download" pour obtenir le zip
- Ou connecte ton GitHub et push directement

---

## 🎨 PERSONNALISATIONS POSSIBLES

Si tu veux modifier quelque chose après génération, dis à l'IA :

```
Change the primary color to #6366f1 (purple instead of blue)
```

```
Add a video embed in the hero section
```

```
Make the testimonials auto-scroll like a carousel
```

```
Add a cookie consent banner
```

---

## 📁 FICHIERS DE RÉFÉRENCE

Si l'IA a besoin de plus de détails, donne-lui ces fichiers :
- `docs/MARKETING_SITE_COMPLETE.md` - Toutes les traductions et specs
- `.cursorrules` - Les règles du projet

---

C'est tout ! Copie-colle le prompt dans Bolt.new et en 2-3 minutes tu auras ton site marketing complet. 🚀
