import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraCapture = ({ isOpen, onClose, onCapture }: CameraCaptureProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: t('camera.accessError'),
        description: t('camera.permissionRequired'),
        variant: "destructive"
      });
    }
  }, [toast, t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCapturedImage(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.8);
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    startCamera();
  }, [capturedImage, startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.8);
    }
  }, [capturedImage, onCapture, onClose]);

  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, capturedImage]);

  const handleClose = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('camera.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isStreaming && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={handleClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    size="icon"
                    className="rounded-full h-16 w-16 bg-white hover:bg-gray-100"
                    onClick={capturePhoto}
                    disabled={isCapturing}
                  >
                    <div className="h-12 w-12 rounded-full border-4 border-gray-800" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={retakePhoto}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                
                <Button
                  size="icon"
                  className="rounded-full h-12 w-12 bg-green-600 hover:bg-green-700"
                  onClick={confirmPhoto}
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}

          {!isStreaming && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <Camera className="h-12 w-12 mx-auto mb-2" />
                <p>{t('camera.starting')}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;