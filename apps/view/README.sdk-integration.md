# LangGraph SDK Frontend Integration

This document describes the Frontend SDK Integration and Thread UI implementation for the AI Trip Planner application.

## Overview

The frontend has been migrated to use LangGraph SDK endpoints (`/threads` and `/langgraph/threads/:threadId/stream`) instead of the legacy custom NDJSON streaming endpoint (`/agent/stream`). This integration includes:

1. **LangGraph Client Wrapper** - Type-safe client for backend SDK endpoints
2. **Thread Management UI** - Sidebar with conversation history
3. **New Chat Provider** - SDK-based state management
4. **Backward Compatibility** - Original implementation preserved

## Architecture

### Client Layer (`lib/langgraph-client.ts`)

The client wrapper provides the following functions:

```typescript
// Thread Management
createThread(title?: string): Promise<{ thread: ThreadMetadata }>
listThreads(limit?: number): Promise<{ threads: ThreadMetadata[] }>
getThread(threadId: string): Promise<{ thread: ThreadMetadata, messages: Message[] }>
deleteThread(threadId: string): Promise<void>

// Messaging
streamMessages(
  threadId: string,
  message: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void>
```

**Key Features:**
- NDJSON streaming parser for server-sent events
- Proper error handling with typed responses
- AbortController support for cancellation
- Uses existing `resolveApiUrl()` for environment-aware base URLs

### Type Definitions (`types.ts`)

New SDK types added:

```typescript
interface ThreadMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'COMPLETED';
  summary: {
    lastUserMessage: string | null;
    lastAssistantMessage: string | null;
    totalMessages: number;
  };
}

interface SDKMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any;
  createdAt: string;
}

interface StreamEvent {
  type: 'meta' | 'event' | 'complete' | 'error';
  event?: string;
  id?: string;
  data: any;
}
```

### State Management (`components/providers/chat-provider-sdk.tsx`)

New provider that:
- Manages thread state (current thread, thread list)
- Handles SDK streaming responses
- Extracts content from LangGraph event structures
- Parses structured payloads using existing `parseAgentResponse()`
- Maintains message history per thread
- Supports thread switching and deletion

**Key Methods:**
```typescript
const {
  messages,
  isSending,
  threadId,
  threads,
  sendMessage,
  createNewThread,
  switchThread,
  deleteThread,
  loadThreads,
} = useChatSDK();
```

### UI Components

#### `thread-item.tsx`
Individual thread list item showing:
- Thread title
- Last message preview
- Last updated date
- Message count
- Delete button (shown on hover)

#### `thread-list.tsx`
Thread list container with:
- "New Conversation" button
- Scrollable thread list
- Loading and error states
- Thread selection handling
- Thread deletion with confirmation

#### `thread-sidebar.tsx`
Responsive sidebar that:
- Shows thread list
- Collapses on mobile with overlay
- Integrates with chat context
- Handles thread creation and switching

### Layout Integration

#### `chat-app-sdk.tsx`
New chat application component that:
- Integrates ThreadSidebar
- Uses SDK provider hooks
- Loads threads on mount
- Creates initial thread if none exists
- Maintains same chat UI/UX as original

#### `app/page.tsx`
Updated to support both implementations:
```typescript
const useSdk = process.env.NEXT_PUBLIC_USE_SDK !== 'false';
if (useSdk) {
  return <ChatAppSDK />;
}
return <ChatApp />;
```

#### `app/layout.tsx`
Conditionally provides SDK or legacy provider:
```typescript
const useSdk = process.env.NEXT_PUBLIC_USE_SDK !== 'false';
<Providers useSdk={useSdk}>{children}</Providers>
```

## Backend API Integration

The frontend integrates with these backend endpoints:

### Thread Management
- `GET /threads?limit=20` - List threads
- `POST /threads` - Create new thread
- `GET /threads/:id` - Get thread with messages
- `DELETE /threads/:id` - Delete thread

### Streaming
- `POST /langgraph/threads/:threadId/stream` - Stream messages
  - Request: `{ message: string }`
  - Response: NDJSON stream of StreamEvent objects

## Event Processing

The SDK streaming implementation handles various LangGraph event structures:

1. **Meta Events** - Thread and run metadata
2. **Message Events** - Extract content from:
   - `data.messages[].content`
   - `data.chunk.content`
   - `data.content`
3. **Complete Events** - Final message parsing
4. **Error Events** - Error state handling

Content extraction is flexible to handle different event payloads from LangGraph.

## Environment Configuration

Control which implementation to use:

```bash
# Use SDK version (default)
NEXT_PUBLIC_USE_SDK=true

# Use legacy version
NEXT_PUBLIC_USE_SDK=false
```

## Backward Compatibility

The original implementation is preserved:
- `chat-provider.tsx` - Original provider (local thread state)
- `chat-app.tsx` - Original chat app (no sidebar)
- `/agent/stream` - Legacy endpoint still works

Set `NEXT_PUBLIC_USE_SDK=false` to revert to original behavior.

## Styling

Thread UI follows existing design system:
- Uses shadcn/ui components (Button, Card)
- Matches existing color variables from `globals.css`
- Responsive design with mobile overlay
- Smooth transitions and hover states

## Testing Recommendations

1. **Thread Operations**
   - Create new threads
   - Switch between threads
   - Delete threads (with confirmation)
   - Verify thread list updates

2. **Messaging**
   - Send messages in new threads
   - Send messages in existing threads
   - Verify message persistence
   - Test streaming updates

3. **Error Handling**
   - Backend unavailable
   - Invalid thread IDs
   - Network errors during streaming
   - Thread deletion errors

4. **Responsive Design**
   - Sidebar collapse on mobile
   - Overlay dismiss on mobile
   - Thread selection on mobile

5. **Backward Compatibility**
   - Toggle SDK flag
   - Verify legacy mode works
   - Compare behavior

## Known Limitations

1. **Event Content Extraction**: The SDK sends various event structures. Current implementation has fallbacks but may need adjustments based on actual LangGraph assistant configuration.

2. **Thread Title**: Currently uses first user message or generic "Nova Conversa". Consider implementing automatic title generation on backend.

3. **Message Sync**: Backend syncs messages after stream completes. Frontend assumes success but doesn't verify sync.

4. **Optimistic Updates**: Thread list doesn't update optimistically during message sending.

## Future Enhancements

1. **Thread Rename**: Add ability to rename threads
2. **Thread Search**: Search threads by content
3. **Thread Filters**: Active/Completed status filtering
4. **Message Editing**: Edit user messages
5. **Thread Export**: Export conversation history
6. **Real-time Updates**: WebSocket for thread list updates
7. **Infinite Scroll**: Paginated thread loading
8. **Thread Tags**: Categorize threads

## Files Modified/Created

### Created
- `lib/langgraph-client.ts` - SDK client wrapper
- `components/thread/thread-item.tsx` - Thread list item
- `components/thread/thread-list.tsx` - Thread list container
- `components/thread/thread-sidebar.tsx` - Responsive sidebar
- `components/providers/chat-provider-sdk.tsx` - SDK provider
- `components/chat-app-sdk.tsx` - Chat app with sidebar
- `README.sdk-integration.md` - This documentation

### Modified
- `types.ts` - Added SDK types
- `components/providers/providers.tsx` - Added SDK toggle
- `app/layout.tsx` - Conditional provider usage
- `app/page.tsx` - Conditional app component

### Preserved (Unchanged)
- `components/providers/chat-provider.tsx` - Legacy provider
- `components/chat-app.tsx` - Legacy chat app
- All other existing components

## Deployment Notes

1. Ensure backend LangGraph assistant is configured:
   ```bash
   LANGGRAPH_ASSISTANT_ID=your-assistant-id
   ```

2. Set frontend SDK flag (default is enabled):
   ```bash
   NEXT_PUBLIC_USE_SDK=true
   ```

3. Verify database migrations are applied for thread/message tables

4. Test streaming endpoint returns expected event structures

5. Monitor backend logs for message sync operations
