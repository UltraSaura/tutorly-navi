
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { extractHomeworkFromMessage } from '@/utils/homeworkExtraction';
import { evaluateHomework } from '@/services/homeworkGrading';

/**
 * Handles document file uploads in the chat
 */
export const handleFileUpload = async (
  file: File,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  processHomeworkFromChat?: (content: string) => Promise<void>
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
  
  try {
    // Automatically treat document uploads as homework if we have a processor
    if (processHomeworkFromChat) {
      // For PDF, Word, etc. we'll treat the upload itself as a homework submission
      // with a placeholder structure until we can extract text (future enhancement)
      const homeworkContent = `Problem: ${file.name}\nAnswer: Document submitted for review`;
      await processHomeworkFromChat(homeworkContent);
    }
    
    // Call AI model with the document info
    setTimeout(async () => {
      try {
        // Here we would process the document with the AI
        // For now using a simulated response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've received your document "${file.name}" and processed it as homework. It has been added to your graded exercises. Would you like me to provide more detailed feedback on the content?`,
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
  } catch (error) {
    console.error('Error processing homework from document:', error);
    toast.error('Failed to process document as homework');
    setIsLoading(false);
  }
};

/**
 * Handles image uploads in the chat
 */
export const handlePhotoUpload = async (
  file: File,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  processHomeworkFromChat?: (content: string) => Promise<void>
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
  
  try {
    // Automatically treat image uploads as homework if we have a processor
    if (processHomeworkFromChat) {
      // For images, we'll treat it as a homework submission with a placeholder
      // until we can implement OCR (future enhancement)
      const homeworkContent = `Problem: ${file.name}\nAnswer: Image submitted for review`;
      await processHomeworkFromChat(homeworkContent);
    }
    
    // Call AI model with the image info
    setTimeout(async () => {
      try {
        // Here we would process the image with the AI
        // For now using a simulated response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've received your image and processed it as homework. I've added it to your graded exercises. In the future, I'll be able to extract the text content using OCR for more detailed feedback.`,
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
  } catch (error) {
    console.error('Error processing homework from image:', error);
    toast.error('Failed to process image as homework');
    setIsLoading(false);
  }
};
