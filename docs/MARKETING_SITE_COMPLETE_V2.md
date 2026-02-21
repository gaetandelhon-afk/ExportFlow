# ExportFlow - Marketing Site Content (FINAL)

## 🎨 BRAND IDENTITY

### Logo
- File: `openart-dffa5c7df8e146bd9b75a1260d103263_raw.jpg`
- Style: 3D gradient ring (blue → purple → pink)
- Text: "ExportFlow" (Export in white, Flow in pink)

### Colors
```css
:root {
  --primary: #3B82F6;        /* Blue - CTAs, links */
  --primary-dark: #2563EB;   /* Blue darker - hover */
  --accent-purple: #8B5CF6;  /* Purple - accents */
  --accent-pink: #EC4899;    /* Pink - highlights */
  --gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
  --dark: #1E293B;           /* Dark blue - text, footer */
  --gray-50: #F9FAFB;        /* Light backgrounds */
  --gray-100: #F3F4F6;       /* Cards */
  --white: #FFFFFF;
}
```

### Typography
- Headings: Inter (600, 700)
- Body: Inter (400, 500)
- Font sizes: Follow Tailwind defaults

### Domain
- Main: exportflow.io
- App: [company].exportflow.io

---

## 📝 CORE MESSAGING

### Slogan (Tagline)
| Language | Slogan |
|----------|--------|
| EN | **Spend time growing, not processing orders.** |
| ZH | **把时间花在业务增长，而非处理订单。** |
| FR | **Passez du temps à grandir, pas à traiter des commandes.** |
| ES | **Dedica tiempo a crecer, no a procesar pedidos.** |
| ID | **Habiskan waktu untuk berkembang, bukan memproses pesanan.** |

### Value Proposition (Subtitle)
| Language | Text |
|----------|------|
| EN | The ordering portal that makes your export business look world-class. |
| ZH | 让您的出口业务看起来像世界500强的订购门户。 |
| FR | Le portail de commande qui donne à votre entreprise d'export une image mondiale. |
| ES | El portal de pedidos que hace que tu negocio de exportación luzca de clase mundial. |
| ID | Portal pemesanan yang membuat bisnis ekspor Anda terlihat kelas dunia. |

---

## 🏠 HOMEPAGE CONTENT

### Hero Section

```json
{
  "hero": {
    "en": {
      "title": "Spend time growing,",
      "title_highlight": "not processing orders.",
      "subtitle": "Give your customers a professional ordering portal. Watch orders roll in. Focus on what matters.",
      "cta_primary": "Start Free Trial",
      "cta_secondary": "See How It Works",
      "note": "14 days free • No credit card required"
    },
    "zh": {
      "title": "把时间花在业务增长，",
      "title_highlight": "而非处理订单。",
      "subtitle": "给客户一个专业的订购门户。订单自动涌入。专注真正重要的事。",
      "cta_primary": "免费试用",
      "cta_secondary": "了解如何运作",
      "note": "14天免费试用 • 无需信用卡"
    },
    "fr": {
      "title": "Passez du temps à grandir,",
      "title_highlight": "pas à traiter des commandes.",
      "subtitle": "Offrez à vos clients un portail de commande professionnel. Regardez les commandes arriver. Concentrez-vous sur l'essentiel.",
      "cta_primary": "Essai Gratuit",
      "cta_secondary": "Voir Comment Ça Marche",
      "note": "14 jours gratuits • Sans carte bancaire"
    },
    "es": {
      "title": "Dedica tiempo a crecer,",
      "title_highlight": "no a procesar pedidos.",
      "subtitle": "Dale a tus clientes un portal de pedidos profesional. Mira cómo llegan los pedidos. Enfócate en lo que importa.",
      "cta_primary": "Prueba Gratis",
      "cta_secondary": "Ver Cómo Funciona",
      "note": "14 días gratis • Sin tarjeta de crédito"
    },
    "id": {
      "title": "Habiskan waktu untuk berkembang,",
      "title_highlight": "bukan memproses pesanan.",
      "subtitle": "Berikan pelanggan Anda portal pemesanan profesional. Lihat pesanan mengalir masuk. Fokus pada yang penting.",
      "cta_primary": "Coba Gratis",
      "cta_secondary": "Lihat Cara Kerjanya",
      "note": "14 hari gratis • Tanpa kartu kredit"
    }
  }
}
```

### Pain Points Section

```json
{
  "pain_points": {
    "en": {
      "section_title": "Sound familiar?",
      "items": [
        {
          "icon": "📧",
          "title": "Endless email threads",
          "description": "Customers email orders. You copy to Excel. They ask for changes. You update. They ask again. Repeat forever."
        },
        {
          "icon": "📊",
          "title": "Excel everywhere",
          "description": "Price lists, order forms, invoices... all in different Excel files. One wrong copy-paste and you've got problems."
        },
        {
          "icon": "🔄",
          "title": "Same questions, every day",
          "description": "'What's the price for X?' 'What's the MOQ?' 'Do you have Y in stock?' Your team answers the same questions over and over."
        },
        {
          "icon": "📄",
          "title": "Documents take forever",
          "description": "Proforma invoices, commercial invoices, packing lists... manually created for every single order."
        }
      ]
    },
    "zh": {
      "section_title": "是不是很熟悉？",
      "items": [
        {
          "icon": "📧",
          "title": "无尽的邮件往来",
          "description": "客户发邮件下单，您复制到Excel，他们要求修改，您更新，他们再修改，如此反复。"
        },
        {
          "icon": "📊",
          "title": "Excel满天飞",
          "description": "价格表、订单表、发票...都在不同的Excel文件里。一次复制粘贴错误就会出大问题。"
        },
        {
          "icon": "🔄",
          "title": "每天重复回答相同的问题",
          "description": "'X产品什么价格？''最小起订量多少？''Y有库存吗？'您的团队一遍又一遍回答同样的问题。"
        },
        {
          "icon": "📄",
          "title": "文件制作耗时太久",
          "description": "形式发票、商业发票、装箱单...每笔订单都要手动制作。"
        }
      ]
    },
    "fr": {
      "section_title": "Ça vous dit quelque chose ?",
      "items": [
        {
          "icon": "📧",
          "title": "Des fils d'emails sans fin",
          "description": "Les clients envoient des commandes par email. Vous copiez dans Excel. Ils demandent des modifications. Vous mettez à jour. Ils redemandent. À l'infini."
        },
        {
          "icon": "📊",
          "title": "Excel partout",
          "description": "Listes de prix, formulaires de commande, factures... tout dans différents fichiers Excel. Une erreur de copier-coller et c'est le chaos."
        },
        {
          "icon": "🔄",
          "title": "Les mêmes questions, chaque jour",
          "description": "'Quel est le prix de X ?' 'Quel est le MOQ ?' 'Avez-vous Y en stock ?' Votre équipe répond aux mêmes questions encore et encore."
        },
        {
          "icon": "📄",
          "title": "Les documents prennent une éternité",
          "description": "Factures proforma, factures commerciales, listes de colisage... créées manuellement pour chaque commande."
        }
      ]
    },
    "es": {
      "section_title": "¿Te suena familiar?",
      "items": [
        {
          "icon": "📧",
          "title": "Hilos de correo interminables",
          "description": "Los clientes envían pedidos por email. Tú copias a Excel. Piden cambios. Actualizas. Vuelven a pedir. Repite para siempre."
        },
        {
          "icon": "📊",
          "title": "Excel por todas partes",
          "description": "Listas de precios, formularios de pedido, facturas... todo en diferentes archivos Excel. Un error de copiar-pegar y tienes problemas."
        },
        {
          "icon": "🔄",
          "title": "Las mismas preguntas, todos los días",
          "description": "'¿Cuál es el precio de X?' '¿Cuál es el MOQ?' '¿Tienen Y en stock?' Tu equipo responde las mismas preguntas una y otra vez."
        },
        {
          "icon": "📄",
          "title": "Los documentos tardan una eternidad",
          "description": "Facturas proforma, facturas comerciales, listas de empaque... creadas manualmente para cada pedido."
        }
      ]
    },
    "id": {
      "section_title": "Terdengar familiar?",
      "items": [
        {
          "icon": "📧",
          "title": "Thread email tanpa akhir",
          "description": "Pelanggan email pesanan. Anda copy ke Excel. Mereka minta perubahan. Anda update. Mereka minta lagi. Berulang terus."
        },
        {
          "icon": "📊",
          "title": "Excel di mana-mana",
          "description": "Daftar harga, formulir pesanan, invoice... semua di file Excel berbeda. Satu kesalahan copy-paste dan masalah muncul."
        },
        {
          "icon": "🔄",
          "title": "Pertanyaan sama, setiap hari",
          "description": "'Berapa harga X?' 'Berapa MOQ-nya?' 'Apakah Y ada stok?' Tim Anda menjawab pertanyaan yang sama berulang-ulang."
        },
        {
          "icon": "📄",
          "title": "Dokumen memakan waktu lama",
          "description": "Invoice proforma, invoice komersial, packing list... dibuat manual untuk setiap pesanan."
        }
      ]
    }
  }
}
```

### Solution Section

```json
{
  "solution": {
    "en": {
      "section_title": "There's a better way",
      "section_subtitle": "ExportFlow gives your customers a professional ordering portal. They order themselves. You focus on growing.",
      "benefits": [
        {
          "icon": "🏪",
          "title": "Your own branded portal",
          "description": "Your logo, your colors, your domain. Customers see a professional storefront, not scattered emails."
        },
        {
          "icon": "⏱️",
          "title": "Orders in, documents out",
          "description": "Customers place orders. Invoices, proformas, and packing lists generate automatically."
        },
        {
          "icon": "🌍",
          "title": "Works in any language",
          "description": "Your portal in English for customers, your dashboard in Chinese for your team. Everyone's happy."
        },
        {
          "icon": "💰",
          "title": "Different prices for different customers",
          "description": "Distributors see distributor prices. Retailers see retail prices. Automatically."
        }
      ]
    },
    "zh": {
      "section_title": "有更好的方式",
      "section_subtitle": "ExportFlow为您的客户提供专业的订购门户。他们自助下单，您专注于业务增长。",
      "benefits": [
        {
          "icon": "🏪",
          "title": "您专属的品牌门户",
          "description": "您的logo、您的颜色、您的域名。客户看到的是专业的店面，而不是零散的邮件。"
        },
        {
          "icon": "⏱️",
          "title": "订单进来，文件出去",
          "description": "客户下单后，发票、形式发票和装箱单自动生成。"
        },
        {
          "icon": "🌍",
          "title": "支持任何语言",
          "description": "客户看到英文门户，您的团队使用中文后台。皆大欢喜。"
        },
        {
          "icon": "💰",
          "title": "不同客户，不同价格",
          "description": "经销商看到经销商价格，零售商看到零售价格。全自动。"
        }
      ]
    },
    "fr": {
      "section_title": "Il y a une meilleure façon",
      "section_subtitle": "ExportFlow offre à vos clients un portail de commande professionnel. Ils commandent eux-mêmes. Vous vous concentrez sur la croissance.",
      "benefits": [
        {
          "icon": "🏪",
          "title": "Votre propre portail brandé",
          "description": "Votre logo, vos couleurs, votre domaine. Les clients voient une vitrine professionnelle, pas des emails éparpillés."
        },
        {
          "icon": "⏱️",
          "title": "Commandes entrantes, documents sortants",
          "description": "Les clients passent commande. Factures, proformas et listes de colisage se génèrent automatiquement."
        },
        {
          "icon": "🌍",
          "title": "Fonctionne dans toutes les langues",
          "description": "Votre portail en anglais pour les clients, votre tableau de bord en chinois pour votre équipe. Tout le monde est content."
        },
        {
          "icon": "💰",
          "title": "Prix différents pour différents clients",
          "description": "Les distributeurs voient les prix distributeurs. Les détaillants voient les prix détail. Automatiquement."
        }
      ]
    },
    "es": {
      "section_title": "Hay una mejor manera",
      "section_subtitle": "ExportFlow da a tus clientes un portal de pedidos profesional. Ellos piden solos. Tú te enfocas en crecer.",
      "benefits": [
        {
          "icon": "🏪",
          "title": "Tu propio portal con tu marca",
          "description": "Tu logo, tus colores, tu dominio. Los clientes ven una tienda profesional, no emails dispersos."
        },
        {
          "icon": "⏱️",
          "title": "Pedidos entran, documentos salen",
          "description": "Los clientes hacen pedidos. Facturas, proformas y listas de empaque se generan automáticamente."
        },
        {
          "icon": "🌍",
          "title": "Funciona en cualquier idioma",
          "description": "Tu portal en inglés para clientes, tu panel en chino para tu equipo. Todos contentos."
        },
        {
          "icon": "💰",
          "title": "Precios diferentes para diferentes clientes",
          "description": "Los distribuidores ven precios de distribuidor. Los minoristas ven precios minoristas. Automáticamente."
        }
      ]
    },
    "id": {
      "section_title": "Ada cara yang lebih baik",
      "section_subtitle": "ExportFlow memberikan pelanggan Anda portal pemesanan profesional. Mereka pesan sendiri. Anda fokus pada pertumbuhan.",
      "benefits": [
        {
          "icon": "🏪",
          "title": "Portal dengan brand Anda sendiri",
          "description": "Logo Anda, warna Anda, domain Anda. Pelanggan melihat toko profesional, bukan email yang tersebar."
        },
        {
          "icon": "⏱️",
          "title": "Pesanan masuk, dokumen keluar",
          "description": "Pelanggan pesan. Invoice, proforma, dan packing list dibuat otomatis."
        },
        {
          "icon": "🌍",
          "title": "Bekerja dalam bahasa apa pun",
          "description": "Portal Anda dalam bahasa Inggris untuk pelanggan, dashboard dalam bahasa Cina untuk tim Anda. Semua senang."
        },
        {
          "icon": "💰",
          "title": "Harga berbeda untuk pelanggan berbeda",
          "description": "Distributor melihat harga distributor. Retailer melihat harga retail. Otomatis."
        }
      ]
    }
  }
}
```

### How It Works

```json
{
  "how_it_works": {
    "en": {
      "section_title": "Up and running in minutes",
      "steps": [
        {
          "number": "1",
          "title": "Import your products",
          "description": "Upload your Excel product list. We'll organize it into a beautiful catalog."
        },
        {
          "number": "2",
          "title": "Invite your customers",
          "description": "Send them the link to your portal. They create an account in 30 seconds."
        },
        {
          "number": "3",
          "title": "Watch orders roll in",
          "description": "Customers browse, order, and you get notified. Documents generate automatically."
        }
      ]
    },
    "zh": {
      "section_title": "几分钟即可上线",
      "steps": [
        {
          "number": "1",
          "title": "导入您的产品",
          "description": "上传Excel产品列表，我们会将其整理成精美的目录。"
        },
        {
          "number": "2",
          "title": "邀请您的客户",
          "description": "发送门户链接给他们，30秒内即可创建账户。"
        },
        {
          "number": "3",
          "title": "坐等订单涌入",
          "description": "客户浏览、下单，您收到通知，文件自动生成。"
        }
      ]
    },
    "fr": {
      "section_title": "Opérationnel en quelques minutes",
      "steps": [
        {
          "number": "1",
          "title": "Importez vos produits",
          "description": "Téléchargez votre liste Excel. Nous l'organisons en un beau catalogue."
        },
        {
          "number": "2",
          "title": "Invitez vos clients",
          "description": "Envoyez-leur le lien vers votre portail. Ils créent un compte en 30 secondes."
        },
        {
          "number": "3",
          "title": "Regardez les commandes arriver",
          "description": "Les clients parcourent, commandent, et vous êtes notifié. Les documents se génèrent automatiquement."
        }
      ]
    },
    "es": {
      "section_title": "Funcionando en minutos",
      "steps": [
        {
          "number": "1",
          "title": "Importa tus productos",
          "description": "Sube tu lista de Excel. La organizamos en un catálogo hermoso."
        },
        {
          "number": "2",
          "title": "Invita a tus clientes",
          "description": "Envíales el link de tu portal. Crean una cuenta en 30 segundos."
        },
        {
          "number": "3",
          "title": "Mira cómo llegan los pedidos",
          "description": "Los clientes navegan, piden, y tú recibes notificación. Los documentos se generan automáticamente."
        }
      ]
    },
    "id": {
      "section_title": "Beroperasi dalam hitungan menit",
      "steps": [
        {
          "number": "1",
          "title": "Import produk Anda",
          "description": "Upload daftar produk Excel Anda. Kami akan mengorganisirnya menjadi katalog yang indah."
        },
        {
          "number": "2",
          "title": "Undang pelanggan Anda",
          "description": "Kirim link portal ke mereka. Mereka buat akun dalam 30 detik."
        },
        {
          "number": "3",
          "title": "Lihat pesanan mengalir masuk",
          "description": "Pelanggan browse, pesan, dan Anda dapat notifikasi. Dokumen dibuat otomatis."
        }
      ]
    }
  }
}
```

---

## 💬 TESTIMONIALS

```json
{
  "testimonials": {
    "en": [
      {
        "quote": "Before ExportFlow, my team spent hours translating Excel orders to Chinese for production. Now ExportFlow does it for us! No more copy-paste to make invoices and export documents. Our customers order directly through their portal. It's like having an extra employee.",
        "author": "Sarah Chen",
        "title": "Operations Manager",
        "company": "Shenzhen Hardware Co.",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "It's like having an extra employee."
      },
      {
        "quote": "My wholesale customers used to call or email with orders, and I would send them back an invoice made in Excel. Now I just watch the orders roll in and take action on any that need special attention. I can finally focus on finding new customers.",
        "author": "Michael Wang",
        "title": "Export Director",
        "company": "Ningbo Marine Parts",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "I just watch the orders roll in."
      },
      {
        "quote": "Our customers used to email asking for prices, MOQs, specs... We spent hours answering the same questions. Now everything is in their portal. They browse, they order, we produce. Simple.",
        "author": "David Liu",
        "title": "Sales Manager",
        "company": "Yiwu Home & Garden Export",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "They browse, they order, we produce. Simple."
      },
      {
        "quote": "When we sent our customers the link to their ordering portal, they were impressed. They said 'this looks like a Fortune 500 system'. We're just 15 people, but now we look world-class. ExportFlow paid for itself in the first month.",
        "author": "Mehmet Yılmaz",
        "title": "Founder",
        "company": "Anatolia Textiles Export",
        "country": "Turkey",
        "flag": "🇹🇷",
        "highlight": "This looks like a Fortune 500 system."
      },
      {
        "quote": "Before, adding more customers meant hiring more staff. Now our team of 4 handles what used to require 10 people. The portal does the heavy lifting.",
        "author": "Priya Sharma",
        "title": "COO",
        "company": "Mumbai Industrial Supplies",
        "country": "India",
        "flag": "🇮🇳",
        "highlight": "Our team of 4 handles what used to require 10."
      }
    ],
    "zh": [
      {
        "quote": "以前，我的团队花费数小时将Excel订单翻译成中文交给生产部门。现在ExportFlow自动完成！不再需要复制粘贴来制作发票和出口文件。客户直接通过门户下单。就像多了一个员工。",
        "author": "Sarah Chen",
        "title": "运营经理",
        "company": "深圳五金有限公司",
        "country": "中国",
        "flag": "🇨🇳",
        "highlight": "就像多了一个员工。"
      },
      {
        "quote": "以前批发客户打电话或发邮件下单，我再用Excel做发票发回去。现在我只需要看着订单涌入，处理那些需要特别关注的。我终于可以专注于开发新客户了。",
        "author": "Michael Wang",
        "title": "出口总监",
        "company": "宁波船舶配件",
        "country": "中国",
        "flag": "🇨🇳",
        "highlight": "我只需要看着订单涌入。"
      },
      {
        "quote": "以前客户总是发邮件问价格、起订量、规格...我们花几个小时回答同样的问题。现在一切都在他们的门户里。他们浏览、下单、我们生产。就这么简单。",
        "author": "David Liu",
        "title": "销售经理",
        "company": "义乌家居园艺出口",
        "country": "中国",
        "flag": "🇨🇳",
        "highlight": "他们浏览、下单、我们生产。"
      },
      {
        "quote": "当我们把订购门户链接发给客户时，他们印象深刻。他们说'这看起来像世界500强的系统'。我们只有15个人，但现在看起来很国际化。ExportFlow第一个月就回本了。",
        "author": "Mehmet Yılmaz",
        "title": "创始人",
        "company": "安纳托利亚纺织出口",
        "country": "土耳其",
        "flag": "🇹🇷",
        "highlight": "这看起来像世界500强的系统。"
      },
      {
        "quote": "以前，增加客户就意味着招更多人。现在我们4个人的团队能处理以前10个人的工作量。门户承担了繁重的工作。",
        "author": "Priya Sharma",
        "title": "首席运营官",
        "company": "孟买工业供应",
        "country": "印度",
        "flag": "🇮🇳",
        "highlight": "4个人处理以前10个人的工作量。"
      }
    ],
    "fr": [
      {
        "quote": "Avant ExportFlow, mon équipe passait des heures à traduire les commandes Excel en chinois pour la production. Maintenant ExportFlow le fait pour nous ! Plus de copier-coller pour les factures et documents d'export. Nos clients commandent directement via leur portail. C'est comme avoir un employé supplémentaire.",
        "author": "Sarah Chen",
        "title": "Responsable des Opérations",
        "company": "Shenzhen Hardware Co.",
        "country": "Chine",
        "flag": "🇨🇳",
        "highlight": "C'est comme avoir un employé supplémentaire."
      },
      {
        "quote": "Mes clients grossistes appelaient ou envoyaient des emails pour commander, et je leur renvoyais une facture faite sur Excel. Maintenant je regarde simplement les commandes arriver et je m'occupe de celles qui nécessitent une attention particulière. Je peux enfin me concentrer sur la prospection.",
        "author": "Michael Wang",
        "title": "Directeur Export",
        "company": "Ningbo Marine Parts",
        "country": "Chine",
        "flag": "🇨🇳",
        "highlight": "Je regarde simplement les commandes arriver."
      },
      {
        "quote": "Nos clients envoyaient des emails pour demander les prix, MOQ, specs... On passait des heures à répondre aux mêmes questions. Maintenant tout est dans leur portail. Ils parcourent, commandent, on produit. Simple.",
        "author": "David Liu",
        "title": "Directeur Commercial",
        "company": "Yiwu Home & Garden Export",
        "country": "Chine",
        "flag": "🇨🇳",
        "highlight": "Ils parcourent, commandent, on produit."
      },
      {
        "quote": "Quand nous avons envoyé le lien du portail à nos clients, ils étaient impressionnés. Ils ont dit 'ça ressemble à un système de Fortune 500'. On n'est que 15, mais maintenant on a l'air d'une multinationale. ExportFlow s'est rentabilisé dès le premier mois.",
        "author": "Mehmet Yılmaz",
        "title": "Fondateur",
        "company": "Anatolia Textiles Export",
        "country": "Turquie",
        "flag": "🇹🇷",
        "highlight": "Ça ressemble à un système de Fortune 500."
      },
      {
        "quote": "Avant, ajouter des clients signifiait embaucher plus de personnel. Maintenant notre équipe de 4 gère ce qui nécessitait 10 personnes avant. Le portail fait le gros du travail.",
        "author": "Priya Sharma",
        "title": "Directrice des Opérations",
        "company": "Mumbai Industrial Supplies",
        "country": "Inde",
        "flag": "🇮🇳",
        "highlight": "Notre équipe de 4 gère ce qui nécessitait 10 personnes."
      }
    ],
    "es": [
      {
        "quote": "Antes de ExportFlow, mi equipo pasaba horas traduciendo pedidos de Excel al chino para producción. ¡Ahora ExportFlow lo hace por nosotros! No más copiar y pegar para hacer facturas y documentos de exportación. Nuestros clientes piden directamente a través de su portal. Es como tener un empleado extra.",
        "author": "Sarah Chen",
        "title": "Gerente de Operaciones",
        "company": "Shenzhen Hardware Co.",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "Es como tener un empleado extra."
      },
      {
        "quote": "Mis clientes mayoristas solían llamar o enviar emails con pedidos, y yo les enviaba una factura hecha en Excel. Ahora solo veo cómo llegan los pedidos y actúo en los que necesitan atención especial. Por fin puedo enfocarme en conseguir nuevos clientes.",
        "author": "Michael Wang",
        "title": "Director de Exportación",
        "company": "Ningbo Marine Parts",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "Solo veo cómo llegan los pedidos."
      },
      {
        "quote": "Nuestros clientes solían enviar emails preguntando precios, MOQs, especificaciones... Pasábamos horas respondiendo las mismas preguntas. Ahora todo está en su portal. Ellos navegan, piden, nosotros producimos. Así de simple.",
        "author": "David Liu",
        "title": "Gerente de Ventas",
        "company": "Yiwu Home & Garden Export",
        "country": "China",
        "flag": "🇨🇳",
        "highlight": "Ellos navegan, piden, nosotros producimos."
      },
      {
        "quote": "Cuando enviamos a nuestros clientes el link de su portal de pedidos, quedaron impresionados. Dijeron 'esto parece un sistema de Fortune 500'. Somos solo 15 personas, pero ahora parecemos de clase mundial. ExportFlow se pagó solo en el primer mes.",
        "author": "Mehmet Yılmaz",
        "title": "Fundador",
        "company": "Anatolia Textiles Export",
        "country": "Turquía",
        "flag": "🇹🇷",
        "highlight": "Esto parece un sistema de Fortune 500."
      },
      {
        "quote": "Antes, agregar más clientes significaba contratar más personal. Ahora nuestro equipo de 4 maneja lo que antes requería 10 personas. El portal hace el trabajo pesado.",
        "author": "Priya Sharma",
        "title": "COO",
        "company": "Mumbai Industrial Supplies",
        "country": "India",
        "flag": "🇮🇳",
        "highlight": "Nuestro equipo de 4 maneja lo que requería 10."
      }
    ],
    "id": [
      {
        "quote": "Sebelum ExportFlow, tim saya menghabiskan berjam-jam menerjemahkan pesanan Excel ke bahasa Cina untuk produksi. Sekarang ExportFlow melakukannya untuk kami! Tidak ada lagi copy-paste untuk membuat invoice dan dokumen ekspor. Pelanggan kami memesan langsung melalui portal mereka. Seperti punya karyawan tambahan.",
        "author": "Sarah Chen",
        "title": "Manajer Operasional",
        "company": "Shenzhen Hardware Co.",
        "country": "Cina",
        "flag": "🇨🇳",
        "highlight": "Seperti punya karyawan tambahan."
      },
      {
        "quote": "Pelanggan grosir saya dulu menelepon atau email untuk memesan, dan saya mengirim balik invoice yang dibuat di Excel. Sekarang saya hanya melihat pesanan masuk dan menangani yang perlu perhatian khusus. Akhirnya saya bisa fokus mencari pelanggan baru.",
        "author": "Michael Wang",
        "title": "Direktur Ekspor",
        "company": "Ningbo Marine Parts",
        "country": "Cina",
        "flag": "🇨🇳",
        "highlight": "Saya hanya melihat pesanan masuk."
      },
      {
        "quote": "Pelanggan kami dulu email menanyakan harga, MOQ, spesifikasi... Kami menghabiskan berjam-jam menjawab pertanyaan yang sama. Sekarang semuanya ada di portal mereka. Mereka browse, pesan, kami produksi. Simpel.",
        "author": "David Liu",
        "title": "Manajer Penjualan",
        "company": "Yiwu Home & Garden Export",
        "country": "Cina",
        "flag": "🇨🇳",
        "highlight": "Mereka browse, pesan, kami produksi."
      },
      {
        "quote": "Ketika kami mengirim link portal pemesanan ke pelanggan, mereka terkesan. Mereka bilang 'ini terlihat seperti sistem Fortune 500'. Kami hanya 15 orang, tapi sekarang kami terlihat kelas dunia. ExportFlow membayar dirinya sendiri di bulan pertama.",
        "author": "Mehmet Yılmaz",
        "title": "Pendiri",
        "company": "Anatolia Textiles Export",
        "country": "Turki",
        "flag": "🇹🇷",
        "highlight": "Ini terlihat seperti sistem Fortune 500."
      },
      {
        "quote": "Dulu, menambah pelanggan berarti merekrut lebih banyak staf. Sekarang tim kami yang 4 orang menangani apa yang dulu membutuhkan 10 orang. Portal melakukan pekerjaan berat.",
        "author": "Priya Sharma",
        "title": "COO",
        "company": "Mumbai Industrial Supplies",
        "country": "India",
        "flag": "🇮🇳",
        "highlight": "Tim 4 orang menangani yang dulu butuh 10."
      }
    ]
  }
}
```

---

## 💰 PRICING

```json
{
  "pricing": {
    "en": {
      "section_title": "Simple, transparent pricing",
      "section_subtitle": "14-day free trial with personalized onboarding. Save 15% with annual billing.",
      "toggle_monthly": "Monthly",
      "toggle_annual": "Annual",
      "save_badge": "Save 15%",
      "popular_badge": "Most Popular",
      "annual_only": "Annual billing only",
      
      "plans": [
        {
          "name": "Starter",
          "description": "For small exporters getting started",
          "price_monthly": "€49",
          "price_annual": "€42",
          "period": "/month",
          "features": [
            "2 team members",
            "100 orders/month",
            "500 products",
            "1 price tier",
            "Basic portal",
            "Email support"
          ],
          "cta": "Start Free Trial"
        },
        {
          "name": "Pro",
          "description": "For growing export businesses",
          "price_monthly": "€149",
          "price_annual": "€127",
          "period": "/month",
          "popular": true,
          "features": [
            "5 team members",
            "500 orders/month",
            "Unlimited products",
            "3 price tiers",
            "Full branding",
            "Proforma invoices",
            "Priority email support"
          ],
          "cta": "Start Free Trial"
        },
        {
          "name": "Business",
          "description": "For established export operations",
          "price_monthly": "€299",
          "price_annual": "€254",
          "period": "/month",
          "features": [
            "15 team members",
            "2,000 orders/month",
            "Unlimited products",
            "Unlimited price tiers",
            "Custom domain",
            "T/T payment tracking",
            "Priority support"
          ],
          "cta": "Start Free Trial"
        },
        {
          "name": "Enterprise",
          "description": "For large organizations",
          "price_monthly": "€499",
          "price_annual": "€499",
          "period": "/month",
          "annual_only": true,
          "features": [
            "Unlimited team members",
            "Unlimited orders",
            "Unlimited products",
            "Unlimited price tiers",
            "Custom domain",
            "T/T payment tracking",
            "3 custom requests/year",
            "Dedicated WhatsApp support"
          ],
          "cta": "Contact Us"
        }
      ],
      
      "price_tiers_title": "What are Price Tiers?",
      "price_tiers_description": "Set different price levels for different customer types. Assign each customer to a tier, and they automatically see their prices in the portal.",
      "price_tiers_example": "Example: Widget A → Distributor €10 | Retailer €12.50 | VIP €15",
      
      "guarantee_title": "30-Day Money-Back Guarantee",
      "guarantee_text": "Not satisfied? Get a full refund within 30 days. No questions asked.",
      
      "faq": [
        {
          "question": "Is there a free trial?",
          "answer": "Yes! Try any plan free for 14 days. We'll personally help you set up your portal. No credit card required."
        },
        {
          "question": "Can I switch plans anytime?",
          "answer": "Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle."
        },
        {
          "question": "What payment methods do you accept?",
          "answer": "We accept all major credit cards and PayPal. Annual plans can also pay by bank transfer."
        },
        {
          "question": "What are custom requests (Enterprise)?",
          "answer": "Small customizations like adding a field, modifying a PDF template, or creating a simple report. Not major features or integrations."
        }
      ]
    },
    "zh": {
      "section_title": "简单透明的定价",
      "section_subtitle": "14天免费试用，专人协助配置。年付享受85折优惠。",
      "toggle_monthly": "月付",
      "toggle_annual": "年付",
      "save_badge": "省15%",
      "popular_badge": "最受欢迎",
      "annual_only": "仅限年付",
      
      "plans": [
        {
          "name": "入门版",
          "description": "适合刚起步的小型出口商",
          "price_monthly": "€49",
          "price_annual": "€42",
          "period": "/月",
          "features": [
            "2个用户",
            "100单/月",
            "500个产品",
            "1个价格层级",
            "基础门户",
            "邮件支持"
          ],
          "cta": "免费试用"
        },
        {
          "name": "专业版",
          "description": "适合成长中的出口企业",
          "price_monthly": "€149",
          "price_annual": "€127",
          "period": "/月",
          "popular": true,
          "features": [
            "5个用户",
            "500单/月",
            "无限产品",
            "3个价格层级",
            "完整品牌定制",
            "形式发票",
            "优先邮件支持"
          ],
          "cta": "免费试用"
        },
        {
          "name": "商业版",
          "description": "适合成熟的出口业务",
          "price_monthly": "€299",
          "price_annual": "€254",
          "period": "/月",
          "features": [
            "15个用户",
            "2000单/月",
            "无限产品",
            "无限价格层级",
            "自定义域名",
            "T/T收款追踪",
            "优先支持"
          ],
          "cta": "免费试用"
        },
        {
          "name": "企业版",
          "description": "适合大型组织",
          "price_monthly": "€499",
          "price_annual": "€499",
          "period": "/月",
          "annual_only": true,
          "features": [
            "无限用户",
            "无限订单",
            "无限产品",
            "无限价格层级",
            "自定义域名",
            "T/T收款追踪",
            "每年3次定制需求",
            "专属WhatsApp/微信支持"
          ],
          "cta": "联系我们"
        }
      ],
      
      "price_tiers_title": "什么是价格层级？",
      "price_tiers_description": "为不同类型的客户设置不同的价格水平。将每个客户分配到一个层级，他们在门户中自动看到自己的价格。",
      "price_tiers_example": "示例：产品A → 经销商 €10 | 零售商 €12.50 | VIP €15",
      
      "guarantee_title": "30天无理由退款",
      "guarantee_text": "不满意？30天内全额退款，无需任何理由。",
      
      "faq": [
        {
          "question": "有免费试用吗？",
          "answer": "有！任何套餐均可免费试用14天，我们会亲自协助您配置门户。无需信用卡。"
        },
        {
          "question": "可以随时切换套餐吗？",
          "answer": "可以，随时升级或降级。变更在下一个账单周期生效。"
        },
        {
          "question": "支持哪些付款方式？",
          "answer": "支持所有主流信用卡和PayPal。年付可使用银行转账。"
        },
        {
          "question": "什么是定制需求（企业版）？",
          "answer": "小型定制，如添加字段、修改PDF模板或创建简单报表。不包括重大功能或集成。"
        }
      ]
    }
  }
}
```

---

## 📄 FEATURES PAGE

```json
{
  "features": {
    "en": {
      "page_title": "Everything you need to manage export orders",
      "page_subtitle": "From product catalog to shipping documents, ExportFlow handles it all.",
      
      "features_list": [
        {
          "id": "portal",
          "title": "Branded Ordering Portal",
          "description": "Your customers get their own professional portal with your logo, colors, and domain. They browse your catalog, see their prices, and place orders 24/7.",
          "benefits": [
            "Your branding, your domain",
            "24/7 self-service ordering",
            "Mobile-friendly",
            "Multi-language support"
          ]
        },
        {
          "id": "catalog",
          "title": "Smart Product Catalog",
          "description": "Upload your Excel and we organize it into a beautiful, searchable catalog. Products with images, specs, MOQs, and stock levels.",
          "benefits": [
            "Import from Excel in minutes",
            "Product images and specs",
            "Stock levels display",
            "Category organization"
          ]
        },
        {
          "id": "pricing",
          "title": "Flexible Pricing (Price Tiers)",
          "description": "Different customers see different prices. Distributors, retailers, VIPs - each sees only their negotiated prices.",
          "benefits": [
            "Unlimited price tiers",
            "Per-customer pricing",
            "Automatic price display",
            "No more price list confusion"
          ]
        },
        {
          "id": "orders",
          "title": "Order Management",
          "description": "All orders in one place. Track status, make modifications, handle substitutions. Your team works together seamlessly.",
          "benefits": [
            "Centralized order tracking",
            "Order modification workflow",
            "Team collaboration",
            "Order history"
          ]
        },
        {
          "id": "documents",
          "title": "Automatic Documents",
          "description": "Proforma invoices, commercial invoices, packing lists - generated automatically from every order. No more manual document creation.",
          "benefits": [
            "Proforma invoices",
            "Commercial invoices",
            "Packing lists",
            "PDF export"
          ]
        },
        {
          "id": "multilingual",
          "title": "Multi-Language Support",
          "description": "Your portal in English, French, Spanish for customers. Your dashboard in Chinese for your team. Everyone works in their language.",
          "benefits": [
            "Customer portal: 5 languages",
            "Admin dashboard: Chinese",
            "Automatic translations",
            "Global ready"
          ]
        }
      ]
    },
    "zh": {
      "page_title": "管理出口订单所需的一切",
      "page_subtitle": "从产品目录到出货文件，ExportFlow全部搞定。",
      
      "features_list": [
        {
          "id": "portal",
          "title": "品牌订购门户",
          "description": "您的客户拥有自己的专业门户，带有您的logo、颜色和域名。他们可以浏览目录、查看价格、全天候下单。",
          "benefits": [
            "您的品牌，您的域名",
            "24/7自助下单",
            "移动端友好",
            "多语言支持"
          ]
        },
        {
          "id": "catalog",
          "title": "智能产品目录",
          "description": "上传Excel，我们将其整理成精美、可搜索的目录。产品包含图片、规格、起订量和库存。",
          "benefits": [
            "几分钟内从Excel导入",
            "产品图片和规格",
            "库存水平显示",
            "分类组织"
          ]
        },
        {
          "id": "pricing",
          "title": "灵活定价（价格层级）",
          "description": "不同客户看到不同价格。经销商、零售商、VIP——各自只看到自己的协商价格。",
          "benefits": [
            "无限价格层级",
            "按客户定价",
            "自动价格显示",
            "告别价格表混乱"
          ]
        },
        {
          "id": "orders",
          "title": "订单管理",
          "description": "所有订单集中一处。跟踪状态、修改订单、处理替换。团队无缝协作。",
          "benefits": [
            "集中订单跟踪",
            "订单修改流程",
            "团队协作",
            "订单历史"
          ]
        },
        {
          "id": "documents",
          "title": "自动生成文件",
          "description": "形式发票、商业发票、装箱单——每笔订单自动生成。告别手动制作文件。",
          "benefits": [
            "形式发票",
            "商业发票",
            "装箱单",
            "PDF导出"
          ]
        },
        {
          "id": "multilingual",
          "title": "多语言支持",
          "description": "客户门户支持英语、法语、西班牙语。您的后台使用中文。每个人都用自己的语言工作。",
          "benefits": [
            "客户门户：5种语言",
            "管理后台：中文",
            "自动翻译",
            "全球就绪"
          ]
        }
      ]
    }
  }
}
```

---

## 📞 CONTACT & FOOTER

```json
{
  "contact": {
    "en": {
      "page_title": "Get in touch",
      "page_subtitle": "Have questions? We'd love to hear from you.",
      "email": "hello@exportflow.io",
      "response_time": "We typically respond within 24 hours",
      "form": {
        "name": "Your name",
        "email": "Email address",
        "company": "Company name",
        "message": "How can we help?",
        "submit": "Send Message"
      },
      "wechat_title": "WeChat",
      "wechat_subtitle": "Scan to connect on WeChat"
    },
    "zh": {
      "page_title": "联系我们",
      "page_subtitle": "有问题？我们很乐意听取您的意见。",
      "email": "hello@exportflow.io",
      "response_time": "我们通常在24小时内回复",
      "form": {
        "name": "您的姓名",
        "email": "邮箱地址",
        "company": "公司名称",
        "message": "有什么可以帮您？",
        "submit": "发送消息"
      },
      "wechat_title": "微信",
      "wechat_subtitle": "扫码添加微信"
    }
  },
  
  "footer": {
    "en": {
      "product": {
        "title": "Product",
        "links": ["Features", "Pricing", "Customers", "Changelog"]
      },
      "resources": {
        "title": "Resources",
        "links": ["Documentation", "Help Center", "API Reference", "Status"]
      },
      "company": {
        "title": "Company",
        "links": ["About", "Blog", "Contact", "Careers"]
      },
      "legal": {
        "title": "Legal",
        "links": ["Privacy Policy", "Terms of Service", "Cookie Policy"]
      },
      "tagline": "Made with ❤️ for exporters worldwide",
      "copyright": "© 2025 ExportFlow. All rights reserved."
    },
    "zh": {
      "product": {
        "title": "产品",
        "links": ["功能", "定价", "客户案例", "更新日志"]
      },
      "resources": {
        "title": "资源",
        "links": ["文档", "帮助中心", "API参考", "系统状态"]
      },
      "company": {
        "title": "公司",
        "links": ["关于我们", "博客", "联系我们", "招聘"]
      },
      "legal": {
        "title": "法律",
        "links": ["隐私政策", "服务条款", "Cookie政策"]
      },
      "tagline": "用❤️为全球出口商打造",
      "copyright": "© 2025 ExportFlow. 保留所有权利。"
    }
  }
}
```

---

## 🔐 AUTH PAGES

```json
{
  "auth": {
    "en": {
      "signup": {
        "title": "Start your free trial",
        "subtitle": "14 days free. No credit card required.",
        "fields": {
          "company": "Company name",
          "name": "Your name",
          "email": "Work email",
          "password": "Password"
        },
        "submit": "Create Account",
        "login_link": "Already have an account? Sign in",
        "benefits": [
          "14-day free trial",
          "Personalized onboarding",
          "Cancel anytime",
          "30-day money-back guarantee"
        ]
      },
      "login": {
        "title": "Welcome back",
        "subtitle": "Sign in to your ExportFlow account",
        "fields": {
          "email": "Email",
          "password": "Password"
        },
        "submit": "Sign In",
        "forgot": "Forgot password?",
        "signup_link": "Don't have an account? Start free trial"
      }
    },
    "zh": {
      "signup": {
        "title": "开始免费试用",
        "subtitle": "14天免费，无需信用卡。",
        "fields": {
          "company": "公司名称",
          "name": "您的姓名",
          "email": "工作邮箱",
          "password": "密码"
        },
        "submit": "创建账户",
        "login_link": "已有账户？登录",
        "benefits": [
          "14天免费试用",
          "专人引导配置",
          "随时取消",
          "30天退款保证"
        ]
      },
      "login": {
        "title": "欢迎回来",
        "subtitle": "登录您的ExportFlow账户",
        "fields": {
          "email": "邮箱",
          "password": "密码"
        },
        "submit": "登录",
        "forgot": "忘记密码？",
        "signup_link": "没有账户？免费试用"
      }
    }
  }
}
```

---

## 🏢 ABOUT / FOUNDER STORY

```json
{
  "about": {
    "en": {
      "title": "Built by exporters, for exporters",
      "story": "ExportFlow was born from frustration. After years of managing thousands of orders through scattered Excel files and endless email threads, our founder knew there had to be a better way. Late nights reconciling orders, customers asking 'did you receive my order?', documents created manually one by one... ExportFlow is the tool we wished existed.",
      "short_story": "Built by an exporter who was tired of Excel chaos and email overload.",
      "location": "Based in France. Serving exporters worldwide.",
      "mission": "Our mission: help export businesses look professional, save time, and focus on growth."
    },
    "zh": {
      "title": "出口商打造，为出口商服务",
      "story": "ExportFlow诞生于挫折。多年来通过零散的Excel文件和无尽的邮件来管理数千笔订单后，我们的创始人知道一定有更好的方法。深夜核对订单、客户询问'收到我的订单了吗？'、一份一份手动制作文件... ExportFlow就是我们希望存在的工具。",
      "short_story": "由一位厌倦了Excel混乱和邮件泛滥的出口商打造。",
      "location": "总部位于法国，服务全球出口商。",
      "mission": "我们的使命：帮助出口企业展现专业形象、节省时间、专注增长。"
    }
  }
}
```

---

## 🔍 SEO METADATA

```json
{
  "seo": {
    "en": {
      "home": {
        "title": "ExportFlow - Order Management for Exporters",
        "description": "Stop managing orders through Excel and email. Give your customers a professional ordering portal. Save hours every week.",
        "keywords": "export order management, B2B ordering portal, wholesale order system, export business software"
      },
      "features": {
        "title": "Features - ExportFlow",
        "description": "Branded portal, smart catalog, flexible pricing, automatic documents. Everything you need to manage export orders."
      },
      "pricing": {
        "title": "Pricing - ExportFlow",
        "description": "Simple, transparent pricing. Start at €49/month. 14-day free trial, no credit card required."
      }
    },
    "zh": {
      "home": {
        "title": "ExportFlow - 出口商订单管理系统",
        "description": "告别Excel和邮件管理订单。给客户一个专业的订购门户。每周节省数小时。",
        "keywords": "出口订单管理, B2B订购门户, 批发订单系统, 出口业务软件"
      },
      "features": {
        "title": "功能 - ExportFlow",
        "description": "品牌门户、智能目录、灵活定价、自动文件。管理出口订单所需的一切。"
      },
      "pricing": {
        "title": "定价 - ExportFlow",
        "description": "简单透明的定价。€49/月起。14天免费试用，无需信用卡。"
      }
    }
  }
}
```

---

## ✅ FILES TO UPDATE IN CURSOR

Tell Cursor:

```
Update the marketing site content with the following changes:

1. NEW SLOGAN: "Spend time growing, not processing orders."
   - Chinese: "把时间花在业务增长，而非处理订单。"

2. NEW TESTIMONIALS: Replace existing testimonials with these 5:
   - Sarah Chen (Shenzhen) - "It's like having an extra employee"
   - Michael Wang (Ningbo) - "Watch orders roll in"
   - David Liu (Yiwu) - "They browse, they order, we produce"
   - Mehmet Yılmaz (Turkey) - "Fortune 500 system"
   - Priya Sharma (India) - "Team of 4 handles what required 10"

3. NEW COLORS (matching logo gradient):
   - Primary: #3B82F6 (blue)
   - Accent: #8B5CF6 (purple) 
   - Highlight: #EC4899 (pink)
   - Use gradient for hero backgrounds

4. Update all translations in the i18n files with the content from this spec.

5. Add the founder story to the About section.

Use the exact content from this document. Keep the design clean and premium.
```
