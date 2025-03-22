
import { Message } from '@/types/chat';
import { toast } from 'sonner';

/**
 * Handles document file uploads in the chat
 */
export const handleFileUpload = (
  file: File,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Create a temporary URL for the file
  const fileUrl = URL.createObjectURL(file);
  
  const newMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: `Uploaded a document: ${file.name}`,
    timestamp: new Date(),
    type: 'file',
    filename: file.name,
    fileUrl: fileUrl,
  };
  
  setMessages([...messages, newMessage]);
  setIsLoading(true);
  
  // Call AI model with the document info
  setTimeout(async () => {
    try {
      // Here we would process the document with the AI
      // For now using a simulated response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your document "${file.name}". Would you like me to help you understand its content or would you like to submit this as an exercise to work on?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Failed to process document');
    } finally {
      setIsLoading(false);
    }
  }, 2000);
};

/**
 * Handles image uploads in the chat
 */
export const handlePhotoUpload = (
  file: File,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Create a temporary URL for the image
  const imageUrl = URL.createObjectURL(file);
  
  const newMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: `Uploaded an image: ${file.name}`,
    timestamp: new Date(),
    type: 'image',
    filename: file.name,
    fileUrl: imageUrl,
  };
  
  setMessages([...messages, newMessage]);
  setIsLoading(true);
  
  // Call AI model with the image info
  setTimeout(async () => {
    try {
      // Here we would process the image with the AI
      // For now using a simulated response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your image and processed it using OCR. I can see some text that appears to be related to ${Math.random() > 0.5 ? 'mathematics' : 'science'}. Would you like me to help explain this content or would you like to submit it as an exercise?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
    } finally {
      setIsLoading(false);
    }
  }, 2500);
};
