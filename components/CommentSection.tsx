
import React, { useState, useMemo } from 'react';
import type { Comment, User } from '../types';
import Avatar from './Avatar';
import { SendIcon, TrashIcon } from './Icons';

interface CommentSectionProps {
  comments: Comment[];
  users: { [key: string]: User };
  currentUser: User;
  onAddComment: (text: string) => void;
  postAuthorId: string;
  onDeleteComment: (commentId: string) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, users, currentUser, onAddComment, postAuthorId, onDeleteComment }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const text = newComment.trim();
    if (text) {
      if (parentId) {
          onAddComment(`@${users[comments.find(c => c.id === parentId)?.authorId!]?.name} ${text} [reply:${parentId}]`);
      } else {
          onAddComment(text);
      }
      setNewComment('');
      setReplyingTo(null);
    }
  };

  // Helper to structure comments into a tree
  const structuredComments = useMemo(() => {
      const roots: (Comment & { replies: Comment[] })[] = [];
      const map = new Map<string, Comment & { replies: Comment[] }>();

      const sorted = [...comments].sort((a, b) => a.timestamp - b.timestamp);

      sorted.forEach(c => {
          map.set(c.id, { ...c, replies: [] });
      });

      sorted.forEach(c => {
          const node = map.get(c.id)!;
          const replyMatch = c.text.match(/\[reply:(.+?)\]$/);
          const parentId = replyMatch ? replyMatch[1] : null;
          
          if (parentId && map.has(parentId)) {
              map.get(parentId)!.replies.push(node);
              // Remove the tag from text for display
              node.text = node.text.replace(/\[reply:.+?\]$/, '').trim();
          } else {
              roots.push(node);
          }
      });

      return roots;
  }, [comments]);

  const renderComment = (comment: Comment & { replies?: Comment[] }, isReply = false) => {
      const author = users[comment.authorId];
      if (!author) return null;

      let canDelete = currentUser.id === comment.authorId || currentUser.id === postAuthorId || currentUser.tag === 'Director';
      if (!canDelete && currentUser.tag === 'HOD/Dean') {
          if (author.collegeId === currentUser.collegeId && author.department === currentUser.department) {
              canDelete = true;
          }
      }

      return (
          <div key={comment.id} className={`group flex flex-col ${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
              <div className="flex items-start space-x-3">
                  <Avatar src={author.avatarUrl} name={author.name} size="sm" />
                  <div className="flex-1">
                      <div className="bg-muted p-3 rounded-2xl flex justify-between items-start shadow-sm">
                          <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-xs">{author.name}</p>
                              <p className="text-foreground text-sm mt-0.5 break-words">{comment.text}</p>
                          </div>
                          {canDelete && (
                              <button onClick={() => onDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity">
                                  <TrashIcon className="w-3.5 h-3.5"/>
                              </button>
                          )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-2">
                          <p className="text-[10px] text-muted-foreground font-medium">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <button
                            onClick={() => {
                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                if (replyingTo !== comment.id) {
                                    setNewComment('');
                                }
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                          >
                              Reply
                          </button>
                      </div>

                      {replyingTo === comment.id && (
                          <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3 flex items-center gap-2 animate-fade-in">
                              <div className="relative flex-1">
                                  <input
                                      autoFocus
                                      type="text"
                                      value={newComment}
                                      onChange={(e) => setNewComment(e.target.value)}
                                      placeholder={`Reply to ${author.name}...`}
                                      className="w-full bg-input border border-border rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                  />
                              </div>
                              <button type="submit" disabled={!newComment.trim()} className="p-2 rounded-full bg-primary text-white disabled:opacity-50 transition-all active:scale-95">
                                  <SendIcon className="w-4 h-4" />
                              </button>
                          </form>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
                          <div className="space-y-1">
                              {comment.replies.map(reply => renderComment(reply, true))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="pt-4">
      {/* Root Comment Input */}
      {!replyingTo && (
        <form onSubmit={(e) => handleSubmit(e)} className="flex items-center space-x-2 mb-6">
            <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="md" />
            <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-input border border-border rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm shadow-sm transition-all"
            />
            <button type="submit" className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95" disabled={!newComment.trim()}>
            <SendIcon className="w-5 h-5" />
            </button>
        </form>
      )}

      {/* Comment List */}
      <div className="space-y-2">
        {structuredComments.map(comment => renderComment(comment))}
      </div>
    </div>
  );
};

export default CommentSection;
