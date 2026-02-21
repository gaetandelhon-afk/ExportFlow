# ExportFlow Marketing Website - Complete Specification

## 🎯 PROJECT OVERVIEW

Build a modern, conversion-optimized marketing website for ExportFlow - a B2B SaaS platform for Chinese exporters to manage orders from international customers.

**Tech Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- next-intl (i18n)

**Languages:** English (default), 中文, Français, Español, Bahasa Indonesia

**Design:** Clean, minimal, premium SaaS aesthetic. Think Linear, Vercel, or Stripe.

---

## 🎨 DESIGN SYSTEM

### Colors

```css
:root {
  /* Primary */
  --color-primary: #0071e3;
  --color-primary-hover: #0077ed;
  --color-primary-light: #e8f4fd;
  
  /* Neutrals */
  --color-bg: #ffffff;
  --color-bg-alt: #f5f5f7;
  --color-text: #1d1d1f;
  --color-text-secondary: #86868b;
  --color-border: #d2d2d7;
  
  /* Accents */
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-error: #ff3b30;
  
  /* Gradients */
  --gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-cta: linear-gradient(135deg, #0071e3 0%, #00c6ff 100%);
}
```

### Typography

```css
/* Headings: Inter or SF Pro Display */
/* Body: Inter or SF Pro Text */

h1 { font-size: 3.5rem; font-weight: 700; line-height: 1.1; }
h2 { font-size: 2.5rem; font-weight: 600; line-height: 1.2; }
h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
p  { font-size: 1.125rem; line-height: 1.7; }
```

### Components Style

- **Buttons:** Rounded (12px), subtle shadow, smooth hover transitions
- **Cards:** White bg, subtle border, 16px padding, 12px radius
- **Sections:** Generous padding (80px vertical), max-width 1200px centered
- **Animations:** Subtle fade-in on scroll, smooth transitions (300ms)

---

## 📁 FILE STRUCTURE

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx                 # Homepage
│   │   ├── features/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── demo/page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   │
│   └── api/
│       └── contact/route.ts
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── LanguageSwitcher.tsx
│   │
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── PainPoints.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Pricing.tsx
│   │   ├── ROICalculator.tsx
│   │   ├── CTA.tsx
│   │   └── FAQ.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── Container.tsx
│
├── messages/
│   ├── en.json
│   ├── zh.json
│   ├── fr.json
│   ├── es.json
│   └── id.json
│
└── lib/
    └── i18n.ts
```

---

## 🌐 TRANSLATIONS

Below is all the content in all 5 languages. Use these exact translations.

### Navigation

```json
{
  "nav": {
    "en": {
      "features": "Features",
      "pricing": "Pricing",
      "customers": "Customers",
      "about": "About",
      "contact": "Contact",
      "login": "Log in",
      "signup": "Start Free",
      "demo": "Book Demo"
    },
    "zh": {
      "features": "功能",
      "pricing": "价格",
      "customers": "客户案例",
      "about": "关于我们",
      "contact": "联系我们",
      "login": "登录",
      "signup": "免费试用",
      "demo": "预约演示"
    },
    "fr": {
      "features": "Fonctionnalités",
      "pricing": "Tarifs",
      "customers": "Clients",
      "about": "À propos",
      "contact": "Contact",
      "login": "Connexion",
      "signup": "Essai gratuit",
      "demo": "Réserver une démo"
    },
    "es": {
      "features": "Funciones",
      "pricing": "Precios",
      "customers": "Clientes",
      "about": "Nosotros",
      "contact": "Contacto",
      "login": "Iniciar sesión",
      "signup": "Prueba gratis",
      "demo": "Agendar demo"
    },
    "id": {
      "features": "Fitur",
      "pricing": "Harga",
      "customers": "Pelanggan",
      "about": "Tentang",
      "contact": "Kontak",
      "login": "Masuk",
      "signup": "Coba Gratis",
      "demo": "Jadwalkan Demo"
    }
  }
}
```

---

### HOMEPAGE

#### Hero Section

```json
{
  "hero": {
    "en": {
      "headline": "Stop Losing Orders to Email Chaos",
      "subheadline": "Give your international customers a professional ordering portal. Receive orders, track payments, and ship faster — all in one place.",
      "cta_primary": "Start Free Trial",
      "cta_secondary": "Watch Demo",
      "trust_text": "Trusted by 50+ exporters in Shenzhen, Ningbo, and Yiwu",
      "no_credit_card": "No credit card required"
    },
    "zh": {
      "headline": "告别邮件混乱，订单从此不再丢失",
      "subheadline": "为您的海外客户提供专业的在线订货平台。接收订单、追踪付款、快速发货——一站式解决。",
      "cta_primary": "免费试用",
      "cta_secondary": "观看演示",
      "trust_text": "深圳、宁波、义乌50+出口商的共同选择",
      "no_credit_card": "无需绑定信用卡"
    },
    "fr": {
      "headline": "Arrêtez de Perdre des Commandes dans le Chaos des Emails",
      "subheadline": "Offrez à vos clients internationaux un portail de commande professionnel. Recevez les commandes, suivez les paiements et expédiez plus vite — tout en un seul endroit.",
      "cta_primary": "Essai Gratuit",
      "cta_secondary": "Voir la Démo",
      "trust_text": "La confiance de 50+ exportateurs à Shenzhen, Ningbo et Yiwu",
      "no_credit_card": "Sans carte bancaire"
    },
    "es": {
      "headline": "Deja de Perder Pedidos en el Caos del Email",
      "subheadline": "Ofrece a tus clientes internacionales un portal de pedidos profesional. Recibe pedidos, rastrea pagos y envía más rápido — todo en un solo lugar.",
      "cta_primary": "Prueba Gratis",
      "cta_secondary": "Ver Demo",
      "trust_text": "La confianza de 50+ exportadores en Shenzhen, Ningbo y Yiwu",
      "no_credit_card": "Sin tarjeta de crédito"
    },
    "id": {
      "headline": "Berhenti Kehilangan Pesanan di Kekacauan Email",
      "subheadline": "Berikan pelanggan internasional Anda portal pemesanan profesional. Terima pesanan, lacak pembayaran, dan kirim lebih cepat — semua di satu tempat.",
      "cta_primary": "Coba Gratis",
      "cta_secondary": "Lihat Demo",
      "trust_text": "Dipercaya 50+ eksportir di Shenzhen, Ningbo, dan Yiwu",
      "no_credit_card": "Tanpa kartu kredit"
    }
  }
}
```

#### Pain Points Section

```json
{
  "pain_points": {
    "en": {
      "section_title": "Sound familiar?",
      "pain_1_title": "Excel Nightmare",
      "pain_1_desc": "Price lists in 10 different Excel files. Wrong prices sent to customers. Hours wasted updating spreadsheets.",
      "pain_2_title": "Lost in Email",
      "pain_2_desc": "Orders buried in email threads. 'Did we confirm that change?' Arguments with customers over what was agreed.",
      "pain_3_title": "Payment Chaos",
      "pain_3_desc": "'Did they pay the deposit?' Checking bank statements manually. No clear view of who owes what.",
      "pain_4_title": "No Visibility",
      "pain_4_desc": "'Where's my order?' Customer calls you can't answer. No tracking, no transparency.",
      "stat_highlight": "Exporters lose an average of $23,000/year to order errors and inefficiency"
    },
    "zh": {
      "section_title": "这些问题是否似曾相识？",
      "pain_1_title": "Excel噩梦",
      "pain_1_desc": "报价单散落在10个不同的Excel文件里。发错价格给客户。花好几个小时更新表格。",
      "pain_2_title": "邮件海洋",
      "pain_2_desc": "订单埋没在邮件往来中。'我们确认过那个修改吗？'和客户争论到底说好了什么。",
      "pain_3_title": "收款混乱",
      "pain_3_desc": "'他们付定金了吗？'手动查银行流水。不清楚谁还欠多少钱。",
      "pain_4_title": "毫无可见性",
      "pain_4_desc": "'我的货到哪了？'客户打电话来你答不上来。没有追踪，没有透明度。",
      "stat_highlight": "出口企业平均每年因订单错误和效率低下损失16万元人民币"
    },
    "fr": {
      "section_title": "Ça vous dit quelque chose ?",
      "pain_1_title": "Le Cauchemar Excel",
      "pain_1_desc": "Vos tarifs dans 10 fichiers Excel différents. Mauvais prix envoyés aux clients. Des heures perdues à mettre à jour les tableurs.",
      "pain_2_title": "Perdu dans les Emails",
      "pain_2_desc": "Commandes enterrées dans des fils d'emails. 'On avait confirmé ce changement ?' Disputes avec les clients sur ce qui avait été convenu.",
      "pain_3_title": "Chaos des Paiements",
      "pain_3_desc": "'Ils ont payé l'acompte ?' Vérifier les relevés bancaires manuellement. Aucune vue claire de qui doit quoi.",
      "pain_4_title": "Aucune Visibilité",
      "pain_4_desc": "'Ma commande est où ?' Appels clients auxquels vous ne pouvez pas répondre. Pas de suivi, pas de transparence.",
      "stat_highlight": "Les exportateurs perdent en moyenne 21 000€/an à cause d'erreurs et d'inefficacité"
    },
    "es": {
      "section_title": "¿Te suena familiar?",
      "pain_1_title": "Pesadilla Excel",
      "pain_1_desc": "Listas de precios en 10 archivos Excel diferentes. Precios incorrectos enviados a clientes. Horas perdidas actualizando hojas de cálculo.",
      "pain_2_title": "Perdido en Emails",
      "pain_2_desc": "Pedidos enterrados en hilos de correo. '¿Confirmamos ese cambio?' Discusiones con clientes sobre lo acordado.",
      "pain_3_title": "Caos de Pagos",
      "pain_3_desc": "'¿Pagaron el anticipo?' Revisar extractos bancarios manualmente. Sin visión clara de quién debe qué.",
      "pain_4_title": "Sin Visibilidad",
      "pain_4_desc": "'¿Dónde está mi pedido?' Llamadas de clientes que no puedes responder. Sin seguimiento, sin transparencia.",
      "stat_highlight": "Los exportadores pierden en promedio $23,000/año por errores e ineficiencia"
    },
    "id": {
      "section_title": "Terdengar familiar?",
      "pain_1_title": "Mimpi Buruk Excel",
      "pain_1_desc": "Daftar harga di 10 file Excel berbeda. Harga salah dikirim ke pelanggan. Berjam-jam terbuang mengupdate spreadsheet.",
      "pain_2_title": "Hilang di Email",
      "pain_2_desc": "Pesanan terkubur di thread email. 'Apakah kita sudah konfirmasi perubahan itu?' Perdebatan dengan pelanggan tentang apa yang disepakati.",
      "pain_3_title": "Kekacauan Pembayaran",
      "pain_3_desc": "'Apakah mereka sudah bayar DP?' Mengecek rekening bank secara manual. Tidak ada gambaran jelas siapa yang masih berhutang.",
      "pain_4_title": "Tidak Ada Visibilitas",
      "pain_4_desc": "'Dimana pesanan saya?' Telepon pelanggan yang tidak bisa Anda jawab. Tidak ada pelacakan, tidak ada transparansi.",
      "stat_highlight": "Eksportir kehilangan rata-rata $23.000/tahun karena kesalahan pesanan dan inefisiensi"
    }
  }
}
```

#### Solution Section

```json
{
  "solution": {
    "en": {
      "section_title": "There's a better way",
      "headline": "Your brand. Your portal. Professional ordering.",
      "subheadline": "ExportFlow gives each customer their own login to browse your catalog, place orders, and track everything — while you manage it all from one dashboard.",
      "benefit_1": "Customers order themselves — no more back-and-forth emails",
      "benefit_2": "Always the right price — customer-specific pricing built in",
      "benefit_3": "Payment tracking — know who paid, who owes, instantly",
      "benefit_4": "Your brand everywhere — your logo, your domain, your colors"
    },
    "zh": {
      "section_title": "更好的方式在这里",
      "headline": "您的品牌，您的平台，专业的订货体验",
      "subheadline": "ExportFlow为每位客户提供专属登录入口，浏览您的产品目录、下单、追踪进度——而您只需在一个后台轻松管理。",
      "benefit_1": "客户自助下单——告别无休止的邮件往来",
      "benefit_2": "价格永远正确——内置客户专属定价",
      "benefit_3": "收款清晰追踪——谁付了、谁欠款，一目了然",
      "benefit_4": "处处彰显品牌——您的logo、您的域名、您的风格"
    },
    "fr": {
      "section_title": "Il existe une meilleure façon",
      "headline": "Votre marque. Votre portail. Des commandes professionnelles.",
      "subheadline": "ExportFlow donne à chaque client son propre accès pour parcourir votre catalogue, passer commande et tout suivre — pendant que vous gérez tout depuis un seul tableau de bord.",
      "benefit_1": "Les clients commandent eux-mêmes — fini les emails interminables",
      "benefit_2": "Toujours le bon prix — tarifs personnalisés par client intégrés",
      "benefit_3": "Suivi des paiements — sachez qui a payé, qui doit, instantanément",
      "benefit_4": "Votre marque partout — votre logo, votre domaine, vos couleurs"
    },
    "es": {
      "section_title": "Hay una mejor manera",
      "headline": "Tu marca. Tu portal. Pedidos profesionales.",
      "subheadline": "ExportFlow da a cada cliente su propio acceso para explorar tu catálogo, hacer pedidos y rastrear todo — mientras tú lo gestionas todo desde un solo panel.",
      "benefit_1": "Los clientes piden solos — sin más emails de ida y vuelta",
      "benefit_2": "Siempre el precio correcto — precios personalizados por cliente integrados",
      "benefit_3": "Seguimiento de pagos — sabe quién pagó, quién debe, al instante",
      "benefit_4": "Tu marca en todas partes — tu logo, tu dominio, tus colores"
    },
    "id": {
      "section_title": "Ada cara yang lebih baik",
      "headline": "Brand Anda. Portal Anda. Pemesanan profesional.",
      "subheadline": "ExportFlow memberikan setiap pelanggan login mereka sendiri untuk menjelajahi katalog, membuat pesanan, dan melacak semuanya — sementara Anda mengelola semua dari satu dashboard.",
      "benefit_1": "Pelanggan pesan sendiri — tidak ada lagi email bolak-balik",
      "benefit_2": "Selalu harga yang tepat — harga khusus pelanggan sudah terintegrasi",
      "benefit_3": "Pelacakan pembayaran — ketahui siapa yang sudah bayar, siapa yang masih hutang, seketika",
      "benefit_4": "Brand Anda di mana-mana — logo Anda, domain Anda, warna Anda"
    }
  }
}
```

#### Features Section

```json
{
  "features": {
    "en": {
      "section_title": "Everything you need to streamline exports",
      "feature_1_title": "Branded Ordering Portal",
      "feature_1_desc": "Your customers get their own portal with your logo and domain. They browse, order, and track — no training needed.",
      "feature_1_bullets": ["Your domain (orders.yourcompany.com)", "Your logo & brand colors", "Mobile-friendly", "Multi-language (EN/中文)"],
      
      "feature_2_title": "Smart Product Catalog",
      "feature_2_desc": "Import your Excel in seconds. Our system handles messy data, detects variants, and gets your catalog live fast.",
      "feature_2_bullets": ["Excel/CSV import (tolerates messy files)", "Product variants (size, color)", "Customer-specific pricing", "Photos & detailed specs"],
      
      "feature_3_title": "Order Management",
      "feature_3_desc": "Every order tracked from placement to delivery. Handle changes, substitutions, and keep everyone informed automatically.",
      "feature_3_bullets": ["Real-time order tracking", "Modification workflow with diff view", "Stock substitution requests", "Automated notifications"],
      
      "feature_4_title": "Payment Tracking",
      "feature_4_desc": "T/T, L/C, deposits, balances — all tracked in one place. Know instantly who paid and who owes.",
      "feature_4_bullets": ["Deposit & balance tracking", "Payment proof upload", "Automatic reminders", "Clear payment dashboard"],
      
      "feature_5_title": "Export Documents",
      "feature_5_desc": "Generate professional proforma invoices, commercial invoices, and packing lists with one click.",
      "feature_5_bullets": ["Proforma & commercial invoices", "Packing lists", "HS codes & Incoterms", "PDF export & email"],
      
      "feature_6_title": "Warehouse Interface",
      "feature_6_desc": "A dedicated Chinese-language interface for your warehouse team. They see what to pick and pack — no prices visible.",
      "feature_6_bullets": ["Chinese interface", "No prices shown (security)", "Pick & pack workflow", "Print packing lists"]
    },
    "zh": {
      "section_title": "出口流程所需的一切功能",
      "feature_1_title": "品牌订货门户",
      "feature_1_desc": "您的客户拥有专属门户，展示您的logo和域名。他们可以浏览、下单、追踪——无需培训。",
      "feature_1_bullets": ["您的域名 (orders.您的公司.com)", "您的logo和品牌色", "移动端适配", "多语言支持 (EN/中文)"],
      
      "feature_2_title": "智能产品目录",
      "feature_2_desc": "几秒钟导入您的Excel。系统智能处理混乱数据，识别规格变体，快速上架产品。",
      "feature_2_bullets": ["Excel/CSV导入（兼容混乱格式）", "产品变体（尺寸、颜色）", "客户专属定价", "图片和详细规格"],
      
      "feature_3_title": "订单管理",
      "feature_3_desc": "从下单到交付，全程追踪每笔订单。处理修改、替换，自动通知相关人员。",
      "feature_3_bullets": ["实时订单追踪", "修改工作流（差异对比）", "缺货替换申请", "自动通知"],
      
      "feature_4_title": "收款追踪",
      "feature_4_desc": "电汇、信用证、定金、尾款——一处追踪。即时掌握谁已付款、谁还欠款。",
      "feature_4_bullets": ["定金和尾款追踪", "付款凭证上传", "自动催款提醒", "清晰的收款看板"],
      
      "feature_5_title": "出口单据",
      "feature_5_desc": "一键生成专业的形式发票、商业发票和装箱单。",
      "feature_5_bullets": ["形式发票和商业发票", "装箱单", "HS编码和贸易术语", "PDF导出和邮件发送"],
      
      "feature_6_title": "仓库界面",
      "feature_6_desc": "专为仓库团队设计的中文界面。他们看到拣货和打包任务——看不到价格。",
      "feature_6_bullets": ["中文界面", "价格隐藏（安全）", "拣货打包流程", "打印装箱单"]
    },
    "fr": {
      "section_title": "Tout ce dont vous avez besoin pour fluidifier vos exports",
      "feature_1_title": "Portail de Commande Brandé",
      "feature_1_desc": "Vos clients ont leur propre portail avec votre logo et domaine. Ils parcourent, commandent et suivent — sans formation nécessaire.",
      "feature_1_bullets": ["Votre domaine (orders.votreentreprise.com)", "Votre logo & couleurs", "Adapté mobile", "Multi-langue (EN/中文)"],
      
      "feature_2_title": "Catalogue Produits Intelligent",
      "feature_2_desc": "Importez votre Excel en quelques secondes. Notre système gère les données désordonnées, détecte les variantes, et met votre catalogue en ligne rapidement.",
      "feature_2_bullets": ["Import Excel/CSV (tolère les fichiers désordonnés)", "Variantes produits (taille, couleur)", "Tarifs personnalisés par client", "Photos & specs détaillées"],
      
      "feature_3_title": "Gestion des Commandes",
      "feature_3_desc": "Chaque commande suivie de la passation à la livraison. Gérez les modifications, substitutions, et informez tout le monde automatiquement.",
      "feature_3_bullets": ["Suivi commandes en temps réel", "Workflow modification avec vue diff", "Demandes de substitution stock", "Notifications automatiques"],
      
      "feature_4_title": "Suivi des Paiements",
      "feature_4_desc": "Virement, L/C, acomptes, soldes — tout suivi au même endroit. Sachez instantanément qui a payé et qui doit.",
      "feature_4_bullets": ["Suivi acomptes & soldes", "Upload preuves de paiement", "Rappels automatiques", "Tableau de bord paiements clair"],
      
      "feature_5_title": "Documents Export",
      "feature_5_desc": "Générez des factures proforma, commerciales et des listes de colisage professionnelles en un clic.",
      "feature_5_bullets": ["Factures proforma & commerciales", "Listes de colisage", "Codes HS & Incoterms", "Export PDF & email"],
      
      "feature_6_title": "Interface Entrepôt",
      "feature_6_desc": "Une interface dédiée en chinois pour votre équipe entrepôt. Ils voient quoi préparer — sans voir les prix.",
      "feature_6_bullets": ["Interface chinoise", "Prix cachés (sécurité)", "Workflow préparation", "Impression bordereaux"]
    },
    "es": {
      "section_title": "Todo lo que necesitas para optimizar tus exportaciones",
      "feature_1_title": "Portal de Pedidos con Tu Marca",
      "feature_1_desc": "Tus clientes tienen su propio portal con tu logo y dominio. Navegan, piden y rastrean — sin necesidad de capacitación.",
      "feature_1_bullets": ["Tu dominio (orders.tuempresa.com)", "Tu logo y colores de marca", "Adaptado a móviles", "Multi-idioma (EN/中文)"],
      
      "feature_2_title": "Catálogo de Productos Inteligente",
      "feature_2_desc": "Importa tu Excel en segundos. Nuestro sistema maneja datos desordenados, detecta variantes, y pone tu catálogo en línea rápido.",
      "feature_2_bullets": ["Importación Excel/CSV (tolera archivos desordenados)", "Variantes de producto (talla, color)", "Precios personalizados por cliente", "Fotos y especificaciones detalladas"],
      
      "feature_3_title": "Gestión de Pedidos",
      "feature_3_desc": "Cada pedido rastreado desde la colocación hasta la entrega. Maneja cambios, sustituciones, y mantén a todos informados automáticamente.",
      "feature_3_bullets": ["Seguimiento de pedidos en tiempo real", "Flujo de modificación con vista de diferencias", "Solicitudes de sustitución de stock", "Notificaciones automáticas"],
      
      "feature_4_title": "Seguimiento de Pagos",
      "feature_4_desc": "T/T, L/C, anticipos, saldos — todo rastreado en un lugar. Sabe al instante quién pagó y quién debe.",
      "feature_4_bullets": ["Seguimiento de anticipos y saldos", "Carga de comprobantes de pago", "Recordatorios automáticos", "Panel de pagos claro"],
      
      "feature_5_title": "Documentos de Exportación",
      "feature_5_desc": "Genera facturas proforma, comerciales y listas de empaque profesionales con un clic.",
      "feature_5_bullets": ["Facturas proforma y comerciales", "Listas de empaque", "Códigos HS e Incoterms", "Exportación PDF y email"],
      
      "feature_6_title": "Interfaz de Almacén",
      "feature_6_desc": "Una interfaz dedicada en chino para tu equipo de almacén. Ven qué preparar — sin ver precios.",
      "feature_6_bullets": ["Interfaz en chino", "Precios ocultos (seguridad)", "Flujo de preparación", "Impresión de listas de empaque"]
    },
    "id": {
      "section_title": "Semua yang Anda butuhkan untuk memperlancar ekspor",
      "feature_1_title": "Portal Pemesanan Bermerek",
      "feature_1_desc": "Pelanggan Anda mendapat portal sendiri dengan logo dan domain Anda. Mereka menjelajah, memesan, dan melacak — tanpa perlu pelatihan.",
      "feature_1_bullets": ["Domain Anda (orders.perusahaananda.com)", "Logo & warna brand Anda", "Ramah mobile", "Multi-bahasa (EN/中文)"],
      
      "feature_2_title": "Katalog Produk Pintar",
      "feature_2_desc": "Impor Excel Anda dalam hitungan detik. Sistem kami menangani data berantakan, mendeteksi varian, dan membuat katalog Anda online dengan cepat.",
      "feature_2_bullets": ["Impor Excel/CSV (toleran file berantakan)", "Varian produk (ukuran, warna)", "Harga khusus per pelanggan", "Foto & spesifikasi detail"],
      
      "feature_3_title": "Manajemen Pesanan",
      "feature_3_desc": "Setiap pesanan dilacak dari pemesanan hingga pengiriman. Tangani perubahan, substitusi, dan beri tahu semua orang secara otomatis.",
      "feature_3_bullets": ["Pelacakan pesanan real-time", "Alur modifikasi dengan tampilan diff", "Permintaan substitusi stok", "Notifikasi otomatis"],
      
      "feature_4_title": "Pelacakan Pembayaran",
      "feature_4_desc": "T/T, L/C, DP, pelunasan — semua terlacak di satu tempat. Ketahui seketika siapa yang sudah bayar dan siapa yang masih berhutang.",
      "feature_4_bullets": ["Pelacakan DP & pelunasan", "Upload bukti pembayaran", "Pengingat otomatis", "Dashboard pembayaran yang jelas"],
      
      "feature_5_title": "Dokumen Ekspor",
      "feature_5_desc": "Buat invoice proforma, invoice komersial, dan packing list profesional dengan satu klik.",
      "feature_5_bullets": ["Invoice proforma & komersial", "Packing list", "Kode HS & Incoterms", "Ekspor PDF & email"],
      
      "feature_6_title": "Antarmuka Gudang",
      "feature_6_desc": "Antarmuka khusus berbahasa Mandarin untuk tim gudang Anda. Mereka melihat apa yang harus dipick dan dipack — tanpa melihat harga.",
      "feature_6_bullets": ["Antarmuka Mandarin", "Harga tersembunyi (keamanan)", "Alur pick & pack", "Cetak packing list"]
    }
  }
}
```

#### How It Works Section

```json
{
  "how_it_works": {
    "en": {
      "section_title": "Up and running in 3 simple steps",
      "step_1_title": "Import your catalog",
      "step_1_desc": "Upload your Excel or CSV. We'll map your columns and clean up the data automatically.",
      "step_2_title": "Invite your customers",
      "step_2_desc": "Send invite links. Each customer gets their own login with their specific prices.",
      "step_3_title": "Watch orders flow in",
      "step_3_desc": "Customers place orders anytime. You manage everything from one beautiful dashboard."
    },
    "zh": {
      "section_title": "三步轻松上手",
      "step_1_title": "导入您的产品目录",
      "step_1_desc": "上传您的Excel或CSV文件。我们会自动映射列并清理数据。",
      "step_2_title": "邀请您的客户",
      "step_2_desc": "发送邀请链接。每位客户都有专属登录入口和专属价格。",
      "step_3_title": "坐等订单飞来",
      "step_3_desc": "客户随时下单。您在一个精美的后台统一管理。"
    },
    "fr": {
      "section_title": "Opérationnel en 3 étapes simples",
      "step_1_title": "Importez votre catalogue",
      "step_1_desc": "Uploadez votre Excel ou CSV. On mappe vos colonnes et nettoie les données automatiquement.",
      "step_2_title": "Invitez vos clients",
      "step_2_desc": "Envoyez des liens d'invitation. Chaque client a son propre accès avec ses prix spécifiques.",
      "step_3_title": "Regardez les commandes arriver",
      "step_3_desc": "Les clients commandent à tout moment. Vous gérez tout depuis un tableau de bord élégant."
    },
    "es": {
      "section_title": "Funcionando en 3 simples pasos",
      "step_1_title": "Importa tu catálogo",
      "step_1_desc": "Sube tu Excel o CSV. Mapeamos tus columnas y limpiamos los datos automáticamente.",
      "step_2_title": "Invita a tus clientes",
      "step_2_desc": "Envía enlaces de invitación. Cada cliente tiene su propio acceso con sus precios específicos.",
      "step_3_title": "Mira los pedidos llegar",
      "step_3_desc": "Los clientes piden cuando quieran. Tú gestionas todo desde un panel elegante."
    },
    "id": {
      "section_title": "Berjalan dalam 3 langkah sederhana",
      "step_1_title": "Impor katalog Anda",
      "step_1_desc": "Upload Excel atau CSV Anda. Kami akan memetakan kolom dan membersihkan data secara otomatis.",
      "step_2_title": "Undang pelanggan Anda",
      "step_2_desc": "Kirim link undangan. Setiap pelanggan mendapat login sendiri dengan harga khusus mereka.",
      "step_3_title": "Lihat pesanan mengalir masuk",
      "step_3_desc": "Pelanggan memesan kapan saja. Anda mengelola semuanya dari satu dashboard yang elegan."
    }
  }
}
```

#### Testimonials Section

```json
{
  "testimonials": {
    "en": {
      "section_title": "Trusted by exporters across China",
      "testimonial_1_quote": "We used to spend 3 hours a day on order emails. Now it's 20 minutes. Our customers love the portal.",
      "testimonial_1_name": "Sarah Chen",
      "testimonial_1_role": "Export Director",
      "testimonial_1_company": "Ningbo Hardware Co.",
      
      "testimonial_2_quote": "Finally, I know who paid and who owes without checking 5 spreadsheets. Game changer.",
      "testimonial_2_name": "Michael Wang",
      "testimonial_2_role": "Finance Manager",
      "testimonial_2_company": "Shenzhen Electronics Ltd.",
      
      "testimonial_3_quote": "Our European customers think we're a Fortune 500 company now. The branded portal is beautiful.",
      "testimonial_3_name": "Lisa Zhang",
      "testimonial_3_role": "CEO",
      "testimonial_3_company": "Yiwu Trading Group"
    },
    "zh": {
      "section_title": "全国出口商的共同信赖",
      "testimonial_1_quote": "以前每天花3小时处理订单邮件，现在只需20分钟。客户们都喜欢这个订货门户。",
      "testimonial_1_name": "陈莎拉",
      "testimonial_1_role": "出口总监",
      "testimonial_1_company": "宁波五金有限公司",
      
      "testimonial_2_quote": "终于不用查5个表格就能知道谁付了款、谁还欠款了。太棒了。",
      "testimonial_2_name": "王迈克",
      "testimonial_2_role": "财务经理",
      "testimonial_2_company": "深圳电子有限公司",
      
      "testimonial_3_quote": "我们的欧洲客户现在觉得我们像世界500强。品牌化的门户太漂亮了。",
      "testimonial_3_name": "张丽莎",
      "testimonial_3_role": "CEO",
      "testimonial_3_company": "义乌贸易集团"
    },
    "fr": {
      "section_title": "La confiance des exportateurs à travers la Chine",
      "testimonial_1_quote": "On passait 3 heures par jour sur les emails de commande. Maintenant c'est 20 minutes. Nos clients adorent le portail.",
      "testimonial_1_name": "Sarah Chen",
      "testimonial_1_role": "Directrice Export",
      "testimonial_1_company": "Ningbo Hardware Co.",
      
      "testimonial_2_quote": "Enfin, je sais qui a payé et qui doit sans vérifier 5 tableurs. Un vrai changement.",
      "testimonial_2_name": "Michael Wang",
      "testimonial_2_role": "Directeur Financier",
      "testimonial_2_company": "Shenzhen Electronics Ltd.",
      
      "testimonial_3_quote": "Nos clients européens pensent qu'on est une Fortune 500 maintenant. Le portail brandé est magnifique.",
      "testimonial_3_name": "Lisa Zhang",
      "testimonial_3_role": "CEO",
      "testimonial_3_company": "Yiwu Trading Group"
    },
    "es": {
      "section_title": "La confianza de exportadores en toda China",
      "testimonial_1_quote": "Pasábamos 3 horas al día en emails de pedidos. Ahora son 20 minutos. A nuestros clientes les encanta el portal.",
      "testimonial_1_name": "Sarah Chen",
      "testimonial_1_role": "Directora de Exportación",
      "testimonial_1_company": "Ningbo Hardware Co.",
      
      "testimonial_2_quote": "Por fin sé quién pagó y quién debe sin revisar 5 hojas de cálculo. Un cambio total.",
      "testimonial_2_name": "Michael Wang",
      "testimonial_2_role": "Gerente de Finanzas",
      "testimonial_2_company": "Shenzhen Electronics Ltd.",
      
      "testimonial_3_quote": "Nuestros clientes europeos piensan que somos Fortune 500 ahora. El portal con nuestra marca es hermoso.",
      "testimonial_3_name": "Lisa Zhang",
      "testimonial_3_role": "CEO",
      "testimonial_3_company": "Yiwu Trading Group"
    },
    "id": {
      "section_title": "Dipercaya eksportir di seluruh China",
      "testimonial_1_quote": "Dulu kami menghabiskan 3 jam sehari untuk email pesanan. Sekarang 20 menit. Pelanggan kami suka portalnya.",
      "testimonial_1_name": "Sarah Chen",
      "testimonial_1_role": "Direktur Ekspor",
      "testimonial_1_company": "Ningbo Hardware Co.",
      
      "testimonial_2_quote": "Akhirnya, saya tahu siapa yang sudah bayar dan siapa yang masih hutang tanpa mengecek 5 spreadsheet. Revolusioner.",
      "testimonial_2_name": "Michael Wang",
      "testimonial_2_role": "Manajer Keuangan",
      "testimonial_2_company": "Shenzhen Electronics Ltd.",
      
      "testimonial_3_quote": "Pelanggan Eropa kami sekarang mengira kami perusahaan Fortune 500. Portal bermerek kami indah sekali.",
      "testimonial_3_name": "Lisa Zhang",
      "testimonial_3_role": "CEO",
      "testimonial_3_company": "Yiwu Trading Group"
    }
  }
}
```

#### Stats Section

```json
{
  "stats": {
    "en": {
      "stat_1_value": "50+",
      "stat_1_label": "Exporters",
      "stat_2_value": "10,000+",
      "stat_2_label": "Orders/month",
      "stat_3_value": "70%",
      "stat_3_label": "Time saved",
      "stat_4_value": "$2M+",
      "stat_4_label": "Processed monthly"
    },
    "zh": {
      "stat_1_value": "50+",
      "stat_1_label": "出口商",
      "stat_2_value": "10,000+",
      "stat_2_label": "月订单量",
      "stat_3_value": "70%",
      "stat_3_label": "时间节省",
      "stat_4_value": "1400万+",
      "stat_4_label": "月处理金额(元)"
    },
    "fr": {
      "stat_1_value": "50+",
      "stat_1_label": "Exportateurs",
      "stat_2_value": "10 000+",
      "stat_2_label": "Commandes/mois",
      "stat_3_value": "70%",
      "stat_3_label": "Temps économisé",
      "stat_4_value": "2M$+",
      "stat_4_label": "Traité mensuellement"
    },
    "es": {
      "stat_1_value": "50+",
      "stat_1_label": "Exportadores",
      "stat_2_value": "10,000+",
      "stat_2_label": "Pedidos/mes",
      "stat_3_value": "70%",
      "stat_3_label": "Tiempo ahorrado",
      "stat_4_value": "$2M+",
      "stat_4_label": "Procesado mensualmente"
    },
    "id": {
      "stat_1_value": "50+",
      "stat_1_label": "Eksportir",
      "stat_2_value": "10.000+",
      "stat_2_label": "Pesanan/bulan",
      "stat_3_value": "70%",
      "stat_3_label": "Waktu dihemat",
      "stat_4_value": "$2M+",
      "stat_4_label": "Diproses bulanan"
    }
  }
}
```

---

### PRICING PAGE

```json
{
  "pricing": {
    "en": {
      "section_title": "Simple, transparent pricing",
      "section_subtitle": "14-day free trial with personalized onboarding. Save 15% with annual billing.",
      "toggle_monthly": "Monthly",
      "toggle_annual": "Annual",
      "save_badge": "Save 15%",
      
      "plan_starter_name": "Starter",
      "plan_starter_description": "For small exporters getting started",
      "plan_starter_price_monthly": "€49",
      "plan_starter_price_annual": "€42",
      "plan_starter_period": "/month",
      "plan_starter_features": ["2 team members", "100 orders/month", "500 products", "1 price tier (same price for all)", "Basic portal", "Email support"],
      "plan_starter_cta": "Start Free Trial",
      
      "plan_pro_name": "Pro",
      "plan_pro_description": "For growing export businesses",
      "plan_pro_price_monthly": "€149",
      "plan_pro_price_annual": "€127",
      "plan_pro_period": "/month",
      "plan_pro_badge": "Most Popular",
      "plan_pro_features": ["5 team members", "500 orders/month", "Unlimited products", "3 price tiers (Distributor/Retail/VIP)", "Full branding (logo, colors)", "Proforma invoices", "Priority email support"],
      "plan_pro_cta": "Start Free Trial",
      
      "plan_business_name": "Business",
      "plan_business_description": "For established export operations",
      "plan_business_price_monthly": "€299",
      "plan_business_price_annual": "€254",
      "plan_business_period": "/month",
      "plan_business_features": ["15 team members", "2,000 orders/month", "Unlimited products", "Unlimited price tiers (per-customer pricing)", "Custom domain", "T/T payment tracking", "Priority support"],
      "plan_business_cta": "Start Free Trial",
      
      "plan_enterprise_name": "Enterprise",
      "plan_enterprise_description": "For large organizations",
      "plan_enterprise_price": "€499",
      "plan_enterprise_period": "/month",
      "plan_enterprise_billing": "Annual billing only",
      "plan_enterprise_features": ["Unlimited team members", "Unlimited orders", "Unlimited products", "Unlimited price tiers", "Custom domain", "T/T payment tracking", "3 custom requests/year", "Dedicated WhatsApp support"],
      "plan_enterprise_cta": "Contact Us",
      
      "price_tiers_title": "What are Price Tiers?",
      "price_tiers_desc": "Set different price levels for different customer types. Assign each customer to a tier, and they automatically see their prices in the portal.",
      "price_tiers_example": "Example: Widget A → Distributor €10 | Retailer €12.50 | VIP €15",
      
      "faq_title": "Frequently Asked Questions",
      "faq_1_q": "Is there a free trial?",
      "faq_1_a": "Yes! Try any plan free for 14 days. We'll personally help you set up your portal. No credit card required.",
      "faq_2_q": "Can I switch plans anytime?",
      "faq_2_a": "Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle.",
      "faq_3_q": "What payment methods do you accept?",
      "faq_3_a": "We accept all major credit cards and PayPal. Annual plans can also pay by bank transfer.",
      "faq_4_q": "What are custom requests (Enterprise)?",
      "faq_4_a": "Small customizations like adding a field, modifying a PDF template, or creating a simple report. Not major features or integrations.",
      
      "guarantee_title": "30-Day Money-Back Guarantee",
      "guarantee_text": "Not satisfied? Get a full refund within 30 days. No questions asked."
    },
    "zh": {
      "section_title": "简单透明的定价",
      "section_subtitle": "14天免费试用，专人协助配置。年付享受85折优惠。",
      "toggle_monthly": "月付",
      "toggle_annual": "年付",
      "save_badge": "省15%",
      
      "plan_starter_name": "入门版",
      "plan_starter_description": "适合刚起步的小型出口商",
      "plan_starter_price_monthly": "€49",
      "plan_starter_price_annual": "€42",
      "plan_starter_period": "/月",
      "plan_starter_features": ["2个用户", "100单/月", "500个产品", "1个价格层级（统一价格）", "基础门户", "邮件支持"],
      "plan_starter_cta": "免费试用",
      
      "plan_pro_name": "专业版",
      "plan_pro_description": "适合成长中的出口企业",
      "plan_pro_price_monthly": "€149",
      "plan_pro_price_annual": "€127",
      "plan_pro_period": "/月",
      "plan_pro_badge": "最受欢迎",
      "plan_pro_features": ["5个用户", "500单/月", "无限产品", "3个价格层级（经销商/零售/VIP）", "完整品牌定制（logo、颜色）", "形式发票", "优先邮件支持"],
      "plan_pro_cta": "免费试用",
      
      "plan_business_name": "商业版",
      "plan_business_description": "适合成熟的出口业务",
      "plan_business_price_monthly": "€299",
      "plan_business_price_annual": "€254",
      "plan_business_period": "/月",
      "plan_business_features": ["15个用户", "2000单/月", "无限产品", "无限价格层级（按客户定价）", "自定义域名", "T/T收款追踪", "优先支持"],
      "plan_business_cta": "免费试用",
      
      "plan_enterprise_name": "企业版",
      "plan_enterprise_description": "适合大型组织",
      "plan_enterprise_price": "€499",
      "plan_enterprise_period": "/月",
      "plan_enterprise_billing": "仅限年付",
      "plan_enterprise_features": ["无限用户", "无限订单", "无限产品", "无限价格层级", "自定义域名", "T/T收款追踪", "每年3次定制需求", "专属WhatsApp/微信支持"],
      "plan_enterprise_cta": "联系我们",
      
      "price_tiers_title": "什么是价格层级？",
      "price_tiers_desc": "为不同类型的客户设置不同的价格水平。将每个客户分配到一个层级，他们在门户中自动看到自己的价格。",
      "price_tiers_example": "示例：产品A → 经销商 €10 | 零售商 €12.50 | VIP €15",
      
      "faq_title": "常见问题",
      "faq_1_q": "有免费试用吗？",
      "faq_1_a": "有！任何套餐均可免费试用14天，我们会亲自协助您配置门户。无需信用卡。",
      "faq_2_q": "可以随时切换套餐吗？",
      "faq_2_a": "可以，随时升级或降级。变更在下一个账单周期生效。",
      "faq_3_q": "支持哪些付款方式？",
      "faq_3_a": "支持所有主流信用卡和PayPal。年付可使用银行转账。",
      "faq_4_q": "什么是定制需求（企业版）？",
      "faq_4_a": "小型定制，如添加字段、修改PDF模板或创建简单报表。不包括重大功能或集成。",
      
      "guarantee_title": "30天无理由退款",
      "guarantee_text": "不满意？30天内全额退款，无需任何理由。"
    },
    "fr": {
      "section_title": "Tarification simple et transparente",
      "section_subtitle": "14 jours d'essai gratuit avec onboarding personnalisé. Économisez 15% en facturation annuelle.",
      "toggle_monthly": "Mensuel",
      "toggle_annual": "Annuel",
      "save_badge": "Économisez 15%",
      
      "plan_starter_name": "Starter",
      "plan_starter_description": "Pour les petits exportateurs qui démarrent",
      "plan_starter_price_monthly": "49€",
      "plan_starter_price_annual": "42€",
      "plan_starter_period": "/mois",
      "plan_starter_features": ["2 utilisateurs", "100 commandes/mois", "500 produits", "1 niveau de prix (même prix pour tous)", "Portail basique", "Support email"],
      "plan_starter_cta": "Essai Gratuit",
      
      "plan_pro_name": "Pro",
      "plan_pro_description": "Pour les entreprises d'export en croissance",
      "plan_pro_price_monthly": "149€",
      "plan_pro_price_annual": "127€",
      "plan_pro_period": "/mois",
      "plan_pro_badge": "Le Plus Populaire",
      "plan_pro_features": ["5 utilisateurs", "500 commandes/mois", "Produits illimités", "3 niveaux de prix (Distri/Retail/VIP)", "Branding complet (logo, couleurs)", "Factures proforma", "Support email prioritaire"],
      "plan_pro_cta": "Essai Gratuit",
      
      "plan_business_name": "Business",
      "plan_business_description": "Pour les opérations d'export établies",
      "plan_business_price_monthly": "299€",
      "plan_business_price_annual": "254€",
      "plan_business_period": "/mois",
      "plan_business_features": ["15 utilisateurs", "2 000 commandes/mois", "Produits illimités", "Niveaux de prix illimités (prix par client)", "Domaine personnalisé", "Suivi paiements T/T", "Support prioritaire"],
      "plan_business_cta": "Essai Gratuit",
      
      "plan_enterprise_name": "Enterprise",
      "plan_enterprise_description": "Pour les grandes organisations",
      "plan_enterprise_price": "499€",
      "plan_enterprise_period": "/mois",
      "plan_enterprise_billing": "Facturation annuelle uniquement",
      "plan_enterprise_features": ["Utilisateurs illimités", "Commandes illimitées", "Produits illimités", "Niveaux de prix illimités", "Domaine personnalisé", "Suivi paiements T/T", "3 demandes custom/an", "Support WhatsApp dédié"],
      "plan_enterprise_cta": "Nous Contacter",
      
      "price_tiers_title": "Qu'est-ce que les Niveaux de Prix ?",
      "price_tiers_desc": "Définissez différents niveaux de prix pour différents types de clients. Assignez chaque client à un niveau, il voit automatiquement ses prix dans le portail.",
      "price_tiers_example": "Exemple : Widget A → Distributeur 10€ | Détaillant 12,50€ | VIP 15€",
      
      "faq_title": "Questions Fréquentes",
      "faq_1_q": "Y a-t-il un essai gratuit ?",
      "faq_1_a": "Oui ! Essayez n'importe quel plan gratuitement pendant 14 jours. On vous aide personnellement à configurer votre portail. Sans carte bancaire.",
      "faq_2_q": "Puis-je changer de plan à tout moment ?",
      "faq_2_a": "Oui, montez ou descendez en gamme quand vous voulez. Les changements prennent effet au prochain cycle de facturation.",
      "faq_3_q": "Quels moyens de paiement acceptez-vous ?",
      "faq_3_a": "Nous acceptons toutes les cartes bancaires et PayPal. Les plans annuels peuvent payer par virement.",
      "faq_4_q": "Que sont les demandes custom (Enterprise) ?",
      "faq_4_a": "De petites personnalisations comme ajouter un champ, modifier un template PDF, ou créer un rapport simple. Pas de fonctionnalités majeures.",
      
      "guarantee_title": "Garantie 30 Jours Satisfait ou Remboursé",
      "guarantee_text": "Pas satisfait ? Remboursement intégral sous 30 jours. Sans question."
    },
    "es": {
      "section_title": "Precios simples y transparentes",
      "section_subtitle": "14 días de prueba gratis con onboarding personalizado. Ahorra 15% con facturación anual.",
      "toggle_monthly": "Mensual",
      "toggle_annual": "Anual",
      "save_badge": "Ahorra 15%",
      
      "plan_starter_name": "Starter",
      "plan_starter_description": "Para pequeños exportadores que empiezan",
      "plan_starter_price_monthly": "€49",
      "plan_starter_price_annual": "€42",
      "plan_starter_period": "/mes",
      "plan_starter_features": ["2 usuarios", "100 pedidos/mes", "500 productos", "1 nivel de precio (mismo precio para todos)", "Portal básico", "Soporte por email"],
      "plan_starter_cta": "Prueba Gratis",
      
      "plan_pro_name": "Pro",
      "plan_pro_description": "Para negocios de exportación en crecimiento",
      "plan_pro_price_monthly": "€149",
      "plan_pro_price_annual": "€127",
      "plan_pro_period": "/mes",
      "plan_pro_badge": "Más Popular",
      "plan_pro_features": ["5 usuarios", "500 pedidos/mes", "Productos ilimitados", "3 niveles de precio (Distri/Retail/VIP)", "Branding completo (logo, colores)", "Facturas proforma", "Soporte email prioritario"],
      "plan_pro_cta": "Prueba Gratis",
      
      "plan_business_name": "Business",
      "plan_business_description": "Para operaciones de exportación establecidas",
      "plan_business_price_monthly": "€299",
      "plan_business_price_annual": "€254",
      "plan_business_period": "/mes",
      "plan_business_features": ["15 usuarios", "2,000 pedidos/mes", "Productos ilimitados", "Niveles de precio ilimitados (precio por cliente)", "Dominio personalizado", "Seguimiento pagos T/T", "Soporte prioritario"],
      "plan_business_cta": "Prueba Gratis",
      
      "plan_enterprise_name": "Enterprise",
      "plan_enterprise_description": "Para grandes organizaciones",
      "plan_enterprise_price": "€499",
      "plan_enterprise_period": "/mes",
      "plan_enterprise_billing": "Solo facturación anual",
      "plan_enterprise_features": ["Usuarios ilimitados", "Pedidos ilimitados", "Productos ilimitados", "Niveles de precio ilimitados", "Dominio personalizado", "Seguimiento pagos T/T", "3 solicitudes custom/año", "Soporte WhatsApp dedicado"],
      "plan_enterprise_cta": "Contáctanos",
      
      "price_tiers_title": "¿Qué son los Niveles de Precio?",
      "price_tiers_desc": "Define diferentes niveles de precio para diferentes tipos de clientes. Asigna cada cliente a un nivel, y automáticamente ven sus precios en el portal.",
      "price_tiers_example": "Ejemplo: Widget A → Distribuidor €10 | Minorista €12.50 | VIP €15",
      
      "faq_title": "Preguntas Frecuentes",
      "faq_1_q": "¿Hay prueba gratuita?",
      "faq_1_a": "¡Sí! Prueba cualquier plan gratis por 14 días. Te ayudamos personalmente a configurar tu portal. Sin tarjeta de crédito.",
      "faq_2_q": "¿Puedo cambiar de plan en cualquier momento?",
      "faq_2_a": "Sí, sube o baja de plan cuando quieras. Los cambios se aplican en tu próximo ciclo de facturación.",
      "faq_3_q": "¿Qué métodos de pago aceptan?",
      "faq_3_a": "Aceptamos todas las tarjetas principales y PayPal. Los planes anuales pueden pagar por transferencia.",
      "faq_4_q": "¿Qué son las solicitudes custom (Enterprise)?",
      "faq_4_a": "Pequeñas personalizaciones como agregar un campo, modificar una plantilla PDF, o crear un reporte simple. No funcionalidades mayores.",
      
      "guarantee_title": "Garantía de Devolución de 30 Días",
      "guarantee_text": "¿No satisfecho? Reembolso completo en 30 días. Sin preguntas."
    },
    "id": {
      "section_title": "Harga sederhana dan transparan",
      "section_subtitle": "14 hari uji coba gratis dengan onboarding personal. Hemat 15% dengan tagihan tahunan.",
      "toggle_monthly": "Bulanan",
      "toggle_annual": "Tahunan",
      "save_badge": "Hemat 15%",
      
      "plan_starter_name": "Starter",
      "plan_starter_description": "Untuk eksportir kecil yang baru memulai",
      "plan_starter_price_monthly": "€49",
      "plan_starter_price_annual": "€42",
      "plan_starter_period": "/bulan",
      "plan_starter_features": ["2 pengguna", "100 pesanan/bulan", "500 produk", "1 tier harga (harga sama untuk semua)", "Portal dasar", "Dukungan email"],
      "plan_starter_cta": "Coba Gratis",
      
      "plan_pro_name": "Pro",
      "plan_pro_description": "Untuk bisnis ekspor yang berkembang",
      "plan_pro_price_monthly": "€149",
      "plan_pro_price_annual": "€127",
      "plan_pro_period": "/bulan",
      "plan_pro_badge": "Paling Populer",
      "plan_pro_features": ["5 pengguna", "500 pesanan/bulan", "Produk unlimited", "3 tier harga (Distributor/Retail/VIP)", "Branding lengkap (logo, warna)", "Invoice proforma", "Dukungan email prioritas"],
      "plan_pro_cta": "Coba Gratis",
      
      "plan_business_name": "Business",
      "plan_business_description": "Untuk operasi ekspor yang sudah mapan",
      "plan_business_price_monthly": "€299",
      "plan_business_price_annual": "€254",
      "plan_business_period": "/bulan",
      "plan_business_features": ["15 pengguna", "2.000 pesanan/bulan", "Produk unlimited", "Tier harga unlimited (harga per pelanggan)", "Domain kustom", "Pelacakan pembayaran T/T", "Dukungan prioritas"],
      "plan_business_cta": "Coba Gratis",
      
      "plan_enterprise_name": "Enterprise",
      "plan_enterprise_description": "Untuk organisasi besar",
      "plan_enterprise_price": "€499",
      "plan_enterprise_period": "/bulan",
      "plan_enterprise_billing": "Tagihan tahunan saja",
      "plan_enterprise_features": ["Pengguna unlimited", "Pesanan unlimited", "Produk unlimited", "Tier harga unlimited", "Domain kustom", "Pelacakan pembayaran T/T", "3 permintaan kustom/tahun", "Dukungan WhatsApp khusus"],
      "plan_enterprise_cta": "Hubungi Kami",
      
      "price_tiers_title": "Apa itu Tier Harga?",
      "price_tiers_desc": "Tetapkan level harga berbeda untuk jenis pelanggan berbeda. Tetapkan setiap pelanggan ke tier, dan mereka otomatis melihat harga mereka di portal.",
      "price_tiers_example": "Contoh: Widget A → Distributor €10 | Retail €12.50 | VIP €15",
      
      "faq_title": "Pertanyaan yang Sering Diajukan",
      "faq_1_q": "Apakah ada uji coba gratis?",
      "faq_1_a": "Ya! Coba paket apa pun gratis selama 14 hari. Kami akan membantu Anda secara personal untuk setup portal. Tanpa kartu kredit.",
      "faq_2_q": "Bisakah saya ganti paket kapan saja?",
      "faq_2_a": "Ya, upgrade atau downgrade kapan saja. Perubahan berlaku di siklus penagihan berikutnya.",
      "faq_3_q": "Metode pembayaran apa yang diterima?",
      "faq_3_a": "Kami menerima semua kartu kredit utama dan PayPal. Paket tahunan bisa bayar dengan transfer bank.",
      "faq_4_q": "Apa itu permintaan kustom (Enterprise)?",
      "faq_4_a": "Kustomisasi kecil seperti menambah field, memodifikasi template PDF, atau membuat laporan sederhana. Bukan fitur besar.",
      
      "guarantee_title": "Jaminan Uang Kembali 30 Hari",
      "guarantee_text": "Tidak puas? Pengembalian dana penuh dalam 30 hari. Tanpa pertanyaan."
    }
  }
}
```

---

### CTA SECTIONS

```json
{
  "cta": {
    "en": {
      "headline": "Ready to stop the chaos?",
      "subheadline": "Join 50+ exporters who transformed their order management.",
      "cta_primary": "Start Free Trial",
      "cta_secondary": "Book a Demo",
      "no_credit_card": "No credit card required • Set up in 10 minutes"
    },
    "zh": {
      "headline": "准备好告别混乱了吗？",
      "subheadline": "加入50+已经转型成功的出口商行列。",
      "cta_primary": "免费试用",
      "cta_secondary": "预约演示",
      "no_credit_card": "无需信用卡 • 10分钟即可上手"
    },
    "fr": {
      "headline": "Prêt à mettre fin au chaos ?",
      "subheadline": "Rejoignez 50+ exportateurs qui ont transformé leur gestion des commandes.",
      "cta_primary": "Essai Gratuit",
      "cta_secondary": "Réserver une Démo",
      "no_credit_card": "Sans carte bancaire • Configuration en 10 minutes"
    },
    "es": {
      "headline": "¿Listo para acabar con el caos?",
      "subheadline": "Únete a 50+ exportadores que transformaron su gestión de pedidos.",
      "cta_primary": "Prueba Gratis",
      "cta_secondary": "Agendar Demo",
      "no_credit_card": "Sin tarjeta de crédito • Configura en 10 minutos"
    },
    "id": {
      "headline": "Siap mengakhiri kekacauan?",
      "subheadline": "Bergabung dengan 50+ eksportir yang telah mentransformasi manajemen pesanan mereka.",
      "cta_primary": "Coba Gratis",
      "cta_secondary": "Jadwalkan Demo",
      "no_credit_card": "Tanpa kartu kredit • Setup dalam 10 menit"
    }
  }
}
```

---

### FOOTER

```json
{
  "footer": {
    "en": {
      "product": "Product",
      "product_features": "Features",
      "product_pricing": "Pricing",
      "product_customers": "Customers",
      "product_changelog": "Changelog",
      
      "resources": "Resources",
      "resources_blog": "Blog",
      "resources_guides": "Guides",
      "resources_help": "Help Center",
      "resources_api": "API Docs",
      
      "company": "Company",
      "company_about": "About",
      "company_contact": "Contact",
      "company_careers": "Careers",
      "company_press": "Press",
      
      "legal": "Legal",
      "legal_privacy": "Privacy Policy",
      "legal_terms": "Terms of Service",
      "legal_security": "Security",
      
      "copyright": "© 2026 ExportFlow. All rights reserved.",
      "made_with": "Made with ❤️ for exporters worldwide"
    },
    "zh": {
      "product": "产品",
      "product_features": "功能",
      "product_pricing": "价格",
      "product_customers": "客户案例",
      "product_changelog": "更新日志",
      
      "resources": "资源",
      "resources_blog": "博客",
      "resources_guides": "指南",
      "resources_help": "帮助中心",
      "resources_api": "API文档",
      
      "company": "公司",
      "company_about": "关于我们",
      "company_contact": "联系我们",
      "company_careers": "加入我们",
      "company_press": "媒体报道",
      
      "legal": "法律",
      "legal_privacy": "隐私政策",
      "legal_terms": "服务条款",
      "legal_security": "安全",
      
      "copyright": "© 2026 ExportFlow. 保留所有权利。",
      "made_with": "用 ❤️ 为全球出口商打造"
    },
    "fr": {
      "product": "Produit",
      "product_features": "Fonctionnalités",
      "product_pricing": "Tarifs",
      "product_customers": "Clients",
      "product_changelog": "Changelog",
      
      "resources": "Ressources",
      "resources_blog": "Blog",
      "resources_guides": "Guides",
      "resources_help": "Centre d'aide",
      "resources_api": "Docs API",
      
      "company": "Entreprise",
      "company_about": "À propos",
      "company_contact": "Contact",
      "company_careers": "Carrières",
      "company_press": "Presse",
      
      "legal": "Légal",
      "legal_privacy": "Politique de confidentialité",
      "legal_terms": "Conditions d'utilisation",
      "legal_security": "Sécurité",
      
      "copyright": "© 2026 ExportFlow. Tous droits réservés.",
      "made_with": "Fait avec ❤️ pour les exportateurs du monde entier"
    },
    "es": {
      "product": "Producto",
      "product_features": "Funciones",
      "product_pricing": "Precios",
      "product_customers": "Clientes",
      "product_changelog": "Changelog",
      
      "resources": "Recursos",
      "resources_blog": "Blog",
      "resources_guides": "Guías",
      "resources_help": "Centro de Ayuda",
      "resources_api": "Docs API",
      
      "company": "Empresa",
      "company_about": "Nosotros",
      "company_contact": "Contacto",
      "company_careers": "Empleos",
      "company_press": "Prensa",
      
      "legal": "Legal",
      "legal_privacy": "Política de Privacidad",
      "legal_terms": "Términos de Servicio",
      "legal_security": "Seguridad",
      
      "copyright": "© 2026 ExportFlow. Todos los derechos reservados.",
      "made_with": "Hecho con ❤️ para exportadores de todo el mundo"
    },
    "id": {
      "product": "Produk",
      "product_features": "Fitur",
      "product_pricing": "Harga",
      "product_customers": "Pelanggan",
      "product_changelog": "Changelog",
      
      "resources": "Sumber Daya",
      "resources_blog": "Blog",
      "resources_guides": "Panduan",
      "resources_help": "Pusat Bantuan",
      "resources_api": "Dok API",
      
      "company": "Perusahaan",
      "company_about": "Tentang",
      "company_contact": "Kontak",
      "company_careers": "Karir",
      "company_press": "Pers",
      
      "legal": "Legal",
      "legal_privacy": "Kebijakan Privasi",
      "legal_terms": "Ketentuan Layanan",
      "legal_security": "Keamanan",
      
      "copyright": "© 2026 ExportFlow. Hak cipta dilindungi.",
      "made_with": "Dibuat dengan ❤️ untuk eksportir di seluruh dunia"
    }
  }
}
```

---

### SIGNUP & LOGIN

```json
{
  "auth": {
    "en": {
      "signup_title": "Start Your Free Trial",
      "signup_subtitle": "14 days free. No credit card required.",
      "signup_company": "Company Name",
      "signup_name": "Your Name",
      "signup_email": "Work Email",
      "signup_phone": "Phone (optional)",
      "signup_password": "Create Password",
      "signup_agree": "I agree to the",
      "signup_terms": "Terms of Service",
      "signup_and": "and",
      "signup_privacy": "Privacy Policy",
      "signup_cta": "Create My Portal",
      "signup_login_prompt": "Already have an account?",
      "signup_login_link": "Log in",
      
      "signup_benefits_title": "What you get:",
      "signup_benefit_1": "Your own portal at yourcompany.exportflow.io",
      "signup_benefit_2": "Import up to 500 products",
      "signup_benefit_3": "Invite up to 20 customers",
      "signup_benefit_4": "Full feature access",
      "signup_benefit_5": "Email & chat support",
      
      "login_title": "Welcome back",
      "login_email": "Email",
      "login_password": "Password",
      "login_remember": "Remember me",
      "login_forgot": "Forgot password?",
      "login_cta": "Log in",
      "login_signup_prompt": "Don't have an account?",
      "login_signup_link": "Start free trial"
    },
    "zh": {
      "signup_title": "开始免费试用",
      "signup_subtitle": "14天免费，无需绑定信用卡。",
      "signup_company": "公司名称",
      "signup_name": "您的姓名",
      "signup_email": "工作邮箱",
      "signup_phone": "电话（可选）",
      "signup_password": "创建密码",
      "signup_agree": "我同意",
      "signup_terms": "服务条款",
      "signup_and": "和",
      "signup_privacy": "隐私政策",
      "signup_cta": "创建我的门户",
      "signup_login_prompt": "已有账户？",
      "signup_login_link": "登录",
      
      "signup_benefits_title": "您将获得：",
      "signup_benefit_1": "您专属的门户 yourcompany.exportflow.io",
      "signup_benefit_2": "最多导入500个产品",
      "signup_benefit_3": "最多邀请20个客户",
      "signup_benefit_4": "全功能访问",
      "signup_benefit_5": "邮件和在线客服支持",
      
      "login_title": "欢迎回来",
      "login_email": "邮箱",
      "login_password": "密码",
      "login_remember": "记住我",
      "login_forgot": "忘记密码？",
      "login_cta": "登录",
      "login_signup_prompt": "还没有账户？",
      "login_signup_link": "免费试用"
    },
    "fr": {
      "signup_title": "Commencez Votre Essai Gratuit",
      "signup_subtitle": "14 jours gratuits. Sans carte bancaire.",
      "signup_company": "Nom de l'entreprise",
      "signup_name": "Votre nom",
      "signup_email": "Email professionnel",
      "signup_phone": "Téléphone (optionnel)",
      "signup_password": "Créer un mot de passe",
      "signup_agree": "J'accepte les",
      "signup_terms": "Conditions d'utilisation",
      "signup_and": "et la",
      "signup_privacy": "Politique de confidentialité",
      "signup_cta": "Créer Mon Portail",
      "signup_login_prompt": "Déjà un compte ?",
      "signup_login_link": "Se connecter",
      
      "signup_benefits_title": "Ce que vous obtenez :",
      "signup_benefit_1": "Votre propre portail votreentreprise.exportflow.io",
      "signup_benefit_2": "Importez jusqu'à 500 produits",
      "signup_benefit_3": "Invitez jusqu'à 20 clients",
      "signup_benefit_4": "Accès à toutes les fonctionnalités",
      "signup_benefit_5": "Support email & chat",
      
      "login_title": "Bon retour",
      "login_email": "Email",
      "login_password": "Mot de passe",
      "login_remember": "Se souvenir de moi",
      "login_forgot": "Mot de passe oublié ?",
      "login_cta": "Se connecter",
      "login_signup_prompt": "Pas encore de compte ?",
      "login_signup_link": "Essai gratuit"
    },
    "es": {
      "signup_title": "Comienza Tu Prueba Gratuita",
      "signup_subtitle": "14 días gratis. Sin tarjeta de crédito.",
      "signup_company": "Nombre de la empresa",
      "signup_name": "Tu nombre",
      "signup_email": "Email de trabajo",
      "signup_phone": "Teléfono (opcional)",
      "signup_password": "Crear contraseña",
      "signup_agree": "Acepto los",
      "signup_terms": "Términos de Servicio",
      "signup_and": "y la",
      "signup_privacy": "Política de Privacidad",
      "signup_cta": "Crear Mi Portal",
      "signup_login_prompt": "¿Ya tienes cuenta?",
      "signup_login_link": "Iniciar sesión",
      
      "signup_benefits_title": "Lo que obtienes:",
      "signup_benefit_1": "Tu propio portal tuempresa.exportflow.io",
      "signup_benefit_2": "Importa hasta 500 productos",
      "signup_benefit_3": "Invita hasta 20 clientes",
      "signup_benefit_4": "Acceso a todas las funciones",
      "signup_benefit_5": "Soporte por email y chat",
      
      "login_title": "Bienvenido de nuevo",
      "login_email": "Email",
      "login_password": "Contraseña",
      "login_remember": "Recordarme",
      "login_forgot": "¿Olvidaste la contraseña?",
      "login_cta": "Iniciar sesión",
      "login_signup_prompt": "¿No tienes cuenta?",
      "login_signup_link": "Prueba gratis"
    },
    "id": {
      "signup_title": "Mulai Uji Coba Gratis",
      "signup_subtitle": "14 hari gratis. Tanpa kartu kredit.",
      "signup_company": "Nama Perusahaan",
      "signup_name": "Nama Anda",
      "signup_email": "Email Kerja",
      "signup_phone": "Telepon (opsional)",
      "signup_password": "Buat Password",
      "signup_agree": "Saya setuju dengan",
      "signup_terms": "Ketentuan Layanan",
      "signup_and": "dan",
      "signup_privacy": "Kebijakan Privasi",
      "signup_cta": "Buat Portal Saya",
      "signup_login_prompt": "Sudah punya akun?",
      "signup_login_link": "Masuk",
      
      "signup_benefits_title": "Yang Anda dapatkan:",
      "signup_benefit_1": "Portal Anda sendiri di perusahaananda.exportflow.io",
      "signup_benefit_2": "Impor hingga 500 produk",
      "signup_benefit_3": "Undang hingga 20 pelanggan",
      "signup_benefit_4": "Akses fitur lengkap",
      "signup_benefit_5": "Dukungan email & chat",
      
      "login_title": "Selamat datang kembali",
      "login_email": "Email",
      "login_password": "Password",
      "login_remember": "Ingat saya",
      "login_forgot": "Lupa password?",
      "login_cta": "Masuk",
      "login_signup_prompt": "Belum punya akun?",
      "login_signup_link": "Coba gratis"
    }
  }
}
```

---

## 🔍 SEO CONFIGURATION

### Meta Tags per Page

```typescript
// src/lib/seo.ts

export const seoConfig = {
  en: {
    home: {
      title: "ExportFlow - Order Management for Chinese Exporters",
      description: "Stop losing orders to email chaos. Give your international customers a professional ordering portal. Track payments, manage products, ship faster.",
      keywords: "export management, B2B ordering portal, China exporter software, order tracking, payment tracking, T/T payment management"
    },
    features: {
      title: "Features - ExportFlow | Complete Export Management Platform",
      description: "Branded ordering portal, smart catalog, payment tracking, export documents. Everything you need to streamline your export business.",
      keywords: "export software features, ordering portal, product catalog, payment tracking, proforma invoice, commercial invoice"
    },
    pricing: {
      title: "Pricing - ExportFlow | Transparent Plans for Every Exporter",
      description: "Simple, transparent pricing starting at $499/month. 14-day free trial, no credit card required. Choose the plan that fits your export business.",
      keywords: "export software pricing, B2B platform pricing, order management cost"
    }
  },
  zh: {
    home: {
      title: "ExportFlow - 出口商订单管理平台",
      description: "告别邮件混乱，订单从此不再丢失。为您的海外客户提供专业的在线订货平台。追踪付款、管理产品、加速发货。",
      keywords: "出口管理软件, B2B订货平台, 外贸软件, 订单追踪, 收款管理, 电汇管理"
    },
    features: {
      title: "功能 - ExportFlow | 完整的出口管理平台",
      description: "品牌订货门户、智能产品目录、收款追踪、出口单据。出口业务所需的一切功能。",
      keywords: "出口软件功能, 订货门户, 产品目录, 收款追踪, 形式发票, 商业发票"
    },
    pricing: {
      title: "价格 - ExportFlow | 透明的出口商套餐",
      description: "简单透明的定价，¥3,499/月起。14天免费试用，无需信用卡。选择适合您出口业务的套餐。",
      keywords: "出口软件价格, B2B平台价格, 订单管理成本"
    }
  }
  // ... other languages
}
```

### Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ExportFlow",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "B2B order management platform for Chinese exporters",
  "offers": {
    "@type": "Offer",
    "price": "499",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "50"
  }
}
```

---

## 🤖 LLM OPTIMIZATION

### For AI Search (Perplexity, ChatGPT, Claude)

1. **Clear headings** - Use descriptive H1-H6 hierarchy
2. **FAQ sections** - Structured Q&A that LLMs can extract
3. **Feature lists** - Bulleted, scannable content
4. **Comparison content** - "ExportFlow vs Excel", "ExportFlow vs Email"
5. **Use cases** - Specific scenarios LLMs can match to queries

### Content Structure for LLMs

```html
<!-- Good for LLM parsing -->
<article itemscope itemtype="https://schema.org/Article">
  <h1>What is ExportFlow?</h1>
  <p>ExportFlow is a B2B order management platform designed specifically for Chinese exporters...</p>
  
  <h2>Key Features</h2>
  <ul>
    <li><strong>Branded Ordering Portal</strong>: Your customers get their own portal...</li>
    <li><strong>Payment Tracking</strong>: Track T/T deposits and balances...</li>
  </ul>
  
  <h2>Who is ExportFlow for?</h2>
  <p>ExportFlow is designed for Chinese exporters who sell to international B2B customers...</p>
</article>
```

---

## 📱 RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

## ✅ FINAL CHECKLIST

- [ ] All 5 languages implemented (EN, ZH, FR, ES, ID)
- [ ] Language switcher in header
- [ ] SEO meta tags per page per language
- [ ] Structured data (JSON-LD)
- [ ] Mobile responsive
- [ ] Fast loading (<3s)
- [ ] Analytics integration ready
- [ ] Contact form functional
- [ ] CTA buttons linked to /signup
- [ ] 404 page styled
- [ ] Favicon and OG images

---

## 🚀 DEPLOYMENT

Deploy to Vercel:
1. Connect GitHub repo
2. Set environment variables
3. Configure domains: exportflow.io, www.exportflow.io
4. Enable automatic deployments

---

END OF SPECIFICATION
