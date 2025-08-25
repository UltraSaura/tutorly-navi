import React from 'react';
import { CompactHorizontalHeader, MinimalEssentialHeader, UltraCompactStickyHeader } from './ExerciseHeaderVariants';
import variant1Image from '@/assets/header-variant-1-compact.png';
import variant2Image from '@/assets/header-variant-2-minimal.png';
import variant3Image from '@/assets/header-variant-3-ultra-compact.png';

const HeaderVariantDemo = () => {
  // Mock data for demonstration
  const mockGrade = { percentage: 85, letter: 'B+' };
  const mockUserStats = {
    xpProgress: 0.7,
    currentLevel: 5,
    streakDays: 7,
    streakActive: true,
    coins: 245
  };
  const mockExerciseStats = {
    correct: 12,
    answered: 15,
    total: 18
  };

  return (
    <div className="p-6 space-y-8 bg-neutral-bg min-h-screen">
      <h1 className="text-h1 font-bold text-neutral-text text-center mb-8">
        Header Optimization Variants
      </h1>
      
      {/* Current vs Optimized Comparison */}
      <div className="grid gap-6">
        
        {/* Variant 1: Compact Horizontal */}
        <div className="bg-neutral-surface rounded-card overflow-hidden shadow-sm">
          <div className="p-4 bg-brand-primary/5 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-semibold text-neutral-text">
                Variant 1: Compact Horizontal Layout
              </h2>
              <span className="text-caption text-neutral-muted bg-state-success/10 px-2 py-1 rounded">
                ~80px height (saves 50%)
              </span>
            </div>
            <p className="text-body text-neutral-muted mt-1">
              Maintains all information but reduces vertical space by consolidating elements horizontally
            </p>
          </div>
          
          <CompactHorizontalHeader 
            grade={mockGrade}
            userStats={mockUserStats}
            exerciseStats={mockExerciseStats}
          />
          
          <div className="p-4">
            <img 
              src={variant1Image} 
              alt="Compact Horizontal Layout Preview" 
              className="w-full rounded border"
            />
          </div>
        </div>

        {/* Variant 2: Minimal Essential */}
        <div className="bg-neutral-surface rounded-card overflow-hidden shadow-sm">
          <div className="p-4 bg-game-coin/5 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-semibold text-neutral-text">
                Variant 2: Minimal Essential Header
              </h2>
              <span className="text-caption text-neutral-muted bg-game-coin/10 px-2 py-1 rounded">
                ~60px height (saves 62%)
              </span>
            </div>
            <p className="text-body text-neutral-muted mt-1">
              Shows only essential information - grade percentage and key stats with maximum space efficiency
            </p>
          </div>
          
          <MinimalEssentialHeader 
            grade={mockGrade}
            userStats={mockUserStats}
            exerciseStats={mockExerciseStats}
          />
          
          <div className="p-4">
            <img 
              src={variant2Image} 
              alt="Minimal Essential Header Preview" 
              className="w-full rounded border"
            />
          </div>
        </div>

        {/* Variant 3: Ultra-Compact Sticky */}
        <div className="bg-neutral-surface rounded-card overflow-hidden shadow-sm">
          <div className="p-4 bg-game-xp/5 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-semibold text-neutral-text">
                Variant 3: Ultra-Compact Sticky Bar
              </h2>
              <span className="text-caption text-neutral-muted bg-game-xp/10 px-2 py-1 rounded">
                ~40px height (saves 75%)
              </span>
            </div>
            <p className="text-body text-neutral-muted mt-1">
              Maximum space optimization with sticky positioning - always visible but minimal footprint
            </p>
          </div>
          
          <UltraCompactStickyHeader 
            grade={mockGrade}
            userStats={mockUserStats}
            exerciseStats={mockExerciseStats}
          />
          
          <div className="p-4">
            <img 
              src={variant3Image} 
              alt="Ultra-Compact Sticky Bar Preview" 
              className="w-full rounded border"
            />
          </div>
        </div>
      </div>

      {/* Space Comparison */}
      <div className="bg-neutral-surface rounded-card p-6">
        <h3 className="text-h2 font-semibold text-neutral-text mb-4">Space Savings Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-neutral-bg rounded">
            <div className="text-h2 font-bold text-neutral-text">Current</div>
            <div className="text-body text-neutral-muted">~160px</div>
            <div className="w-full bg-neutral-border h-16 rounded mt-2"></div>
          </div>
          <div className="text-center p-4 bg-brand-primary/5 rounded">
            <div className="text-h2 font-bold text-brand-primary">Variant 1</div>
            <div className="text-body text-neutral-muted">~80px</div>
            <div className="w-full bg-brand-primary h-8 rounded mt-2"></div>
          </div>
          <div className="text-center p-4 bg-game-coin/5 rounded">
            <div className="text-h2 font-bold text-game-coin">Variant 2</div>
            <div className="text-body text-neutral-muted">~60px</div>
            <div className="w-full bg-game-coin h-6 rounded mt-2"></div>
          </div>
          <div className="text-center p-4 bg-game-xp/5 rounded">
            <div className="text-h2 font-bold text-game-xp">Variant 3</div>
            <div className="text-body text-neutral-muted">~40px</div>
            <div className="w-full bg-game-xp h-4 rounded mt-2"></div>
          </div>
        </div>
        <p className="text-center text-body text-neutral-muted mt-4">
          Visual representation of header height reduction - more space for homework content
        </p>
      </div>
    </div>
  );
};

export default HeaderVariantDemo;