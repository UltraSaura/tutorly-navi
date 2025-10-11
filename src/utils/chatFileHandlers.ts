
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
  subjectId?: string
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
    
    if (processingResult && processingResult.exercises.length > 0) {
      console.log('[Photo Upload] Exercises found, starting grading...');
      
      // Update processing message
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: `✅ Found ${processingResult.exercises.length} exercises! Grading them now...` }
          : msg
      ));
      
      // Grade the extracted exercises
      const gradedExercises = await gradeDocumentExercises(processingResult.exercises, selectedModelId);
      
      console.log('[Photo Upload] Grading complete', {
        gradedCount: gradedExercises.length,
        correctCount: gradedExercises.filter(ex => ex.isCorrect === true).length
      });
      
      // Add the exercises to the exercise list if the handler is provided
      if (addExercises) {
        console.log('[Photo Upload] Adding exercises to exercise list...');
        await addExercises(gradedExercises);
      } else {
        console.warn('[Photo Upload] No addExercises handler provided!');
      }
      
      // Create a summary of the extracted exercises
      const exerciseCount = gradedExercises.length;
      const correctCount = gradedExercises.filter(ex => ex.isCorrect === true).length;
      const incorrectCount = gradedExercises.filter(ex => ex.isCorrect === false).length;
      const pendingCount = exerciseCount - correctCount - incorrectCount;
      
      // Generate detailed AI response with the results
      let resultSummary = `✅ Successfully processed your photo!\n\n📊 **Results:**\n- ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} found\n`;
      
      if (correctCount > 0) {
        resultSummary += `- ✅ ${correctCount} correct\n`;
      }
      if (incorrectCount > 0) {
        resultSummary += `- ❌ ${incorrectCount} incorrect\n`;
      }
      if (pendingCount > 0) {
        resultSummary += `- ⏳ ${pendingCount} pending review\n`;
      }
      
      resultSummary += `\n📝 **View your graded exercises in the "Graded Homework" section below.**`;
      
      if (processingResult.rawText && processingResult.rawText.length > 0) {
        resultSummary += `\n\n📄 **Extracted text:**\n\`\`\`\n${processingResult.rawText.substring(0, 500)}${processingResult.rawText.length > 500 ? '...' : ''}\n\`\`\``;
      }
      
      // Update the processing message with final results
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: resultSummary }
          : msg
      ));
      
      toast.success(`✅ Graded ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} from your photo!`);
      
      console.log('[Photo Upload] ✅ Process completed successfully');
    } else {
      console.warn('[Photo Upload] No exercises extracted from photo');
      
      // Provide helpful feedback
      const noExercisesMessage = `⚠️ I received your photo but couldn't extract any exercises from it.\n\n**Possible reasons:**\n- The image might be blurry or low quality\n- The text might be too small\n- The handwriting might be difficult to read\n- The photo might not contain math exercises\n\n**Tips for better results:**\n1. Ensure good lighting\n2. Hold the camera steady\n3. Make sure the text is clearly visible\n4. Try typing the exercises directly instead`;
      
      // Update the processing message
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: noExercisesMessage }
          : msg
      ));
      
      toast.warning('No exercises found in photo. Try typing them directly or retake with better lighting.');
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
