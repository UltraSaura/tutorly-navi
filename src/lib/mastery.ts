import { supabase } from '@/integrations/supabase/client';

/**
 * Update or create objective mastery record based on task results
 * 
 * Logic:
 * - Creates new record if none exists
 * - Updates existing record with new score (uses MAX of current and new)
 * - Sets status based on score_percent:
 *   - >= 80: mastered
 *   - 30-79: in_progress
 *   - < 30: in_progress (but not mastered)
 * 
 * @param params.studentId - The user ID of the student
 * @param params.topicId - The topic where this mastery was demonstrated
 * @param params.objectiveId - The objective being assessed
 * @param params.scorePercent - Score from 0-100 based on task results
 * @param params.countryCode - Optional curriculum country code
 * @param params.levelCode - Optional curriculum level code
 */
export async function updateMasteryFromTaskResult({
  studentId,
  topicId,
  objectiveId,
  scorePercent,
  countryCode,
  levelCode,
}: {
  studentId: string;
  topicId: string;
  objectiveId: string;
  scorePercent: number;
  countryCode?: string;
  levelCode?: string;
}) {
  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(100, scorePercent));
  
  // Determine status based on score
  let status: 'not_started' | 'in_progress' | 'mastered';
  if (clampedScore >= 80) {
    status = 'mastered';
  } else if (clampedScore >= 30) {
    status = 'in_progress';
  } else {
    status = 'in_progress'; // Keep in_progress even for low scores
  }
  
  // Check if record exists
  const { data: existingRecord } = await supabase
    .from('objective_mastery')
    .select('id, score_percent, attempts_count')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .eq('objective_id', objectiveId)
    .single();
  
  if (existingRecord) {
    // UPDATE: Use MAX of existing and new score
    const newScore = Math.max(existingRecord.score_percent, clampedScore);
    const newStatus = newScore >= 80 ? 'mastered' : newScore >= 30 ? 'in_progress' : 'in_progress';
    
    const { error } = await supabase
      .from('objective_mastery')
      .update({
        score_percent: newScore,
        status: newStatus,
        attempts_count: existingRecord.attempts_count + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', existingRecord.id);
    
    if (error) throw error;
    
    console.log('[Mastery] Updated objective mastery:', {
      studentId,
      objectiveId,
      topicId,
      newScore,
      newStatus,
      attempts: existingRecord.attempts_count + 1,
    });
  } else {
    // INSERT: Create new record
    const { error } = await supabase
      .from('objective_mastery')
      .insert({
        student_id: studentId,
        topic_id: topicId,
        objective_id: objectiveId,
        score_percent: clampedScore,
        status,
        attempts_count: 1,
        last_attempt_at: new Date().toISOString(),
        country_code: countryCode || null,
        level_code: levelCode || null,
      });
    
    if (error) throw error;
    
    console.log('[Mastery] Created objective mastery:', {
      studentId,
      objectiveId,
      topicId,
      score: clampedScore,
      status,
    });
  }
}

/**
 * Calculate score percentage from task results
 * 
 * @param taskResults - Array of task results with is_correct boolean
 * @returns Score percentage (0-100)
 */
export function calculateScoreFromTasks(taskResults: Array<{ is_correct: boolean }>) {
  if (taskResults.length === 0) return 0;
  
  const correctCount = taskResults.filter(r => r.is_correct).length;
  return Math.round((correctCount / taskResults.length) * 100);
}
