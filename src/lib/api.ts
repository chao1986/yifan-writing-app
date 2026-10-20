import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import type {
  EssayDetail,
  EssaySummary,
  EssayVersionDetail,
  EssayVersionSummary,
  ModelConversationEntry,
  ReviewSuggestion,
  SettingsInput,
  SettingsView,
} from '../types';

export const desktopApi = {
  loadSettings: () => invoke<SettingsView>('load_settings'),

  saveSettings: (input: SettingsInput) =>
    invoke<SettingsView>('save_settings', { input }),

  testModel: (input: SettingsInput) =>
    invoke<string>('test_model_connection', { input }),

  chooseLibraryFolder: async () => {
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === 'string' ? selected : null;
  },

  listEssays: (query = '', tags: string[] = []) =>
    invoke<EssaySummary[]>('list_essays', { query, tags }),

  listEssayTags: () =>
    invoke<string[]>('list_essay_tags'),

  deleteEssay: (essayId: string) =>
    invoke<void>('delete_essay', { essayId }),

  loadEssay: (essayId: string) =>
    invoke<EssayDetail>('load_essay', { essayId }),

  updateEssayTags: (essayId: string, tags: string[]) =>
    invoke<EssayDetail>('update_essay_tags', { input: { essayId, tags } }),

  saveNewDraft: (input: {
    essayId?: string;
    title: string;
    tags: string[];
    requirements: string;
    reviewPrompt: string;
    content: string;
  }) => invoke<EssayDetail>('save_new_draft', { input }),

  reviewEssay: (input: {
    essayId: string;
    title: string;
    content: string;
  }) => invoke<EssayDetail>('review_essay', { input }),

  requestLocalEdit: (input: {
    essayId: string;
    version: number;
    content: string;
    selectedText: string;
    occurrence: number;
    instruction: string;
  }) => invoke<ReviewSuggestion>('request_local_edit', { input }),

  saveRevision: (input: {
    essayId: string;
    version: number;
    content: string;
    suggestions: ReviewSuggestion[];
  }) => invoke<EssayDetail>('save_revision', { input }),

  saveAsNewVersion: (input: {
    essayId: string;
    version: number;
    content: string;
    suggestions: ReviewSuggestion[];
  }) => invoke<EssayDetail>('save_as_new_version', { input }),

  finalizeEssay: (input: {
    essayId: string;
    version: number;
    content: string;
    suggestions: ReviewSuggestion[];
  }) => invoke<EssayDetail>('finalize_essay', { input }),

  listEssayVersions: (essayId: string) =>
    invoke<EssayVersionSummary[]>('list_essay_versions', { essayId }),

  loadEssayVersion: (essayId: string, version: number) =>
    invoke<EssayVersionDetail>('load_essay_version', { input: { essayId, version } }),

  restoreEssayVersion: (essayId: string, version: number) =>
    invoke<EssayDetail>('restore_essay_version', { input: { essayId, version } }),

  listModelConversations: (essayId: string) =>
    invoke<ModelConversationEntry[]>('list_model_conversations', { essayId }),

  deleteModelConversation: (essayId: string, conversationId: string) =>
    invoke<void>('delete_model_conversation', { essayId, conversationId }),

  clearModelConversations: (essayId: string) =>
    invoke<void>('clear_model_conversations', { essayId }),
};
