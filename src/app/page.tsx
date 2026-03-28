/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Home Page - Dayf Syrian Tourism Platform
 * الصفحة الرئيسية - منصة ضيف للسياحة السورية
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/lib/logger';
import {
  Header,
  Hero,
  CitiesBento,
  ServicesCards,
  PropertyListings,
  ExperiencesBento,
  TraditionalSouks,
  SyrianGovernorates,
  CTASection,
  Footer,
  BottomNav,
  WishlistDrawer,
  CategoriesSection,
  ServiceSection
} from '@/components/dayf';
import MarketHighlights from '@/features/marketplace/components/MarketHighlights';
import CommunityHighlights from '@/features/community/components/CommunityHighlights';
import { ReviewsHighlights } from '@/features/reviews/components';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, MessageSquare, ShoppingCart, LayoutDashboard, Store } from 'lucide-react';

interface WishlistItem {
  id: string;
  type: 'service' | 'product' | 'destination';
  image: string;
  name: string;
  location: string;
  price: number;
  currency: string;
  rating: number;
}

export default function HomePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlistItems(data.items || []);
      }
    } catch (error) {
      logger.error('Error fetching wishlist', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setWishlistLoading(false);
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const response = await fetch(`/api/wishlist/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setWishlistItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      logger.error('Error removing from wishlist', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleSearch = (query: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }
    router.push(`/services?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F5F0]">
      <Header onWishlistClick={() => setIsWishlistOpen(true)} />
      
      {/* Quick Links to Services - روابط سريعة للخدمات */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm font-medium opacity-90">
              {language === 'ar' ? '🚀 الخدمات المتكاملة:' : '🚀 Integrated Services:'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <a 
                href="/?XTransformPort=3001" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                {language === 'ar' ? 'المنتدى' : 'Forum'}
              </a>
              <a 
                href="/?XTransformPort=3003" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all"
              >
                <Store className="w-4 h-4" />
                {language === 'ar' ? 'المتجر' : 'Store'}
              </a>
              <a 
                href="/graphql/?XTransformPort=3002" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                {language === 'ar' ? 'GraphQL' : 'GraphQL'}
              </a>
              <a 
                href="/?XTransformPort=3003" 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <Hero onSearch={handleSearch} />
      
      <CategoriesSection />
      
      <ServiceSection 
        title={language === 'ar' ? 'أماكن إقامة مميزة' : 'Featured Stays'}
        subtitle={language === 'ar' ? 'اكتشف أفضل أماكن الإقامة' : 'Discover the best places to stay'}
        category="tourism"
        limit={8}
        viewAllPath="/services?category=tourism"
      />
      
      <ServiceSection 
        title={language === 'ar' ? 'خدمات طبية' : 'Medical Services'}
        subtitle={language === 'ar' ? 'أفضل المراكز الطبية والأطباء' : 'Best medical centers and doctors'}
        category="medical"
        limit={6}
        viewAllPath="/services?category=medical"
      />
      
      <ServiceSection 
        title={language === 'ar' ? 'عقارات' : 'Real Estate'}
        subtitle={language === 'ar' ? 'فرص بيع وإيجار' : 'Sales and rental opportunities'}
        category="realestate"
        limit={6}
        viewAllPath="/services?category=realestate"
      />

      <CitiesBento />
      
      <ServicesCards />
      
      <PropertyListings />
      
      <ReviewsHighlights />
      
      <MarketHighlights />
      
      <CommunityHighlights />
      
      <ExperiencesBento />
      
      <TraditionalSouks />
      
      <SyrianGovernorates />
      
      <CTASection />
      
      <Footer />
      
      <BottomNav onWishlistClick={() => setIsWishlistOpen(true)} />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        items={wishlistItems}
        onRemove={removeFromWishlist}
        loading={wishlistLoading}
      />
    </main>
  );
}
