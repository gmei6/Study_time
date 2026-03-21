import React from 'react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-12 flex flex-col items-center md:items-start">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col"
        >
          <h1 className="text-6xl font-bold tracking-tighter text-white mb-2">Study Tracker</h1>
          <p className="text-gray-500 text-lg font-medium">A way to track your study time.</p>
        </motion.div>
      </header>
      
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
