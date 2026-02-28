/**
 * Theme Configuration Reference
 * 
 * This file documents the theme system. To change colors:
 * 1. Edit the CSS variables in src/app/globals.css
 * 2. All components using these variables will update automatically
 * 
 * Usage in components:
 * - Background: bg-bg-primary, bg-bg-secondary, bg-bg-tertiary
 * - Text: text-text-primary, text-text-secondary, text-text-tertiary
 * - Brand: bg-brand-primary, text-brand-primary, border-brand-primary
 * - Status: bg-status-success, text-status-warning, etc.
 * 
 * Pre-built classes (from globals.css):
 * - .btn-primary - Blue filled button
 * - .btn-secondary - White outlined button
 * - .input-field - Standard input styling
 * - .card - Standard card with border
 * - .card-hover - Card with hover effects
 */

// Status badge configurations
export const statusConfig = {
    DRAFT: { 
      className: 'bg-text-secondary/10 text-text-secondary',
      label: 'Draft' 
    },
    PENDING: { 
      className: 'bg-status-warning/10 text-status-warning',
      label: 'Pending' 
    },
    CONFIRMED: { 
      className: 'bg-brand-primary/10 text-brand-primary',
      label: 'Confirmed' 
    },
    PREPARING: { 
      className: 'bg-status-info/10 text-status-info',
      label: 'Preparing' 
    },
    READY: { 
      className: 'bg-status-success/10 text-status-success',
      label: 'Ready' 
    },
    SHIPPED: { 
      className: 'bg-status-success/10 text-status-success',
      label: 'Shipped' 
    },
    DELIVERED: { 
      className: 'bg-status-success/10 text-status-success',
      label: 'Delivered' 
    },
    CANCELLED: { 
      className: 'bg-status-error/10 text-status-error',
      label: 'Cancelled' 
    },
  } as const
  
  // Price type configurations
  export const priceTypeConfig = {
    DISTRIBUTOR: {
      className: 'bg-brand-primary/10 text-brand-primary',
      label: 'Distributor'
    },
    DIRECT: {
      className: 'bg-text-secondary/10 text-text-secondary',
      label: 'Direct'
    },
  } as const
  
  // Stat card colors (for dashboard)
  export const statColors = {
    blue: 'bg-brand-primary',
    green: 'bg-status-success',
    orange: 'bg-status-warning',
    red: 'bg-status-error',
    purple: 'bg-status-info',
  } as const