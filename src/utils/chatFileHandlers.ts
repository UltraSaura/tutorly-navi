
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
  selectedModelId: string,
  processHomeworkFromChat?: (content: string) => Promise<void>,
  addExercises?: (exercises: any[]) => Promise<void>,
  subjectId?: string
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
      const gradedExercises = await gradeDocumentExercises(processingResult.exercises, selectedModelId);
      
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
  selectedModelId: string,
  processHomeworkFromChat?: (content: string) => Promise<void>,
  addExercises?: (exercises: any[]) => Promise<void>,
  subjectId?: string,
  handleSendMessage?: (text: string) => Promise<void>
) => {
  console.log('[Photo Upload] Starting photo upload process', { 
    fileName: file.name, 
    fileSize: file.size, 
    fileType: file.type 
  });
  
  // Create a temporary URL for the image
  const imageUrl = URL.createObjectURL(file);
  
  const newMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: `📷 Uploaded photo: ${file.name}`,
    timestamp: new Date(),
    type: 'image',
    filename: file.name,
    fileUrl: imageUrl,
  };
  
  setMessages([...messages, newMessage]);
  
  // Show immediate processing feedback
  const processingMessage: Message = {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '🔍 Processing your photo... Extracting text using OCR...',
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, processingMessage]);
  setIsLoading(true);
  
  try {
    console.log('[Photo Upload] Calling processUploadedDocument...');
    
    // Process the image to extract exercises with subject ID
    const processingResult = await processUploadedDocument(file, imageUrl, subjectId);
    
    console.log('[Photo Upload] Processing result:', {
      hasResult: !!processingResult,
      exerciseCount: processingResult?.exercises.length || 0,
      rawTextLength: processingResult?.rawText?.length || 0
    });
    
    // Check if we have extracted text and handleSendMessage callback
    if (processingResult && processingResult.rawText && processingResult.rawText.trim().length > 0) {
      console.log('[Photo Upload] Text extracted successfully, length:', processingResult.rawText.length);
      
      if (handleSendMessage) {
        // Send the extracted text through the normal chat flow
        console.log('[Photo Upload] Sending extracted text to chat flow...');
        
        // Update processing message
        setMessages(prev => prev.map(msg => 
          msg.id === processingMessage.id 
            ? { ...msg, content: `✅ Text extracted! Processing through AI...` }
            : msg
        ));
        
        // Remove the processing message before sending to chat
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        
        // Send the extracted text as if user typed it
        await handleSendMessage(processingResult.rawText);
        
        console.log('[Photo Upload] ✅ Text sent to chat flow successfully');
      } else {
        // Fallback to old behavior: create exercises directly
        console.log('[Photo Upload] No handleSendMessage callback, falling back to direct exercise processing');
        
        if (processingResult.exercises.length > 0) {
      // Update processing message
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: `✅ Found ${processingResult.exercises.length} exercises! Grading them now...` }
          : msg
      ));
      
      // Grade the extracted exercises
      const gradedExercises = await gradeDocumentExercises(processingResult.exercises, selectedModelId);
      
      // Add the exercises to the exercise list if the handler is provided
      if (addExercises) {
        await addExercises(gradedExercises);
      }
      
      const exerciseCount = gradedExercises.length;
      const correctCount = gradedExercises.filter(ex => ex.isCorrect === true).length;
      
      // Update the processing message with final results
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
              ? { ...msg, content: `✅ Successfully processed your photo!\n\n📊 Found ${exerciseCount} exercises (${correctCount} correct). View in Graded Homework section.` }
          : msg
      ));
      
          toast.success(`✅ Graded ${exerciseCount} exercises from your photo!`);
        } else {
          // No exercises found
          setMessages(prev => prev.map(msg => 
            msg.id === processingMessage.id 
              ? { ...msg, content: `⚠️ Could not extract exercises from photo. Please try typing them directly.` }
              : msg
          ));
          
          toast.warning('No exercises found in photo.');
        }
      }
    } else {
      console.warn('[Photo Upload] No text extracted from photo');
      
      // Provide helpful feedback
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: `⚠️ Could not extract text from photo. Please try typing the exercises directly.` }
          : msg
      ));
      
      toast.warning('Could not extract text from photo. Try typing exercises directly.');
    }
  } catch (error) {
    console.error('[Photo Upload] ❌ Error processing image:', error);
    
    // Update processing message with error
    const errorMessage = `❌ **Error processing your photo**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**What to try:**\n1. Check your internet connection\n2. Try uploading the photo again\n3. Try typing the exercises directly\n4. Use a different photo with better lighting`;
    
    setMessages(prev => prev.map(msg => 
      msg.id === processingMessage.id 
        ? { ...msg, content: errorMessage }
        : msg
    ));
    
    toast.error('Failed to process photo. Please try again or type the exercises directly.');
  } finally {
    setIsLoading(false);
    console.log('[Photo Upload] Process ended');
  }
};
