'use client';

import * as React from 'react';
import {
  Send,
  User,
  Bot,
  Plus,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronRight,
  Square,
  Copy,
  Check,
  MessageSquare,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import TopBar from './topbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/* =========================
   Types (Strictly as Requested)
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
  options?: string[];
  header?: string;
  multiSelect?: boolean;
}

export interface ChatMessage {
  session_id?: string;
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  tools?: ToolUseEntry[];
  timestamp?: string;
  model?: string;
  pendingQuestion?: PendingQuestion & { answered?: boolean; answer?: string };
}

/* =========================
   Assistant Bubble (Handles All Types)
========================= */
function AssistantBubble({ msg }: { msg: ChatMessage }) {
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [thinkingOpen, setThinkingOpen] = React.useState(true);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Thinking State */}
      {msg.thinking && (
        <div className="group">
          <button
            onClick={() => setThinkingOpen(!thinkingOpen)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            <Loader2
              size={12}
              className={cn('transition-transform', thinkingOpen ? 'rotate-0' : '-rotate-90')}
            />
            Thinking Process
          </button>
          {thinkingOpen && (
            <div className="mt-1 text-xs text-muted-foreground/80 border-l-2 border-muted pl-3 py-1 italic bg-muted/20 rounded-r-md">
              {msg.thinking}
            </div>
          )}
        </div>
      )}

      {/* 2. Tools Used */}
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
              {msg.tools.map((tool, i) => (
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

      {/* 3. Main Content */}
      {msg.content && (
        <div className="text-sm leading-relaxed bg-muted/50 border rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom component for code blocks
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
              // Custom component for tables
              table({ node, ...props }: any) {
                return (
                  <div className="overflow-x-auto">
                    <table className="border-collapse border border-gray-300 w-full" {...props} />
                  </div>
                );
              },
              // Custom component for table cells
              th({ node, ...props }: any) {
                return (
                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-bold" {...props} />
                );
              },
              td({ node, ...props }: any) {
                return (
                  <td className="border border-gray-300 px-4 py-2" {...props} />
                );
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      )}

      {/* 4. Pending Question / Approval */}
      {msg.pendingQuestion && !msg.pendingQuestion.answered && (
        <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4 mt-2 animate-in fade-in zoom-in-95 duration-300">
          {msg.pendingQuestion.header && (
            <div className="text-[10px] font-black uppercase text-primary mb-1">
              {msg.pendingQuestion.header}
            </div>
          )}
          <div className="text-sm font-semibold mb-3">{msg.pendingQuestion.question}</div>
          <div className="flex flex-wrap gap-2">
            {msg.pendingQuestion.options?.map(opt => (
              <Button
                key={opt}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-background hover:bg-primary hover:text-white transition-all"
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type ChatSession = { id: string; title: string; messages: ChatMessage[] };

// Helper function to create a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to create a timestamp
function generateTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatWindow() {
  // State for chat sessions
  const [sessions, setSessions] = React.useState<ChatSession[]>([
    { id: '1', title: 'Main Chat', messages: [] }
  ]);
  const [activeTab, setActiveTab] = React.useState('1');
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);

  // Get the active session
  const activeSession = sessions.find(session => session.id === activeTab) || sessions[0];

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: generateTimestamp(),
    };

    // Update the session with the user message
    const updatedSessions = sessions.map(session => 
      session.id === activeTab 
        ? { ...session, messages: [...session.messages, userMessage] } 
        : session
    );
    
    setSessions(updatedSessions);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare the request payload
      const requestBody = {
        message: inputValue.trim(),
        sessionId: currentSessionId || undefined,
        approvalMode: 'yolo' as const, // Default to yolo mode
      };

      // Stream the response from the API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let sessionStarted = false;
      let newSessionId: string | null = null;

      // Process the streamed response
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const dataStr = line.slice(6); // Remove 'data: '
            const data = JSON.parse(dataStr);
            
            // Handle conversation creation
            if (data.type === 'conversation_created') {
              // We don't need to do anything special here
            }
            
            // Handle session initialization
            if (data.type === 'session_init') {
              newSessionId = data.session_id;
              setCurrentSessionId(newSessionId);
              sessionStarted = true;
            }
            
            // Handle thinking messages
            if (data.type === 'thinking') {
              const thinkingMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: '', // Empty content for thinking messages
                thinking: data.content,
                timestamp: generateTimestamp(),
              };
              
              // Add thinking message to current session
              const updatedSessionsWithThinking = updatedSessions.map(session => 
                session.id === activeTab 
                  ? { ...session, messages: [...session.messages, thinkingMessage] } 
                  : session
              );
              setSessions(updatedSessionsWithThinking);
            }
            
            // Handle text content
            if (data.type === 'text') {
              // Skip empty text messages as they might be intermediate states
              if (data.content.trim() === '') {
                console.log('[DEBUG] Skipping empty text message');
                continue;
              }
              
              const textMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: data.content,
                timestamp: generateTimestamp(),
              };
              
              // Add text message to current session
              const updatedSessionsWithText = updatedSessions.map(session =>
                session.id === activeTab
                  ? { ...session, messages: [...session.messages, textMessage] }
                  : session
              );
              setSessions(updatedSessionsWithText);
            }
            
            // Handle tool use
            if (data.type === 'tool_use') {
              const toolMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: '', // Empty content for tool messages
                tools: [{
                  id: data.id,
                  name: data.name,
                  input: data.input,
                }],
                timestamp: generateTimestamp(),
              };
              
              // Add tool message to current session
              const updatedSessionsWithTool = updatedSessions.map(session => 
                session.id === activeTab 
                  ? { ...session, messages: [...session.messages, toolMessage] } 
                  : session
              );
              setSessions(updatedSessionsWithTool);
            }
            
            // Handle ask_user_question
            if (data.type === 'ask_user_question') {
              const questionMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: '', // Empty content for question messages
                pendingQuestion: {
                  uuid: data.session_id,
                  question: data.question,
                },
                timestamp: generateTimestamp(),
              };
              
              // Add question message to current session
              const updatedSessionsWithQuestion = updatedSessions.map(session => 
                session.id === activeTab 
                  ? { ...session, messages: [...session.messages, questionMessage] } 
                  : session
              );
              setSessions(updatedSessionsWithQuestion);
            }
            
            // Handle done signal
            if (data.type === 'done') {
              setIsLoading(false);
              break;
            }
          } catch (parseError) {
            console.error('Error parsing stream data:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: generateTimestamp(),
      };
      
      const updatedSessionsWithError = sessions.map(session => 
        session.id === activeTab 
          ? { ...session, messages: [...session.messages, errorMessage] } 
          : session
      );
      setSessions(updatedSessionsWithError);
    }
  };

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Remove a tab
  const removeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    
    const newSessions = sessions.filter(session => session.id !== id);
    setSessions(newSessions);
    
    if (activeTab === id) {
      setActiveTab(newSessions[0].id);
    }
  };

  // Add a new tab
  const addNewTab = () => {
    const newId = generateId();
    const newSession: ChatSession = {
      id: newId,
      title: `Chat ${sessions.length + 1}`,
      messages: []
    };
    
    setSessions([...sessions, newSession]);
    setActiveTab(newId);
  };

  return (
    <Card className="h-screen flex flex-col rounded-none border-none shadow-none p-0">
      <TopBar
        sessions={sessions}
        removeTab={removeTab}
        addNewTab={addNewTab}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <ScrollArea className="flex-1 px-4 h-[calc(100vh-10rem)]">
        <div className="max-w-7xl mx-auto space-y-8">
          {activeSession.messages.map(msg => (
            <div
              key={msg.id}
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
                  <AssistantBubble msg={msg} />
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
              <div className="flex flex-col gap-1 w-full items-start">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm">Thinking...</span>
                </div>
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
            onChange={(e) => setInputValue(e.target.value)}
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

/* =========================
   Example Data for Each Type
========================= */
const EXAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Check the server logs and let me know if there are errors.',
    timestamp: '09:41 AM',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    model: 'gpt-4o',
    thinking:
      'I need to access the logs directory. I will use the listPipelineTools to check if I have a log_reader tool.',
    tools: [
      {
        id: 'tool-882',
        name: 'mcp__system__read_file',
        input: { path: '/var/logs/error.log' },
        output: 'File read successfully. Found 2 error lines.',
      },
    ],
    content:
      'I have analyzed the logs. There are two critical errors related to the database connection pool.',
    timestamp: '09:41 AM',
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content: 'The errors suggest the pool size is too small. Should I increase it to 20?',
    pendingQuestion: {
      uuid: 'q-992-abc',
      header: 'Configuration Change Required',
      question: 'Do you want to apply the new database pool size config?',
      options: ['Yes, Apply Now', 'No, Wait', 'Plan Only'],
      multiSelect: false,
    },
    timestamp: '09:42 AM',
  },
];
