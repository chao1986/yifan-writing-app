import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Database,
  FilePlus2,
  FileStack,
  FolderOpen,
  Library,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  Sparkles,
  TestTube2,
  SquareTerminal,
  Sun,
  Tag,
  UserRound,
  RotateCcw,
  WandSparkles,
  X,
} from 'lucide-react';

import './App.css';
import { desktopApi } from './lib/api';
import type {
  EssayDetail,
  EssaySummary,
  EssayVersionDetail,
  EssayVersionSummary,
  ModelConversationEntry,
  ReviewSuggestion,
  SettingsInput,
  SettingsView,
} from './types';

type Screen = 'library' | 'new' | 'review' | 'settings' | 'conversations';
type ReviewView = 'annotated' | 'preview';
type ThemeMode = 'light' | 'dark';
type Toast = { tone: 'success' | 'error'; title: string; detail?: string };

const COMMON_TAGS = ['记叙文', '议论文', '说明文', '散文', '读后感', '应用文'];
const MAX_ESSAY_TAGS = 8;
const MAX_TAG_CHARACTERS = 10;

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后重试。';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function countOccurrences(text: string, target: string) {
  if (!target) return 0;
  let count = 0;
  let cursor = 0;
  while (cursor <= text.length) {
    const index = text.indexOf(target, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + target.length;
  }
  return count;
}

function replaceOccurrence(text: string, target: string, replacement: string, occurrence = 0) {
  let cursor = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const match = text.indexOf(target, cursor);
    if (match < 0) return text;
    if (index === occurrence) {
      return `${text.slice(0, match)}${replacement}${text.slice(match + target.length)}`;
    }
    cursor = match + target.length;
  }
  return text;
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function TagEditor({
  tags,
  recentTags,
  onChange,
}: {
  tags: string[];
  recentTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const selectedKeys = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  const recent = uniqueTags(recentTags)
    .filter((tag) => !COMMON_TAGS.includes(tag) && !selectedKeys.has(tag.toLocaleLowerCase()))
    .slice(0, 12);

  const remove = (tag: string) => {
    onChange(tags.filter((current) => current !== tag));
    setMessage('');
  };

  const add = (raw: string) => {
    const candidates = raw
      .split(/[，,、\n]+/)
      .map((tag) => tag.trim().replace(/^#+/, '').trim())
      .filter(Boolean);
    if (!candidates.length) return;
    const next = [...tags];
    for (const candidate of candidates) {
      if (candidate.length > MAX_TAG_CHARACTERS) {
        setMessage(`单个标签最多 ${MAX_TAG_CHARACTERS} 个字符`);
        return;
      }
      if (next.some((tag) => tag.toLocaleLowerCase() === candidate.toLocaleLowerCase())) continue;
      if (next.length >= MAX_ESSAY_TAGS) {
        setMessage(`每篇作文最多添加 ${MAX_ESSAY_TAGS} 个标签`);
        return;
      }
      next.push(candidate);
    }
    onChange(next);
    setInput('');
    setMessage('');
  };

  const toggleCommon = (tag: string) => {
    if (selectedKeys.has(tag.toLocaleLowerCase())) remove(tag);
    else add(tag);
  };

  return (
    <div className="tag-editor">
      <div className="tag-group">
        <small>常用标签</small>
        <div className="tag-chip-row">
          {COMMON_TAGS.map((tag) => (
            <button type="button" key={tag} className={`tag-chip ${selectedKeys.has(tag.toLocaleLowerCase()) ? 'is-selected' : ''}`} onClick={() => toggleCommon(tag)}>
              {selectedKeys.has(tag.toLocaleLowerCase()) ? <Check /> : <Plus />}{tag}
            </button>
          ))}
        </div>
      </div>
      {recent.length ? (
        <div className="tag-group">
          <small>最近使用</small>
          <div className="tag-chip-row">
            {recent.map((tag) => <button type="button" key={tag} className="tag-chip" onClick={() => add(tag)}><Plus />{tag}</button>)}
          </div>
        </div>
      ) : null}
      <div className="tag-group">
        <small>已添加</small>
        <div className="selected-tags">
          {tags.map((tag) => <button type="button" key={tag} className="selected-tag" onClick={() => remove(tag)}>{tag}<X /></button>)}
          {!tags.length ? <span>暂未添加标签</span> : null}
        </div>
      </div>
      <div className="tag-input-row">
        <input
          value={input}
          maxLength={MAX_TAG_CHARACTERS}
          onChange={(event) => { setInput(event.target.value); setMessage(''); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
              event.preventDefault();
              add(input);
            }
          }}
          placeholder="输入自定义标签"
        />
        <button type="button" aria-label="添加标签" disabled={!input.trim()} onClick={() => add(input)}><Plus /></button>
      </div>
      {message ? <span className="tag-message">{message}</span> : null}
    </div>
  );
}

function findMatches(paragraph: string, suggestions: ReviewSuggestion[]) {
  const candidates = suggestions
    .filter((suggestion) => suggestion.status !== 'accepted')
    .map((suggestion) => ({
      suggestion,
      index: paragraph.indexOf(suggestion.original),
    }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index);

  const matches: typeof candidates = [];
  let cursor = 0;
  for (const match of candidates) {
    if (match.index < cursor) continue;
    matches.push(match);
    cursor = match.index + match.suggestion.original.length;
  }
  return matches;
}

function AnnotatedArticle({
  content,
  suggestions,
  activeId,
  onSelect,
}: {
  content: string;
  suggestions: ReviewSuggestion[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <article className="essay-copy">
      {content.split(/\n\s*\n/).map((paragraph, paragraphIndex) => {
        const matches = findMatches(paragraph, suggestions);
        const nodes: React.ReactNode[] = [];
        let cursor = 0;
        matches.forEach(({ suggestion, index }) => {
          nodes.push(paragraph.slice(cursor, index));
          nodes.push(
            <button
              type="button"
              key={suggestion.id}
              className={`review-mark kind-${suggestion.kind} is-${suggestion.status} ${activeId === suggestion.id ? 'is-active' : ''}`}
              onClick={() => onSelect(suggestion.id)}
            >
              {suggestion.original}
            </button>,
          );
          cursor = index + suggestion.original.length;
        });
        nodes.push(paragraph.slice(cursor));
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 12)}`}>{nodes}</p>
        );
      })}
    </article>
  );
}

function Sidebar({
  screen,
  settings,
  collapsed,
  onToggle,
  onNavigate,
}: {
  screen: Screen;
  settings: SettingsView;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={collapsed ? '展开侧边功能栏' : '折叠侧边功能栏'}
        aria-expanded={!collapsed}
        title={collapsed ? '展开功能栏' : '折叠功能栏'}
        onClick={onToggle}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>
      <div className="brand-block">
        <div className="brand-mark">文</div>
        <div className="brand-copy">
          <strong>一凡文库</strong>
        </div>
      </div>

      <nav className="side-nav" aria-label="主导航">
        <button
          type="button"
          className={screen === 'library' || screen === 'new' ? 'is-active' : ''}
          title={collapsed ? '一凡文库' : undefined}
          onClick={() => onNavigate('library')}
        >
          <Library /> <span className="nav-label">一凡文库</span>
        </button>
        <button
          type="button"
          className={screen === 'settings' ? 'is-active' : ''}
          title={collapsed ? '设置' : undefined}
          onClick={() => onNavigate('settings')}
        >
          <Settings /> <span className="nav-label">设置</span>
        </button>
      </nav>

      <div className="sidebar-spacer" />
      <div className="local-card" title={collapsed ? `本地资料库：${settings.libraryPath}` : undefined}>
        <div className="local-card-title">
          <Database /> 本地资料库
          <i />
        </div>
        <span title={settings.libraryPath}>{settings.libraryPath}</span>
        <small>{settings.hasApiKey ? '模型密钥已安全保存' : '尚未配置模型密钥'}</small>
      </div>
    </aside>
  );
}

function LibraryScreen({
  essays,
  availableTags,
  selectedTags,
  query,
  loading,
  onQueryChange,
  onTagsChange,
  onCreate,
  onOpen,
  onConversations,
  onDeleted,
  notify,
}: {
  essays: EssaySummary[];
  availableTags: string[];
  selectedTags: string[];
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onConversations: (essay: EssaySummary) => void;
  onDeleted: (id: string) => void;
  notify: (toast: Toast) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<EssaySummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const normalizedTagQuery = tagQuery.trim().toLocaleLowerCase();
  const commonFilterTags = COMMON_TAGS.filter((tag) => tag.toLocaleLowerCase().includes(normalizedTagQuery));
  const personalFilterTags = uniqueTags(availableTags).filter((tag) =>
    !COMMON_TAGS.includes(tag) && tag.toLocaleLowerCase().includes(normalizedTagQuery),
  );

  useEffect(() => {
    if (!tagFilterOpen) return;
    const close = (event: MouseEvent) => {
      if (!tagFilterRef.current?.contains(event.target as Node)) setTagFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTagFilterOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [tagFilterOpen]);

  const toggleFilterTag = (tag: string) => {
    onTagsChange(selectedTags.includes(tag)
      ? selectedTags.filter((current) => current !== tag)
      : [...selectedTags, tag]);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await desktopApi.deleteEssay(pendingDelete.id);
      notify({ tone: 'success', title: '作文已删除', detail: pendingDelete.title });
      onDeleted(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      notify({ tone: 'error', title: '删除失败', detail: getErrorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="page catalog-page">
      <header className="page-heading">
        <div>
          <h1>一凡文库</h1>
          <p>所有作文、批改记录与定稿都保存在你的电脑上。</p>
        </div>
        <button type="button" className="button primary" onClick={onCreate}>
          <FilePlus2 /> 新建作文
        </button>
      </header>

      <div className="search-panel">
        <Search />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索题目、要求或正文关键词"
        />
        {loading ? <LoaderCircle className="spin" /> : <kbd>⌘ K</kbd>}
        <div className="tag-filter" ref={tagFilterRef}>
          <button type="button" className={`tag-filter-trigger ${selectedTags.length ? 'is-active' : ''}`} onClick={() => setTagFilterOpen((current) => !current)}>
            <Tag />标签{selectedTags.length ? <i>{selectedTags.length}</i> : null}<ChevronDown />
          </button>
          {tagFilterOpen ? (
            <div className="tag-filter-popover panel">
              <div className="tag-filter-search"><Search /><input value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder="搜索标签" /></div>
              <div className="tag-filter-options">
                {commonFilterTags.length ? <small>常用</small> : null}
                {commonFilterTags.length ? <div>{commonFilterTags.map((tag) => (
                  <button type="button" key={tag} className={selectedTags.includes(tag) ? 'is-selected' : ''} onClick={() => toggleFilterTag(tag)}>
                    {selectedTags.includes(tag) ? <Check /> : <Plus />}{tag}
                  </button>
                ))}</div> : null}
                {personalFilterTags.length ? <small>我的标签</small> : null}
                {personalFilterTags.length ? <div>{personalFilterTags.map((tag) => (
                  <button type="button" key={tag} className={selectedTags.includes(tag) ? 'is-selected' : ''} onClick={() => toggleFilterTag(tag)}>
                    {selectedTags.includes(tag) ? <Check /> : <Plus />}{tag}
                  </button>
                ))}</div> : null}
                {!commonFilterTags.length && !personalFilterTags.length ? <span>没有找到标签</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedTags.length ? (
        <div className="active-tag-filters">
          <span>同时包含</span>
          {selectedTags.map((tag) => <button type="button" key={tag} onClick={() => toggleFilterTag(tag)}>{tag}<X /></button>)}
          <button type="button" className="clear-tag-filters" onClick={() => onTagsChange([])}>清除</button>
        </div>
      ) : null}

      <div className="essay-table">
        <div className="essay-table-head">
          <span>作文</span>
          <span>版本</span>
          <span>状态</span>
          <span>更新时间</span>
          <span>模型交互</span>
          <span />
          <span />
        </div>
        {essays.length ? (
          essays.map((essay, index) => (
            <div
              className="essay-row"
              key={essay.id}
              role="link"
              tabIndex={0}
              onClick={() => onOpen(essay.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(essay.id);
              }}
            >
              <div className="essay-main">
                <i>{String(index + 1).padStart(2, '0')}</i>
                <div>
                  <strong>{essay.title}</strong>
                  <span>{essay.excerpt || essay.requirements}</span>
                  {essay.tags.length ? (
                    <div className="essay-tags">
                      {essay.tags.slice(0, 3).map((tag) => (
                        <button type="button" key={tag} onClick={(event) => { event.stopPropagation(); if (!selectedTags.includes(tag)) onTagsChange([...selectedTags, tag]); }}>{tag}</button>
                      ))}
                      {essay.tags.length > 3 ? <i>+{essay.tags.length - 3}</i> : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="table-meta">
                <FileStack /> {essay.currentVersion} 稿
              </div>
              <div className={`status-chip ${essay.status === '已定稿' ? 'is-final' : ''}`}>
                {essay.status === '已定稿' ? <CheckCircle2 /> : <CircleDot />}
                {essay.status}
              </div>
              <time>{formatDate(essay.updatedAt)}</time>
              <button
                type="button"
                className="row-conversations"
                onClick={(event) => {
                  event.stopPropagation();
                  onConversations(essay);
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <MessageSquareText /> 对话记录
              </button>
              <button
                type="button"
                className="row-delete"
                aria-label={`删除作文：${essay.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete(essay);
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Trash2 />
              </button>
              <ChevronRight className="row-arrow" />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Archive />
            <strong>{query || selectedTags.length ? '没有找到相关作文' : '本地文库还是空的'}</strong>
            <span>{query || selectedTags.length ? '调整关键词或标签条件试试。' : '新建第一篇作文，开始本地批改。'}</span>
          </div>
        )}
      </div>

      {pendingDelete ? (
        <div className="confirm-backdrop" role="presentation" onClick={() => { if (!deleting) setPendingDelete(null); }}>
          <div
            className="confirm-dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-essay-title"
            onClick={(event) => event.stopPropagation()}
          >
            <strong id="delete-essay-title">删除这篇作文？</strong>
            <p>「{pendingDelete.title}」的全部稿件、批改记录和定稿会从本地文库删除，无法恢复。</p>
            <div className="confirm-actions">
              <button type="button" className="button secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>
                取消
              </button>
              <button type="button" className="button danger" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? <LoaderCircle className="spin" /> : <Trash2 />} 删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function NewEssayScreen({
  canReview,
  availableTags,
  onSaved,
  onReview,
  onNeedSettings,
  notify,
}: {
  canReview: boolean;
  availableTags: string[];
  onSaved: () => void;
  onReview: (detail: EssayDetail) => void;
  onNeedSettings: () => void;
  notify: (toast: Toast) => void;
}) {
  const [essayId, setEssayId] = useState<string>();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [requirements, setRequirements] = useState('');
  const [reviewPrompt, setReviewPrompt] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState<'save' | 'review' | null>(null);

  const save = async () => {
    setBusy('save');
    try {
      const detail = await desktopApi.saveNewDraft({
        essayId,
        title,
        tags,
        requirements,
        reviewPrompt,
        content,
      });
      setEssayId(detail.metadata.id);
      notify({ tone: 'success', title: '草稿已保存到本地' });
      onSaved();
    } catch (error) {
      notify({ tone: 'error', title: '保存失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const review = async () => {
    if (!canReview) {
      notify({ tone: 'error', title: '请先配置模型和 API Key' });
      onNeedSettings();
      return;
    }
    setBusy('review');
    try {
      const saved = await desktopApi.saveNewDraft({
        essayId,
        title,
        tags,
        requirements,
        reviewPrompt,
        content,
      });
      setEssayId(saved.metadata.id);
      const reviewed = await desktopApi.reviewEssay({
        essayId: saved.metadata.id,
        title,
        content,
      });
      onReview(reviewed);
      notify({ tone: 'success', title: `第 ${reviewed.metadata.currentVersion} 版批改完成` });
    } catch (error) {
      notify({ tone: 'error', title: 'AI 批改失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="page compose-page">
      <header className="page-heading compact">
        <div>
          <h1>新建作文</h1>
          <p>输入题目、作文要求和这篇的批改提示词。草稿将保存为 Markdown 文件。</p>
        </div>
        <div className="word-count">{content.replace(/\s/g, '').length} 字</div>
      </header>

      <div className="compose-grid">
        <div className="prompt-panel panel">
          <label>
            <span>作文题目</span>
            <input disabled={Boolean(essayId)} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="输入作文题目" />
          </label>
          <label>
            <span>作文要求</span>
            <textarea
              disabled={Boolean(essayId)}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              placeholder="输入材料、写作要求或字数限制"
            />
          </label>
          <label>
            <span>这篇的批改提示词</span>
            <textarea
              disabled={Boolean(essayId)}
              value={reviewPrompt}
              onChange={(event) => setReviewPrompt(event.target.value)}
              placeholder="只对这篇作文生效。例如：重点改细节，保留原来的立意"
            />
          </label>
          <div className="compose-tag-field">
            <span>作文标签</span>
            <TagEditor tags={tags} recentTags={availableTags} onChange={setTags} />
          </div>
          <div className="privacy-note">
            <ShieldCheck />
            <span>作文文件保存在本地。点击 AI 批改时，会连同写作要求、本篇批改提示词、当前正文和此前修改历程一起发送。</span>
          </div>
        </div>

        <div className="editor-panel panel">
          <div className="panel-head">
            <div>
              <strong>作文正文</strong>
            </div>
          </div>
          <textarea
            className="essay-editor"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="在这里输入作文正文……"
          />
          <div className="editor-actions">
            <button
              type="button"
              className="button secondary"
              disabled={Boolean(busy) || !title.trim() || !content.trim()}
              onClick={save}
            >
              {busy === 'save' ? <LoaderCircle className="spin" /> : <Save />}
              保存草稿
            </button>
            <button
              type="button"
              className="button primary"
              disabled={Boolean(busy) || !title.trim() || !content.trim()}
              onClick={review}
            >
              {busy === 'review' ? <LoaderCircle className="spin" /> : <WandSparkles />}
              {busy === 'review' ? 'AI 正在批改' : 'AI 开始批改'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewScreen({
  initial,
  availableTags,
  onBack,
  onTagsChanged,
  notify,
}: {
  initial: EssayDetail;
  availableTags: string[];
  onBack: () => void;
  onTagsChanged: () => void;
  notify: (toast: Toast) => void;
}) {
  const [detail, setDetail] = useState(initial);
  const [content, setContent] = useState(initial.content);
  const [suggestions, setSuggestions] = useState(initial.suggestions);
  const [view, setView] = useState<ReviewView>(
    initial.metadata.status === '已定稿' ? 'preview' : 'annotated',
  );
  const [activeId, setActiveId] = useState(initial.suggestions[0]?.id ?? '');
  const [saved, setSaved] = useState(true);
  const [versions, setVersions] = useState<EssayVersionSummary[]>([]);
  const [viewedVersion, setViewedVersion] = useState<EssayVersionDetail | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedOccurrence, setSelectedOccurrence] = useState(0);
  const [localInstruction, setLocalInstruction] = useState('');
  const [newSuggestionId, setNewSuggestionId] = useState('');
  const [expandedResolved, setExpandedResolved] = useState<Set<string>>(() => new Set());
  const [versionsCollapsed, setVersionsCollapsed] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState(initial.metadata.tags);
  const [savingTags, setSavingTags] = useState(false);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'save' | 'review' | 'final' | 'local' | 'new-version' | 'restore' | 'version' | null>(null);
  const isFinal = detail.metadata.status === '已定稿';
  const requirements = detail.metadata.requirements;
  const reviewPrompt = detail.metadata.reviewPrompt ?? '';
  const isViewingHistory = Boolean(viewedVersion && !viewedVersion.isCurrent);
  const visibleContent = isViewingHistory ? viewedVersion!.content : content;
  const visibleSuggestions = isViewingHistory ? viewedVersion!.suggestions : suggestions;

  const refreshVersions = useCallback(async () => {
    try {
      setVersions(await desktopApi.listEssayVersions(detail.metadata.id));
    } catch (error) {
      notify({ tone: 'error', title: '版本列表加载失败', detail: getErrorMessage(error) });
    }
  }, [detail.metadata.id, notify]);

  useEffect(() => {
    void refreshVersions();
  }, [detail.metadata.currentVersion, refreshVersions]);

  const saveTags = async () => {
    setSavingTags(true);
    try {
      const updated = await desktopApi.updateEssayTags(detail.metadata.id, draftTags);
      setDetail(updated);
      setDraftTags(updated.metadata.tags);
      setEditingTags(false);
      onTagsChanged();
      notify({ tone: 'success', title: '标签已更新' });
    } catch (error) {
      notify({ tone: 'error', title: '标签保存失败', detail: getErrorMessage(error) });
    } finally {
      setSavingTags(false);
    }
  };

  useEffect(() => {
    if (!newSuggestionId) return;
    suggestionListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = window.setTimeout(() => setNewSuggestionId(''), 1600);
    return () => window.clearTimeout(timer);
  }, [newSuggestionId]);

  const counts = useMemo(
    () => ({
      accepted: visibleSuggestions.filter((item) => item.status === 'accepted').length,
      ignored: visibleSuggestions.filter((item) => item.status === 'ignored').length,
      pending: visibleSuggestions.filter((item) => item.status === 'pending').length,
    }),
    [visibleSuggestions],
  );

  const updateSuggestion = (id: string, nextStatus: 'accepted' | 'ignored') => {
    if (isFinal) return;
    const suggestion = suggestions.find((item) => item.id === id);
    if (!suggestion) return;

    setContent((current) => {
      if (nextStatus === 'accepted') {
        return replaceOccurrence(current, suggestion.original, suggestion.replacement, suggestion.occurrence);
      }
      if (suggestion.status === 'accepted') {
        return replaceOccurrence(current, suggestion.replacement, suggestion.original, suggestion.occurrence);
      }
      return current;
    });
    setSuggestions((current) =>
      current.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
    );
    setActiveId(id);
    setExpandedResolved((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setSaved(false);
  };

  const acceptAll = () => {
    if (isFinal) return;
    setContent((current) =>
      suggestions.reduce(
        (next, suggestion) =>
          suggestion.status === 'accepted'
            ? next
            : replaceOccurrence(next, suggestion.original, suggestion.replacement, suggestion.occurrence),
        current,
      ),
    );
    setSuggestions((current) => current.map((item) => ({ ...item, status: 'accepted' })));
    setExpandedResolved(new Set());
    setSaved(false);
  };

  const ignoreAll = () => {
    if (isFinal) return;
    setContent((current) =>
      suggestions.reduce(
        (next, suggestion) =>
          suggestion.status === 'accepted'
            ? replaceOccurrence(next, suggestion.replacement, suggestion.original, suggestion.occurrence)
            : next,
        current,
      ),
    );
    setSuggestions((current) => current.map((item) => ({ ...item, status: 'ignored' })));
    setExpandedResolved(new Set());
    setSaved(false);
  };

  const toggleResolvedSuggestion = (id: string) => {
    setExpandedResolved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const captureSelection = (container: HTMLElement) => {
    if (isFinal || isViewingHistory) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const next = selection.toString().trim();
    if (!next || !content.includes(next)) return;
    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(container);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    const occurrence = countOccurrences(prefixRange.toString(), next);
    setSelectedText(next);
    setSelectedOccurrence(occurrence);
  };

  const requestLocalEdit = async () => {
    if (!selectedText || !localInstruction.trim() || isFinal || isViewingHistory) return;
    setBusy('local');
    try {
      const suggestion = await desktopApi.requestLocalEdit({
        essayId: detail.metadata.id,
        version: detail.metadata.currentVersion,
        content,
        selectedText,
        occurrence: selectedOccurrence,
        instruction: localInstruction,
      });
      setSuggestions((current) => [suggestion, ...current]);
      setActiveId(suggestion.id);
      setNewSuggestionId(suggestion.id);
      setLocalInstruction('');
      setSelectedText('');
      setSelectedOccurrence(0);
      setSaved(false);
      notify({ tone: 'success', title: '局部修改方案已生成', detail: '接受或忽略后保存草稿，不会增加版本号。' });
    } catch (error) {
      notify({ tone: 'error', title: '局部修改失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const openVersion = async (version: EssayVersionSummary) => {
    if (version.isCurrent) {
      setViewedVersion(null);
      return;
    }
    setBusy('version');
    try {
      const loaded = await desktopApi.loadEssayVersion(detail.metadata.id, version.version);
      setViewedVersion(loaded);
      setActiveId(loaded.suggestions[0]?.id ?? '');
      setView('annotated');
    } catch (error) {
      notify({ tone: 'error', title: '历史版本加载失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const persist = async () => {
    setBusy('save');
    try {
      const savedDetail = await desktopApi.saveRevision({
        essayId: detail.metadata.id,
        version: detail.metadata.currentVersion,
        content,
        suggestions,
      });
      setDetail(savedDetail);
      setSaved(true);
      await refreshVersions();
      notify({ tone: 'success', title: `第 ${savedDetail.metadata.currentVersion} 版草稿已保存` });
    } catch (error) {
      notify({ tone: 'error', title: '保存失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const saveAsNewVersion = async () => {
    if (isFinal || isViewingHistory) return;
    setBusy('new-version');
    try {
      const next = await desktopApi.saveAsNewVersion({
        essayId: detail.metadata.id,
        version: detail.metadata.currentVersion,
        content,
        suggestions,
      });
      setDetail(next);
      setContent(next.content);
      setSuggestions(next.suggestions);
      setActiveId('');
      setViewedVersion(null);
      setSaved(true);
      await refreshVersions();
      notify({ tone: 'success', title: `已保存为第 ${next.metadata.currentVersion} 版` });
    } catch (error) {
      notify({ tone: 'error', title: '保存新版失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const restoreViewedVersion = async () => {
    if (!viewedVersion || viewedVersion.isCurrent) return;
    if (!saved) {
      notify({ tone: 'error', title: '请先保存当前修改', detail: '保存后再恢复历史版本，避免当前工作稿丢失。' });
      return;
    }
    setBusy('restore');
    try {
      const restored = await desktopApi.restoreEssayVersion(detail.metadata.id, viewedVersion.version);
      setDetail(restored);
      setContent(restored.content);
      setSuggestions(restored.suggestions);
      setActiveId('');
      setViewedVersion(null);
      setSaved(true);
      await refreshVersions();
      notify({ tone: 'success', title: `已从第 ${viewedVersion.version} 版恢复为第 ${restored.metadata.currentVersion} 版`, detail: '原有版本没有被覆盖。' });
    } catch (error) {
      notify({ tone: 'error', title: '恢复版本失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const continueReview = async () => {
    if (!saved || isFinal) return;
    setBusy('review');
    try {
      const reviewed = await desktopApi.reviewEssay({
        essayId: detail.metadata.id,
        title: detail.metadata.title,
        content,
      });
      setDetail(reviewed);
      setContent(reviewed.content);
      setSuggestions(reviewed.suggestions);
      setActiveId(reviewed.suggestions[0]?.id ?? '');
      setViewedVersion(null);
      setSaved(false);
      setView('annotated');
      await refreshVersions();
      notify({ tone: 'success', title: `第 ${reviewed.metadata.currentVersion} 版批改完成` });
    } catch (error) {
      notify({ tone: 'error', title: '继续批改失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const finalize = async () => {
    setBusy('final');
    try {
      const finalDetail = await desktopApi.finalizeEssay({
        essayId: detail.metadata.id,
        version: detail.metadata.currentVersion,
        content,
        suggestions,
      });
      setDetail(finalDetail);
      setSaved(true);
      setViewedVersion(null);
      setView('preview');
      await refreshVersions();
      notify({ tone: 'success', title: '作文已定稿并保存为 final.md' });
    } catch (error) {
      notify({ tone: 'error', title: '定稿失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="review-page">
      <header className="detail-toolbar review-toolbar">
        <button type="button" className="detail-back" onClick={onBack}>
          <ChevronRight /> 返回
        </button>
        <div className="mode-row">
          <div className="mode-switch">
            <button type="button" className={view === 'annotated' ? 'is-active' : ''} onClick={() => setView('annotated')}>
              <ListChecks /> 原文标记
            </button>
            <button type="button" className={view === 'preview' ? 'is-active' : ''} onClick={() => setView('preview')}>
              <Sparkles /> 修改预览
            </button>
          </div>
        </div>
      </header>

      <div className="review-workspace">
        <aside className={`version-rail ${versionsCollapsed ? 'versions-collapsed' : ''}`}>
          <div className="review-side-controls">
          <div className="side-essay-title">
            <span>作文题目</span>
            <strong>{detail.metadata.title}</strong>
          </div>
          <div className="side-tag-field">
            <div className="side-field-heading">
              <span>作文标签</span>
              {!editingTags ? <button type="button" onClick={() => { setDraftTags(detail.metadata.tags); setEditingTags(true); }}>编辑</button> : null}
            </div>
            {editingTags ? (
              <>
                <TagEditor tags={draftTags} recentTags={availableTags} onChange={setDraftTags} />
                <div className="side-tag-actions">
                  <button type="button" disabled={savingTags} onClick={() => { setDraftTags(detail.metadata.tags); setEditingTags(false); }}>取消</button>
                  <button type="button" className="is-primary" disabled={savingTags} onClick={() => void saveTags()}>{savingTags ? <LoaderCircle className="spin" /> : <Check />}保存</button>
                </div>
              </>
            ) : (
              <div className="readonly-tags">
                {detail.metadata.tags.map((tag) => <span key={tag}>{tag}</span>)}
                {!detail.metadata.tags.length ? <em>未添加</em> : null}
              </div>
            )}
          </div>
          <div className="side-readonly-field">
            <span>作文要求</span>
            <p>{requirements.trim() || '未填写'}</p>
          </div>
          {reviewPrompt.trim() ? (
            <div className="side-readonly-field">
              <span>这篇的批改提示词</span>
              <p>{reviewPrompt}</p>
            </div>
          ) : null}
          </div>
          <div className={`version-section ${versionsCollapsed ? 'is-collapsed' : ''}`}>
          <button type="button" className="version-section-toggle" onClick={() => setVersionsCollapsed((current) => !current)}>
            <div><strong>版本列表</strong><span>{versions.length || detail.metadata.currentVersion} 个正式版本</span></div>
            {versionsCollapsed ? <ChevronDown /> : <ChevronUp />}
          </button>
          {!versionsCollapsed ? (
            <>
              {isViewingHistory ? (
                <div className="version-viewing-note"><CircleDot />正在查看第 {viewedVersion!.version} 版 · 只读</div>
              ) : null}
              <div className="version-list">
                {versions.map((version) => {
                  const selected = isViewingHistory
                    ? viewedVersion?.version === version.version
                    : version.isCurrent;
                  return (
                    <button
                      type="button"
                      key={version.version}
                      className={`version-node ${version.isCurrent ? 'is-live' : 'is-done'} ${selected ? 'is-selected' : ''}`}
                      disabled={busy === 'version'}
                      onClick={() => void openVersion(version)}
                    >
                      <i>{String(version.version).padStart(2, '0')}</i>
                      <div>
                        <strong>{version.label}</strong>
                        <span>{version.isCurrent && !saved ? '有未保存修改' : formatDate(version.createdAt)}</span>
                      </div>
                      {selected ? <CircleDot /> : <ChevronRight />}
                    </button>
                  );
                })}
                {!versions.length && <LoaderCircle className="version-loader spin" />}
              </div>
              <div className="version-next">
                <div className="version-line dashed" />
                <div className="version-node is-future">
                  <i>{String(detail.metadata.currentVersion + 1).padStart(2, '0')}</i>
                  <div><strong>下一版本</strong><span>全篇批改或保存新版</span></div>
                  <Plus />
                </div>
              </div>
            </>
          ) : null}
          </div>
        </aside>

        <div className="review-main">
          <div className={`review-grid mode-${view}`}>
          <div className="paper panel">
            <div className="panel-head">
              <div>
                <strong>
                  {isViewingHistory
                    ? `第 ${viewedVersion!.version} 版正文 · 只读`
                    : view === 'annotated' ? '原文标记 · 可直接编辑' : '当前草稿预览'}
                </strong>
              </div>
            </div>
            {view === 'annotated' ? (
              <div
                className={`annotated-editor ${isFinal || isViewingHistory ? 'is-locked' : ''}`}
                contentEditable={!isFinal && !isViewingHistory}
                suppressContentEditableWarning
                spellCheck={false}
                onMouseUp={(event) => captureSelection(event.currentTarget)}
                onBlur={(event) => {
                  if (isViewingHistory) return;
                  if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
                  const next = event.currentTarget.innerText.replace(/\n{3,}/g, '\n\n').trim();
                  if (next && next !== content) {
                    setContent(next);
                    setSaved(false);
                  }
                }}
              >
                <AnnotatedArticle content={visibleContent} suggestions={visibleSuggestions} activeId={activeId} onSelect={setActiveId} />
              </div>
            ) : (
              <article className="essay-copy preview-copy">
                {visibleContent.split(/\n\s*\n/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)}
              </article>
            )}
          </div>

          {view === 'annotated' ? (
            <aside className="suggestions panel">
              <div className="suggestion-heading">
                <div><strong>{isViewingHistory ? `第 ${viewedVersion!.version} 版修改建议` : '逐条处理修改建议'}</strong></div>
                <b>{counts.pending}</b>
              </div>
              {!isViewingHistory && !isFinal ? (
                <div className="local-edit-box">
                  <div className="local-edit-title"><MessageSquareText /><strong>局部 AI 修改</strong></div>
                  <div className="local-edit-controls">
                    <div
                      className={`selected-quote ${selectedText ? 'has-selection' : ''}`}
                      title={selectedText || '先在左侧正文中选中一句或一段文字'}
                    >
                      {selectedText || '先在左侧正文中选中一句或一段文字'}
                    </div>
                    <button
                      type="button"
                      className="button local-edit-submit"
                      disabled={!selectedText || !localInstruction.trim() || Boolean(busy)}
                      onClick={() => void requestLocalEdit()}
                    >
                      {busy === 'local' ? <LoaderCircle className="spin" /> : <Sparkles />}
                      {busy === 'local' ? '生成中' : '生成修改'}
                    </button>
                  </div>
                  <textarea
                    value={localInstruction}
                    onChange={(event) => setLocalInstruction(event.target.value)}
                    placeholder="例如：这一段描写不够细致，增加动作和环境描写，不改变原意"
                  />
                </div>
              ) : null}
              <div className="suggestion-list" ref={suggestionListRef}>
                {visibleSuggestions.length ? visibleSuggestions.map((suggestion, index) => {
                  const resolved = suggestion.status !== 'pending';
                  const expanded = !resolved || expandedResolved.has(suggestion.id);
                  return (
                    <article key={suggestion.id} className={`suggestion-card is-${suggestion.status} ${activeId === suggestion.id ? 'is-active' : ''} ${newSuggestionId === suggestion.id ? 'is-new' : ''} ${expanded ? '' : 'is-collapsed'}`}>
                      <div className={`suggestion-toolbar ${isViewingHistory ? 'is-readonly' : ''}`}>
                        <i className="suggestion-index">{String(index + 1).padStart(2, '0')}</i>
                        <button type="button" className="suggestion-meta-compact" onClick={() => setActiveId(suggestion.id)}>
                          <span>{suggestion.kind}</span><em>{suggestion.location}</em>
                        </button>
                        {!isViewingHistory ? (
                          <div className="suggestion-icon-actions">
                            <button
                              type="button"
                              className={`suggestion-action accept-action ${suggestion.status === 'accepted' ? 'is-selected' : ''}`}
                              disabled={isFinal}
                              onClick={() => updateSuggestion(suggestion.id, 'accepted')}
                              aria-label="接受建议"
                              title="接受建议"
                            >
                              <Check />
                            </button>
                            <button
                              type="button"
                              className={`suggestion-action ignore-action ${suggestion.status === 'ignored' ? 'is-selected' : ''}`}
                              disabled={isFinal}
                              onClick={() => updateSuggestion(suggestion.id, 'ignored')}
                              aria-label="忽略建议"
                              title="忽略建议"
                            >
                              <X />
                            </button>
                          </div>
                        ) : (
                          <div className="suggestion-readonly-actions">
                            <span className={`suggestion-state is-${suggestion.status}`} title={suggestion.status === 'accepted' ? '已接受' : suggestion.status === 'ignored' ? '已忽略' : '待处理'}>
                              {suggestion.status === 'accepted' ? <Check /> : suggestion.status === 'ignored' ? <X /> : <CircleDot />}
                            </span>
                            {resolved ? (
                              <button type="button" className="suggestion-expand-icon" onClick={() => toggleResolvedSuggestion(suggestion.id)} aria-label={expanded ? '收起建议' : '展开建议'}>
                                {expanded ? <ChevronUp /> : <ChevronDown />}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {expanded ? (
                        <div className="suggestion-detail">
                          <del>{suggestion.original}</del>
                          <div className="replacement"><ChevronRight /><span>{suggestion.replacement}</span></div>
                          <p>{suggestion.reason}</p>
                          {resolved ? (
                            <button type="button" className="collapse-suggestion" onClick={() => toggleResolvedSuggestion(suggestion.id)}>
                              <ChevronUp /> 收起当前建议
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <button type="button" className="collapsed-suggestion" onClick={() => toggleResolvedSuggestion(suggestion.id)}>
                          <span>{suggestion.status === 'accepted' ? '已应用：' : '已忽略：'}</span>
                          <strong>{suggestion.status === 'accepted' ? suggestion.replacement : suggestion.original}</strong>
                          <ChevronDown />
                        </button>
                      )}
                    </article>
                  );
                }) : (
                  <div className="suggestion-empty">
                    <Sparkles /><strong>当前没有修改建议</strong><span>{isViewingHistory ? '这个版本没有保存修改建议。' : '可以选中文字进行局部修改，或进行全篇 AI 批改。'}</span>
                  </div>
                )}
              </div>
            </aside>
          ) : null}
          </div>
          <div className={`review-bottom-actions ${isViewingHistory ? 'is-history' : ''}`}>
          {isViewingHistory ? (
            <>
              <button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => setViewedVersion(null)}>
                <ChevronRight /> 返回当前版本
              </button>
              <button type="button" className="button primary" disabled={Boolean(busy) || !saved} onClick={() => void restoreViewedVersion()} title={!saved ? '请先保存当前工作稿' : undefined}>
                {busy === 'restore' ? <LoaderCircle className="spin" /> : <RotateCcw />} 恢复为新版本
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button ghost danger" disabled={!suggestions.length || isFinal || Boolean(busy)} onClick={ignoreAll}>
                <X /> 忽略全部
              </button>
              <button type="button" className="button secondary" disabled={!suggestions.length || isFinal || Boolean(busy)} onClick={acceptAll}>
                <Check /> 接受全部
              </button>
              <button type="button" className="button secondary" disabled={isFinal || Boolean(busy)} onClick={persist}>
                {busy === 'save' ? <LoaderCircle className="spin" /> : <Save />} 保存草稿
              </button>
              <button type="button" className="button secondary" disabled={isFinal || Boolean(busy)} onClick={() => void saveAsNewVersion()}>
                {busy === 'new-version' ? <LoaderCircle className="spin" /> : <FilePlus2 />} 保存新版
              </button>
              <button type="button" className="button primary" disabled={!saved || isFinal || Boolean(busy)} onClick={continueReview}>
                {busy === 'review' ? <LoaderCircle className="spin" /> : <WandSparkles />}
                {suggestions.length ? '继续 AI' : '开始 AI'}
              </button>
              <button type="button" className="button finalize" disabled={!saved || isFinal || Boolean(busy)} onClick={finalize}>
                {busy === 'final' ? <LoaderCircle className="spin" /> : <ShieldCheck />}
                {isFinal ? '已定稿' : '定稿'}
              </button>
            </>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConversationScreen({
  essay,
  onBack,
  notify,
}: {
  essay: EssaySummary;
  onBack: () => void;
  notify: (toast: Toast) => void;
}) {
  const [entries, setEntries] = useState<ModelConversationEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ModelConversationEntry | 'all' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await desktopApi.listModelConversations(essay.id);
      setEntries(loaded);
    } catch (error) {
      notify({ tone: 'error', title: '对话记录读取失败', detail: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [essay.id, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected && selectedId) setSelectedId('');
  }, [selected, selectedId]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete === 'all') {
        await desktopApi.clearModelConversations(essay.id);
        setEntries([]);
        setSelectedId('');
        notify({ tone: 'success', title: '本篇对话记录已清空' });
      } else {
        await desktopApi.deleteModelConversation(essay.id, pendingDelete.id);
        setEntries((current) => current.filter((entry) => entry.id !== pendingDelete.id));
        if (selectedId === pendingDelete.id) setSelectedId('');
        notify({ tone: 'success', title: '对话记录已删除' });
      }
      setPendingDelete(null);
    } catch (error) {
      notify({ tone: 'error', title: '删除失败', detail: getErrorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="page conversation-page">
      <header className="detail-toolbar conversation-toolbar">
        <button type="button" className="detail-back" onClick={onBack}>
          <ChevronRight /> 返回
        </button>
        <div className="conversation-toolbar-actions">
          <button type="button" className="button danger" disabled={loading || !entries.length} onClick={() => setPendingDelete('all')}>
            <Trash2 /> 清空本篇
          </button>
          <button type="button" className="button secondary" disabled={loading} onClick={() => void refresh()}>
            {loading ? <LoaderCircle className="spin" /> : <RefreshCw />} 刷新记录
          </button>
        </div>
      </header>

      <div className="conversation-grid">
        <aside className="conversation-list panel">
          {loading ? (
            <div className="conversation-empty"><LoaderCircle className="spin" /><span>正在读取记录</span></div>
          ) : entries.length ? (
            entries.map((entry) => (
              <div key={entry.id} className={`conversation-list-item ${selected?.id === entry.id ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="conversation-select"
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="conversation-list-title">
                    <span>{entry.kind}</span>
                    <i className={entry.error ? 'is-error' : 'is-success'}>{entry.error ? '请求失败' : '已返回'}</i>
                  </div>
                  <strong>{entry.version ? `第 ${entry.version} 版` : entry.kind}</strong>
                  <small>{entry.version ? `第 ${entry.version} 版 · ` : ''}{formatDate(entry.createdAt)}</small>
                  <em>{entry.model}</em>
                </button>
                <button
                  type="button"
                  className="conversation-delete"
                  aria-label={`删除 ${formatDate(entry.createdAt)} 的对话记录`}
                  onClick={() => setPendingDelete(entry)}
                >
                  <Trash2 />
                </button>
              </div>
            ))
          ) : (
            <div className="conversation-empty"><SquareTerminal /><strong>这篇作文还没有对话记录</strong><span>完成一次全篇批改或局部修改后会显示在这里。</span></div>
          )}
        </aside>

        <section className="conversation-detail panel">
          {selected ? (
            <>
              <div className="conversation-meta">
                <div><span>类型</span><strong>{selected.kind}</strong></div>
                <div><span>模型</span><strong>{selected.model}</strong></div>
                <div><span>服务商</span><strong>{selected.providerName || '未命名'}</strong></div>
                <div><span>时间</span><strong>{formatDate(selected.createdAt)}</strong></div>
                <div className="conversation-endpoint"><span>实际接口</span><strong>{selected.endpoint}</strong></div>
              </div>
              <div className="conversation-messages">
                <article className="conversation-message system-message">
                  <header><Server /><strong>System</strong><span>实际发送的系统提示词</span></header>
                  <pre>{selected.systemPrompt}</pre>
                </article>
                <article className="conversation-message user-message">
                  <header><UserRound /><strong>User</strong><span>实际发送的用户消息</span></header>
                  <pre>{selected.userPrompt}</pre>
                </article>
                <article className={`conversation-message assistant-message ${selected.error ? 'has-error' : ''}`}>
                  <header><Bot /><strong>{selected.error ? 'Error' : 'Assistant'}</strong><span>{selected.error ? '模型请求失败信息' : '模型原始回复'}</span></header>
                  <pre>{selected.error || selected.assistantResponse || '模型没有返回内容'}</pre>
                </article>
              </div>
            </>
          ) : (
            <div className="conversation-empty"><SquareTerminal /><strong>选择一条记录查看详情</strong></div>
          )}
        </section>
      </div>

      {pendingDelete ? (
        <div className="confirm-backdrop" role="presentation" onClick={() => { if (!deleting) setPendingDelete(null); }}>
          <div
            className="confirm-dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <strong id="delete-conversation-title">{pendingDelete === 'all' ? '清空本篇对话记录？' : '删除这条对话记录？'}</strong>
            <p>
              {pendingDelete === 'all'
                ? `将删除「${essay.title}」保存的全部真实模型请求与回复。`
                : '将删除这次真实模型请求与回复。'}
              作文正文、版本和用于后续批改的修改历程不会受影响。
            </p>
            <div className="confirm-actions">
              <button type="button" className="button secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>
                取消
              </button>
              <button type="button" className="button danger" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? <LoaderCircle className="spin" /> : <Trash2 />} {pendingDelete === 'all' ? '清空' : '删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SettingsScreen({
  initial,
  theme,
  onThemeChange,
  onSaved,
  notify,
}: {
  initial: SettingsView;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onSaved: (settings: SettingsView) => void;
  notify: (toast: Toast) => void;
}) {
  const [form, setForm] = useState<SettingsInput>({ ...initial, apiKey: '' });
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);

  useEffect(() => setForm({ ...initial, apiKey: '' }), [initial]);

  const update = (key: keyof SettingsInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const chooseFolder = async () => {
    const selected = await desktopApi.chooseLibraryFolder();
    if (selected) update('libraryPath', selected);
  };

  const save = async () => {
    setBusy('save');
    try {
      const settings = await desktopApi.saveSettings(form);
      onSaved(settings);
      setForm({ ...settings, apiKey: '' });
      notify({ tone: 'success', title: '设置已保存', detail: 'API Key 已和其他模型设置一起保存在本机。' });
    } catch (error) {
      notify({ tone: 'error', title: '保存设置失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    try {
      const response = await desktopApi.testModel(form);
      notify({ tone: 'success', title: '模型连接成功', detail: response });
    } catch (error) {
      notify({ tone: 'error', title: '连接测试失败', detail: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="page settings-page">
      <header className="page-heading">
        <div>
          <h1>设置</h1>
          <p>模型配置保存在本机设置文件中，不会写入作文文件。</p>
        </div>
        <div className={`key-state ${initial.hasApiKey ? 'is-ready' : ''}`}>
          <i /> {initial.hasApiKey ? '密钥已配置' : '密钥未配置'}
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-panel appearance-settings panel">
          <div className="section-title"><strong>界面外观</strong></div>
          <div className="theme-options" aria-label="界面外观">
            <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => onThemeChange('light')}>
              <Sun /> 白天模式
            </button>
            <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => onThemeChange('dark')}>
              <Moon /> 黑夜模式
            </button>
          </div>
        </div>
        <div className="settings-panel panel">
          <div className="section-title"><strong>大模型接口</strong></div>
          <div className="form-grid two-columns">
            <label><span>服务商名称</span><input value={form.providerName} onChange={(event) => update('providerName', event.target.value)} /></label>
            <label><span>模型名称</span><input value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="例如 gpt-5-mini" /></label>
          </div>
          <label>
            <span>API Base URL</span>
            <input value={form.apiBaseUrl} onChange={(event) => update('apiBaseUrl', event.target.value)} placeholder="https://服务商地址/v1" />
            <small className="field-note">第三方模型请填写服务商给出的地址。只改模型名称和密钥、地址仍是 https://api.openai.com/v1 时，请求会发给 OpenAI。</small>
          </label>
          <label>
            <span>API Key</span>
            <input type="password" value={form.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={initial.hasApiKey ? '************（留空不修改）' : '输入 API Key'} />
          </label>
          <div className="settings-actions">
            <button type="button" className="button secondary" disabled={Boolean(busy)} onClick={test}>
              {busy === 'test' ? <LoaderCircle className="spin" /> : <TestTube2 />} 测试连接
            </button>
          </div>
        </div>

        <div className="settings-panel panel">
          <div className="section-title"><strong>本地作文目录</strong></div>
          <label>
            <span>资料库位置</span>
            <div className="folder-input">
              <input value={form.libraryPath} onChange={(event) => update('libraryPath', event.target.value)} />
              <button type="button" onClick={chooseFolder}><FolderOpen /> 选择</button>
            </div>
          </label>
          <div className="storage-example">
            <Database />
            <span>每篇作文独立保存提示词、草稿、批改记录、完整修改历程和最终定稿。</span>
          </div>
        </div>

        <div className="settings-panel prompt-settings panel">
          <div className="section-title"><strong>作文批改提示词</strong></div>
          <label>
            <span>系统提示词</span>
            <textarea value={form.reviewPrompt} onChange={(event) => update('reviewPrompt', event.target.value)} />
            <small className="field-note">所有作文共用这些输出规则。每篇作文还可以单独写批改提示词，批改时会一起提交。</small>
          </label>
        </div>
      </div>

      <footer className="settings-footer">
        <button type="button" className="button primary" disabled={Boolean(busy)} onClick={save}>
          {busy === 'save' ? <LoaderCircle className="spin" /> : <Save />} 保存全部设置
        </button>
      </footer>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [essays, setEssays] = useState<EssaySummary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeEssay, setActiveEssay] = useState<EssayDetail | null>(null);
  const [conversationEssay, setConversationEssay] = useState<EssaySummary | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('yifan-sidebar-collapsed') === 'true',
  );
  const [theme, setTheme] = useState<ThemeMode>(
    () => window.localStorage.getItem('yifan-theme') === 'light' ? 'light' : 'dark',
  );

  const notify = useCallback((next: Toast) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const refreshEssays = useCallback(async (nextQuery: string, nextTags: string[]) => {
    setLoading(true);
    try {
      setEssays(await desktopApi.listEssays(nextQuery, nextTags));
    } catch (error) {
      notify({ tone: 'error', title: '无法读取本地文库', detail: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const refreshTags = useCallback(async () => {
    try {
      setAvailableTags(await desktopApi.listEssayTags());
    } catch (error) {
      notify({ tone: 'error', title: '标签读取失败', detail: getErrorMessage(error) });
    }
  }, [notify]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const loaded = await desktopApi.loadSettings();
        setSettings(loaded);
        const [loadedEssays, loadedTags] = await Promise.all([
          desktopApi.listEssays('', []),
          desktopApi.listEssayTags(),
        ]);
        setEssays(loadedEssays);
        setAvailableTags(loadedTags);
      } catch (error) {
        notify({ tone: 'error', title: '应用初始化失败', detail: getErrorMessage(error) });
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [notify]);

  useEffect(() => {
    if (!settings) return;
    const timeout = window.setTimeout(() => void refreshEssays(query, selectedTags), 180);
    return () => window.clearTimeout(timeout);
  }, [query, selectedTags, refreshEssays, settings]);

  const navigate = (next: Screen) => {
    if (next !== 'review') setActiveEssay(null);
    if (next !== 'conversations') setConversationEssay(null);
    setScreen(next);
    if (next === 'library') void refreshEssays(query, selectedTags);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('yifan-sidebar-collapsed', String(next));
      return next;
    });
  };

  const changeTheme = (next: ThemeMode) => {
    setTheme(next);
    window.localStorage.setItem('yifan-theme', next);
  };

  const openEssay = async (essayId: string) => {
    setLoading(true);
    try {
      const detail = await desktopApi.loadEssay(essayId);
      setActiveEssay(detail);
      setScreen('review');
    } catch (error) {
      notify({ tone: 'error', title: '无法打开作文', detail: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return <div className="boot-screen"><LoaderCircle className="spin" /><span>正在打开本地文库…</span></div>;
  }

  return (
    <main className={`app-shell theme-${theme} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="ambient-grid" />
      <Sidebar
        screen={screen}
        settings={settings}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onNavigate={navigate}
      />
      <div className="content-shell">
        {screen === 'library' ? (
          <LibraryScreen
            essays={essays}
            availableTags={availableTags}
            selectedTags={selectedTags}
            query={query}
            loading={loading}
            onQueryChange={setQuery}
            onTagsChange={setSelectedTags}
            onCreate={() => setScreen('new')}
            onOpen={(id) => void openEssay(id)}
            onConversations={(essay) => {
              setConversationEssay(essay);
              setScreen('conversations');
            }}
            notify={notify}
            onDeleted={(id) => {
              if (activeEssay?.metadata.id === id) setActiveEssay(null);
              void refreshEssays(query, selectedTags);
              void refreshTags();
            }}
          />
        ) : null}
        {screen === 'new' ? (
          <NewEssayScreen
            canReview={settings.hasApiKey}
            availableTags={availableTags}
            onSaved={() => { void refreshEssays(query, selectedTags); void refreshTags(); }}
            onReview={(detail) => { setActiveEssay(detail); setScreen('review'); }}
            onNeedSettings={() => setScreen('settings')}
            notify={notify}
          />
        ) : null}
        {screen === 'review' && activeEssay ? (
          <ReviewScreen
            initial={activeEssay}
            availableTags={availableTags}
            onBack={() => navigate('library')}
            onTagsChanged={() => { void refreshEssays(query, selectedTags); void refreshTags(); }}
            notify={notify}
          />
        ) : null}
        {screen === 'settings' ? (
          <SettingsScreen
            initial={settings}
            theme={theme}
            onThemeChange={changeTheme}
            onSaved={(next) => { setSettings(next); void refreshEssays(query, selectedTags); void refreshTags(); }}
            notify={notify}
          />
        ) : null}
        {screen === 'conversations' && conversationEssay ? (
          <ConversationScreen
            essay={conversationEssay}
            onBack={() => navigate('library')}
            notify={notify}
          />
        ) : null}
      </div>

      {toast ? (
        <output className={`toast is-${toast.tone}`}>
          {toast.tone === 'success' ? <CheckCircle2 /> : <X />}
          <div><strong>{toast.title}</strong>{toast.detail ? <span>{toast.detail}</span> : null}</div>
        </output>
      ) : null}
    </main>
  );
}
