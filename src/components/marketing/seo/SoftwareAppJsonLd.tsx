export function SoftwareAppJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ExportFlow',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'B2B order management platform for Chinese exporters',
    offers: {
      '@type': 'Offer',
      price: '499',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '50'
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

