import React, { useRef, useState } from 'react';
import { Plus, Paperclip, Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { cn } from '@/lib/utils';

interface AttachmentMenuProps {
  onFileUpload: () => void;
  onPhotoUpload: () => void;
  onCameraOpen: () => void;
}

const AttachmentMenu = ({ onFileUpload, onPhotoUpload, onCameraOpen }: AttachmentMenuProps) => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleItemClick = (originalOnClick: () => void) => {
    originalOnClick();
    setOpen(false);
  };

  const menuItems = [
    {
      icon: Paperclip,
      label: t('upload.uploadDocument'),
      description: t('upload.documentDescription'),
      onClick: () => handleItemClick(onFileUpload),
    },
    {
      icon: ImageIcon,
      label: t('upload.uploadPhoto'),
      description: t('upload.photoDescription'),
      onClick: () => handleItemClick(onPhotoUpload),
    },
    {
      icon: Camera,
      label: t('upload.takePhoto'),
      description: t('upload.cameraDescription'),
      onClick: () => handleItemClick(onCameraOpen),
    },
  ];

  const MenuContent = () => (
    <div className={cn(
      "grid gap-1",
      isMobile ? "p-4 pb-6" : "p-2"
    )}>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            key={index}
            variant="ghost"
            className={cn(
              "justify-start gap-3 text-left",
              isMobile 
                ? "h-14 px-4 rounded-xl" 
                : "h-12 px-3 rounded-lg hover:bg-muted"
            )}
            onClick={item.onClick}
          >
            <Icon className={cn(
              "text-muted-foreground",
              isMobile ? "h-6 w-6" : "h-5 w-5"
            )} />
            <div className="flex flex-col gap-0.5">
              <span className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}>
                {item.label}
              </span>
              {isMobile && (
                <span className="text-sm text-muted-foreground">
                  {item.description}
                </span>
              )}
            </div>
          </Button>
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
          <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-4" />
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold">{t('upload.attachFiles')}</h3>
            <p className="text-sm text-muted-foreground">{t('upload.selectOption')}</p>
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