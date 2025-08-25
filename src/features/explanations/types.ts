/**
 * Icon identifiers for explanation steps
 */
export type StepIcon = "magnifier" | "checklist" | "divide" | "lightbulb" | "target" | "warning";

/**
 * Kind identifiers for explanation steps
 */
export type StepKind = "concept" | "example" | "strategy" | "pitfall" | "check";

/**
 * Individual explanation step
 */
export interface Step {
  title: string;
  body: string;
  icon: StepIcon;
  kind: StepKind;
}

/**
 * Payload containing multiple explanation steps
 */
export interface StepsPayload {
  steps: Step[];
  meta: {
    mode: string;
    revealAnswer: boolean;
  };
}