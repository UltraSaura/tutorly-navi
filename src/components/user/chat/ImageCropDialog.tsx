
import React, { useRef, useCallback } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImageCropDialogProps {
  isOpen: boolean;
  imageUrl: string | null;
  originalFile: File | null;
  onCropConfirm: (croppedFile: File) => void;
  onSendFull: (file: File) => void;
  onCancel: () => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  isOpen,
  imageUrl,
  originalFile,
  onCropConfirm,
  onSendFull,
  onCancel,
}) => {
  const { t } = useTranslation();
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !originalFile) return;

    const canvas = cropper.getCroppedCanvas({
      maxWidth: 2048,
      maxHeight: 2048,
      imageSmoothingQuality: 'high',
    });

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File(
          [blob],
          originalFile.name.replace(/\.[^.]+$/, '') + '_cropped.jpg',
          { type: 'image/jpeg' }
        );
        onCropConfirm(croppedFile);
      },
      'image/jpeg',
      0.92
    );
  }, [originalFile, onCropConfirm]);

  const handleSendFull = useCallback(() => {
    if (originalFile) onSendFull(originalFile);
  }, [originalFile, onSendFull]);

  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 gap-0 sm:max-w-lg overflow-hidden">
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-border">
            <h3 className="text-sm font-semibold text-foreground">
              {t('upload.cropTitle', 'Crop Image')}
            </h3>
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cropper Area */}
          <div className="flex-1 min-h-0 bg-black/5">
            <Cropper
              ref={cropperRef}
              src={imageUrl}
              style={{ height: '100%', width: '100%', maxHeight: '60vh' }}
              guides={true}
              viewMode={1}
              dragMode="move"
              autoCropArea={0.8}
              responsive={true}
              checkOrientation={true}
              background={false}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 p-3 border-t border-neutral-border bg-background">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={handleSendFull}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {t('upload.sendFull', 'Send Full')}
            </Button>
            <Button
              className="flex-1 text-xs bg-brand-primary hover:bg-brand-navy text-white"
              onClick={handleCrop}
            >
              <Crop className="h-3.5 w-3.5 mr-1.5" />
              {t('upload.cropAndSend', 'Crop & Send')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
