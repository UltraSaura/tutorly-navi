import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TokensPreview = () => {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-display font-bold text-neutral-text mb-4">
          Design Tokens Preview
        </h1>
        <p className="text-body text-neutral-muted">
          Showcasing our design system tokens in action
        </p>
      </div>

      {/* Brand Colors Card */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Brand Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-primary rounded-button mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Primary</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-navy rounded-button mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Navy</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-tint rounded-button mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Tint</p>
            </div>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-navy text-white rounded-button">
            Brand Button
          </Button>
        </CardContent>
      </Card>

      {/* Game Elements Card */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Game Elements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* XP Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-body text-neutral-text font-medium">Experience Points</span>
              <span className="text-caption text-neutral-muted">750 / 1000 XP</span>
            </div>
            <div className="w-full bg-neutral-border rounded-chip h-3">
              <div 
                className="bg-game-xp h-3 rounded-chip transition-all duration-300"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-brand-tint rounded-button">
              <div className="w-8 h-8 bg-game-xp rounded-chip mx-auto mb-2"></div>
              <p className="text-h2 font-bold text-neutral-text">750</p>
              <p className="text-caption text-neutral-muted">XP</p>
            </div>
            <div className="text-center p-4 bg-brand-tint rounded-button">
              <div className="w-8 h-8 bg-game-coin rounded-chip mx-auto mb-2"></div>
              <p className="text-h2 font-bold text-neutral-text">250</p>
              <p className="text-caption text-neutral-muted">Coins</p>
            </div>
            <div className="text-center p-4 bg-brand-tint rounded-button">
              <div className="w-8 h-8 bg-game-streak rounded-chip mx-auto mb-2"></div>
              <p className="text-h2 font-bold text-neutral-text">7</p>
              <p className="text-caption text-neutral-muted">Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography & States Card */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Typography & States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Typography Scale */}
          <div className="space-y-4">
            <h1 className="text-display font-bold text-neutral-text">Display Text</h1>
            <h2 className="text-h1 font-semibold text-neutral-text">Heading 1</h2>
            <h3 className="text-h2 font-semibold text-neutral-text">Heading 2</h3>
            <p className="text-body text-neutral-text">
              This is body text using our design token system. It demonstrates proper typography scaling and color usage.
            </p>
            <p className="text-caption text-neutral-muted">Caption text for smaller details</p>
          </div>

          {/* State Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-state-success/10 border border-state-success/20 rounded-button">
              <p className="text-body text-state-success font-medium">✅ Success State</p>
              <p className="text-caption text-neutral-muted">Everything is working correctly</p>
            </div>
            <div className="p-4 bg-state-danger/10 border border-state-danger/20 rounded-button">
              <p className="text-body text-state-danger font-medium">❌ Error State</p>
              <p className="text-caption text-neutral-muted">Something went wrong</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius Demo */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Border Radius Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-primary rounded-card mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Card (28px)</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-primary rounded-button mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Button (24px)</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-primary rounded-chip mx-auto mb-2"></div>
              <p className="text-caption text-neutral-muted">Chip (999px)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokensPreview;