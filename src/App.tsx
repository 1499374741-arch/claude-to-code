import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  LoaderCircle,
  Loader2,
  Paperclip,
  PencilLine,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { CSSProperties, ChangeEvent, DragEvent, KeyboardEvent, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import claudeMark from "./assets/claude-mark.png";
import claudeLogo from "./assets/claude-logo.png";

type Status = WorkbenchStatus;
type Attachment = WorkbenchAttachment;
type Conversation = WorkbenchConversation;

const defaultAppearance = {
  chatBackground: "#F7F4EE",
  chatOpacity: 100,
  chatImageUrl: "",
  chatImagePath: "",
  chatVideoUrl: "",
  chatVideoPath: "",
  loadingVariant: "ring"
};

const initialConversations: Conversation[] = [
  {
    id: "session-1",
    claudeSessionId: "11111111-1111-4111-8111-111111111111",
    title: "重构 Codex 插件状态栏",
    updatedAt: "16:18",
    directory: "~/Documents/Codex/plugins/status-bar",
    status: "processing",
    pinned: true,
    attachments: [
      {
        id: "att-1",
        name: "status-panel.tsx",
        path: "~/Documents/Codex/plugins/status-bar/src/status-panel.tsx",
        size: "18 KB"
      }
    ],
    messages: [
      {
        id: "m1",
        role: "user",
        body: "帮我把这个状态栏改成更轻一点的桌面工具感，保留当前所有快捷入口。",
        meta: "你 · 16:05"
      },
      {
        id: "m2",
        role: "assistant",
        body: "我会先读取现有组件和样式，确认状态来源，再把视觉层、交互层和状态文案分开处理。",
        meta: "Claude Code · 本地记录",
        output: "read src/status-panel.tsx\nread src/status-store.ts\npending visual pass"
      },
      {
        id: "m3",
        role: "assistant",
        body: "当前状态：已经定位到布局噪音主要来自过重的边框和重复标签。下一步会把活动状态改成轻量底色和更明确的图标反馈。",
        meta: "Claude Code · 处理中"
      }
    ]
  },
  {
    id: "session-2",
    claudeSessionId: "22222222-2222-4222-8222-222222222222",
    title: "检查 Electron 文件拖拽",
    updatedAt: "15:42",
    directory: "~/Desktop/ClaudeShell",
    status: "local",
    pinned: false,
    attachments: [],
    messages: [
      {
        id: "m4",
        role: "user",
        body: "拖进窗口的文件要复制到当前会话附件目录，并在发送时带上路径。",
        meta: "你 · 15:31"
      },
      {
        id: "m5",
        role: "assistant",
        body: "建议主进程负责复制文件，渲染进程只维护附件显示和发送前的路径列表。这样权限边界会更清楚。",
        meta: "Claude Code · 本地记录"
      }
    ]
  },
  {
    id: "session-3",
    claudeSessionId: "33333333-3333-4333-8333-333333333333",
    title: "新会话",
    updatedAt: "刚刚",
    directory: "~/Documents/Codex/new-chat",
    status: "local",
    pinned: false,
    attachments: [],
    messages: []
  }
];

const statusText: Record<Status, string> = {
  local: "本地记录",
  processing: "处理中",
  synced: "已整理"
};

const statusIcon: Record<Status, ReactNode> = {
  local: <Archive aria-hidden="true" />,
  processing: <Loader2 aria-hidden="true" />,
  synced: <CheckCircle2 aria-hidden="true" />
};

type AppView = "chat" | "settings";
type SettingsSection = "background" | "loading";

const loadingOptions = [
  { id: "ring", label: "Ring" },
  { id: "ring-dual", label: "Dual Ring" },
  { id: "ring-dash", label: "Dash Ring" },
  { id: "ring-thin", label: "Thin Ring" },
  { id: "ring-bold", label: "Bold Ring" },
  { id: "ring-reverse", label: "Reverse" },
  { id: "orbit", label: "Orbit" },
  { id: "orbit-double", label: "Double Orbit" },
  { id: "orbit-slow", label: "Slow Orbit" },
  { id: "orbit-fast", label: "Fast Orbit" },
  { id: "pulse", label: "Pulse" },
  { id: "pulse-soft", label: "Soft Pulse" },
  { id: "pulse-ring", label: "Pulse Ring" },
  { id: "dots", label: "Dots" },
  { id: "dots-wave", label: "Dot Wave" },
  { id: "dots-chase", label: "Dot Chase" },
  { id: "bars", label: "Bars" },
  { id: "bars-wave", label: "Bar Wave" },
  { id: "bars-rise", label: "Bar Rise" },
  { id: "square", label: "Square" },
  { id: "square-flip", label: "Flip" },
  { id: "diamond", label: "Diamond" },
  { id: "typing", label: "Typing" },
  { id: "scan", label: "Scan" },
  { id: "radar", label: "Radar" },
  { id: "breath", label: "Breath" },
  { id: "spark", label: "Spark" },
  { id: "flower", label: "Flower" },
  { id: "clock", label: "Clock" },
  { id: "pinwheel", label: "Pinwheel" }
] as const;

type LoadingVariant = (typeof loadingOptions)[number]["id"];

function formatFileSize(size: number) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function displayFileSize(size?: number | string) {
  if (typeof size === "number") return formatFileSize(size);
  return size ?? "";
}

function displayMessageBody(body: string) {
  return body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "$1")
    .replace(/(^|[\s（(])\*([^*\n]+)\*(?=$|[\s，。！？、）)])/g, "$1$2");
}

function isMessageProcessing(message: WorkbenchMessage) {
  return message.meta?.includes("处理中") ?? false;
}

function ClaudeMessageMark({
  processing,
  loadingVariant,
  completed
}: {
  processing: boolean;
  loadingVariant: LoadingVariant;
  completed: boolean;
}) {
  if (processing) {
    return (
      <span className={`loading-mark loading-${loadingVariant}`} aria-hidden="true">
        <span />
      </span>
    );
  }

  return <img className={completed ? "is-complete" : ""} src={claudeMark} alt="" />;
}

function loadAppearance() {
  try {
    const stored = window.localStorage.getItem("claude-workbench-appearance");
    if (!stored) return defaultAppearance;
    const parsed = JSON.parse(stored) as Partial<typeof defaultAppearance>;
    return {
      chatBackground: typeof parsed.chatBackground === "string" ? parsed.chatBackground : defaultAppearance.chatBackground,
      chatOpacity:
        typeof parsed.chatOpacity === "number"
          ? Math.min(100, Math.max(20, parsed.chatOpacity))
          : defaultAppearance.chatOpacity,
      chatImageUrl: typeof parsed.chatImageUrl === "string" ? parsed.chatImageUrl : defaultAppearance.chatImageUrl,
      chatImagePath: typeof parsed.chatImagePath === "string" ? parsed.chatImagePath : defaultAppearance.chatImagePath,
      chatVideoUrl: typeof parsed.chatVideoUrl === "string" ? parsed.chatVideoUrl : defaultAppearance.chatVideoUrl,
      chatVideoPath: typeof parsed.chatVideoPath === "string" ? parsed.chatVideoPath : defaultAppearance.chatVideoPath,
      loadingVariant: loadingOptions.some((option) => option.id === parsed.loadingVariant)
        ? (parsed.loadingVariant as LoadingVariant)
        : defaultAppearance.loadingVariant
    };
  } catch {
    return defaultAppearance;
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 247, g: 244, b: 238 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function App() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [appInfo, setAppInfo] = useState<WorkbenchInfo | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [composerFiles, setComposerFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [permissionRequests, setPermissionRequests] = useState<Record<string, ClaudePermissionEvent>>({});
  const [appView, setAppView] = useState<AppView>("chat");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("background");
  const [appearance, setAppearance] = useState(loadAppearance);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const streamQueuesRef = useRef(new Map<string, string[]>());
  const streamTimersRef = useRef(new Map<string, number>());

  const chatRgb = hexToRgb(appearance.chatBackground);
  const chatOpacity = appearance.chatOpacity / 100;
  const hasVisualBackground = Boolean(appearance.chatImageUrl || appearance.chatVideoUrl);
  const appStyle = {
    "--custom-chat-background": `rgb(${chatRgb.r} ${chatRgb.g} ${chatRgb.b} / ${hasVisualBackground ? 1 : chatOpacity})`,
    "--custom-chat-background-overlay": `rgb(${chatRgb.r} ${chatRgb.g} ${chatRgb.b} / ${hasVisualBackground ? 1 - chatOpacity : 0})`,
    "--custom-chat-image": appearance.chatImageUrl && !appearance.chatVideoUrl ? `url("${appearance.chatImageUrl}")` : "none"
  } as CSSProperties;

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedConversations;
    return sortedConversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(normalized) ||
        conversation.directory.toLowerCase().includes(normalized)
      );
    });
  }, [query, sortedConversations]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];

  useEffect(() => {
    window.localStorage.setItem("claude-workbench-appearance", JSON.stringify(appearance));
  }, [appearance]);

  function splitStreamChunk(text: string) {
    const pieces: string[] = [];
    let index = 0;
    while (index < text.length) {
      const nextBreak = text.slice(index).search(/(?<=[。！？.!?；;，,、\n])\s*/);
      const softEnd = nextBreak >= 0 ? index + nextBreak + 1 : index + 18;
      const end = Math.min(text.length, Math.max(index + 6, Math.min(index + 24, softEnd)));
      pieces.push(text.slice(index, end));
      index = end;
    }
    return pieces.filter(Boolean);
  }

  function appendMessageChunk(conversationId: string, messageId: string, chunk: string) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              status: "processing",
              messages: conversation.messages.map((message) =>
                message.id === messageId ? { ...message, body: `${message.body}${chunk}` } : message
              )
            }
          : conversation
      )
    );
  }

  function stopStreamQueue(messageId: string, conversationId?: string, flush = false) {
    const timer = streamTimersRef.current.get(messageId);
    if (timer) window.clearTimeout(timer);
    if (flush && conversationId) {
      const queue = streamQueuesRef.current.get(messageId);
      if (queue?.length) {
        appendMessageChunk(conversationId, messageId, queue.join(""));
      }
    }
    streamTimersRef.current.delete(messageId);
    streamQueuesRef.current.delete(messageId);
  }

  function enqueueMessageChunk(conversationId: string, messageId: string, chunk: string) {
    const queue = streamQueuesRef.current.get(messageId) ?? [];
    queue.push(...splitStreamChunk(chunk));
    streamQueuesRef.current.set(messageId, queue);

    if (streamTimersRef.current.has(messageId)) return;

    const flush = () => {
      const currentQueue = streamQueuesRef.current.get(messageId);
      if (!currentQueue || currentQueue.length === 0) {
        stopStreamQueue(messageId);
        return;
      }
      const next = currentQueue.shift();
      if (next) appendMessageChunk(conversationId, messageId, next);
      const timer = window.setTimeout(flush, 18);
      streamTimersRef.current.set(messageId, timer);
    };

    const timer = window.setTimeout(flush, 18);
    streamTimersRef.current.set(messageId, timer);
  }

  function scrollConversationToBottom(behavior: ScrollBehavior = "smooth") {
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollTo({ top: scroll.scrollHeight, behavior });
  }

  useLayoutEffect(() => {
    scrollConversationToBottom("auto");
    const frame = window.requestAnimationFrame(() => scrollConversationToBottom("auto"));
    const timer = window.setTimeout(() => scrollConversationToBottom("auto"), 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [activeId]);

  useEffect(() => {
    scrollConversationToBottom("smooth");
  }, [activeId, activeConversation?.messages.length, activeConversation?.messages.at(-1)?.body]);

  useEffect(() => {
    const resetDragState = () => {
      dragDepthRef.current = 0;
      setDragging(false);
    };

    const handleWindowDragLeave = (event: globalThis.DragEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      if (x <= 0 || y <= 0 || x >= window.innerWidth || y >= window.innerHeight) resetDragState();
    };

    window.addEventListener("dragend", resetDragState);
    window.addEventListener("drop", resetDragState);
    window.addEventListener("blur", resetDragState);
    window.addEventListener("dragleave", handleWindowDragLeave);

    return () => {
      window.removeEventListener("dragend", resetDragState);
      window.removeEventListener("drop", resetDragState);
      window.removeEventListener("blur", resetDragState);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, []);

  useEffect(() => {
    if (!window.workbench) return;

    let mounted = true;

    window.workbench.listConversations().then((items) => {
      if (!mounted) return;
      setConversations(items);
      setActiveId((current) => items.find((item) => item.id === current)?.id ?? items[0]?.id ?? "");
    });

    window.workbench.getAppInfo().then((info) => {
      if (mounted) setAppInfo(info);
    });

    const offChanged = window.workbench.onConversationsChanged((items) => {
      setConversations(items);
      setActiveId((current) => items.find((item) => item.id === current)?.id ?? items[0]?.id ?? "");
    });

    const offChunk = window.workbench.onClaudeChunk(({ conversationId, messageId, chunk }) => {
      if (!chunk) return;
      enqueueMessageChunk(conversationId, messageId, chunk);
    });

    const offStderr = window.workbench.onClaudeStderr(({ conversationId, messageId, stderr }) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId ? { ...message, output: stderr ?? message.output } : message
                )
              }
            : conversation
        )
      );
    });

    const syncFinal = (event: ClaudeChunkEvent) => {
      if (event.messageId) stopStreamQueue(event.messageId, event.conversationId, true);
      if (event.conversations) setConversations(event.conversations);
      if (event.finalMessage) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === event.conversationId
              ? {
                  ...conversation,
                  status: event.finalMessage?.meta?.includes("已整理") ? "synced" : "local",
                  messages: conversation.messages.map((message) =>
                    message.id === event.messageId
                      ? {
                          ...message,
                          meta: event.finalMessage?.meta ?? message.meta,
                          output: event.finalMessage?.output ?? message.output,
                          body: message.body || event.finalMessage?.body || message.body
                        }
                      : message
                  )
                }
              : conversation
          )
        );
      }
      if (event.error) showToast(event.error);
      if (event.messageId) {
        setCompletedMessageIds((current) => new Set(current).add(event.messageId));
        setPermissionRequests((current) => {
          const next = { ...current };
          delete next[event.messageId];
          return next;
        });
      }
    };

    const offPermission = window.workbench.onClaudePermission((event) => {
      setPermissionRequests((current) => ({ ...current, [event.messageId]: event }));
    });
    const offSelectMessageContent = window.workbench.onSelectMessageContent(({ x, y }) => {
      selectMessageContentAt(x, y);
    });
    const offDone = window.workbench.onClaudeDone(syncFinal);
    const offError = window.workbench.onClaudeError(syncFinal);

    return () => {
      mounted = false;
      offChanged();
      offChunk();
      offStderr();
      offPermission();
      offSelectMessageContent();
      offDone();
      offError();
      streamTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      streamTimersRef.current.clear();
      streamQueuesRef.current.clear();
    };
  }, []);

  async function persistConversation(id: string, patch: Partial<Conversation>) {
    if (!window.workbench) return;
    const items = await window.workbench.updateConversation(id, patch);
    setConversations(items);
  }

  function updateConversation(id: string, updater: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((conversation) => (conversation.id === id ? updater(conversation) : conversation)));
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function createConversation() {
    if (window.workbench) {
      const items = await window.workbench.createConversation();
      setConversations(items);
      setActiveId(items[0]?.id ?? "");
      setDraft("");
      setComposerFiles([]);
      return;
    }

    const next: Conversation = {
      id: makeId("session"),
      claudeSessionId: makeId("claude"),
      title: "新会话",
      updatedAt: "刚刚",
      directory: "~/Documents/Codex/new-session",
      status: "local",
      pinned: false,
      attachments: [],
      messages: []
    };
    setConversations((current) => [next, ...current]);
    setActiveId(next.id);
    setDraft("");
    setComposerFiles([]);
  }

  async function deleteConversation(id: string) {
    const target = conversations.find((conversation) => conversation.id === id);
    if (!target) return;

    if (window.workbench) {
      const remaining = await window.workbench.deleteConversation(id);
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0]?.id ?? "");
        setDraft("");
        setComposerFiles([]);
      }
      showToast(`已删除「${target.title}」和本地记录`);
      return;
    }

    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? "");
      setDraft("");
      setComposerFiles([]);
    }
    showToast(`已删除「${target.title}」和本地记录`);
  }

  function togglePin(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) return;
    updateConversation(id, (item) => ({ ...item, pinned: !item.pinned }));
    void persistConversation(id, { pinned: !conversation.pinned });
  }

  function beginRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setRenameValue(conversation.title);
  }

  function finishRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      updateConversation(id, (conversation) => ({ ...conversation, title: trimmed }));
      void persistConversation(id, { title: trimmed });
    }
    setEditingId(null);
    setRenameValue("");
  }

  async function pickFiles() {
    if (window.workbench?.pickFiles && activeConversation) {
      const picked = await window.workbench.pickFiles(activeConversation.id);
      addAttachments(picked);
      return;
    }

    fileInputRef.current?.click();
  }

  function addAttachments(files: Attachment[]) {
    if (files.length === 0) return;
    setComposerFiles((current) => {
      const existing = new Set(current.map((file) => file.path));
      return [...current, ...files.filter((file) => !existing.has(file.path))];
    });
  }

  function handleBrowserFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).map((file) => ({
      id: makeId("att"),
      name: file.name,
      path: `local://${file.name}`,
      size: formatFileSize(file.size)
    }));
    addAttachments(selected);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    const dropped = Array.from(event.dataTransfer.files);
    const filePaths = dropped
      .map((file) => (file as File & { path?: string }).path)
      .filter((filePath): filePath is string => Boolean(filePath));

    if (window.workbench?.copyFiles && activeConversation && filePaths.length > 0) {
      void window.workbench.copyFiles(activeConversation.id, filePaths).then(addAttachments);
      return;
    }

    const files = dropped.map((file) => ({
      id: makeId("att"),
      name: file.name,
      path: "path" in file ? String((file as File & { path?: string }).path ?? `local://${file.name}`) : `local://${file.name}`,
      size: formatFileSize(file.size)
    }));
    addAttachments(files);
  }

  async function sendMessage() {
    const body = draft.trim();
    if ((!body && composerFiles.length === 0) || !activeConversation || sending) return;

    if (window.workbench?.sendToClaude) {
      const files = composerFiles;
      const previousDraft = draft;
      setDraft("");
      setComposerFiles([]);
      if (textAreaRef.current) textAreaRef.current.style.height = "110px";
      setSending(true);
      try {
        const result = await window.workbench.sendToClaude({
          conversationId: activeConversation.id,
          prompt: body || "请查看这些附件。",
          attachments: files
        });
        if (!result.ok) throw new Error(result.error || "Claude Code 没有接受这次任务。");
      } catch (error) {
        setDraft(previousDraft);
        setComposerFiles(files);
        showToast(error instanceof Error ? error.message : "发送失败，请重新试一次。");
      } finally {
        setSending(false);
      }
      return;
    }

    const fileLines = composerFiles.map((file) => `- ${file.path}`).join("\n");
    const userBody = [body, fileLines ? `\n附件路径：\n${fileLines}` : ""].filter(Boolean).join("\n");
    const assistantBody = composerFiles.length
      ? "我会把这些附件路径一起传给 Claude Code，并把关键输出整理回当前会话。"
      : "已收到。我会把这条任务发送给 Claude Code，并在这里保留整理后的关键结果。";

    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      updatedAt: "刚刚",
      status: "processing",
      attachments: [...conversation.attachments, ...composerFiles],
      messages: [
        ...conversation.messages,
        {
          id: makeId("msg"),
          role: "user",
          body: userBody,
          meta: "你 · 刚刚"
        },
        {
          id: makeId("msg"),
          role: "assistant",
          body: assistantBody,
          meta: "Claude Code · 处理中",
          output: "queued task\nattached paths forwarded\nwaiting for local runner"
        }
      ]
    }));

    setDraft("");
    setComposerFiles([]);
    if (textAreaRef.current) textAreaRef.current.style.height = "110px";
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }

  function resizeComposer() {
    const element = textAreaRef.current;
    if (!element) return;
    element.style.height = "110px";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 110), 276)}px`;
  }

  function jumpToPreviousUserMessage() {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const userMessages = Array.from(scroll.querySelectorAll<HTMLElement>(".message-user"));
    if (userMessages.length === 0) return;

    const currentTop = scroll.scrollTop;
    const target =
      [...userMessages].reverse().find((message) => message.offsetTop < currentTop - 12) ?? userMessages[0];

    scroll.scrollTo({
      top: Math.max(0, target.offsetTop - 20),
      behavior: "smooth"
    });
  }

  function selectMessageContentAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y);
    const message = target?.closest(".message-content");
    if (!message) return;

    const contentNodes = Array.from(message.querySelectorAll(".message-body, pre")).filter((node) =>
      node.textContent?.trim()
    );
    if (contentNodes.length === 0) return;

    const range = document.createRange();
    range.setStartBefore(contentNodes[0]);
    range.setEndAfter(contentNodes[contentNodes.length - 1]);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  async function answerPermission(request: ClaudePermissionEvent, choice: ClaudePermissionChoice) {
    if (!window.workbench?.answerClaudePermission) return;
    const result = await window.workbench.answerClaudePermission({
      conversationId: request.conversationId,
      input: choice.input
    });

    if (!result.ok) {
      showToast(result.error || "没有成功提交权限选择。");
      return;
    }

    setPermissionRequests((current) => {
      const next = { ...current };
      delete next[request.messageId];
      return next;
    });
  }

  async function pickChatBackgroundImage() {
    if (!window.workbench?.pickBackgroundImage) return;
    const picked = await window.workbench.pickBackgroundImage();
    if (!picked) return;
    setAppearance((current) => ({
      ...current,
      chatImagePath: picked.path,
      chatImageUrl: picked.url,
      chatVideoPath: "",
      chatVideoUrl: ""
    }));
  }

  function removeChatBackgroundImage() {
    setAppearance((current) => ({
      ...current,
      chatImagePath: "",
      chatImageUrl: ""
    }));
  }

  async function pickChatBackgroundVideo() {
    if (!window.workbench?.pickBackgroundVideo) return;
    const picked = await window.workbench.pickBackgroundVideo();
    if (!picked) return;
    setAppearance((current) => ({
      ...current,
      chatImagePath: "",
      chatImageUrl: "",
      chatVideoPath: picked.path,
      chatVideoUrl: picked.url
    }));
  }

  function removeChatBackgroundVideo() {
    setAppearance((current) => ({
      ...current,
      chatVideoPath: "",
      chatVideoUrl: ""
    }));
  }

  return (
    <main
      className={`app-shell ${appView === "settings" ? "settings-view" : ""} ${dragging ? "is-dragging" : ""} ${
        inspectorCollapsed ? "inspector-collapsed" : ""
      }`}
      style={appStyle}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="top-window-drag" aria-hidden="true" />
      <aside className="sidebar" aria-label={appView === "settings" ? "设置目录" : "会话列表"}>
        <div className="window-drag" />
        {appView === "settings" ? (
          <>
            <button className="settings-back" type="button" onClick={() => setAppView("chat")}>
              <ArrowLeft aria-hidden="true" />
              返回应用
            </button>
            <label className="search-field">
              <Search aria-hidden="true" />
              <span className="sr-only">搜索设置</span>
              <input placeholder="搜索设置..." />
            </label>
            <nav className="settings-nav" aria-label="设置分类">
              <p>个人</p>
              <button
                className={`settings-nav-item ${settingsSection === "background" ? "is-active" : ""}`}
                type="button"
                onClick={() => setSettingsSection("background")}
              >
                <ImageIcon aria-hidden="true" />
                背景
              </button>
              <button
                className={`settings-nav-item ${settingsSection === "loading" ? "is-active" : ""}`}
                type="button"
                onClick={() => setSettingsSection("loading")}
              >
                <LoaderCircle aria-hidden="true" />
                Loading
              </button>
            </nav>
          </>
        ) : (
          <>
            <header className="sidebar-header">
              <img className="brand-logo" src={claudeLogo} alt="Claude" />
              <button className="icon-button primary" type="button" onClick={createConversation} aria-label="新建对话">
                <Plus aria-hidden="true" />
              </button>
            </header>

            <label className="search-field">
              <Search aria-hidden="true" />
              <span className="sr-only">搜索对话</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索对话或目录" />
            </label>

            <div className="session-list" role="list">
              {filteredConversations.length === 0 ? (
                <div className="sidebar-empty">
                  <Search aria-hidden="true" />
                  <p>没有匹配的本地会话</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <article
                    className={`session-item ${conversation.id === activeId ? "is-active" : ""}`}
                    key={conversation.id}
                    role="listitem"
                  >
                    <button className="session-main" type="button" onClick={() => setActiveId(conversation.id)}>
                      <span className="session-title-row">
                        {conversation.pinned ? <Pin className="pin-mark" aria-label="已置顶" /> : null}
                        {editingId === conversation.id ? (
                          <input
                            className="rename-input"
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onBlur={() => finishRename(conversation.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") finishRename(conversation.id);
                              if (event.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            onClick={(event) => event.stopPropagation()}
                          />
                        ) : (
                          <strong>{conversation.title}</strong>
                        )}
                      </span>
                      <span className="session-meta">
                        <Clock3 aria-hidden="true" />
                        {conversation.updatedAt}
                      </span>
                    </button>
                    <div className="session-actions" aria-label={`${conversation.title} 操作`}>
                      <button
                        type="button"
                        onClick={() => togglePin(conversation.id)}
                        aria-label={conversation.pinned ? "取消置顶" : "置顶"}
                      >
                        {conversation.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                      </button>
                      <button type="button" onClick={() => beginRename(conversation)} aria-label="重命名">
                        <PencilLine aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => deleteConversation(conversation.id)} aria-label="删除对话和本地记录">
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="sidebar-footer">
              <button className="settings-trigger" type="button" onClick={() => setAppView("settings")} aria-label="打开设置">
                <Settings aria-hidden="true" />
                <span>设置</span>
              </button>
            </div>
          </>
        )}
      </aside>

      <section className="workspace" aria-label={appView === "settings" ? "设置" : "当前会话"}>
        {appView === "settings" ? (
          <div className="settings-page">
            <div className="settings-content">
              <header className="settings-page-header">
                <h2>{settingsSection === "background" ? "背景" : "Loading"}</h2>
                <p>
                  {settingsSection === "background"
                    ? "调整对话文本大框的背景颜色、图片和透明度。"
                    : "选择 Claude Code 处理任务时，小 logo 位置显示的 loading 动画。"}
                </p>
              </header>
              {settingsSection === "background" ? (
                <section className="settings-card" aria-label="背景设置">
                  <label className="setting-row">
                    <span>对话框背景</span>
                    <span className="color-control">
                      <button
                        className="color-swatch"
                        type="button"
                        style={{ background: appearance.chatBackground }}
                        onClick={() => colorInputRef.current?.click()}
                        aria-label="选择对话框背景色"
                      />
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={appearance.chatBackground}
                        onChange={(event) =>
                          setAppearance((current) => ({
                            ...current,
                            chatBackground: event.target.value
                          }))
                        }
                        aria-label="选择对话框背景色"
                      />
                    </span>
                  </label>
                  <div className="setting-row">
                    <span>背景图片</span>
                    <div className="image-control">
                      {appearance.chatImageUrl ? (
                        <span
                          className="image-preview"
                          style={{ backgroundImage: `url("${appearance.chatImageUrl}")` }}
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="image-preview is-empty" aria-hidden="true" />
                      )}
                      <div>
                        <button className="settings-action" type="button" onClick={pickChatBackgroundImage}>
                          选择图片
                        </button>
                        {appearance.chatImageUrl ? (
                          <button className="settings-action subtle" type="button" onClick={removeChatBackgroundImage}>
                            移除图片
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="setting-row">
                    <span>背景视频</span>
                    <div className="image-control">
                      {appearance.chatVideoUrl ? (
                        <span className="video-preview" aria-hidden="true">
                          <video src={appearance.chatVideoUrl} muted loop playsInline />
                        </span>
                      ) : (
                        <span className="video-preview is-empty" aria-hidden="true" />
                      )}
                      <div>
                        <button className="settings-action" type="button" onClick={pickChatBackgroundVideo}>
                          选择视频
                        </button>
                        {appearance.chatVideoUrl ? (
                          <button className="settings-action subtle" type="button" onClick={removeChatBackgroundVideo}>
                            移除视频
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <label className="setting-slider">
                    <span>{appearance.chatVideoUrl ? "视频透明度" : appearance.chatImageUrl ? "图片透明度" : "背景透明度"}</span>
                    <span className="compact-slider-control">
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="1"
                        value={appearance.chatOpacity}
                        style={{ "--slider-progress": `${appearance.chatOpacity}%` } as CSSProperties}
                        onChange={(event) =>
                          setAppearance((current) => ({
                            ...current,
                            chatOpacity: Number(event.target.value)
                          }))
                        }
                      />
                      <strong>{appearance.chatOpacity}%</strong>
                    </span>
                  </label>
                  <button className="reset-appearance" type="button" onClick={() => setAppearance(defaultAppearance)}>
                    <RotateCcw aria-hidden="true" />
                    重置背景
                  </button>
                </section>
              ) : (
                <section className="settings-card" aria-label="Loading 设置">
                  <div className="loading-options" role="radiogroup" aria-label="选择 loading 动画">
                    {loadingOptions.map((option) => (
                      <button
                        className={`loading-option ${appearance.loadingVariant === option.id ? "is-active" : ""}`}
                        type="button"
                        role="radio"
                        aria-checked={appearance.loadingVariant === option.id}
                        key={option.id}
                        onClick={() =>
                          setAppearance((current) => ({
                            ...current,
                            loadingVariant: option.id
                          }))
                        }
                      >
                        <span className={`loading-mark loading-${option.id}`} aria-hidden="true">
                          <span />
                        </span>
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : (
          <>
            <header className="topbar">
              <div className="topbar-title">
                <div>
                  <h2>{activeConversation?.title ?? "没有会话"}</h2>
                  <p>
                    <FolderOpen aria-hidden="true" />
                    {activeConversation?.directory ?? "未选择目录"}
                  </p>
                </div>
              </div>
              <div className="topbar-actions">
                {activeConversation ? (
                  <div className={`status-pill status-${activeConversation.status}`} aria-live="polite">
                    {statusIcon[activeConversation.status]}
                    {statusText[activeConversation.status]}
                  </div>
                ) : null}
                {inspectorCollapsed ? (
                  <button
                    className="ghost-button compact topbar-inspector-toggle"
                    type="button"
                    onClick={() => setInspectorCollapsed(false)}
                    aria-label="展开本地会话信息"
                    title="展开"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </header>

            <div className="conversation-shell">
              {appearance.chatVideoUrl ? (
                <video className="chat-background-video" src={appearance.chatVideoUrl} autoPlay muted loop playsInline />
              ) : null}
              <div className="conversation-scroll" id="conversation-log" ref={scrollRef}>
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <EmptyConversation onPickFiles={pickFiles} />
                ) : (
                  <div className="message-stack">
                    {activeConversation.messages.map((message) => (
                      <article className={`message message-${message.role}`} key={message.id}>
                        {message.role === "assistant" ? (
                          <div className="avatar" aria-hidden="true">
                            <ClaudeMessageMark
                              processing={isMessageProcessing(message)}
                              loadingVariant={appearance.loadingVariant as LoadingVariant}
                              completed={completedMessageIds.has(message.id)}
                            />
                          </div>
                        ) : null}
                        <div className="message-content">
                          <div className="message-meta">{message.meta}</div>
                          <p className="message-body">{displayMessageBody(message.body)}</p>
                          {message.output ? <pre>{message.output}</pre> : null}
                          {permissionRequests[message.id] ? (
                            <PermissionCard request={permissionRequests[message.id]} onChoose={answerPermission} />
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <footer className="composer-panel" aria-label="发送给 Claude Code">
                {activeConversation?.attachments.length ? (
                  <div className="context-strip">
                    <Paperclip aria-hidden="true" />
                    当前会话已有 {activeConversation.attachments.length} 个本地附件记录
                  </div>
                ) : null}

                {composerFiles.length > 0 ? (
                  <div className="attachment-tray" aria-label="待发送附件">
                    {composerFiles.map((file) => (
                      <span className="file-chip" key={file.id}>
                        <Paperclip aria-hidden="true" />
                        <span>{file.name}</span>
                        {displayFileSize(file.size) ? <small>{displayFileSize(file.size)}</small> : null}
                        <button
                          type="button"
                          onClick={() => setComposerFiles((current) => current.filter((item) => item.id !== file.id))}
                          aria-label={`移除 ${file.name}`}
                        >
                          <X aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="composer">
                  <button className="icon-button" type="button" onClick={pickFiles} aria-label="添加本地文件">
                    <FilePlus2 aria-hidden="true" />
                  </button>
                  <label className="sr-only" htmlFor="task-input">
                    输入要发送给 Claude Code 的任务
                  </label>
                  <textarea
                    ref={textAreaRef}
                    id="task-input"
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      resizeComposer();
                    }}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="输入任务，或把文件拖进窗口..."
                    rows={1}
                  />
                  <button
                    className={`send-button ${sending ? "is-sending" : ""}`}
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || (!draft.trim() && composerFiles.length === 0)}
                  >
                    {sending ? <Loader2 aria-hidden="true" /> : <Send aria-hidden="true" />}
                    {sending ? "发送中" : "发送"}
                  </button>
                  <button
                    className="jump-user-button"
                    type="button"
                    onClick={jumpToPreviousUserMessage}
                    aria-label="跳到上一条我的消息"
                    title="跳到上一条我的消息"
                  />
                </div>
                <div className="composer-hints">
                  <span>Cmd / Ctrl + Enter 发送</span>
                  {appInfo?.mockClaude ? <span>Mock Claude 已启用</span> : null}
                </div>
                <input ref={fileInputRef} className="hidden-input" type="file" multiple onChange={handleBrowserFiles} />
              </footer>
            </div>
          </>
        )}
      </section>

      <aside className="inspector" aria-label="本地会话信息" aria-expanded={!inspectorCollapsed}>
        <header>
          <p className="eyebrow">Local session</p>
          <button
            className="ghost-button compact inspector-toggle"
            type="button"
            onClick={() => setInspectorCollapsed((value) => !value)}
            aria-label={inspectorCollapsed ? "展开本地会话信息" : "收起本地会话信息"}
            title={inspectorCollapsed ? "展开" : "收起"}
          >
            {inspectorCollapsed ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        </header>
        <div className="inspector-body" aria-hidden={inspectorCollapsed}>
          <section>
            <h3>发送预览</h3>
            <div className="path-preview">
              <ChevronDown aria-hidden="true" />
              <span>{activeConversation?.directory ?? "~/Documents/Codex"}</span>
            </div>
            <p className="muted">发送时会附带当前工作目录和待发送附件路径。</p>
          </section>
          <section>
            <h3>会话状态</h3>
            <ul className="status-list">
              <li>
                <span>本地 transcript</span>
                <strong>{activeConversation?.messages.length ?? 0} 条</strong>
              </li>
              <li>
                <span>附件记录</span>
                <strong>{activeConversation?.attachments.length ?? 0} 个</strong>
              </li>
              <li>
                <span>置顶</span>
                <strong>{activeConversation?.pinned ? "是" : "否"}</strong>
              </li>
            </ul>
          </section>
          <section>
            <h3>终端 Claude Code</h3>
            <p className="muted">{appInfo?.claudeCommand ?? "浏览器预览模式"}</p>
          </section>
        </div>
      </aside>

      {dragging ? (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <FilePlus2 />
            <strong>松开以添加到当前会话</strong>
            <span>文件会进入附件队列，发送时带上本地路径</span>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function PermissionCard({
  request,
  onChoose
}: {
  request: ClaudePermissionEvent;
  onChoose: (request: ClaudePermissionEvent, choice: ClaudePermissionChoice) => void;
}) {
  return (
    <div className="permission-card" role="group" aria-label="Claude Code 权限确认">
      <div>
        <strong>Claude Code 需要你确认</strong>
        <p>{request.prompt}</p>
      </div>
      <div className="permission-actions">
        {request.choices.map((choice) => (
          <button
            className={`permission-button permission-${choice.action}`}
            key={choice.action}
            type="button"
            onClick={() => onChoose(request, choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyConversation({ onPickFiles }: { onPickFiles: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">
        <img src={claudeMark} alt="" aria-hidden="true" />
      </div>
      <h2>开始一个干净的 Claude Code 会话</h2>
      <p>输入任务、拖入文件，或先添加附件。这里会保留整理后的双方对话和关键输出，不让完整终端噪音淹没工作。</p>
      <div className="empty-actions">
        <button className="soft-button" type="button" onClick={onPickFiles}>
          <FilePlus2 aria-hidden="true" />
          添加文件
        </button>
        <span>也可以直接把文件拖进窗口</span>
      </div>
    </div>
  );
}
