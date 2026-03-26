import React, { useState, useMemo, useEffect } from 'react';
import type { User, Group, Post } from '../types';
import Avatar from './Avatar';
import { SendIcon, RepostIcon, MessageIcon } from './Icons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onShareToUsers: (userIds: string[]) => void;
  postToShare: Post;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  groups: Group[];
  defaultTab?: 'share' | 'message';
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, currentUser, users, onShareToUsers, postToShare, onSharePost, groups, defaultTab }) => {
  const [activeTab, setActiveTab] = useState<'share' | 'message'>(defaultTab || 'share');
  
  // State for "Share as Post" tab
  const [commentary, setCommentary] = useState('');
  const [shareTarget, setShareTarget] = useState('feed'); // 'feed' or group ID

  // State for "Send as Message" tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
        setActiveTab(defaultTab || 'share');
        setCommentary('');
        setSearchTerm('');
        setSelectedUserIds([]);
    }
  }, [isOpen, defaultTab]);

  const userMemberGroups = useMemo(() => {
    return groups.filter(g => g.memberIds.includes(currentUser.id));
  }, [groups, currentUser.id]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.id !== currentUser.id &&
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, currentUser, searchTerm]);

  if (!isOpen) return null;

  const handleShareSubmit = () => {
    const target = shareTarget === 'feed' 
      ? { type: 'feed' as 'feed' } 
      : { type: 'group' as 'group', id: shareTarget };
    onSharePost(postToShare, commentary, target);
    onClose();
  };

  const handleSendAsMessages = () => {
    onShareToUsers(selectedUserIds);
    onClose();
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg flex flex-col h-full max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground text-center p-4 border-b border-border">Share Post</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab('share')} className={`flex-1 flex justify-center items-center space-x-2 py-3 text-sm font-medium ${activeTab === 'share' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-primary'}`}>
            <RepostIcon className="w-5 h-5"/> <span>Share Post</span>
          </button>
          <button onClick={() => setActiveTab('message')} className={`flex-1 flex justify-center items-center space-x-2 py-3 text-sm font-medium ${activeTab === 'message' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-primary'}`}>
            <MessageIcon className="w-5 h-5"/> <span>Send as Message</span>
          </button>
        </div>

        {activeTab === 'share' && (
          <div className="p-4 space-y-4 flex-1 flex flex-col">
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="Say something about this..."
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
            />
            <div className="flex items-center gap-2">
                <label htmlFor="share-target" className="text-sm font-medium text-text-muted flex-shrink-0">Share to:</label>
                <select 
                    id="share-target"
                    value={shareTarget} 
                    onChange={e => setShareTarget(e.target.value)}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="feed">My Feed</option>
                    {userMemberGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex-1"></div> {/* Spacer */}
            <button
                onClick={handleShareSubmit}
                className="w-full bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
            >
                Post
            </button>
          </div>
        )}

        {activeTab === 'message' && (
           <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-3">
                    <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search for people..."
                    className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />

                    {selectedUserIds.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            {selectedUserIds.map(uid => {
                                const user = users.find(u => u.id === uid);
                                if (!user) return null;
                                return (
                                    <div key={uid} className="flex-shrink-0 relative group">
                                        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                                        <button
                                            onClick={() => toggleUserSelection(uid)}
                                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                onClick={() => toggleUserSelection(user.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <Avatar src={user.avatarUrl} name={user.name} size="md" />
                                    <div>
                                        <p className="font-semibold text-card-foreground">{user.name}</p>
                                        <p className="text-sm text-text-muted">{user.department}</p>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedUserIds.includes(user.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                                    {selectedUserIds.includes(user.id) && <span className="text-white text-[10px] font-black">✓</span>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-text-muted p-8">No users found.</p>
                    )}
                </div>
                {selectedUserIds.length > 0 && (
                    <div className="p-4 border-t border-border">
                        <button
                            onClick={handleSendAsMessages}
                            className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            Send to {selectedUserIds.length} {selectedUserIds.length === 1 ? 'person' : 'people'}
                        </button>
                    </div>
                )}
           </div>
        )}

      </div>
    </div>
  );
};

export default ShareModal;