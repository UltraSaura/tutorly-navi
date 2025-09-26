# Unified Math Chat System

This document explains the new unified chat system that combines math detection, education, and grading in a single AI call.

## Overview

The unified system reduces AI API calls by 75% by combining multiple functions:
- **Math Detection**: Determines if content is math-related
- **Educational Guidance**: Provides Socratic tutoring for math problems  
- **Automatic Grading**: Evaluates answers and provides feedback
- **Progressive Hints**: Adjusts feedback based on attempt number

## How It Works

### Before (4 separate AI calls per exercise):
1. Math detection API call
2. Main AI response API call  
3. Grading API call
4. Guidance/feedback API call

### After (1 unified AI call per exercise):
1. **Single unified API call** that handles everything

## Implementation

### Frontend (`useChat.ts`)
- Uses `sendUnifiedMessage()` instead of multiple service calls
- Automatically detects math vs non-math content
- Handles grading responses in the same flow

### Backend (`ai-chat` edge function)
- New `isUnified` parameter triggers unified template
- Uses special "Unified Math Chat Assistant" prompt template
- Single response contains all needed information

### Admin Panel Integration
- **Template**: "Unified Math Chat Assistant" (usage_type: 'chat', tags: ['unified'])
- **Priority**: 100 (highest, auto-activated)
- **Features**: Math detection + education + grading in one prompt

## Unified Response Format

The AI provides structured responses:

```
For math problems with answers:
CORRECT/INCORRECT

**Problem:** [restated problem]
**Guidance:** [educational feedback]

For math problems without answers:
**Problem:** [restated problem]  
**Guidance:** [Socratic questions and hints]

For non-math content:
NOT_MATH - Please visit the general chat page for non-mathematical questions.
```

## Benefits

1. **Performance**: 75% fewer API calls = faster responses
2. **Cost**: Significant reduction in AI service costs
3. **Consistency**: Single prompt ensures unified behavior
4. **Maintainability**: One prompt to manage instead of multiple hardcoded fallbacks
5. **Admin Control**: Full control via admin panel prompt management

## Migration from Old System

### Removed/Deprecated:
- `detectMathWithAI()` - now part of unified response
- `evaluateHomework()` - grading now integrated
- Hardcoded fallback prompts in `systemPrompts.ts`
- Separate math detection service calls

### New Components:
- `unifiedChatService.ts` - handles unified AI communication
- Unified prompt template in database
- `isUnified` parameter in AI chat function
- Automatic response parsing for grading markers

### Admin Panel Changes:
- New "Unified Math Chat Assistant" template (priority 100)
- Existing chat templates demoted to priority 50
- Template tagged with 'unified' for identification

## Usage

The unified system is automatically used when `isUnified: true` is passed to the AI chat function. The frontend (`useChat.ts`) uses this by default for all math interactions.

Users can still manage prompts through the admin panel - the unified template becomes the primary source of truth for all math interactions.