export type SuggestionStatus = 'pending' | 'accepted' | 'ignored';

export type ReviewSuggestion = {
  id: string;
  kind: string;
  original: string;
  replacement: string;
  reason: string;
  location: string;
  occurrence?: number;
  status: SuggestionStatus;
};

export type EssayMetadata = {
  id: string;
  title: string;
  tags: string[];
  requirements: string;
  reviewPrompt: string;
  status: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type EssaySummary = Omit<EssayMetadata, 'createdAt'> & {
  excerpt: string;
};

export type EssayDetail = {
  metadata: EssayMetadata;
  content: string;
  suggestions: ReviewSuggestion[];
};

export type EssayVersionSummary = {
  version: number;
  createdAt: string;
  label: string;
  excerpt: string;
  suggestionCount: number;
  isCurrent: boolean;
};

export type EssayVersionDetail = {
  version: number;
  createdAt: string;
  label: string;
  content: string;
  suggestions: ReviewSuggestion[];
  isCurrent: boolean;
};

export type ModelConversationEntry = {
  id: string;
  createdAt: string;
  kind: string;
  essayId?: string;
  essayTitle?: string;
  version?: number;
  providerName: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  assistantResponse?: string;
  error?: string;
};

export type SettingsView = {
  providerName: string;
  apiBaseUrl: string;
  model: string;
  libraryPath: string;
  reviewPrompt: string;
  hasApiKey: boolean;
};

export type SettingsInput = Omit<SettingsView, 'hasApiKey'> & {
  apiKey?: string;
};
