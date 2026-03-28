'use client';

import { useState } from 'react';
import { PodcastData } from '@/types';
import TopAppBar from '@/components/TopAppBar';
import Hero from '@/components/Hero';
import InputCard from '@/components/InputCard';
import PlayerCard from '@/components/PlayerCard';
import TranscriptPreview from '@/components/TranscriptPreview';
import Footer from '@/components/Footer';
import WelcomeModal from '@/components/WelcomeModal';

export default function Home() {
  const [podcastData, setPodcastData] = useState<PodcastData | null>(null);


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      <WelcomeModal />
      <TopAppBar />
      
      <main className="pt-28 px-4 pb-12 max-w-2xl mx-auto space-y-8 flex-grow">
        <Hero />
        
        <InputCard onGenerate={(data) => setPodcastData(data)} />
        
        {podcastData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PlayerCard data={podcastData} />
            <TranscriptPreview transcript={podcastData.transcript} />
          </div>
        )}
        
        {!podcastData && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-on-surface-variant/30 select-none">
            <span className="material-symbols-outlined text-7xl" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
              podcasts
            </span>
            <p className="text-xs font-bold tracking-widest uppercase">
              Paste a URL above to get started
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
