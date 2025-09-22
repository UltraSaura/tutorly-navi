import React, { useRef, useState, useEffect } from 'react';
import { Plus, Paperclip, Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useOverlay } from '@/context/OverlayContext';
import { cn } from '@/lib/utils';

interface AttachmentMenuProps {
  onFileUpload: () => void;
  onPhotoUpload: () => void;
  onCameraOpen: () => void;
}

const AttachmentMenu = ({ onFileUpload, onPhotoUpload, onCameraOpen }: AttachmentMenuProps) => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { setHasActiveOverlay } = useOverlay();
  const [open, setOpen] = useState(false);

  // Sync sheet state with global overlay context
  useEffect(() => {
    if (isMobile) {
      setHasActiveOverlay(open);
    }
  }, [open, isMobile, setHasActiveOverlay]);

  const handleItemClick = (originalOnClick: () => void) => {
    originalOnClick();
    setOpen(false);
  };

  const menuItems = [
    {
      icon: Paperclip,
      label: 'Upload Document (PDF)',
      description: 'Upload a PDF or document to extract exercises',
      onClick: () => handleItemClick(onFileUpload),
      color: 'bg-blue-500',
    },
    {
      icon: ImageIcon,
      label: 'Upload Photo',
      description: 'Upload an image from your gallery',
      onClick: () => handleItemClick(onPhotoUpload),
      color: 'bg-green-500',
    },
    {
      icon: Camera,
      label: 'Take Photo',
      description: 'Capture a photo with your camera',
      onClick: () => handleItemClick(onCameraOpen),
      color: 'bg-orange-500',
    },
  ];

  const MenuContent = () => (
    <div className={cn(
      "grid gap-3",
      isMobile ? "p-6" : "p-2 gap-1"
    )}>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={cn(
              "relative overflow-hidden rounded-button cursor-pointer transition-all hover:scale-105 active:scale-95",
              isMobile 
                ? "p-6 min-h-[80px]" 
                : "p-4 min-h-[60px]"
            )}
            onClick={item.onClick}
          >
            {/* Background with color */}
            <div className={cn(
              "absolute inset-0 opacity-10",
              item.color
            )} />
            
            {/* Content */}
            <div className="relative flex items-center gap-4">
              <div className={cn(
                "rounded-full p-2",
                item.color,
                "text-white"
              )}>
                <Icon className={cn(
                  isMobile ? "h-6 w-6" : "h-5 w-5"
                )} />
              </div>
              <div className="flex-1">
                <div className={cn(
                  "font-semibold text-neutral-text",
                  isMobile ? "text-lg" : "text-base"
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  "text-neutral-muted",
                  isMobile ? "text-sm" : "text-xs"
                )}>
                  {item.description}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const TriggerButton = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentPropsWithoutRef<typeof Button>
  >((props, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted"
      {...props}
    >
      <Plus className="h-5 w-5" />
    </Button>
  ));

  TriggerButton.displayName = "AttachmentTrigger";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <TriggerButton />
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="rounded-t-xl border-t"
        >
          <div className="mx-auto w-12 h-1.5 bg-neutral-border rounded-full mb-4" />
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-neutral-text">Upload Content</h3>
            <p className="text-neutral-muted">Choose how you'd like to add your homework</p>
          </div>
          <MenuContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TriggerButton />
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-64 p-0"
        sideOffset={8}
      >
        <MenuContent />
      </PopoverContent>
    </Popover>
  );
};

export default AttachmentMenu;