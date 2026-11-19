import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';
import { canUseExerciseForLearner } from '@/features/practice/exerciseCurriculum';

export type PracticeCatalogueTopic = {
  id: string;
  curriculum_country_code?: string | null;
  curriculum_level_code?: string | null;
};

export type PracticeBankCatalogue = {
  bankByTopic: Map<string, string>;
  eligibleBankIds: Set<string>;
  isLoading: boolean;
  error: Error | null;
};

function topicMatchesLearner(topic: PracticeCatalogueTopic, country: string | null, level: string | null) {
  return Boolean(country && level && topic.curriculum_country_code?.trim().toLowerCase() === country
    && normalizeSchoolLevel(topic.curriculum_level_code) === normalizeSchoolLevel(level));
}

function bankLevelsMatch(schoolLevels: string[] | null, level: string) {
  // Older banks inherit their level from the exactly matched topic. Explicit
  // metadata must always include an alias of the active level.
  return !schoolLevels?.length || schoolLevels.some((bankLevel) => normalizeSchoolLevel(bankLevel) === normalizeSchoolLevel(level));
}

export function buildPracticeBankCatalogue({
  topics,
  assignments,
  banks,
  questions,
  country,
  level,
}: {
  topics: PracticeCatalogueTopic[];
  assignments: Array<{ topic_id: string | null; bank_id: string | null; display_context?: string | null; is_active?: boolean | null }>;
  banks: Array<{ id: string; school_levels: string[] | null }>;
  questions: Array<{ bank_id: string; payload: unknown }>;
  country: string | null;
  level: string | null;
}) {
  const allowedTopics = new Set(topics.filter((topic) => topicMatchesLearner(topic, country, level)).map((topic) => topic.id));
  const allowedAssignments = assignments.filter((assignment) =>
    assignment.is_active === true
    && (assignment.display_context == null || assignment.display_context === 'practice' || assignment.display_context === 'both')
    && Boolean(assignment.topic_id && allowedTopics.has(assignment.topic_id) && assignment.bank_id));
  const assignmentsByBank = new Map<string, string[]>();
  for (const assignment of allowedAssignments) {
    if (!assignment.bank_id || !assignment.topic_id) continue;
    const linked = assignmentsByBank.get(assignment.bank_id) ?? [];
    linked.push(assignment.topic_id);
    assignmentsByBank.set(assignment.bank_id, linked);
  }

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const bankById = new Map(banks.map((bank) => [bank.id, bank]));
  const questionRowsByBank = new Map<string, unknown[]>();
  for (const row of questions) {
    if (!row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload) || !row.bank_id) continue;
    const rows = questionRowsByBank.get(row.bank_id) ?? [];
    rows.push(row.payload);
    questionRowsByBank.set(row.bank_id, rows);
  }

  const bankByTopic = new Map<string, string>();
  const eligibleBankIds = new Set<string>();
  for (const [bankId, topicIds] of assignmentsByBank) {
    const bank = bankById.get(bankId);
    const bankQuestions = questionRowsByBank.get(bankId) ?? [];
    if (!bank || !level || !bankQuestions.length || !bankLevelsMatch(bank.school_levels, level)) continue;
    const hasEligibleTopic = topicIds.some((topicId) => {
      const topic = topicById.get(topicId);
      return topic && topicMatchesLearner(topic, country, level);
    });
    if (!hasEligibleTopic || !bankQuestions.every((question) => canUseExerciseForLearner(question, country, level))) continue;
    eligibleBankIds.add(bankId);
    for (const topicId of topicIds) {
      if (!bankByTopic.has(topicId)) bankByTopic.set(topicId, bankId);
    }
  }
  return { bankByTopic, eligibleBankIds };
}

export function usePracticeBankCatalogue(
  topics: PracticeCatalogueTopic[],
  countryCode: string | null,
  levelCode: string | null,
): PracticeBankCatalogue {
  const topicIds = useMemo(() => Array.from(new Set(topics.map((topic) => topic.id))).sort(), [topics]);
  const country = countryCode?.trim().toLowerCase() ?? null;
  const level = levelCode ? normalizeSchoolLevel(levelCode) : null;
  const query = useQuery({
    queryKey: ['practice-bank-catalogue', topicIds.join(','), country, level],
    enabled: topicIds.length > 0 && Boolean(country && level),
    queryFn: async () => {
      const [{ data: assignments, error: assignmentError }] = await Promise.all([
        supabase.from('quiz_bank_assignments')
          .select('topic_id, bank_id, display_context, is_active')
          .eq('is_active', true)
          .in('topic_id', topicIds),
      ]);
      if (assignmentError) throw assignmentError;
      const practiceAssignments = (assignments ?? []).filter((assignment) =>
        assignment.display_context == null || assignment.display_context === 'practice' || assignment.display_context === 'both');
      const bankIds = Array.from(new Set(practiceAssignments.map((assignment) => assignment.bank_id).filter((id): id is string => Boolean(id))));
      if (bankIds.length === 0) return buildPracticeBankCatalogue({ topics, assignments: [], banks: [], questions: [], country, level });

      const [{ data: banks, error: bankError }, { data: questions, error: questionError }] = await Promise.all([
        supabase.from('quiz_banks').select('id, school_levels').in('id', bankIds),
        supabase.from('quiz_bank_questions').select('bank_id, payload').in('bank_id', bankIds),
      ]);
      if (bankError) throw bankError;
      if (questionError) throw questionError;
      return buildPracticeBankCatalogue({ topics, assignments: practiceAssignments, banks: banks ?? [], questions: questions ?? [], country, level });
    },
  });

  return {
    bankByTopic: query.data?.bankByTopic ?? new Map<string, string>(),
    eligibleBankIds: query.data?.eligibleBankIds ?? new Set<string>(),
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
