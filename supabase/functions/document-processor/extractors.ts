
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document based on file type
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType}`);

  try {
    // Primary method: Use OpenAI Vision for all file types
    console.log('Attempting to extract text using OpenAI Vision API');
    return await extractTextWithOpenAIVision(fileData);
  } catch (openaiError) {
    console.error("OpenAI Vision extraction failed, trying DeepSeek Vision as fallback:", openaiError);
    
    try {
      console.log('Falling back to DeepSeek Vision API');
      return await extractTextWithDeepSeekVL2(fileData);
    } catch (deepseekError) {
      console.error("Both OpenAI and DeepSeek Vision extraction failed:", deepseekError);
      throw new Error(`Failed to extract content: ${deepseekError.message}. Please check your API key configuration.`);
    }
  }
}

// New function to extract text using OpenAI Vision API
export async function extractTextWithOpenAIVision(fileUrl: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error("OpenAI API key not configured for visual extraction");
  }

  try {
    console.log('Making OpenAI Vision API request for content extraction');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are an OCR system that extracts French math exercises with STRICT formatting. Use EXERCISE_START and EXERCISE_END delimiters for each exercise to ensure proper separation."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Extract ALL mathematical exercises from this French worksheet. This is CRITICAL - you must find both the INSTRUCTIONS and the MATHEMATICAL CONTENT (fractions, numbers, equations).\n\n🎯 **PRIMARY OBJECTIVE**: Find complete mathematical exercises, not just instruction words!\n\n**FORMAT REQUIRED:**\nEXERCISE_START a. [COMPLETE exercise with instruction AND mathematical content] EXERCISE_END\n\n**WHAT TO LOOK FOR:**\n1. 📊 **FRACTIONS**: Look for patterns like 3/4, 15/20, 6/8, 9/12, 4/6, etc.\n2. 🔢 **NUMBERS**: Any mathematical numbers, even if handwritten\n3. ➕ **OPERATIONS**: +, -, ×, ÷, =, parentheses\n4. 📝 **EQUATIONS**: x + 5 = 12, 2x = 14, etc.\n5. 📐 **DECIMALS**: 3.5, 0.25, 1.75, etc.\n\n**CRITICAL SCANNING STRATEGY:**\n- SCAN the ENTIRE image systematically from top to bottom\n- Look for mathematical content in TABLES, COLUMNS, or SEPARATE LINES\n- Mathematical expressions might be BELOW, BESIDE, or SEPARATE from instruction text\n- Don't stop at instruction words - keep looking for the actual math!\n\n**EXAMPLE of COMPLETE extraction:**\n❌ WRONG: 'EXERCISE_START a. Simplifie les fractions suivantes EXERCISE_END'\n✅ CORRECT: 'EXERCISE_START a. Simplifie les fractions suivantes: 6/8, 4/12, 15/20 EXERCISE_END'\n\n**RECOVERY INSTRUCTIONS:**\nIf you see instruction text like 'Simplifie les fractions' but no fractions:\n1. Look more carefully in the image for fraction numbers\n2. Check if fractions are in a table or list format\n3. Look for handwritten numbers that might be fractions\n4. Scan the entire worksheet area around that instruction\n\n**FINAL CHECK:** Every exercise should contain ACTUAL mathematical content, not just instruction words!\n\nNow extract EVERYTHING mathematical from this image:" 
              },
              { type: "image_url", image_url: { url: fileUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Vision API error response:', errorData);
      throw new Error(`OpenAI Vision API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI Vision API returned error:", data.error);
      throw new Error(`OpenAI Vision API error: ${data.error.message}`);
    }

    console.log('Successfully extracted text from document using OpenAI Vision');
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI Vision extraction:", error);
    throw new Error(`Failed to extract text with OpenAI Vision: ${error.message}`);
  }
}

// Extract text from images and documents using DeepSeek-VL2
export async function extractTextWithDeepSeekVL2(fileData: string): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error("DeepSeek API key not configured for visual extraction");
  }

  try {
    console.log('Making DeepSeek Vision API request for content extraction');
    
    // Handle base64 data URL format - DeepSeek Vision expects direct base64 data
    let imageData = fileData;
    if (fileData.startsWith('data:image/')) {
      // Extract just the base64 part after the comma
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        imageData = base64Match[1];
        console.log('Extracted base64 data for DeepSeek Vision API');
      }
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-vl2",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL mathematical exercises from this French worksheet. This is CRITICAL - you must find both the INSTRUCTIONS and the MATHEMATICAL CONTENT (fractions, numbers, equations).\n\n🎯 **PRIMARY OBJECTIVE**: Find complete mathematical exercises, not just instruction words!\n\n**FORMAT REQUIRED:**\nEXERCISE_START a. [COMPLETE exercise with instruction AND mathematical content] EXERCISE_END\n\n**WHAT TO LOOK FOR:**\n1. 📊 **FRACTIONS**: Look for patterns like 3/4, 15/20, 6/8, 9/12, 4/6, etc.\n2. 🔢 **NUMBERS**: Any mathematical numbers, even if handwritten\n3. ➕ **OPERATIONS**: +, -, ×, ÷, =, parentheses\n4. 📝 **EQUATIONS**: x + 5 = 12, 2x = 14, etc.\n5. 📐 **DECIMALS**: 3.5, 0.25, 1.75, etc.\n\n**CRITICAL SCANNING STRATEGY:**\n- SCAN the ENTIRE image systematically from top to bottom\n- Look for mathematical content in TABLES, COLUMNS, or SEPARATE LINES\n- Mathematical expressions might be BELOW, BESIDE, or SEPARATE from instruction text\n- Don't stop at instruction words - keep looking for the actual math!\n\n**EXAMPLE of COMPLETE extraction:**\n❌ WRONG: 'EXERCISE_START a. Simplifie les fractions suivantes EXERCISE_END'\n✅ CORRECT: 'EXERCISE_START a. Simplifie les fractions suivantes: 6/8, 4/12, 15/20 EXERCISE_END'\n\n**RECOVERY INSTRUCTIONS:**\nIf you see instruction text like 'Simplifie les fractions' but no fractions:\n1. Look more carefully in the image for fraction numbers\n2. Check if fractions are in a table or list format\n3. Look for handwritten numbers that might be fractions\n4. Scan the entire worksheet area around that instruction\n\n**FINAL CHECK:** Every exercise should contain ACTUAL mathematical content, not just instruction words!\n\nNow extract EVERYTHING mathematical from this image:"
              },
              {
                type: "image",
                image: imageData
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek Vision API error response:', errorData);
      throw new Error(`DeepSeek Vision API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek Vision API returned error:", data.error);
      throw new Error(`DeepSeek Vision API error: ${data.error.message}`);
    }

    console.log('Successfully extracted text from document using DeepSeek Vision');
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek Vision extraction:", error);
    throw new Error(`Failed to extract text with DeepSeek Vision: ${error.message}`);
  }
}
