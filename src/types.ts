export interface InterviewSession {
  jobTitle: string;
  jobDescription: string;
  questions: InterviewStep[];
  currentStep: number;
  status: 'setup' | 'interviewing' | 'feedback';
}

export interface InterviewStep {
  question: string;
  answer: string;
  feedback?: StepFeedback;
}

export interface Highlight {
  text: string;
  type: 'grammar' | 'culture';
  reason: string;
}

export interface StepFeedback {
  englishScore: number;
  cultureScore: number;
  grammarIssues: string[];
  cultureIssues: string[];
  suggestedAnswer: string;
  highlights?: Highlight[];
}

export interface GlobalFeedback {
  overallEnglish: string;
  overallCulture: string;
  keyStrengths: string[];
  areasForImprovement: string[];
}
