/**
 * CURRICULUM PIPELINE:
 * User Profile (country, level, language) → CurriculumBundle (taxonomy) → learning_topics (content) → UI
 * 
 * This module transforms database rows into hierarchical curriculum structures
 * optimized for UI consumption with localized labels.
 */

import type { Database } from '@/integrations/supabase/types';
import { getLocalizedLabel } from '@/lib/curriculum';

// Database row types (from Supabase)
type LearningTopicRow = Database['public']['Tables']['learning_topics']['Row'];
type LearningSubjectRow = Database['public']['Tables']['learning_subjects']['Row'];
type LearningCategoryRow = Database['public']['Tables']['learning_categories']['Row'];

// View models for UI
export interface CurriculumTopic {
  id: string;
  topicKey: string;
  topicLabel: string;
  description: string | null;
  slug: string;
  videoCount: number;
  quizCount: number;
  estimatedDurationMinutes: number;
  orderIndex: number;
  categoryId: string;
  // Curriculum location
  curriculumDomainId: string | null;
  curriculumSubdomainId: string | null;
}

export interface CurriculumSubdomain {
  subdomainId: string;
  subdomainLabel: string;
  topics: CurriculumTopic[];
}

export interface CurriculumDomain {
  domainId: string;
  domainLabel: string;
  subdomains: CurriculumSubdomain[];
}

export interface CurriculumSubject {
  id: string; // learning_subjects.id (UUID)
  subjectKey: string; // curriculum subject ID (e.g., "MATH")
  subjectLabel: string; // Localized name
  slug: string;
  colorScheme: string;
  iconName: string;
  orderIndex: number;
  domains: CurriculumDomain[];
  totalTopics: number;
}

/**
 * Pure transformation function that builds nested curriculum structure
 * @param learningSubjects - Database subjects with categories
 * @param learningTopics - Database topics filtered by curriculum
 * @param curriculumSubjects - Curriculum bundle subjects
 * @param curriculumDomains - Curriculum bundle domains
 * @param curriculumSubdomains - Curriculum bundle subdomains
 * @param language - Current UI language (en/fr)
 * @returns Array of curriculum subjects with nested structure
 */
export function buildSubjectsFromCurriculum({
  learningSubjects,
  learningTopics,
  curriculumSubjects,
  curriculumDomains,
  curriculumSubdomains,
  language,
}: {
  learningSubjects: (LearningSubjectRow & {
    learning_categories?: LearningCategoryRow[];
  })[];
  learningTopics: LearningTopicRow[];
  curriculumSubjects: any[];
  curriculumDomains: any[];
  curriculumSubdomains: any[];
  language: string;
}): CurriculumSubject[] {
  const subjectsMap = new Map<string, CurriculumSubject>();

  // Build a map of categoryId -> subjectId for quick lookup
  const categoryToSubject = new Map<string, string>();
  learningSubjects.forEach(subject => {
    subject.learning_categories?.forEach(cat => {
      categoryToSubject.set(cat.id, subject.id);
    });
  });

  // For each learning subject, build its curriculum structure
  learningSubjects.forEach(learningSubject => {
    // Find topics that belong to this subject (via categories)
    const categoryIds = learningSubject.learning_categories?.map(c => c.id) || [];
    const subjectTopics = learningTopics.filter(topic =>
      categoryIds.includes(topic.category_id)
    );

    if (subjectTopics.length === 0) return; // Skip subjects with no content

    // Find curriculum subject for this learning subject
    const curriculumSubjectId = subjectTopics[0]?.curriculum_subject_id;
    const currSubject = curriculumSubjects.find(cs => cs.id === curriculumSubjectId);

    if (!currSubject) return;

    // Group topics by domain and subdomain
    const domainsMap = new Map<string, CurriculumDomain>();

    subjectTopics.forEach(topic => {
      if (!topic.curriculum_domain_id || !topic.curriculum_subdomain_id) return;

      const domainId = topic.curriculum_domain_id;
      const subdomainId = topic.curriculum_subdomain_id;

      // Find domain and subdomain info from curriculum
      const domain = curriculumDomains.find(d => d.id === domainId);
      const subdomain = curriculumSubdomains.find(sd => sd.id === subdomainId);

      if (!domain || !subdomain) return;

      // Get or create domain
      if (!domainsMap.has(domainId)) {
        domainsMap.set(domainId, {
          domainId,
          domainLabel: getLocalizedLabel(domain.labels, language),
          subdomains: [],
        });
      }

      const domainData = domainsMap.get(domainId)!;

      // Find or create subdomain
      let subdomainData = domainData.subdomains.find(
        sd => sd.subdomainId === subdomainId
      );
      if (!subdomainData) {
        subdomainData = {
          subdomainId,
          subdomainLabel: getLocalizedLabel(subdomain.labels, language),
          topics: [],
        };
        domainData.subdomains.push(subdomainData);
      }

      // Add topic to subdomain
      subdomainData.topics.push({
        id: topic.id,
        topicKey: topic.slug,
        topicLabel: topic.name,
        description: topic.description,
        slug: topic.slug,
        videoCount: topic.video_count,
        quizCount: topic.quiz_count,
        estimatedDurationMinutes: topic.estimated_duration_minutes,
        orderIndex: topic.order_index,
        categoryId: topic.category_id,
        curriculumDomainId: topic.curriculum_domain_id,
        curriculumSubdomainId: topic.curriculum_subdomain_id,
      });
    });

    // Sort subdomains and topics
    domainsMap.forEach(domain => {
      domain.subdomains.forEach(subdomain => {
        subdomain.topics.sort((a, b) => a.orderIndex - b.orderIndex);
      });
    });

    // Create subject
    subjectsMap.set(learningSubject.id, {
      id: learningSubject.id,
      subjectKey: curriculumSubjectId || learningSubject.slug,
      subjectLabel: getLocalizedLabel(currSubject.labels, language) || learningSubject.name,
      slug: learningSubject.slug,
      colorScheme: learningSubject.color_scheme,
      iconName: learningSubject.icon_name,
      orderIndex: learningSubject.order_index,
      domains: Array.from(domainsMap.values()),
      totalTopics: subjectTopics.length,
    });
  });

  return Array.from(subjectsMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);
}
