import type { Locale } from '@/i18n/locales';

type SeoPage = 'home' | 'features' | 'pricing';

type SeoEntry = {
  title: string;
  description: string;
  keywords?: string;
};

export const seoConfig: Record<'en' | 'zh', Record<SeoPage, SeoEntry>> = {
  en: {
    home: {
      title: 'ExportFlow - Order Management for Exporters',
      description:
        'Stop managing orders through Excel and email. Give your customers a professional ordering portal. Save hours every week.',
      keywords:
        'export order management, B2B ordering portal, wholesale order system, export business software'
    },
    features: {
      title: 'Features - ExportFlow',
      description:
        'Branded portal, smart catalog, flexible pricing, automatic documents. Everything you need to manage export orders.'
    },
    pricing: {
      title: 'Pricing - ExportFlow',
      description:
        'Simple, transparent pricing. Start at €49/month. 14-day free trial, no credit card required.'
    }
  },
  zh: {
    home: {
      title: 'ExportFlow - 出口商订单管理系统',
      description:
        '告别Excel和邮件管理订单。给客户一个专业的订购门户。每周节省数小时。',
      keywords: '出口订单管理, B2B订购门户, 批发订单系统, 出口业务软件'
    },
    features: {
      title: '功能 - ExportFlow',
      description:
        '品牌门户、智能目录、灵活定价、自动文件。管理出口订单所需的一切。'
    },
    pricing: {
      title: '定价 - ExportFlow',
      description:
        '简单透明的定价。€49/月起。14天免费试用，无需信用卡。'
    }
  }
};

export function getSeo(locale: Locale, page: SeoPage) {
  const l = (locale in seoConfig ? locale : 'en') as keyof typeof seoConfig;
  return seoConfig[l]?.[page] ?? seoConfig.en[page];
}

