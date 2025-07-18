import React, { useRef } from 'react';
import { Plus, Paperclip, Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface AttachmentMenuProps {
  onFileUpload: () => void;
  onPhotoUpload: () => void;
  onCameraOpen: () => void;
}

const AttachmentMenu = ({ onFileUpload, onPhotoUpload, onCameraOpen }: AttachmentMenuProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const attachmentOptions = [
    {
      icon: Paperclip,
      label: t('upload.uploadDocument'),
      action: onFileUpload,
      description: t('upload.documentDescription') || 'PDF, DOC, DOCX, TXT'
    },
    {
      icon: ImageIcon,
      label: t('upload.choosePhoto'),
      action: onPhotoUpload,
      description: t('upload.photoDescription') || 'JPG, PNG, GIF'
    },
    {
      icon: Camera,
      label: t('upload.takePhoto'),
      action: onCameraOpen,
      description: t('upload.cameraDescription') || 'Use camera to take a photo'
    }
  ];

  const AttachmentButton = ({ children }: { children: React.ReactNode }) => (
    <Button 
      variant="ghost" 
      size="icon" 
      className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {children}
    </Button>
  );

  const MenuContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className={`${isMobile ? 'p-6' : 'p-2'} space-y-1`}>
      {isMobile && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">{t('upload.attachFiles')}</h3>
          <p className="text-sm text-muted-foreground">{t('upload.selectOption')}</p>
        </div>
      )}
      {attachmentOptions.map((option, index) => {
        const Icon = option.icon;
        return (
          <button
            key={index}
            onClick={() => {
              option.action();
              onItemClick?.();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left ${
              isMobile ? 'py-4' : 'py-2'
            }`}
          >
            <div className={`rounded-full p-2 bg-primary/10 text-primary ${isMobile ? 'p-3' : 'p-2'}`}>
              <Icon className={`${isMobile ? 'h-6 w-6' : 'h-4 w-4'}`} />
            </div>
            <div className="flex-1">
              <div className={`font-medium ${isMobile ? 'text-lg' : 'text-sm'}`}>
                {option.label}
              </div>
              {isMobile && (
                <div className="text-sm text-muted-foreground">
                  {option.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <AttachmentButton>
            <Plus className="h-5 w-5" />
          </AttachmentButton>
        </DrawerTrigger>
        <DrawerContent className="max-h-[50vh]">
          <MenuContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <AttachmentButton>
          <Plus className="h-5 w-5" />
        </AttachmentButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <MenuContent />
      </PopoverContent>
    </Popover>
  );
};

export default AttachmentMenu;