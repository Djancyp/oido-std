'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Send, Square, User, Bot, Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import TopBar from './topbar';
import { useAgents } from '@/contexts/Agents';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/* =========================
   Types
========================= */
export type ApprovalMode = 'yolo' | 'default' | 'auto-edit' | 'plan';

export interface ToolUseEntry {
  id: string;
  name: string;
  input: unknown;
  output?: string;
}

export interface PendingQuestion {
  uuid: string;
  question: string;
  options?: string[] | null;
  header?: string;
  multiSelect?: boolean;
  answered?: boolean;
  answer?: string;
}

export interface ChatMessage {
  session_id?: string;
  conversation_id?: number;
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  tools?: ToolUseEntry[];
  timestamp?: string;
  model?: string;
  pendingQuestion?: PendingQuestion;
}

export type ChatSession = { id: string; title: string; messages: ChatMessage[] };

/* =========================
   AssistantBubble
========================= */
interface AssistantBubbleProps {
  msg: ChatMessage;
  onAnswer: (conversationId: number, answer: string, msgId: string) => Promise<void>;
}

function AssistantBubble({ msg, onAnswer }: AssistantBubbleProps) {
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const [freeText, setFreeText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleOptionClick = async (opt: string) => {
    if (!msg.conversation_id || submitting) return;
    setSubmitting(true);
    await onAnswer(msg.conversation_id, opt, msg.id);
    setSubmitting(false);
  };

  const handleFreeTextSubmit = async () => {
    if (!msg.conversation_id || !freeText.trim() || submitting) return;
    setSubmitting(true);
    await onAnswer(msg.conversation_id, freeText.trim(), msg.id);
    setFreeText('');
    setSubmitting(false);
  };
  const components: Components & {
    thinking?: React.ElementType;
  } = {
    thinking: ({ children }: any) => (
      <div className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Loader2 size={12} className="animate-spin" />
        {children}
      </div>
    ),
    h1: ({ ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
    h2: ({ ...props }) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
    h3: ({ ...props }) => <h3 className="text-md font-semibold mt-2 mb-1" {...props} />,

    p: ({ ...props }) => <p className="leading-relaxed mb-2" {...props} />,

    ul: ({ ...props }) => <ul className="list-disc ml-5 space-y-1" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal ml-5 space-y-1" {...props} />,

    li: ({ ...props }) => <li className="ml-1" {...props} />,
    div: ({ node, ...props }: any) => {
      if (node?.properties?.['data-type'] === 'thinking') {
        return (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            {props.children}
          </div>
        );
      }
      return <div {...props} />;
    },

    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-muted-foreground pl-3 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),

    a: ({ ...props }) => <a className="text-blue-500 hover:underline" target="_blank" {...props} />,

    hr: () => <hr className="my-4 border-muted" />,

    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <pre className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
          {children}
        </code>
      );
    },

    table: ({ ...props }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full border border-border text-sm" {...props} />
      </div>
    ),

    thead: ({ ...props }) => <thead className="bg-muted" {...props} />,

    th: ({ ...props }) => <th className="border px-3 py-2 text-left font-semibold" {...props} />,

    td: ({ ...props }) => <td className="border px-3 py-2 align-top" {...props} />,

    tr: ({ ...props }) => <tr className="even:bg-muted/40" {...props} />,
  };
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Thinking */}
      {msg.thinking && (
        <div>
          <button
            onClick={() => setThinkingOpen(!thinkingOpen)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            <Loader2 size={12} className={cn(thinkingOpen ? 'rotate-0' : '-rotate-90')} />
            Thinking Process
          </button>
          {thinkingOpen && (
            <div className="mt-1 text-xs text-muted-foreground/80 border-l-2 border-muted pl-3 py-1 italic bg-muted/20 rounded-r-md">
              {msg.thinking}
            </div>
          )}
        </div>
      )}

      {/* Tools */}
      {msg.tools && msg.tools.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-blue-500"
          >
            <Wrench size={12} />
            Used {msg.tools.length} Tools
            {toolsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {toolsOpen && (
            <div className="flex flex-col gap-1.5">
              {msg.tools.map(tool => (
                <div
                  key={tool.id}
                  className="text-[11px] font-mono bg-muted/40 border rounded-md p-2"
                >
                  <div className="flex justify-between text-blue-600 font-bold mb-1">
                    <span>{tool.name}</span>
                    <span className="text-[9px] text-muted-foreground">ID: {tool.id}</span>
                  </div>
                  <div className="text-foreground/70 truncate">
                    Input: {JSON.stringify(tool.input)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      {msg.content && (
        <div className="text-sm leading-relaxed bg-muted/50 border rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={components as any}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Pending question */}
      {msg.pendingQuestion && (
        <div
          className={cn(
            'border-2 rounded-xl p-4 mt-2 animate-in fade-in zoom-in-95 duration-300',
            msg.pendingQuestion.answered
              ? 'border-muted bg-muted/20'
              : 'border-primary/30 bg-primary/5'
          )}
        >
          {msg.pendingQuestion.header && (
            <div className="text-[10px] font-black uppercase text-primary mb-1">
              {msg.pendingQuestion.header}
            </div>
          )}
          <div className="text-sm font-semibold mb-3">{msg.pendingQuestion.question}</div>

          {msg.pendingQuestion.answered ? (
            /* Show the answer that was given */
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              Answered:{' '}
              <span className="font-medium text-foreground">{msg.pendingQuestion.answer}</span>
            </div>
          ) : msg.pendingQuestion.options && msg.pendingQuestion.options.length > 0 ? (
            /* Multiple choice */
            <div className="flex flex-wrap gap-2">
              {msg.pendingQuestion.options.map(opt => (
                <Button
                  key={opt}
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  className="h-8 text-xs bg-background hover:bg-primary hover:text-white transition-all"
                  onClick={() => handleOptionClick(opt)}
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : opt}
                </Button>
              ))}
            </div>
          ) : (
            /* Free text */
            <div className="flex gap-2">
              <Input
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFreeTextSubmit();
                }}
                placeholder="Type your answer..."
                className="h-8 text-xs"
                disabled={submitting}
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={submitting || !freeText.trim()}
                onClick={handleFreeTextSubmit}
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   Helpers
========================= */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* =========================
   ChatWindow
========================= */
export function ChatWindow() {
  const { selectedAgent, getTabsForAgent, createTab, initialConversation } = useAgents();

  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeTab, setActiveTab] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = React.useState<number | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeTab) ??
    sessions[0] ?? { id: '', title: '', messages: [] };
  const bottomRef = useRef<HTMLDivElement>(null);

  const agentInfo = selectedAgent
    ? { name: selectedAgent.agent_name, model: selectedAgent.model ?? 'default' }
    : undefined;

  const loadedTabs = React.useRef<Set<string>>(new Set());

  /* ── Fetch history for one tab ── */
  const fetchTabHistory = React.useCallback(
    async (agentId: string, tabId: string) => {
      if (loadedTabs.current.has(tabId)) return;
      loadedTabs.current.add(tabId);

      try {
        const isInitial =
          initialConversation &&
          initialConversation.agentId === agentId &&
          initialConversation.tabId === tabId;

        const data = isInitial
          ? initialConversation
          : await fetch(`/api/sessions/tabs?agentId=${agentId}&tabId=${tabId}`).then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            });

        if (Array.isArray(data?.conversation)) {
          const messages: ChatMessage[] = [];

          for (let i = 0; i < data.conversation.length; i++) {
            const conv = data.conversation[i];
            const role: 'user' | 'assistant' = conv.type === 'user' ? 'user' : 'assistant';
            const contentArr: any[] = conv.message?.content ?? [];

            // Extract proper thinking blocks
            const thinkingText = contentArr
              .filter((c: any) => c.type === 'thinking')
              .map((c: any) => c.thinking ?? '')
              .join('');

            let rawText = contentArr
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text ?? '')
              .join('');

            // Strip leaked <thinking>...</thinking> XML from text, capture as thinking
            let leakedThinking = '';
            rawText = rawText.replace(/<thinking>([\s\S]*?)<\/thinking>/g, (_: string, inner: string) => {
              leakedThinking += inner.trim() + '\n';
              return '';
            }).trim();

            const thinking = (thinkingText || leakedThinking).trim() || undefined;

            // Strip [Tool: ask_user_question] prefix from user messages
            let displayContent = rawText;
            if (role === 'user') {
              displayContent = rawText.replace(
                /^\[Tool: ask_user_question\] User answered:\s*"?([\s\S]*?)"?\s*$/,
                '$1'
              ).trim();
            }

            // Skip messages with no visible content and no thinking
            if (!displayContent && !thinking) continue;

            messages.push({
              id: `${conv.sessionId || 'msg'}-${i}`,
              role,
              content: displayContent,
              thinking,
              timestamp: conv.timestamp
                ? new Date(conv.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }

          setSessions(prev => prev.map(s => (s.id === tabId ? { ...s, messages } : s)));
        }
      } catch (err) {
        console.error('[history]', err);
      }
    },
    [initialConversation]
  );

  /* ── When agent changes: seed sessions from its tabs ── */
  useEffect(() => {
    if (!selectedAgent) return;

    const agentTabs = getTabsForAgent(selectedAgent.agent_id);
    // Fall back to tab_ids when context tabs haven't loaded yet
    const tabList =
      agentTabs.length > 0
        ? agentTabs
        : (selectedAgent.tab_ids ?? []).map((id: string, i: number) => ({
            id,
            name: `Tab ${i + 1}`,
            agentId: selectedAgent.agent_id,
            createdAt: new Date(),
          }));

    loadedTabs.current.clear();

    const newSessions: ChatSession[] = tabList.map(t => ({
      id: t.id,
      title: t.name,
      messages: [],
    }));
    setSessions(newSessions);

    const firstId = newSessions[0]?.id ?? '';
    setActiveTab(firstId);
    if (firstId) fetchTabHistory(selectedAgent.agent_id, firstId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.agent_id]);

  /* ── When TopBar tab is clicked: lazy-load history ── */
  const handleTabSwitch = (tabId: string) => {
    setActiveTab(tabId);
    if (selectedAgent) fetchTabHistory(selectedAgent.agent_id, tabId);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [activeSession?.messages]);

  /* ── Append / update helpers ── */
  const appendMessage = (msg: ChatMessage) => {
    setSessions(prev =>
      prev.map(s => (s.id === activeTab ? { ...s, messages: [...s.messages, msg] } : s))
    );
  };

  const updateMessage = (id: string, patch: Partial<ChatMessage>) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === activeTab
          ? { ...s, messages: s.messages.map(m => (m.id === id ? { ...m, ...patch } : m)) }
          : s
      )
    );
  };

  /* ── Answer handler (passed to AssistantBubble) ── */
  const handleAnswer = async (conversationId: number, answer: string, msgId: string) => {
    try {
      const res = await fetch(`/api/chat/${conversationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Mark the question as answered in the UI immediately
      updateMessage(msgId, {
        pendingQuestion: {
          // merge — we only know msgId here so read from current state
          ...(activeSession.messages.find(m => m.id === msgId)?.pendingQuestion as PendingQuestion),
          answered: true,
          answer,
        },
      });
    } catch (err) {
      console.error('[answer] failed:', err);
    }
  };

  /* ── Send message ── */
  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: generateTimestamp(),
    };

    appendMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: inputValue.trim(),
          sessionId: currentSessionId ?? undefined,
          agentId: selectedAgent?.agent_id ?? undefined,
          tabId: activeTab || undefined,
          approvalMode: 'yolo' as const,
          model: agentInfo?.model,
          systemPrompt: selectedAgent?.system_prompt || undefined,
          excludeTools: selectedAgent?.exclude_tools?.length ? selectedAgent.exclude_tools : undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('no reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let convId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(part.slice(6));

            if (data.type === 'conversation_created') {
              convId = data.conversation_id;
              setCurrentConversationId(convId);
            }

            if (data.type === 'session_init') {
              setCurrentSessionId(data.session_id);
            }

            if (data.type === 'thinking') {
              appendMessage({
                id: generateId(),
                role: 'assistant',
                content: '',
                thinking: data.content,
                timestamp: generateTimestamp(),
              });
            }

            if (data.type === 'text' && data.content?.trim()) {
              appendMessage({
                id: generateId(),
                role: 'assistant',
                content: data.content,
                timestamp: generateTimestamp(),
              });
            }

            if (data.type === 'tool_use') {
              appendMessage({
                id: generateId(),
                role: 'assistant',
                content: '',
                tools: [{ id: data.id, name: data.name, input: data.input }],
                timestamp: generateTimestamp(),
              });
            }

            if (data.type === 'ask_user_question' && data.question?.trim()) {
              appendMessage({
                id: generateId(),
                role: 'assistant',
                content: '',
                // conversation_id lets the bubble call the right endpoint
                conversation_id: convId ?? undefined,
                pendingQuestion: {
                  uuid: data.session_id,
                  question: data.question,
                  header: data.header ?? '',
                  options: data.options ?? null,
                },
                timestamp: generateTimestamp(),
              });
            }

            if (data.type === 'context_reset') {
              setCurrentSessionId(null);
              appendMessage({
                id: generateId(),
                role: 'system',
                content: 'Session was too long for this model — started a fresh context.',
                timestamp: generateTimestamp(),
              });
            }

            if (data.type === 'error') {
              appendMessage({
                id: generateId(),
                role: 'system',
                content: `Error: ${data.message}`,
                timestamp: generateTimestamp(),
              });
              setIsLoading(false);
            }

            if (data.type === 'done') {
              setIsLoading(false);
            }
          } catch (e) {
            console.error('[stream] parse error:', e);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[send]', err);
      appendMessage({
        id: generateId(),
        role: 'system',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: generateTimestamp(),
      });
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    if (activeTab === id) setActiveTab(next[0].id);

    if (selectedAgent) {
      fetch('/api/sessions/tabs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.agent_id,
          tabId: id,
          agentName: selectedAgent.agent_name,
        }),
      }).catch(err => console.error('[removeTab] session delete failed:', err));
    }
  };

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const addNewTab = () => {
    if (!selectedAgent) return;
    const newTab = createTab(selectedAgent.agent_id, `Tab ${sessions.length + 1}`);
    loadedTabs.current.add(newTab.id); // new tab has no history to fetch
    setSessions(prev => [...prev, { id: newTab.id, title: newTab.name, messages: [] }]);
    setActiveTab(newTab.id);
  };
  if (!agentInfo) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center bg-background">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Bot className="text-muted-foreground" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">No Agent Selected</h1>
          <p className="text-sm text-muted-foreground">
            Please select an agent from the sidebar to start chatting.
          </p>
        </div>
      </div>
    );
  }
  return (
    <Card className="h-dvh flex flex-col rounded-none border-none shadow-none p-0">
      <TopBar
        sessions={sessions}
        removeTab={removeTab}
        addNewTab={addNewTab}
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        agentInfo={agentInfo}
      />

      <ScrollArea className="flex-1 px-2 md:px-4 min-h-0">
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-6 py-3 md:py-4">
          {activeSession.messages.map((msg, index) => (
            <div
              key={`${index}-${msg.id}-${msg.content}`}
              className={cn('flex gap-2 md:gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <Avatar className="hidden md:flex h-8 w-8 border shrink-0">
                <AvatarFallback
                  className={
                    msg.role === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                  }
                >
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'flex flex-col gap-1 min-w-0',
                  msg.role === 'user' ? 'items-end max-w-[85%] ml-auto' : 'items-start w-full'
                )}
              >
                {msg.role === 'user' ? (
                  <div className="bg-primary text-primary-foreground px-3 py-2 md:px-4 rounded-2xl rounded-tr-none text-sm shadow-sm break-words">
                    {msg.content}
                  </div>
                ) : (
                  <AssistantBubble msg={msg} onAnswer={handleAnswer} />
                )}
                {msg.timestamp && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">{msg.timestamp}</span>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
          {isLoading && (
            <div className="flex gap-2 md:gap-4">
              <Avatar className="hidden md:flex h-8 w-8 border shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot size={16} />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" size={15} />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardFooter className="border-t p-2 md:p-4 bg-muted/10 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-3xl mx-auto items-end gap-2">
          <textarea
            ref={textareaRef}
            placeholder="Message..."
            className="flex-1 min-h-[44px] resize-none bg-background rounded-2xl shadow-inner border border-muted-foreground/20 px-3 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            value={inputValue}
            rows={1}
            style={{ height: '44px' }}
            onChange={e => {
              setInputValue(e.target.value);
              e.target.style.height = '44px';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-11 w-11 rounded-2xl active:scale-95 transition-transform shrink-0"
              onClick={handleStop}
            >
              <Square size={15} fill="currentColor" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-11 w-11 rounded-2xl active:scale-95 transition-transform shrink-0"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              <Send size={18} />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
