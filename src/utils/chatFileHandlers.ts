
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { extractHomeworkFromMessage } from '@/utils/homework';
import { evaluateHomework } from '@/services/homeworkGrading';
import { processUploadedDocument, gradeDocumentExercises } from '@/utils/documentProcessor';

/**
 * Handles document file uploads in the chat
 */
export const handleFileUpload = async (
  file: File,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  processHomeworkFromChat?: (content: string) => Promise<void>,
  addExercises?: (exercises: any[]) => Promise<void>,
  subjectId?: string,
  selectedModelId?: string
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
    // Process the document to extract exercises with subject ID
    const processingResult = await processUploadedDocument(file, fileUrl, subjectId);
    
    if (processingResult && processingResult.exercises.length > 0) {
      // Grade the extracted exercises
      const gradedExercises = await gradeDocumentExercises(processingResult.exercises, selectedModelId || localStorage.getItem('selectedModelId') || 'gpt-4.1');
      
      // Add the exercises to the exercise list if the handler is provided
      if (addExercises) {
        await addExercises(gradedExercises);
      }
      
      // Create a summary of the extracted exercises
      const exerciseCount = gradedExercises.length;
      const correctCount = gradedExercises.filter(ex => ex.isCorrect).length;
      
      // Generate AI response with the results
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've processed your document "${file.name}" and extracted ${exerciseCount} exercises. ${correctCount} of them are correct. You can view them in the Graded Homework section.${processingResult.rawText ? '\n\nHere\'s what I found in your document:\n\n```\n' + processingResult.rawText + '\n```' : ''}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      toast.success(`Processed ${exerciseCount} exercises from your document`);
    } else {
      // Fallback to the old method if document processing failed
      if (processHomeworkFromChat) {
        const homeworkContent = `Problem: ${file.name}\nAnswer: Document submitted for review`;
        await processHomeworkFromChat(homeworkContent);
      }
      
      // Call AI model with the document info
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your document "${file.name}" but couldn't extract specific exercises. It has been added as a general submission to your graded exercises.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }
  } catch (error) {
    console.error('Error processing document:', error);
    toast.error('Failed to process document');
    
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `I had trouble processing your document "${file.name}". Please try again or submit your exercises in text format.`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, aiResponse]);
  } finally {
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
  processHomeworkFromChat?: (content: string) => Promise<void>,
  addExercises?: (exercises: any[]) => Promise<void>,
  subjectId?: string,
  selectedModelId?: string
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
    // Process the image to extract exercises with subject ID
    const processingResult = await processUploadedDocument(file, imageUrl, subjectId);
    
    if (processingResult && processingResult.exercises.length > 0) {
      // Grade the extracted exercises
      const gradedExercises = await gradeDocumentExercises(processingResult.exercises, selectedModelId || localStorage.getItem('selectedModelId') || 'gpt-4.1');
      
      // Add the exercises to the exercise list if the handler is provided
      if (addExercises) {
        await addExercises(gradedExercises);
      }
      
      // Create a summary of the extracted exercises
      const exerciseCount = gradedExercises.length;
      const correctCount = gradedExercises.filter(ex => ex.isCorrect).length;
      
      // Generate AI response with the results
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've processed your image and extracted ${exerciseCount} exercises. ${correctCount} of them are correct. You can view them in the Graded Homework section.${processingResult.rawText ? '\n\nHere\'s what I found in your image:\n\n```\n' + processingResult.rawText + '\n```' : ''}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      toast.success(`Processed ${exerciseCount} exercises from your image`);
    } else {
      // Fallback to the old method if image processing failed
      if (processHomeworkFromChat) {
        const homeworkContent = `Problem: ${file.name}\nAnswer: Image submitted for review`;
        await processHomeworkFromChat(homeworkContent);
      }
      
      // Call AI model with the image info
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your image but couldn't extract specific exercises. It has been added as a general submission to your graded exercises. In the future, I'll be able to extract the text content better.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }
  } catch (error) {
    console.error('Error processing image:', error);
    toast.error('Failed to process image');
    
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `I had trouble processing your image. Please try again or submit your exercises in text format.`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, aiResponse]);
  } finally {
    setIsLoading(false);
  }
};
