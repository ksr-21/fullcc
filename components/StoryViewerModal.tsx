
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Story, User, Group } from '../types';
import Avatar from './Avatar';
import StoryViewersList from './StoryViewersList';
import { CloseIcon, OptionsIcon, TrashIcon, SendIcon, UsersIcon, HeartIcon, HeartIconSolid } from './Icons';

interface StoryViewerModalProps {
  stories: Story[];
  users: { [key: string]: User };
  groups: Group[];
  currentUser: User;
  startEntityId: string;
  onClose: () => void;
  onMarkStoryAsViewed: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onReplyToStory: (authorId: string, text: string) => void;
  onLikeStory: (storyId: string) => void;
}

const StoryProgressBar: React.FC<{ count: number; currentIndex: number; isPaused: boolean; currentEntityId: string }> = ({ count, currentIndex, isPaused, currentEntityId }) => {
    return (
        <div className="flex items-center gap-1 w-full">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    {index < currentIndex && <div className="h-full w-full bg-white" />}
                    {index === currentIndex && (
                        <div
                            key={`${currentEntityId}-${currentIndex}`} // Force re-render/restart animation
                            className={`relative h-full bg-white progress-bar-shimmer ${!isPaused ? 'animate-progress' : ''}`}
                            style={{ 
                                transformOrigin: 'left',
                                animationPlayState: isPaused ? 'paused' : 'running'
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};


const StoryViewerModal: React.FC<StoryViewerModalProps> = (props) => {
    const { stories, users, groups, currentUser, startEntityId, onClose, onMarkStoryAsViewed, onDeleteStory, onReplyToStory, onLikeStory } = props;

    const orderedEntities = useMemo(() => {
        const storiesByEntity = stories.reduce((acc, story) => {
            const entityId = story.groupId ? `group-${story.groupId}` : `user-${story.authorId}`;
            (acc[entityId] = acc[entityId] || []).push(story);
            return acc;
        }, {} as Record<string, Story[]>);

        const entityIdsWithStories = Object.keys(storiesByEntity).filter(id => {
            if (id.startsWith('group-')) {
                const groupId = id.split('-')[1];
                return groups.some(g => g.id === groupId) && (currentUser.followingGroups || []).includes(groupId);
            }
            return !!users[id.split('-')[1]];
        });
        
        const currentUserStoryId = `user-${currentUser.id}`;

        return entityIdsWithStories.sort((a, b) => {
            // 1. The story that was clicked to open the viewer always comes first.
            if (a === startEntityId) return -1;
            if (b === startEntityId) return 1;
    
            // 2. The current user's own story is prioritized next.
            if (a === currentUserStoryId) return -1;
            if (b === currentUserStoryId) return 1;
            
            // 3. Stories with unviewed content come after that.
            // FIX: Safely access viewedBy
            const aHasUnviewed = storiesByEntity[a].some(s => !(s.viewedBy || []).includes(currentUser.id));
            const bHasUnviewed = storiesByEntity[b].some(s => !(s.viewedBy || []).includes(currentUser.id));
            if (aHasUnviewed && !bHasUnviewed) return -1;
            if (!aHasUnviewed && bHasUnviewed) return 1;
    
            // 4. Finally, sort all others by the timestamp of their most recent story.
            const aLatest = Math.max(...storiesByEntity[a].map(s => s.timestamp));
            const bLatest = Math.max(...storiesByEntity[b].map(s => s.timestamp));
            return bLatest - aLatest;
        });
    }, [stories, users, groups, startEntityId, currentUser.id, currentUser.followingGroups]);

    const [currentEntityIndex, setCurrentEntityIndex] = useState(() => orderedEntities.indexOf(startEntityId));
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isViewersListOpen, setIsViewersListOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    
    const activeEntityId = orderedEntities[currentEntityIndex];
    const [activeEntityType, activeId] = activeEntityId ? activeEntityId.split('-') : [null, null];

    const activeEntity = useMemo(() => {
        if (!activeId) return null;
        if (activeEntityType === 'group') {
            return groups.find(g => g.id === activeId) || null;
        }
        return users[activeId] || null;
    }, [activeEntityType, activeId, users, groups]);
    
    const activeEntityStories = useMemo(() => {
        if (!activeEntityId) return [];
        return stories.filter(s => {
            const storyEntityId = s.groupId ? `group-${s.groupId}` : `user-${s.authorId}`;
            return storyEntityId === activeEntityId;
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [stories, activeEntityId]);
    
    const activeStory = activeEntityStories[currentStoryIndex];
    const isGroupStory = activeEntityType === 'group';

    const canDelete = useMemo(() => {
        if (!activeStory) return false;
        if (currentUser.tag === 'Director') return true;
        const isAuthor = currentUser.id === activeStory.authorId;
        if (isAuthor) return true;

        const isHod = currentUser.tag === 'HOD/Dean';
        if (isHod) {
             const storyAuthor = users[activeStory.authorId];
             if (storyAuthor && storyAuthor.collegeId === currentUser.collegeId && storyAuthor.department === currentUser.department) {
                 return true;
             }
        }
        
        if (isGroupStory) {
            const group = groups.find(g => g.id === activeStory.groupId);
            return !!(group && group.creatorId === currentUser.id);
        }
        return false;
    }, [activeStory, currentUser, isGroupStory, groups, users]);

    const isLiked = activeStory?.likedBy?.includes(currentUser.id);

    const goToNextStory = useCallback(() => {
        if (currentStoryIndex < activeEntityStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentEntityIndex < orderedEntities.length - 1) {
            setCurrentEntityIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
        } else {
            onClose();
        }
    }, [currentStoryIndex, activeEntityStories.length, currentEntityIndex, orderedEntities.length, onClose]);

    const goToPrevStory = useCallback(() => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentEntityIndex > 0) {
            const prevEntityIndex = currentEntityIndex - 1;
            const prevEntityId = orderedEntities[prevEntityIndex];
            const prevEntityStories = stories.filter(s => {
                const storyEntityId = s.groupId ? `group-${s.groupId}` : `user-${s.authorId}`;
                return storyEntityId === prevEntityId;
            });
            setCurrentEntityIndex(prevEntityIndex);
            setCurrentStoryIndex(prevEntityStories.length - 1);
        }
    }, [currentStoryIndex, currentEntityIndex, orderedEntities, stories]);

    useEffect(() => {
        if (activeEntityStories.length > 0 && currentStoryIndex >= activeEntityStories.length) {
            setCurrentStoryIndex(activeEntityStories.length - 1);
        } else if (activeEntityStories.length === 0 && activeEntityId) {
            goToNextStory();
        }
    }, [activeEntityStories, currentStoryIndex, activeEntityId, goToNextStory]);

    useEffect(() => {
        // FIX: Safely access viewedBy
        if (activeStory && !(activeStory.viewedBy || []).includes(currentUser.id)) {
            onMarkStoryAsViewed(activeStory.id);
        }
    }, [activeStory, currentUser.id, onMarkStoryAsViewed]);
    
    useEffect(() => {
        if (isPaused) return;
        const timer = setTimeout(goToNextStory, 5000);
        return () => clearTimeout(timer);
    }, [currentStoryIndex, currentEntityIndex, isPaused, goToNextStory]);
    
    const handleDelete = () => {
        if (!activeStory || !window.confirm("Are you sure you want to delete this story?")) return;
        onDeleteStory(activeStory.id);
        setIsOptionsMenuOpen(false);
    };

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (replyText.trim() && activeEntity) {
            const authorId = activeStory.authorId; // Reply to the person who posted it
            const text = isGroupStory ? `Replied to ${activeEntity.name}'s story: ${replyText.trim()}` : replyText.trim();
            onReplyToStory(authorId, text);
            setReplyText('');
        }
    };

    if (!activeEntity || !activeStory) {
        if (orderedEntities.length === 0) onClose();
        return null;
    }
    
    const textClasses = `${activeStory.fontSize || 'text-3xl'} ${activeStory.fontFamily || 'font-sans'} ${activeStory.fontWeight || 'font-bold'}`;
    const hasMedia = !!activeStory.mediaUrl;

    return (
        // Increased z-index to z-[60] to ensure it overlays other UI elements including bottom bar
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex justify-center items-center animate-fade-in" role="dialog" aria-modal="true">
            <div 
                className="relative z-10 w-[88vw] max-w-[400px] h-[82vh] bg-gray-900 rounded-[32px] overflow-hidden flex flex-col shadow-2xl my-auto border border-white/10"
                onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}
            >
                 {/* Background/Media */}
                 {hasMedia ? (
                     <img 
                        src={activeStory.mediaUrl} 
                        alt="Story" 
                        className="absolute inset-0 w-full h-full object-contain bg-black" 
                     />
                 ) : (
                    <div className={`absolute inset-0 transition-colors duration-300 ${activeStory.backgroundColor || 'bg-slate-800'}`}></div>
                 )}
                
                {/* Dim Gradient for Visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>
                
                {/* Navigation Overlay (Invisible Touch Areas) */}
                <div className="absolute inset-0 flex z-20">
                    <div 
                        className="w-1/3 h-full" 
                        onMouseDown={e => e.stopPropagation()} 
                        onMouseUp={e => e.stopPropagation()} 
                        onClick={goToPrevStory} 
                    />
                    <div className="flex-1 h-full" />
                    <div 
                        className="w-1/3 h-full"
                        onMouseDown={e => e.stopPropagation()} 
                        onMouseUp={e => e.stopPropagation()} 
                        onClick={goToNextStory} 
                    />
                </div>

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 z-30">
                     <StoryProgressBar count={activeEntityStories.length} currentIndex={currentStoryIndex} isPaused={isPaused} currentEntityId={activeEntityId}/>
                     <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => console.log("View profile")}>
                            {isGroupStory ? (
                                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-white/20">
                                    <UsersIcon className="w-6 h-6"/>
                                </div>
                            ) : (
                                <Avatar src={(activeEntity as User).avatarUrl} name={activeEntity.name} size="md" className="border-2 border-white/20"/>
                            )}
                            <div>
                                <span className="text-white font-bold text-sm shadow-sm block leading-none mb-0.5">{activeEntity.name}</span>
                                <span className="text-xs text-white/70">{new Date(activeStory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                             {canDelete && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsOptionsMenuOpen(prev => !prev)}
                                        className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full"
                                    >
                                        <OptionsIcon className="w-5 h-5"/>
                                    </button>
                                    {isOptionsMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-36 bg-card rounded-md shadow-lg py-1 border border-border z-30">
                                            <button
                                                onClick={handleDelete}
                                                className="flex items-center w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted"
                                            >
                                                <TrashIcon className="w-4 h-4 mr-2"/>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                             )}
                            <button onClick={onClose} className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                 {/* Content Area */}
                 <div className="flex-1 flex items-center justify-center p-6 pointer-events-none z-10 relative">
                    {/* If it's a text-only story, show large text in center. If media story with caption, show text at bottom */}
                    {!hasMedia && activeStory.textContent && (
                        <p className={`text-white text-center break-words whitespace-pre-wrap shadow-lg ${textClasses}`}>{activeStory.textContent}</p>
                    )}
                </div>
                
                 {/* Footer / Reply / Caption */}
                 <div className="absolute bottom-0 left-0 right-0 p-4 z-30 flex flex-col gap-2">
                    {hasMedia && activeStory.textContent && (
                        <div className="bg-black/50 backdrop-blur-sm p-3 rounded-xl text-center mb-2">
                            <p className="text-white text-sm font-medium">{activeStory.textContent}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {/* Like Button */}
                        <button 
                            onClick={() => onLikeStory(activeStory.id)}
                            className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all active:scale-95 group"
                        >
                            {isLiked ? (
                                <HeartIconSolid className="w-6 h-6 text-red-500 animate-bounce-in" />
                            ) : (
                                <HeartIcon className="w-6 h-6 text-white group-hover:text-red-400 transition-colors" />
                            )}
                        </button>

                        {canDelete ? (
                            <button onClick={() => { setIsViewersListOpen(true); setIsPaused(true); }} className="flex-1 text-white text-sm font-bold bg-black/40 backdrop-blur-md px-4 py-3 rounded-full hover:bg-black/50 transition-colors flex items-center justify-center gap-2">
                               <UsersIcon className="w-4 h-4"/> {(activeStory.viewedBy || []).length} Viewers
                            </button>
                        ) : (
                            <form onSubmit={handleReplySubmit} className="flex-1 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Reply..."
                                    className="flex-1 bg-black/40 border border-white/20 rounded-full px-5 py-3 focus:outline-none focus:border-white/50 text-white placeholder:text-white/60 text-sm backdrop-blur-md transition-all"
                                />
                                <button type="submit" className="p-3 rounded-full text-white bg-teal-500/90 hover:bg-teal-600 disabled:opacity-50 shadow-lg transition-transform active:scale-95" disabled={!replyText.trim()}>
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {isViewersListOpen && (
                <StoryViewersList
                    viewedBy={activeStory.viewedBy || []}
                    users={users}
                    onClose={() => { setIsViewersListOpen(false); setIsPaused(false); }}
                />
            )}
        </div>
    );
};

export default StoryViewerModal;
