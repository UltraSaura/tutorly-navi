import React from 'react';

export const TokensPreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-bg p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-display font-bold text-neutral-text">
            Design Tokens Preview
          </h1>
          <p className="text-body text-neutral-muted">
            Showcasing the design system tokens integrated with Tailwind CSS
          </p>
        </div>

        {/* Brand Colors Section */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Brand Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-brand-primary p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Primary</h3>
              <p className="text-body opacity-90">bg-brand-primary</p>
            </div>
            <div className="bg-brand-navy p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Navy</h3>
              <p className="text-body opacity-90">bg-brand-navy</p>
            </div>
            <div className="bg-brand-tint p-6 rounded-card text-neutral-text">
              <h3 className="text-h2 font-semibold mb-2">Tint</h3>
              <p className="text-body opacity-90">bg-brand-tint</p>
            </div>
          </div>
        </div>

        {/* Game Colors Section */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Game Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-game-xp p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">XP</h3>
              <p className="text-body opacity-90">bg-game-xp</p>
            </div>
            <div className="bg-game-coin p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Coin</h3>
              <p className="text-body opacity-90">bg-game-coin</p>
            </div>
            <div className="bg-game-streak p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Streak</h3>
              <p className="text-body opacity-90">bg-game-streak</p>
            </div>
          </div>
        </div>

        {/* State Colors Section */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">State Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-state-success p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Success</h3>
              <p className="text-body opacity-90">bg-state-success</p>
            </div>
            <div className="bg-state-danger p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Danger</h3>
              <p className="text-body opacity-90">bg-state-danger</p>
            </div>
          </div>
        </div>

        {/* Neutral Colors Section */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Neutral Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <h3 className="text-h2 font-semibold mb-2 text-neutral-text">Surface</h3>
              <p className="text-body text-neutral-muted">bg-neutral-surface</p>
            </div>
            <div className="bg-neutral-muted p-6 rounded-card text-white">
              <h3 className="text-h2 font-semibold mb-2">Muted</h3>
              <p className="text-body opacity-90">bg-neutral-muted</p>
            </div>
          </div>
        </div>

        {/* XP Bar Example */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">XP Bar Example</h2>
          <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-body font-medium text-neutral-text">Experience Points</span>
              <span className="text-caption text-neutral-muted">750 / 1000 XP</span>
            </div>
            <div className="w-full bg-neutral-border rounded-full h-3 overflow-hidden">
              <div 
                className="bg-game-xp h-full rounded-full transition-all duration-300"
                style={{ width: '75%' }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 bg-game-xp rounded-full" />
              <span className="text-caption text-neutral-muted">Current Level Progress</span>
            </div>
          </div>
        </div>

        {/* Typography Section */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Typography Scale</h2>
          <div className="space-y-4">
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <h1 className="text-display font-bold text-neutral-text mb-2">Display Text</h1>
              <p className="text-caption text-neutral-muted">text-display (44px)</p>
            </div>
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <h2 className="text-h1 font-semibold text-neutral-text mb-2">Heading 1</h2>
              <p className="text-caption text-neutral-muted">text-h1 (36px)</p>
            </div>
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <h3 className="text-h2 font-semibold text-neutral-text mb-2">Heading 2</h3>
              <p className="text-caption text-neutral-muted">text-h2 (30px)</p>
            </div>
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <p className="text-body text-neutral-text mb-2">Body text example with proper line height and spacing for optimal readability.</p>
              <p className="text-caption text-neutral-muted">text-body (16px)</p>
            </div>
            <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
              <p className="text-caption text-neutral-muted mb-2">Caption text for smaller details and metadata.</p>
              <p className="text-caption text-neutral-muted">text-caption (13px)</p>
            </div>
          </div>
        </div>

        {/* Border Radius Examples */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Border Radius Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-brand-primary p-6 rounded-card text-white text-center">
              <h3 className="text-h2 font-semibold mb-2">Card</h3>
              <p className="text-body opacity-90">rounded-card (28px)</p>
            </div>
            <div className="bg-game-xp p-6 rounded-button text-white text-center">
              <h3 className="text-h2 font-semibold mb-2">Button</h3>
              <p className="text-body opacity-90">rounded-button (24px)</p>
            </div>
            <div className="bg-state-success p-6 rounded-chip text-white text-center">
              <h3 className="text-h2 font-semibold mb-2">Chip</h3>
              <p className="text-body opacity-90">rounded-chip (999px)</p>
            </div>
          </div>
        </div>

        {/* Spacing Example */}
        <div className="space-y-6">
          <h2 className="text-h2 font-semibold text-neutral-text">Spacing Example</h2>
          <div className="bg-neutral-surface p-6 rounded-card border border-neutral-border">
            <div className="space-y-base">
              <div className="bg-brand-primary h-8 rounded-button" />
              <div className="bg-game-xp h-8 rounded-button" />
              <div className="bg-state-success h-8 rounded-button" />
            </div>
            <p className="text-caption text-neutral-muted mt-4">
              Each colored bar is separated by space-base (24px) using space-y-base
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 