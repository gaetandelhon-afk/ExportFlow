// ============================================
// TYPES
// ============================================

export interface FeatureFlags {
    favorites: boolean
    drafts: boolean
    stockVisible: boolean
    quotes: boolean
    orderNotes: boolean
    multipleAddresses: boolean
    notifications: boolean
    moqEnforced: boolean
    creditLimit: boolean
    lateOrderSurcharge: boolean
    invoiceConsolidation: boolean
    indicativePrices: boolean
  }
  
  export interface ShippingMethod {
    id: string
    name: string
    description: string
    icon: string
    requiresDetails: boolean
    enabled: boolean
  }
  
  export interface PreparationPreset {
    id: string
    label: string
    days: number
  }
  
  export interface CompanyInfo {
    name: string
    legalName: string
    logo?: string // Base64 or URL
    address: {
      street: string
      city: string
      postalCode: string
      country: string
    }
    phone?: string
    email?: string
    website?: string
    vatNumber?: string
    registrationNumber?: string
    bankInfo?: {
      bankName: string
      accountName: string
      accountNumber: string
      swiftCode?: string
      iban?: string
    }
  }
  
  export interface DocumentSettings {
    quote: {
      validityDays: number
      footer: string
      showBankInfo: boolean
    }
    invoice: {
      prefix: string
      footer: string
      showBankInfo: boolean
      paymentInstructions: string
    }
  }
  
  export interface OrderModificationRule {
    id: string
    minDays: number | null  // null = no minimum (e.g., for "blocked" after loading)
    maxDays: number | null  // null = no maximum (e.g., for "free" always)
    surchargeType: 'none' | 'fixed' | 'percentage' | 'higher_of'  // higher_of = max(fixed, percentage)
    fixedAmount?: number
    percentageAmount?: number
    message: string
    allowModification: boolean
    tier: string  // For UI display (e.g., 'free', 'warning', 'late', 'urgent', 'blocked')
  }

  export interface OrderModificationSettings {
    enabled: boolean
    rules: OrderModificationRule[]
    // Reference date field for calculating days (e.g., 'requestedDate', 'loadingDate')
    referenceDateField: 'requestedDate' | 'loadingDate' | 'none'
    // If no reference date is set, what behavior?
    noDateBehavior: 'allow_free' | 'block' | 'apply_default_rule'
    defaultRuleId?: string
  }

  export interface CompanyConfig {
    // Company identification
    company: CompanyInfo
    
    // Document settings
    documents: DocumentSettings
    
    // Feature flags
    features: FeatureFlags
    
    // Order modification settings (configurable by admin)
    orderModification: OrderModificationSettings
    
    // Defaults for new customers
    defaults: {
      stockVisible: boolean
      canGenerateQuotes: boolean
      currency: string
      priceType: string
      paymentTerms: string
      minQuantity: number
    }
    
    // Catalog settings
    catalog: {
      currency: string
      availableCurrencies: string[]
    }
    
    // Available indicative currencies for distributors
    indicativeCurrencies: string[]
    
    // Shipping options
    shipping: ShippingMethod[]
    
    // Payment terms presets
    paymentTermsList: string[]
    
    // Preparation time presets
    preparationPresets: PreparationPreset[]
  }
  
  // ============================================
  // SWIFT BOATS CONFIGURATION
  // ============================================
  
  export const COMPANY_CONFIG: CompanyConfig = {
    // Company Info
    company: {
      name: 'Swift Boats',
      legalName: 'Swift Boats Marine Hardware Co., Ltd.',
      logo: '', // Will be set via admin or base64
      address: {
        street: '88 Harbour Industrial Road, Building C',
        city: 'Xiamen',
        postalCode: '361000',
        country: 'China',
      },
      phone: '+86 592 123 4567',
      email: 'sales@swiftboats.com',
      website: 'www.swiftboats.com',
      vatNumber: 'CN123456789',
      registrationNumber: '91350200MA2XXXXXX',
      bankInfo: {
        bankName: 'Bank of China, Xiamen Branch',
        accountName: 'Swift Boats Marine Hardware Co., Ltd.',
        accountNumber: '1234 5678 9012 3456',
        swiftCode: 'BKCHCNBJ',
        iban: '',
      },
    },
    
    // Document Settings
    documents: {
      quote: {
        validityDays: 30,
        footer: 'Prices are subject to change. Shipping costs will be calculated separately.',
        showBankInfo: false,
      },
      invoice: {
        prefix: 'INV',
        footer: 'Thank you for your business.',
        showBankInfo: true,
        paymentInstructions: 'Please transfer the total amount to our bank account within the payment terms.',
      },
    },
    
    // Features
    features: {
      favorites: true,
      drafts: true,
      stockVisible: true,
      quotes: true,
      orderNotes: true,
      multipleAddresses: true,
      notifications: true,
      moqEnforced: false,
      creditLimit: false,
      lateOrderSurcharge: true,
      invoiceConsolidation: true,
      indicativePrices: true,
    },
    
    // Order Modification Settings (Admin configurable)
    // These are example rules - admin will define their own
    orderModification: {
      enabled: true,
      referenceDateField: 'requestedDate',
      noDateBehavior: 'allow_free',
      defaultRuleId: 'free',
      rules: [
        // Example rules - Admin can modify/add/remove these
        // Rules are evaluated in order, first match wins
        {
          id: 'free',
          minDays: null,
          maxDays: null,
          surchargeType: 'none',
          message: 'Modification allowed',
          allowModification: true,
          tier: 'free',
        },
      ],
    },
    
    // Defaults
    defaults: {
      stockVisible: true,
      canGenerateQuotes: true,
      currency: 'EUR',
      priceType: 'DISTRIBUTOR',
      paymentTerms: 'Net 30',
      minQuantity: 1,
    },
    
    // Catalog
    catalog: {
      currency: 'RMB',
      availableCurrencies: ['RMB', 'EUR', 'USD'],
    },
    
    // Available currencies for indicative prices
    indicativeCurrencies: ['EUR', 'USD', 'GBP', 'AUD', 'CAD', 'BRL', 'JPY', 'KRW', 'SGD', 'CHF'],
    
    // Shipping
    shipping: [
      {
        id: 'sea',
        name: 'Sea Freight',
        description: '45-60 days transit time',
        icon: 'Ship',
        requiresDetails: false,
        enabled: true,
      },
      {
        id: 'air',
        name: 'Air Freight',
        description: '7-14 days transit time',
        icon: 'Plane',
        requiresDetails: false,
        enabled: true,
      },
      {
        id: 'pickup',
        name: 'Factory Pickup',
        description: 'Collect from our Xiamen facility',
        icon: 'Building2',
        requiresDetails: false,
        enabled: true,
      },
      {
        id: 'other',
        name: 'Other',
        description: 'Specify your requirements',
        icon: 'MoreHorizontal',
        requiresDetails: true,
        enabled: true,
      },
    ],
    
    // Payment Terms
    paymentTermsList: [
      'Prepaid',
      'Net 15',
      'Net 30',
      'Net 45',
      'Net 60',
      '50% Deposit, 50% Before Shipping',
    ],
    
    // Preparation Presets
    preparationPresets: [
      { id: '1week', label: '1 Week', days: 7 },
      { id: '2weeks', label: '2 Weeks', days: 14 },
      { id: '1month', label: '1 Month', days: 30 },
      { id: 'custom', label: 'Custom', days: 0 },
    ],
  }
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  export function getMinQuantity(productMoq: number): number {
    if (COMPANY_CONFIG.features.moqEnforced) {
      return productMoq
    }
    return COMPANY_CONFIG.defaults.minQuantity
  }
  
  export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return COMPANY_CONFIG.features[feature] ?? false
  }
  
  export function getEnabledShippingMethods(): ShippingMethod[] {
    return COMPANY_CONFIG.shipping.filter(m => m.enabled)
  }
  
  export function getCompanyInfo(): CompanyInfo {
    // Try to get company info from localStorage (set by admin in Settings > Company)
    if (typeof window !== 'undefined') {
      try {
        const companyStored = localStorage.getItem('orderbridge_company_settings')
        const billingStored = localStorage.getItem('orderbridge_billing_settings')
        
        // Start with default values
        let companyInfo: CompanyInfo = { ...COMPANY_CONFIG.company }
        
        // Override with company settings if available
        if (companyStored) {
          const settings = JSON.parse(companyStored)
          companyInfo = {
            ...companyInfo,
            name: settings.companyName || companyInfo.name,
            legalName: settings.legalName || companyInfo.legalName,
            address: {
              street: settings.street || companyInfo.address.street,
              city: settings.city || companyInfo.address.city,
              postalCode: settings.postalCode || companyInfo.address.postalCode,
              country: settings.country || companyInfo.address.country,
            },
            phone: settings.phone || companyInfo.phone,
            email: settings.email || companyInfo.email,
            website: settings.website || companyInfo.website,
            vatNumber: settings.vatNumber || companyInfo.vatNumber,
            registrationNumber: settings.registrationNumber || companyInfo.registrationNumber,
          }
        }
        
        // Override bank info from billing settings if available
        if (billingStored) {
          const billingSettings = JSON.parse(billingStored)
          if (billingSettings.bankAccounts && billingSettings.bankAccounts.length > 0) {
            // Find default bank account or use first one
            const defaultAccount = billingSettings.bankAccounts.find((acc: { isDefault?: boolean }) => acc.isDefault) || billingSettings.bankAccounts[0]
            if (defaultAccount) {
              const fallbackBankInfo = COMPANY_CONFIG.company.bankInfo || {
                bankName: '',
                accountName: '',
                accountNumber: '',
                swiftCode: '',
                iban: ''
              }
              const currentBankInfo = companyInfo.bankInfo || fallbackBankInfo
              companyInfo.bankInfo = {
                bankName: defaultAccount.bankName || currentBankInfo.bankName,
                accountName: defaultAccount.accountName || currentBankInfo.accountName,
                accountNumber: defaultAccount.accountNumber || currentBankInfo.accountNumber,
                swiftCode: defaultAccount.swiftCode || currentBankInfo.swiftCode,
                iban: defaultAccount.iban || currentBankInfo.iban,
              }
            }
          }
        }
        
        return companyInfo
      } catch {
        // If parsing fails, return default
      }
    }
    return COMPANY_CONFIG.company
  }
  
  export function getDocumentSettings(): DocumentSettings {
    return COMPANY_CONFIG.documents
  }

  export function getOrderModificationSettings(): OrderModificationSettings {
    return COMPANY_CONFIG.orderModification
  }

  export function getOrderModificationRules(): OrderModificationRule[] {
    return COMPANY_CONFIG.orderModification.rules
  }