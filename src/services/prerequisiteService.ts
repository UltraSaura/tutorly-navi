/**
 * Pure Prerequisite Graph Traversal & Query Service for Tutorly
 *
 * Implements cycle-safe, bounded traversal over directed prerequisite relationships
 * (A -> B means A is prerequisite for B) according to TUTORLY_FINAL_PRODUCT_AND_ADAPTIVE_ARCHITECTURE.md.
 */

import type {
  PrerequisiteRelationship,
  PrerequisiteGraphNode,
} from "@/types/prerequisite";
import type { ConceptId } from "@/types/learning-unit";

export const MAX_GRAPH_TRAVERSAL_DEPTH = 5;

/**
 * Pure class for querying in-memory directed prerequisite graphs.
 */
export class PrerequisiteGraph {
  private relationships: PrerequisiteRelationship[];
  private directPrereqMap: Map<ConceptId, Set<ConceptId>>;
  private directDependentsMap: Map<ConceptId, Set<ConceptId>>;

  constructor(relationships: PrerequisiteRelationship[] = []) {
    this.relationships = [];
    this.directPrereqMap = new Map();
    this.directDependentsMap = new Map();

    for (const rel of relationships) {
      this.addRelationship(rel);
    }
  }

  /**
   * Adds a directed prerequisite relationship (prerequisite -> target).
   * Automatically enforces non-self-referential constraints.
   */
  public addRelationship(rel: PrerequisiteRelationship): boolean {
    const prereq = rel.prerequisiteConceptId?.trim();
    const target = rel.targetConceptId?.trim();

    if (!prereq || !target || prereq === target) {
      return false;
    }

    this.relationships.push({
      ...rel,
      prerequisiteConceptId: prereq,
      targetConceptId: target,
    });

    if (!this.directPrereqMap.has(target)) {
      this.directPrereqMap.set(target, new Set());
    }
    this.directPrereqMap.get(target)!.add(prereq);

    if (!this.directDependentsMap.has(prereq)) {
      this.directDependentsMap.set(prereq, new Set());
    }
    this.directDependentsMap.get(prereq)!.add(target);

    return true;
  }

  /**
   * Returns all direct prerequisites required by a given target concept.
   */
  public getDirectPrerequisites(targetConceptId: ConceptId): ConceptId[] {
    const direct = this.directPrereqMap.get(targetConceptId.trim());
    return direct ? Array.from(direct) : [];
  }

  /**
   * Returns the transitive closure of prerequisites up to maxDepth with cycle prevention.
   */
  public getPrerequisiteChain(
    targetConceptId: ConceptId,
    maxDepth: number = MAX_GRAPH_TRAVERSAL_DEPTH
  ): ConceptId[] {
    const visited = new Set<ConceptId>();
    const ordered: ConceptId[] = [];

    const traverse = (currentId: ConceptId, currentDepth: number) => {
      if (currentDepth > maxDepth || visited.has(currentId)) {
        return;
      }
      visited.add(currentId);

      const direct = this.getDirectPrerequisites(currentId);
      for (const p of direct) {
        if (!visited.has(p)) {
          ordered.push(p);
          traverse(p, currentDepth + 1);
        }
      }
    };

    traverse(targetConceptId.trim(), 1);
    return ordered;
  }

  /**
   * Detects if adding a directed edge would create a cycle or if current graph has cycles.
   */
  public hasCycle(fromPrereq: ConceptId, toTarget: ConceptId): boolean {
    if (fromPrereq === toTarget) return true;
    const chain = this.getPrerequisiteChain(fromPrereq);
    return chain.includes(toTarget);
  }

  /**
   * Returns a structured node representation.
   */
  public getNode(conceptId: ConceptId): PrerequisiteGraphNode {
    return {
      conceptId: conceptId.trim(),
      directPrerequisites: this.getDirectPrerequisites(conceptId),
    };
  }
}
