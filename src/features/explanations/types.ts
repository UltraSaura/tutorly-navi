export type StepIcon = "lightbulb"|"magnifier"|"divide"|"checklist"|"warning"|"target";

export type Step = { 
  title: string; 
  body: string; 
  icon: StepIcon; 
  kind: "concept"|"example"|"strategy"|"pitfall"|"check" 
};

export type StepsPayload = { 
  steps: Step[]; 
  meta?: { 
    mode?: "concept"|"solution"; 
    revealAnswer?: boolean 
  } 
};