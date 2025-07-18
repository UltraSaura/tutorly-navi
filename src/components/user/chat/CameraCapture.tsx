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
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      // Try different constraint sets for better compatibility
      const constraints = [
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'environment' } },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true }
      ];

      let stream = null;
      let lastError = null;

      for (const constraint of constraints) {
        try {
          console.log('Trying constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('Camera access granted with constraint:', constraint);
          break;
        } catch (error) {
          console.log('Constraint failed:', constraint, error);
          lastError = error;
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('No camera access available');
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, camera ready');
          setIsStreaming(true);
          setIsInitializing(false);
        };

        // Add timeout for video loading
        setTimeout(() => {
          if (!isStreaming) {
            console.log('Video loading timeout, forcing stream state');
            setIsStreaming(true);
            setIsInitializing(false);
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setIsInitializing(false);
      
      let errorMessage = 'Unknown camera error';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      toast({
        title: t('camera.accessError'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast, t, isStreaming]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsInitializing(false);
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

  useEffect(() => {
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
              <div className="text-white text-center p-4">
                {cameraError ? (
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
                ) : isInitializing ? (
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