import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import XpBar from '@/components/game/XpBar';
import StreakChip from '@/components/game/StreakChip';
import CoinWallet from '@/components/game/CoinWallet';
import BadgeCard from '@/components/game/BadgeCard';
import { showXpToast } from '@/components/game/XpToast';
import { Trophy, Star, Target, Zap, Award, BookOpen } from 'lucide-react';

const GamePreview = () => {
  const [xpValue, setXpValue] = useState(0.65);
  const [streakActive, setStreakActive] = useState(true);
  const [coins, setCoins] = useState(1250);

  const handleXpToast = () => {
    const amount = Math.floor(Math.random() * 100) + 10;
    showXpToast(amount, "Great job completing that exercise!");
  };

  const badges = [
    { title: "First Steps", icon: <Star size={20} />, locked: false },
    { title: "Math Whiz", icon: <Target size={20} />, locked: false, progress: 0.75 },
    { title: "Speed Demon", icon: <Zap size={20} />, locked: false, progress: 0.3 },
    { title: "Scholar", icon: <BookOpen size={20} />, locked: true },
    { title: "Champion", icon: <Trophy size={20} />, locked: true },
    { title: "Master", icon: <Award size={20} />, locked: true },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-display font-bold text-neutral-text mb-4">
          Gamification Components
        </h1>
        <p className="text-body text-neutral-muted">
          Interactive preview of game elements and achievements
        </p>
      </div>

      {/* XP Bar Demo */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Experience Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <XpBar value={xpValue} level={12} />
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setXpValue(Math.max(0, xpValue - 0.1))}
              className="rounded-button"
            >
              -10% XP
            </Button>
            <Button 
              variant="outline"
              onClick={() => setXpValue(Math.min(1, xpValue + 0.1))}
              className="rounded-button"
            >
              +10% XP
            </Button>
            <Button 
              onClick={handleXpToast}
              className="bg-game-xp hover:bg-game-xp/90 text-white rounded-button"
            >
              Show XP Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streak and Coins Demo */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Streak & Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <StreakChip days={7} active={streakActive} />
            <CoinWallet coins={coins} />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setStreakActive(!streakActive)}
              className="rounded-button"
            >
              Toggle Streak
            </Button>
            <Button 
              variant="outline"
              onClick={() => setCoins(prev => prev + 50)}
              className="rounded-button"
            >
              +50 Coins
            </Button>
            <Button 
              variant="outline"
              onClick={() => setCoins(prev => Math.max(0, prev - 25))}
              className="rounded-button"
            >
              -25 Coins
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badges Demo */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Achievement Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 justify-items-center">
            {badges.map((badge, index) => (
              <BadgeCard
                key={index}
                title={badge.title}
                icon={badge.icon}
                locked={badge.locked}
                progress={badge.progress}
              />
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-brand-tint/50 rounded-button">
            <h3 className="text-body font-semibold text-neutral-text mb-2">Badge States:</h3>
            <ul className="text-caption text-neutral-muted space-y-1">
              <li>• <strong>Earned:</strong> Green border, full color icon</li>
              <li>• <strong>In Progress:</strong> Blue border with progress ring</li>
              <li>• <strong>Locked:</strong> Gray with lock overlay</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo */}
      <Card className="rounded-card bg-neutral-surface border-neutral-border">
        <CardHeader>
          <CardTitle className="text-h2 text-neutral-text">Interactive Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-brand-tint/30 rounded-button border border-brand-primary/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <XpBar value={xpValue} level={12} className="flex-1 min-w-0" />
              <div className="flex gap-2">
                <StreakChip days={7} active={streakActive} />
                <CoinWallet coins={coins} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 justify-items-center">
              {badges.slice(0, 3).map((badge, index) => (
                <BadgeCard
                  key={index}
                  title={badge.title}
                  icon={badge.icon}
                  locked={badge.locked}
                  progress={badge.progress}
                />
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={handleXpToast}
              className="bg-brand-primary hover:bg-brand-navy text-white rounded-button"
              size="lg"
            >
              🎉 Earn XP Reward
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GamePreview;