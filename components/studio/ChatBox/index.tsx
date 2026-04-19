'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { Send, User, Bot, Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import TopBar from './topbar';
import { useAgents } from '@/contexts/Agents';
import ReactMarkdown from 'react-markdown';
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
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              table({ node, ...props }: any) {
                return (
                  <div className="overflow-x-auto">
                    <table className="border-collapse border border-gray-300 w-full" {...props} />
                  </div>
                );
              },
              th({ node, ...props }: any) {
                return (
                  <th
                    className="border border-gray-300 px-4 py-2 bg-gray-100 font-bold"
                    {...props}
                  />
                );
              },
              td({ node, ...props }: any) {
                return <td className="border border-gray-300 px-4 py-2" {...props} />;
              },
            }}
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
  const [sessions, setSessions] = React.useState<ChatSession[]>([
    { id: '1', title: 'Main Chat', messages: [] },
  ]);
  const [activeTab, setActiveTab] = React.useState('1');
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = React.useState<number | null>(null);

  const activeSession = sessions.find(s => s.id === activeTab) ?? sessions[0];

  // Get agent info from the context
  const { selectedAgent, selectedTab } = useAgents();
  const agentInfo = selectedAgent
    ? { name: selectedAgent.agent_name, model: 'openrouter/free' }
    : undefined;

  // Load conversation history when agent or tab changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedAgent || !selectedTab) return;
      console.log(selectedTab);

      try {
        const response = await fetch(
          `/api/sessions/tabs?agentId=${selectedAgent.agent_id}&tabId=${selectedTab.id}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Process the conversation data and update the session
        if (data.conversation && Array.isArray(data.conversation)) {
          // Convert the conversation data to our ChatMessage format
          const messages: ChatMessage[] = data.conversation.map((conv: any) => ({
            id: conv.sessionId || crypto.randomUUID(),
            role: conv.role || conv.type,
            content: conv.content || conv.text || '',
            timestamp: conv.timestamp
              ? new Date(conv.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));

          setSessions([
            {
              id: '1',
              title: selectedTab.name || 'Main Chat',
              messages: messages,
            },
          ]);
        } else {
          // If no conversation exists yet, initialize with an empty session
          setSessions([
            {
              id: '1',
              title: selectedTab.name || 'Main Chat',
              messages: [],
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        // Initialize with an empty session if there's an error
        setSessions([
          {
            id: '1',
            title: selectedTab.name || 'Main Chat',
            messages: [],
          },
        ]);
      }
    };

    loadHistory();
  }, [selectedAgent, selectedTab]);

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

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue.trim(),
          sessionId: currentSessionId ?? undefined,
          agentId: selectedAgent?.agent_id ?? undefined,
          tabId: selectedTab?.id ?? undefined,
          approvalMode: 'yolo' as const,
          model: agentInfo?.model,
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
    } catch (err) {
      console.error('[send]', err);
      appendMessage({
        id: generateId(),
        role: 'system',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: generateTimestamp(),
      });
      setIsLoading(false);
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
  };

  const addNewTab = () => {
    const newId = generateId();
    setSessions(prev => [...prev, { id: newId, title: `Chat ${prev.length + 1}`, messages: [] }]);
    setActiveTab(newId);
  };
  if (!agentInfo) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
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
    <Card className="h-screen flex flex-col rounded-none border-none shadow-none p-0">
      <TopBar
        sessions={sessions}
        removeTab={removeTab}
        addNewTab={addNewTab}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        agentInfo={agentInfo}
      />

      <ScrollArea className="flex-1 px-4 h-[calc(100vh-10rem)]">
        <div className="max-w-7xl mx-auto space-y-8">
          {activeSession.messages.map(msg => (
            <div
              key={msg.content}
              className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <Avatar className="h-9 w-9 border shrink-0">
                <AvatarFallback
                  className={
                    msg.role === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                  }
                >
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'flex flex-col gap-1 w-full',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                {msg.role === 'user' ? (
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-tr-none text-sm shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <AssistantBubble msg={msg} onAnswer={handleAnswer} />
                )}
                {msg.timestamp && (
                  <span className="text-[10px] text-muted-foreground mt-1">{msg.timestamp}</span>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <Avatar className="h-9 w-9 border shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot size={18} />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardFooter className="border-t p-4 bg-muted/10">
        <div className="flex w-full max-w-3xl mx-auto items-center gap-3">
          <Input
            placeholder="Ready for next command..."
            className="h-12 bg-background rounded-xl shadow-inner border-muted-foreground/20"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="h-12 w-12 rounded-xl active:scale-95 transition-transform"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            <Send size={20} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
