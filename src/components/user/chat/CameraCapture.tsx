import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, CameraDialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async (preferredFacingMode?: 'user' | 'environment') => {
    setCameraState('starting');
    setCameraError(null);
    
    const targetFacingMode = preferredFacingMode || facingMode;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Try constraints in order of preference
      const constraints = [
        { video: { facingMode: targetFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: targetFacingMode } },
        { video: { facingMode: targetFacingMode === 'environment' ? 'user' : 'environment' } },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;
      let actualFacingMode = targetFacingMode;

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          // Update facing mode based on what actually worked
          if (constraint.video && typeof constraint.video === 'object' && constraint.video.facingMode) {
            actualFacingMode = constraint.video.facingMode as 'user' | 'environment';
          }
          break;
        } catch (error) {
          lastError = error as Error;
          console.log('Failed with constraint:', constraint, error);
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with any configuration');
      }
      
      setFacingMode(actualFacingMode);
      
      if (videoRef.current) {
        streamRef.current = stream;
        
        // Track diagnostics (no auto-restart)
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.addEventListener('ended', () => {
            console.warn('[Camera] Video track ended');
          });
        }
        
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Wait for video to load and start playing
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Camera loading timeout'));
          }, 8000);

          const onLoadedMetadata = () => {
            console.log('Video loaded:', { 
              videoWidth: video.videoWidth, 
              videoHeight: video.videoHeight,
              readyState: video.readyState 
            });
            
            video.play()
              .then(() => {
                // Give video time to actually start playing
                setTimeout(() => {
                  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                    clearTimeout(timeout);
                    setCameraState('ready');


                    resolve();
                  } else {
                    reject(new Error('Video failed to initialize properly'));
                  }
                }, 300);
              })
              .catch(reject);
          };

          const onError = (e: Event) => {
            clearTimeout(timeout);
            reject(new Error('Video loading failed'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          video.addEventListener('error', onError, { once: true });
        });
      }
    } catch (error: any) {
      // Clean up stream if error occurs
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setCameraState('error');
      
      let errorMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Camera loading timed out. Please try again.';
      } else if (error.message.includes('initialize')) {
        errorMessage = 'Camera failed to initialize. Please try again.';
      }
      
      setCameraError(errorMessage);
      toast({
        title: t('camera.accessError'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [facingMode, toast, t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraState('idle');
    setCameraError(null);
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
    
    // Mirror the image if using front camera
    if (facingMode === 'user') {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.8);
  }, [stopCamera, facingMode]);

  const flipCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    stopCamera();
    startCamera(newFacingMode);
  }, [facingMode, startCamera, stopCamera]);

  const retryCamera = useCallback(() => {
    startCamera();
  }, [startCamera]);

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
    if (isOpen) {
      // Start when dialog opens
      startCamera();
      return () => {
        // Stop only when dialog closes or component unmounts
        stopCamera();
      };
    } else {
      // Ensure stopped when closed
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <CameraDialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('camera.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black overflow-hidden">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ 
                  minWidth: '100%', 
                  minHeight: '100%',
                  objectFit: 'cover'
                }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {cameraState === 'ready' && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={handleClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={flipCamera}
                  >
                    <RotateCw className="h-4 w-4" />
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
                      onClick={retryCamera}
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
      </CameraDialogContent>
    </Dialog>
  );
};

export default CameraCapture;