import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
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
  
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraState('starting');
    setCameraError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          video.onloadedmetadata = async () => {
            try {
              await video.play();
              setCameraState('ready');
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          
          video.onerror = () => reject(new Error('Video loading failed'));
          
          setTimeout(() => reject(new Error('Camera timeout')), 5000);
        });
      }
    } catch (error: any) {
      setCameraState('error');
      
      let errorMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      }
      
      setCameraError(errorMessage);
      toast({
        title: t('camera.accessError'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast, t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraState('idle');
    setCameraError(null);
    setCapturedImage(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

  useEffect(() => {
    if (isOpen && !capturedImage && cameraState === 'idle') {
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, capturedImage, cameraState]);

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
              
              {cameraState === 'ready' && (
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

          {cameraState !== 'ready' && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center p-4">
                {cameraState === 'error' ? (
                  <>
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-400 font-medium mb-2">Camera Error</p>
                    <p className="text-sm text-gray-300 mb-4">{cameraError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={startCamera}
                      className="text-white border-white hover:bg-white hover:text-black"
                    >
                      Try Again
                    </Button>
                  </>
                ) : cameraState === 'starting' ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Starting camera...</p>
                  </>
                ) : (
                  <>
                    <Camera className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('camera.starting')}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;