import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { User, Conversation, Message } from '../types';
import Avatar from '../components/Avatar';
import { SendIcon, ArrowLeftIcon, OptionsIcon, TrashIcon, CloseIcon, UsersIcon } from './Icons';

interface ChatPanelProps {
  conversation: Conversation;
  currentUser: User;
  users: { [key: string]: User };
  onSendMessage: (conversationId: string, text: string) => void;
  onDeleteMessagesForEveryone: (conversationId: string, messageIds: string[]) => void;
  onDeleteMessagesForSelf: (conversationId: string, messageIds: string[]) => void;
  onClose: () => void; 
  onNavigate: (path: string) => void;
}

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const isSameDay = (ts1: number, ts2: number) => {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

const formatDateSeparator = (timestamp: number) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (messageDate >= startOfToday) {
        return 'Today';
    } else if (messageDate >= startOfYesterday) {
        return 'Yesterday';
    } else {
        return messageDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    }
};

const DeleteMessageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    canDeleteForEveryone: boolean;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
}> = ({ isOpen, onClose, canDeleteForEveryone, onDeleteForMe, onDeleteForEveryone }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-xs border border-border" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-center mb-4 text-foreground">Delete message(s)?</h3>
                <div className="space-y-3">
                    {canDeleteForEveryone && (
                        <button onClick={onDeleteForEveryone} className="w-full text-left p-3 rounded-xl hover:bg-muted text-destructive font-bold transition-colors">Delete for everyone</button>
                    )}
                    <button onClick={onDeleteForMe} className="w-full text-left p-3 rounded-xl hover:bg-muted text-foreground font-bold transition-colors">Delete for me</button>
                    <button onClick={onClose} className="w-full p-3 rounded-xl hover:bg-muted text-center font-bold text-muted-foreground transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const ChatPanel: React.FC<ChatPanelProps> = ({ conversation, currentUser, users, onSendMessage, onDeleteMessagesForEveryone, onDeleteMessagesForSelf, onClose, onNavigate }) => {
  const [text, setText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const prevMessagesLength = useRef(conversation.messages.length);

  const isGroupChat = conversation.isGroupChat;
  const otherParticipantId = !isGroupChat ? conversation.participantIds.find(id => id !== currentUser.id) : null;
  const otherUser = otherParticipantId ? users[otherParticipantId] : null;
  const chatName = isGroupChat ? conversation.name : otherUser?.name;

  const isSelectionMode = selectedMessages.length > 0;

  // Filter out messages deleted for self
  const visibleMessages = useMemo(() => {
    return conversation.messages.filter(msg => {
        if (msg.deletedFor && msg.deletedFor.includes(currentUser.id)) return false;
        return true;
    });
  }, [conversation.messages, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    prevMessagesLength.current = conversation.messages.length;
  }, [conversation.id]);

  useEffect(() => {
    const currentMessagesLength = visibleMessages.length;
    if (currentMessagesLength > prevMessagesLength.current) {
      const messagesContainer = messagesContainerRef.current;
      if (messagesContainer) {
        const lastMessage = visibleMessages[currentMessagesLength - 1];
        const isFromCurrentUser = lastMessage.senderId === currentUser.id;
        const scrollThreshold = 150;
        const isScrolledNearBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + scrollThreshold;

        if (isFromCurrentUser || isScrolledNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    prevMessagesLength.current = currentMessagesLength;
  }, [visibleMessages, currentUser.id]);

  useEffect(() => {
    setSelectedMessages([]);
  }, [conversation.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(conversation.id, text.trim());
      setText('');
    }
  };
  
  const handleMessageTap = (messageId: string, isDeleted: boolean) => {
    if (wasLongPress.current) {
        wasLongPress.current = false;
        return;
    }
    if (isDeleted) return;

    if (isSelectionMode) {
        setSelectedMessages(prev => 
            prev.includes(messageId)
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId]
        );
    }
  };

  const handleLongPressStart = (messageId: string, isDeleted: boolean) => {
    if (isDeleted) return;

    wasLongPress.current = false;
    longPressTimerRef.current = setTimeout(() => {
        wasLongPress.current = true;
        if (!selectedMessages.includes(messageId)) {
            setSelectedMessages(prev => [...prev, messageId]);
        }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleDeleteTrigger = () => {
    setIsDeleteModalOpen(true);
  };
  
  const canDeleteForEveryone = useMemo(() => {
      if (selectedMessages.length === 0) return false;
      const messagesToDelete = conversation.messages.filter(m => selectedMessages.includes(m.id));
      return messagesToDelete.every(m => m.senderId === currentUser.id && !m.isDeleted);
  }, [selectedMessages, conversation.messages, currentUser.id]);

  if (!isGroupChat && !otherUser) {
      return <div className="flex-1 flex items-center justify-center text-muted-foreground">User not found</div>;
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      {isSelectionMode ? (
        <div className="p-3 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10 animate-slide-down">
             <button onClick={() => setSelectedMessages([])} className="p-2 rounded-full hover:bg-muted text-foreground">
                <CloseIcon className="w-6 h-6" />
            </button>
            <p className="font-bold text-foreground">{selectedMessages.length} Selected</p>
            <button onClick={handleDeleteTrigger} className="p-2 rounded-full hover:bg-muted text-destructive">
                <TrashIcon className="w-6 h-6" />
            </button>
        </div>
      ) : (
        <div className="p-3 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-muted">
                    <ArrowLeftIcon className="w-6 h-6 text-foreground" />
                </button>
                {isGroupChat ? (
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                        <UsersIcon className="w-6 h-6"/>
                    </div>
                ) : (
                    <div className="cursor-pointer" onClick={() => onNavigate(`#/profile/${otherUser.id}`)}>
                        <Avatar src={otherUser.avatarUrl} name={otherUser.name} size="md" />
                    </div>
                )}
                <div className={!isGroupChat && otherUser ? "cursor-pointer flex-1 overflow-hidden" : "flex-1 overflow-hidden"} onClick={!isGroupChat && otherUser ? () => onNavigate(`#/profile/${otherUser.id}`) : undefined}>
                    <p className="font-bold text-foreground truncate">{chatName}</p>
                    {isGroupChat ? (
                         <p className="text-xs text-muted-foreground">{conversation.participantIds.length} members</p>
                    ) : (
                        <p className="text-xs text-muted-foreground truncate">{otherUser?.department}</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 chat-background-panel">
        {visibleMessages.map((msg, index) => {
          const sender = users[msg.senderId];
          const isCurrentUser = msg.senderId === currentUser.id;
          const isSelected = selectedMessages.includes(msg.id);
          const isDeleted = msg.isDeleted; 
          
          const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
          const showDateSeparator = !prevMessage || !isSameDay(msg.timestamp, prevMessage.timestamp);

          // Logic to identify if this is a shared post
          const isSharedPost = !isDeleted && msg.text.startsWith('Shared a post from');
          let sharedHeader = '';
          let sharedContent = msg.text;

          if (isSharedPost) {
              const parts = msg.text.split(':\n');
              if (parts.length > 1) {
                  sharedHeader = parts[0];
                  // Re-join parts after first split to handle colons in content
                  sharedContent = parts.slice(1).join(':\n').replace(/^"|"$/g, ''); 
              }
          }

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="bg-background/60 backdrop-blur-sm text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full border border-border">
                    {formatDateSeparator(msg.timestamp)}
                  </span>
                </div>
              )}
              <div 
                  className={`flex items-end gap-2 animate-bubble-in ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  onClick={() => handleMessageTap(msg.id, !!isDeleted)}
                  onMouseDown={() => handleLongPressStart(msg.id, !!isDeleted)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(msg.id, !!isDeleted)}
                  onTouchEnd={handleLongPressEnd}
              >
                  {!isCurrentUser && sender && <Avatar src={sender.avatarUrl} name={sender.name} size="sm" />}
                  <div className={`flex flex-col max-w-xs md:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    {conversation.isGroupChat && sender && (
                        <p className="text-xs text-muted-foreground mb-1 px-3">{isCurrentUser ? 'You' : sender.name}</p>
                    )}
                  <div className={`group relative transition-all ${
                      isSharedPost ? 'p-0 overflow-hidden' : 'p-3' 
                  } rounded-2xl ${
                      isSelected 
                        ? 'bg-primary/30 border border-primary/50' 
                        : (isDeleted 
                            ? 'bg-muted border border-border/50 text-muted-foreground italic p-3'
                            : (isSharedPost
                                ? 'bg-[#262626] border border-zinc-800 shadow-xl w-full max-w-[280px]' // Dark Instagram-like card
                                : (isCurrentUser 
                                    ? 'bg-gradient-to-br from-primary to-blue-600 text-primary-foreground rounded-br-lg shadow-sm' 
                                    : 'bg-card text-card-foreground border border-border rounded-bl-lg shadow-sm'
                                  )
                              )
                          )
                  }`}>
                      {/* --- SHARED POST LAYOUT --- */}
                      {isSharedPost ? (
                          <div className="flex flex-col w-full">
                              {/* Header: Avatar + Author */}
                              <div className="flex items-center gap-2 p-2.5 bg-black/20 border-b border-white/5">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[1px] flex-shrink-0">
                                      <div className="w-full h-full rounded-full bg-[#262626] flex items-center justify-center text-[8px] font-bold text-white">
                                          {sharedHeader.charAt(0) || 'U'}
                                      </div>
                                  </div>
                                  <span className="text-xs font-bold text-white/90 truncate">{sharedHeader}</span>
                              </div>
                              
                              {/* Image (if exists) */}
                              {msg.image && (
                                  <div className="w-full bg-black flex justify-center">
                                      <img 
                                        src={msg.image} 
                                        alt="Shared content" 
                                        className="w-full h-auto max-h-72 object-cover" 
                                      />
                                  </div>
                              )}
                              
                              {/* Content */}
                              <div className="p-3">
                                  <p className="whitespace-pre-wrap break-words text-sm text-white/90 leading-relaxed">
                                      <span className="font-bold text-white mr-1">{sharedHeader}</span>
                                      {sharedContent}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          // REGULAR MESSAGE
                          <>
                            {!isDeleted && msg.image && (
                                <img 
                                    src={msg.image} 
                                    alt="Sent image" 
                                    className="rounded-lg mb-2 max-h-64 w-full object-cover border border-white/10" 
                                />
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
                          </>
                      )}
                  </div>
                   <p className={`text-[10px] text-muted-foreground mt-1 px-1`}>{formatTimestamp(msg.timestamp)}</p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-input border border-border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground transition shadow-sm placeholder:text-muted-foreground font-medium"
          />
          <button type="submit" className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:scale-100 transition-transform transform hover:scale-110" disabled={!text.trim()}>
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        canDeleteForEveryone={canDeleteForEveryone}
        onDeleteForEveryone={() => {
            onDeleteMessagesForEveryone(conversation.id, selectedMessages);
            setIsDeleteModalOpen(false);
            setSelectedMessages([]);
        }}
        onDeleteForMe={() => {
            onDeleteMessagesForSelf(conversation.id, selectedMessages);
            setIsDeleteModalOpen(false);
            setSelectedMessages([]);
        }}
      />
    </div>
  );
};

export default ChatPanel;
