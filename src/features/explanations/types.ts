/**
 * Icon identifiers for explanation steps
 */
export type StepIcon = "magnifier" | "checklist" | "divide" | "lightbulb" | "target" | "warning";

/**
 * Individual explanation step
 */
export interface Step {
  title: string;
  body: string;
  icon: StepIcon;
}

/**
 * Payload containing multiple explanation steps
 */
export interface StepsPayload {
  steps: Step[];
}