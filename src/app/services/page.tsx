import { Metadata } from 'next';
import { Suspense } from 'react';
import ServicesPageClient from './client';
import ServicesLoading from './loading';

export const metadata: Metadata = {
  title: 'الخدمات - ضيف',
  description: 'استكشف أفضل الخدمات السياحية والعقارية والطبية في سوريا',
};

export default function ServicesPage() {
  return (
    <Suspense fallback={<ServicesLoading />}>
      <ServicesPageClient />
    </Suspense>
  );
}
