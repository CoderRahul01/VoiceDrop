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
          <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant/40 select-none">
             <span className="material-symbols-outlined text-8xl mb-4" aria-hidden="true">
              podcasts
            </span>
            <p className="text-sm font-bold tracking-widest uppercase">
              No podcast generated yet
            </p>
          </div>
        )}
      </main>

      <Footer />

      {/* Floating Action Button (Prototype Style) */}
      <button 
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-container text-on-primary-container rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        aria-label="Create new podcast"
      >
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">add</span>
      </button>
    </div>
  );
}
