/// <reference types="vite/client" />

type WorkbenchStatus = "local" | "processing" | "synced";
type WorkbenchRole = "user" | "assistant";

interface WorkbenchAttachment {
  id: string;
  name: string;
  path: string;
  size?: number | string;
}

interface WorkbenchMessage {
  id: string;
  role: WorkbenchRole;
  body: string;
  meta?: string;
  output?: string;
}

interface WorkbenchConversation {
  id: string;
  claudeSessionId: string;
  title: string;
  updatedAt: string;
  directory: string;
  status: WorkbenchStatus;
  pinned: boolean;
  messages: WorkbenchMessage[];
  attachments: WorkbenchAttachment[];
}

interface ClaudeChunkEvent {
  conversationId: string;
  messageId: string;
  chunk?: string;
  stderr?: string;
  conversations?: WorkbenchConversation[];
  finalMessage?: WorkbenchMessage;
  error?: string;
}

interface ClaudePermissionChoice {
  action: "allow-once" | "allow-always" | "deny";
  label: string;
  input: string;
}

interface ClaudePermissionEvent {
  conversationId: string;
  messageId: string;
  prompt: string;
  choices: ClaudePermissionChoice[];
}

interface SelectMessageContentEvent {
  x: number;
  y: number;
}

interface PickedBackgroundImage {
  path: string;
  url: string;
}

interface PickedBackgroundVideo {
  path: string;
  url: string;
}

interface WorkbenchInfo {
  storeDir: string;
  attachmentRoot: string;
  sessionRoot?: string;
  claudeCommand: string;
  mockClaude: boolean;
  claudeConnection?: {
    connected: boolean;
    detail: string;
  };
}

interface Window {
  workbench?: {
    listConversations: () => Promise<WorkbenchConversation[]>;
    createConversation: () => Promise<WorkbenchConversation[]>;
    updateConversation: (id: string, patch: Partial<WorkbenchConversation>) => Promise<WorkbenchConversation[]>;
    deleteConversation: (id: string) => Promise<WorkbenchConversation[]>;
    pickFiles: (conversationId: string) => Promise<WorkbenchAttachment[]>;
    copyFiles: (conversationId: string, paths: string[]) => Promise<WorkbenchAttachment[]>;
    pickBackgroundImage: () => Promise<PickedBackgroundImage | null>;
    pickBackgroundVideo: () => Promise<PickedBackgroundVideo | null>;
    sendToClaude: (payload: {
      conversationId: string;
      prompt: string;
      attachments: WorkbenchAttachment[];
    }) => Promise<{ ok: boolean; error?: string }>;
    answerClaudePermission: (payload: {
      conversationId: string;
      input: string;
    }) => Promise<{ ok: boolean; error?: string }>;
    getAppInfo: () => Promise<WorkbenchInfo>;
    onConversationsChanged: (callback: (conversations: WorkbenchConversation[]) => void) => () => void;
    onClaudeChunk: (callback: (event: ClaudeChunkEvent) => void) => () => void;
    onClaudeStderr: (callback: (event: ClaudeChunkEvent) => void) => () => void;
    onClaudePermission: (callback: (event: ClaudePermissionEvent) => void) => () => void;
    onClaudeDone: (callback: (event: ClaudeChunkEvent) => void) => () => void;
    onClaudeError: (callback: (event: ClaudeChunkEvent) => void) => () => void;
    onSelectMessageContent: (callback: (event: SelectMessageContentEvent) => void) => () => void;
  };
}
