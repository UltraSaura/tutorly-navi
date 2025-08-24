import React, { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Camera, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadType = 'document' | 'photo' | 'camera';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: UploadType) => void;
}

interface UploadTileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  type: UploadType;
  colorScheme: 'blue' | 'green' | 'orange';
  onClick: (type: UploadType) => void;
}

const UploadTile = ({ title, subtitle, icon, type, colorScheme, onClick }: UploadTileProps) => {
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'blue':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/30',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          subtitle: 'text-blue-700'
        };
      case 'green':
        return {
          bg: 'bg-state-success/10 hover:bg-state-success/20 border-state-success/20 hover:border-state-success/30',
          icon: 'text-state-success',
          title: 'text-green-900',
          subtitle: 'text-green-700'
        };
      case 'orange':
        return {
          bg: 'bg-game-coin/10 hover:bg-game-coin/20 border-game-coin/20 hover:border-game-coin/30',
          icon: 'text-game-coin',
          title: 'text-orange-900',
          subtitle: 'text-orange-700'
        };
    }
  };

  const colors = getColorClasses();

  const handleClick = () => {
    onClick(type);
    
    // Emit analytics event
    try {
      // Simple analytics tracking - replace with your analytics service
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'upload_opened', {
          type: type,
          timestamp: Date.now()
        });
      } else {
        console.log('Analytics: upload_opened', { type, timestamp: Date.now() });
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      className={cn(
        'w-full p-6 rounded-button border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 text-left',
        colors.bg
      )}
      role="button"
      tabIndex={0}
      aria-label={`${title} - ${subtitle}`}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-button bg-neutral-surface border border-neutral-border flex items-center justify-center',
          colors.icon
        )}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-body font-semibold mb-1', colors.title)}>
            {title}
          </h3>
          <p className={cn('text-caption', colors.subtitle)}>
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  );
};

const UploadModal = ({ open, onClose, onSelect }: UploadModalProps) => {
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  const handleSelect = (type: UploadType) => {
    onSelect(type);
    onClose();
  };

  const tiles = [
    {
      title: 'Upload document (PDF)',
      subtitle: '+10 XP for uploading a document',
      icon: <FileText size={24} />,
      type: 'document' as UploadType,
      colorScheme: 'blue' as const
    },
    {
      title: 'Upload photo',
      subtitle: '+10 XP',
      icon: <Image size={24} />,
      type: 'photo' as UploadType,
      colorScheme: 'green' as const
    },
    {
      title: 'Take photo',
      subtitle: '+10 XP',
      icon: <Camera size={24} />,
      type: 'camera' as UploadType,
      colorScheme: 'orange' as const
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-card border-t border-neutral-border bg-neutral-surface"
        onInteractOutside={onClose}
      >
        <SheetHeader className="text-center mb-6">
          <SheetTitle className="text-h2 font-semibold text-neutral-text">
            Upload Homework
          </SheetTitle>
          <SheetDescription className="text-body text-neutral-muted">
            Choose how you'd like to upload your homework and earn XP
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 pb-6">
          {tiles.map((tile) => (
            <UploadTile
              key={tile.type}
              title={tile.title}
              subtitle={tile.subtitle}
              icon={tile.icon}
              type={tile.type}
              colorScheme={tile.colorScheme}
              onClick={handleSelect}
            />
          ))}
        </div>
        
        {/* Visual indicator for swipe-to-close */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-1 bg-neutral-border rounded-chip" />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UploadModal;