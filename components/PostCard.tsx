import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Post, User, Group, ReactionType, ConfessionMood } from '../types';
import Avatar from './Avatar';
import CommentSection from './CommentSection';
import ShareModal from './ShareModal';
import ReactionsModal from './ReactionsModal';
import { CommentIcon, SendIcon, CalendarIcon, GhostIcon, LikeIcon, BriefcaseIcon, LinkIcon, TrashIcon, BookmarkIcon, BookmarkIconSolid, OptionsIcon, CloseIcon, ArrowLeftIcon, ArrowRightIcon, MapPinIcon, ClockIcon, SparkleIcon } from './Icons';

interface PostCardProps {
  post: Post;
  author: User;
  currentUser: User;
  users: { [key: string]: User };
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessage: (conversationId: string, authorName: string, postContent: string, imageUrl?: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
  groups: Group[];
  onNavigate: (path: string) => void;
  animationIndex?: number;
  onViewImage?: (url: string) => void;
}

const reactionsList: { type: ReactionType; emoji: string; color: string; label: string }[] = [
    { type: 'like', emoji: '👍', color: 'text-blue-500', label: 'Like' },
    { type: 'love', emoji: '❤️', color: 'text-red-500', label: 'Love' },
    { type: 'haha', emoji: '😂', color: 'text-yellow-500', label: 'Haha' },
    { type: 'wow', emoji: '😮', color: 'text-sky-500', label: 'Wow' },
    { type: 'sad', emoji: '😢', color: 'text-yellow-500', label: 'Sad' },
    { type: 'angry', emoji: '😡', color: 'text-orange-600', label: 'Angry' },
];

const confessionMoods: { [key in ConfessionMood]: { emoji: string; gradient: string; } } = {
    love: { emoji: '💘', gradient: 'from-rose-500 via-pink-600 to-purple-700' },
    funny: { emoji: '🤣', gradient: 'from-amber-400 via-orange-500 to-red-500' },
    sad: { emoji: '😢', gradient: 'from-blue-600 via-indigo-700 to-slate-800' },
    chaos: { emoji: '🤯', gradient: 'from-purple-600 via-fuchsia-700 to-pink-800' },
    deep: { emoji: '🧠', gradient: 'from-slate-700 via-slate-800 to-black' },
};

const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (diffInSeconds < 60) return `Just now`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ImageGrid: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => {
    const count = images.length;
    const renderImage = (index: number, className: string = '') => (
        <div key={index} className={`relative cursor-pointer overflow-hidden bg-black/5 dark:bg-black/20 ${className}`} onClick={() => onImageClick(index)}>
            <img src={images[index]} alt={`Post media ${index + 1}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        </div>
    );
    if (count === 1) {
        return (
            <div className="relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-border/40 bg-muted shadow-lg flex justify-center transform transition-transform duration-500 hover:scale-[1.01]" onClick={() => onImageClick(0)}>
                <img src={images[0]} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
            </div>
        );
    }
    if (count === 2) return <div className="grid grid-cols-2 gap-2 aspect-video rounded-[2.5rem] overflow-hidden border border-border/40">{images.map((_, i) => renderImage(i))}</div>;
    if (count >= 3) {
        return (
            <div className="grid grid-cols-2 grid-rows-2 gap-2 aspect-square sm:aspect-video rounded-[2.5rem] overflow-hidden border border-border/40">
                {renderImage(0, 'row-span-2')}
                {renderImage(1)}
                {count === 3 ? renderImage(2) : (
                  <div key={3} className="relative cursor-pointer" onClick={() => onImageClick(3)}>
                      <img src={images[3]} alt="Post media 4" className="absolute inset-0 w-full h-full object-cover filter blur-md" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors hover:bg-black/30">
                          <span className="text-white text-3xl font-black">+{count - 3}</span>
                      </div>
                  </div>
                )}
            </div>
        );
    }
    return null;
};

const Lightbox: React.FC<{ images: string[]; startIndex: number; onClose: () => void }> = ({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const nextImage = (e?: React.MouseEvent) => { e?.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length); };
    const prevImage = (e?: React.MouseEvent) => { e?.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length); };
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextImage();
            else if (e.key === 'ArrowLeft') prevImage();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    return (
        <div className="fixed inset-0 bg-black/98 z-[9999] flex items-center justify-center animate-fade-in backdrop-blur-xl" onClick={onClose}>
            <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 text-white/80 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all z-10 hover:rotate-90"><CloseIcon className="w-6 h-6"/></button>
                {images.length > 1 && <>
                    <button onClick={prevImage} className="absolute left-6 text-white/80 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all z-10 active:scale-90"><ArrowLeftIcon className="w-6 h-6"/></button>
                    <button onClick={nextImage} className="absolute right-6 text-white/80 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all z-10 active:scale-90"><ArrowRightIcon className="w-6 h-6"/></button>
                </>}
                <img src={images[currentIndex]} alt="Lightbox view" className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-2xl animate-scale-in"/>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white font-black text-sm bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">{currentIndex + 1} / {images.length}</div>
            </div>
        </div>
    );
};

const PostCard: React.FC<PostCardProps> = (props) => {
  const { post, author, currentUser, users, onReaction, onAddComment, onDeletePost, onDeleteComment, onCreateOrOpenConversation, onSharePostAsMessage, onSharePost, onToggleSavePost, groups, onNavigate, animationIndex } = props;
  const [showComments, setShowComments] = useState(false);
  const [shareModalState, setShareModalState] = useState<{isOpen: boolean, defaultTab: 'share' | 'message'}>({isOpen: false, defaultTab: 'message'});
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);
  const [countdown, setCountdown] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharedPostExpanded, setIsSharedPostExpanded] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; startIndex: number }>({ isOpen: false, startIndex: 0 });

  const isSaved = currentUser.savedPosts?.includes(post.id);
  const isReadOnly = currentUser.isApproved === false;
  const postContent = post.content || '';

  const { isLongContent, strippedTextLength } = useMemo(() => {
      const strippedText = postContent.replace(/<[^>]+>/g, '');
      const lineBreaks = (postContent.match(/<br\s*\/?>|<\/p>|<\/div>|<li>|\n/gi) || []).length;
      const isLong = strippedText.length > 200 || lineBreaks > 3;
      return { isLongContent: isLong, strippedTextLength: strippedText.length };
  }, [postContent]);

  const sharedPostOriginalContent = post.sharedPost?.originalContent || '';
  const isLongSharedPost = useMemo(() => {
      const strippedText = sharedPostOriginalContent.replace(/<[^>]+>/g, '');
      const lineBreaks = (sharedPostOriginalContent.match(/<br\s*\/?>|<\/p>|<\/div>|<li>|\n/gi) || []).length;
      return strippedText.length > 200 || lineBreaks > 3;
  }, [sharedPostOriginalContent]);

  useEffect(() => {
    if (!post.isEvent || !post.eventDetails) return;
    let timerId: ReturnType<typeof setInterval> | null = null;
    const eventDate = new Date(post.eventDetails.date);
    const calculate = () => {
        const diff = eventDate.getTime() - new Date().getTime();
        if (diff <= 0) { setCountdown(''); if (timerId) clearInterval(timerId); return; }
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let countdownStr = 'Starts in ';
        if (hours > 0) countdownStr += `${hours}h `;
        if (minutes > 0) countdownStr += `${minutes}m`;
        setCountdown(countdownStr.trim());
    };
    if (new Date().getTime() < eventDate.getTime()) { calculate(); timerId = setInterval(calculate, 60000); }
    return () => { if (timerId) clearInterval(timerId); };
  }, [post.isEvent, post.eventDetails?.date]);

  const handleShareToUser = async (uid: string) => {
      try {
          const convoId = await onCreateOrOpenConversation(uid);
          
          // --- FIX: Pass the first image URL if it exists ---
          const imageUrl = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : undefined;
          
          onSharePostAsMessage(
              convoId, 
              author?.name || 'Anonymous', 
              post.content || 'media', 
              imageUrl // <--- Pass the image URL here
          );
          setShareModalState({isOpen: false, defaultTab: 'message'});
      } catch (e) {
          console.error(e);
      }
  };

  if (!author && !post.isConfession) return null;
  const isAuthor = post.authorId === currentUser.id;
  
  const canDelete = useMemo(() => {
    if (post.isConfession) return currentUser.tag === 'Director' || currentUser.tag === 'HOD/Dean';
    if (isAuthor || currentUser.tag === 'Director') return true;
    if (currentUser.tag === 'HOD/Dean' && author?.collegeId === currentUser.collegeId && author?.department === currentUser.department) return true;
    return false;
  }, [post, currentUser, isAuthor, author]);

  const currentUserReaction = useMemo(() => {
    const reactions = post.reactions || {};
    for (const reaction of reactionsList) { if (reactions[reaction.type]?.includes(currentUser.id)) return reaction; }
    return null;
  }, [post.reactions, currentUser.id]);

  const reactionSummary = useMemo(() => {
      const reactions = post.reactions || {};
      let total = 0;
      const counts = reactionsList.map(r => ({...r, count: reactions[r.type]?.length || 0})).filter(r => r.count > 0).sort((a,b) => b.count - a.count);
      counts.forEach(r => total += r.count);
      return { total, topEmojis: counts.slice(0, 3) };
  }, [post.reactions]);

  const handleMouseEnter = () => { if (!isReadOnly) { if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current); setPickerVisible(true); } };
  const handleMouseLeave = () => { pickerTimerRef.current = setTimeout(() => setPickerVisible(false), 300); };
  const handleTouchStart = () => { if (!isReadOnly) { wasLongPress.current = false; pickerTimerRef.current = setTimeout(() => { wasLongPress.current = true; setPickerVisible(true); }, 500); } };
  const handleTouchEnd = () => { if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current); setTimeout(() => setPickerVisible(false), 1500); };
  const handleLikeButtonClick = () => { if (isReadOnly || wasLongPress.current) { wasLongPress.current = false; return; } onReaction(post.id, currentUserReaction ? currentUserReaction.type : 'like'); };

  const renderReactionsButton = (isConfession = false) => {
    const btnClass = isConfession ? "text-white/80 hover:text-white hover:bg-white/10" : `transition-all ${currentUserReaction ? currentUserReaction.color + ' bg-primary/5 border-primary/20' : 'text-muted-foreground hover:text-primary bg-muted/40 hover:bg-muted border-transparent'}`;
    const icon = currentUserReaction ? <span className="text-xl animate-bounce-in">{currentUserReaction.emoji}</span> : <LikeIcon className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" />;
    return (
      <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
           {isPickerVisible && (
               <div className="absolute bottom-full mb-3 -left-2 bg-card/95 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-border flex items-center gap-1.5 z-20 animate-scale-in origin-bottom-left" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                  {reactionsList.map(r => <button key={r.type} onClick={() => { onReaction(post.id, r.type); setPickerVisible(false); }} className="text-2xl hover:scale-125 hover:-translate-y-2 transition-all transform p-1">{r.emoji}</button>)}
               </div>
           )}
          <button onClick={handleLikeButtonClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} disabled={isReadOnly} className={`px-4 py-2.5 rounded-2xl transition-all active:scale-90 flex items-center gap-2 font-black uppercase tracking-widest text-[10px] border ${btnClass} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {icon}
              {!isConfession && <span className={currentUserReaction ? currentUserReaction.color : ''}>{currentUserReaction ? currentUserReaction.label : 'Like'}</span>}
          </button>
      </div>
    )
  }

  if (post.isConfession) {
    const mood = post.confessionMood && confessionMoods[post.confessionMood] ? confessionMoods[post.confessionMood] : confessionMoods.deep;
    return (
        <div className="mb-10 animate-fade-in group" style={{ animationDelay: `${(animationIndex || 0) * 100}ms` }}>
            <div className="rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/10 group-hover:shadow-primary/20 transition-all duration-500">
                <div className={`relative p-12 md:p-16 bg-gradient-to-br ${mood.gradient} text-white flex flex-col justify-center items-center text-center min-h-[360px]`}>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative z-10 max-w-lg">
                        <span className="text-7xl mb-8 block filter drop-shadow-2xl animate-bubble-in">{mood.emoji}</span>
                        <div className={`text-2xl md:text-4xl font-black leading-tight tracking-tight drop-shadow-2xl font-serif mb-6 ${!isExpanded ? 'line-clamp-4' : ''}`} dangerouslySetInnerHTML={{ __html: postContent }} />
                         {isLongContent && <button onClick={() => setIsExpanded(!isExpanded)} className="text-white/80 hover:text-white font-black uppercase tracking-widest text-[11px] px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all">{isExpanded ? 'Read Less' : 'View Full Confession'}</button>}
                    </div>
                    {canDelete && <button onClick={() => { if(window.confirm("Delete confession?")) onDeletePost(post.id) }} className="absolute top-6 right-6 p-3 bg-black/20 hover:bg-red-500 rounded-full text-white transition-all backdrop-blur-md border border-white/10 hover:scale-110"><TrashIcon className="w-5 h-5"/></button>}
                </div>
                <div className="bg-black/90 backdrop-blur-xl text-white/70 p-4 flex justify-between items-center border-t border-white/10">
                    <div className="flex gap-2">
                        {renderReactionsButton(true)}
                        <button onClick={() => setShowComments(!showComments)} className="px-5 py-2.5 rounded-2xl hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px] border border-transparent">
                            <CommentIcon className="w-5 h-5 stroke-[2.5]"/>
                            <span>{(post.comments || []).length}</span>
                        </button>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-4">{formatTimestamp(post.timestamp)}</div>
                </div>
                {showComments && (
                    <div className="px-6 pb-6 bg-black text-white/80 border-t border-white/5 animate-fade-in">
                        <CommentSection comments={post.comments || []} users={users} currentUser={currentUser} onAddComment={(t) => onAddComment(post.id, t)} postAuthorId={post.authorId} onDeleteComment={(commentId) => onDeleteComment(post.id, commentId)}/>
                    </div>
                )}
            </div>
            {isReactionsModalOpen && <ReactionsModal isOpen={isReactionsModalOpen} onClose={() => setIsReactionsModalOpen(false)} reactions={post.reactions} users={users} onNavigate={onNavigate} />}
        </div>
    );
  }

  return (
    <div className="mb-10 animate-fade-in group relative" style={{ animationDelay: `${(animationIndex || 0) * 100}ms` }}>
      <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/20 via-cyan-400/20 to-secondary/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition duration-700 blur-2xl pointer-events-none"></div>
      <div className="relative bg-card rounded-[3rem] shadow-sm border border-border/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4 cursor-pointer group/author" onClick={() => onNavigate(`#/profile/${author.id}`)}>
                <Avatar src={author.avatarUrl} name={author.name} size="md" className="w-10 h-10 rounded-full"/>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-black text-foreground text-sm tracking-tight group-hover/author:text-primary transition-colors">{author.name}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{author.tag}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{author.department?.split(' ')[0]} • {formatTimestamp(post.timestamp)}</p>
                </div>
            </div>
            <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="text-muted-foreground hover:bg-muted p-3 rounded-full transition-all active:rotate-90"><OptionsIcon className="w-6 h-6" /></button>
            {isOptionsOpen && (
                <div className="absolute right-6 top-16 w-56 bg-card rounded-2xl shadow-2xl py-2 border border-border z-30 animate-scale-in origin-top-right">
                    <button onClick={() => { onToggleSavePost(post.id); setIsOptionsOpen(false); }} className="flex items-center w-full text-left px-5 py-3.5 text-sm font-black uppercase tracking-widest text-foreground hover:bg-muted transition-colors">{isSaved ? <BookmarkIconSolid className="w-4 h-4 mr-3 text-primary"/> : <BookmarkIcon className="w-4 h-4 mr-3"/>}{isSaved ? 'Bookmarked' : 'Bookmark'}</button>
                    {canDelete && <button onClick={() => { if(window.confirm('Delete post?')) onDeletePost(post.id); setIsOptionsOpen(false); }} className="flex items-center w-full text-left px-5 py-3.5 text-sm font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors"><TrashIcon className="w-4 h-4 mr-3" />Remove Post</button>}
                </div>
            )}
        </div>
        <div className="px-6 pb-4">
            {post.isEvent && post.eventDetails && (
                 <div
                    onClick={() => onNavigate(`#/events/${post.id}`)}
                    className="mb-6 rounded-3xl overflow-hidden bg-muted/20 border border-border/40 p-5 group/event cursor-pointer transition-all hover:bg-muted/30"
                 >
                    <div className="flex gap-5">
                        <div className="flex-shrink-0 w-16 h-16 bg-background rounded-2xl flex flex-col items-center justify-center border border-border/60 shadow-inner">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{new Date(post.eventDetails.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-black text-foreground">{new Date(post.eventDetails.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">Workshop</span>
                                </div>
                                {countdown && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
                                        <ClockIcon className="w-3 h-3 animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{countdown}</span>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-black text-foreground leading-tight tracking-tight mb-1 truncate">{post.eventDetails.title}</h3>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">{post.eventDetails.location} • {new Date(post.eventDetails.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                    <button className="mt-5 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        Register for Event
                    </button>
                </div>
            )}
            {postContent && <div className={`whitespace-pre-wrap leading-relaxed mb-6 font-medium ${strippedTextLength < 80 && !post.mediaUrls ? 'text-xl md:text-2xl font-black text-foreground/90 tracking-tight' : 'text-sm md:text-base text-foreground/80'} ${!isExpanded ? 'line-clamp-5' : ''}`} dangerouslySetInnerHTML={{ __html: postContent }} />}
            {isLongContent && <button onClick={() => setIsExpanded(!isExpanded)} className="text-primary hover:text-secondary font-black uppercase tracking-widest text-[10px] mb-6 inline-flex items-center gap-2 group/more">{isExpanded ? 'View Less' : 'Continue Reading'}<ArrowRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? '-rotate-90' : 'group-hover:translate-x-1'}`}/></button>}
            {post.sharedPost && (
                <div className="mb-6 border border-border/60 rounded-[2rem] p-6 bg-muted/20 relative group/shared overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                    <div className="flex items-center space-x-3 mb-4">
                        {users[post.sharedPost.originalAuthorId] ? (
                            <><Avatar src={users[post.sharedPost.originalAuthorId].avatarUrl} name={users[post.sharedPost.originalAuthorId].name} size="sm" className="ring-2 ring-card"/><div><p className="font-black text-xs text-foreground uppercase tracking-tight">{users[post.sharedPost.originalAuthorId].name}</p><p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{formatTimestamp(post.sharedPost.originalTimestamp)}</p></div></>
                        ) : <div className="flex items-center space-x-2"><div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground"><GhostIcon className="w-4 h-4"/></div><div><p className="font-black text-xs text-foreground uppercase">Anonymous</p><p className="text-[9px] text-muted-foreground font-black uppercase">{formatTimestamp(post.sharedPost.originalTimestamp)}</p></div></div>}
                    </div>
                    <div className={`text-muted-foreground text-sm font-medium leading-relaxed ${!isSharedPostExpanded ? 'line-clamp-4' : ''}`} dangerouslySetInnerHTML={{ __html: sharedPostOriginalContent }} />
                    {isLongSharedPost && <button onClick={() => setIsSharedPostExpanded(!isSharedPostExpanded)} className="text-primary font-black uppercase tracking-widest text-[9px] mt-3">{isSharedPostExpanded ? 'Collapse' : 'Expand Shared Post'}</button>}
                </div>
            )}
        </div>
        {post.mediaUrls && post.mediaUrls.length > 0 && <div className="mb-6 px-4"><ImageGrid images={post.mediaUrls} onImageClick={index => setLightboxState({ isOpen: true, startIndex: index })} /></div>}
        <div className="px-6 py-4 flex justify-between items-center border-t border-border/40 bg-muted/5">
           <div className="flex items-center gap-3">
               {renderReactionsButton()}
               <button onClick={() => setShowComments(!showComments)} className="px-4 py-2.5 rounded-2xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px] border border-transparent active:scale-95"><CommentIcon className="w-5 h-5 stroke-[2.5]" /><span className="hidden sm:inline">Comment</span></button>
               <button onClick={() => !isReadOnly && setShareModalState({isOpen: true, defaultTab: 'message'})} disabled={isReadOnly} className={`px-4 py-2.5 rounded-2xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px] border border-transparent active:scale-95 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}><SendIcon className="w-5 h-5 stroke-[2.5]" /><span className="hidden sm:inline">Send</span></button>
           </div>
        </div>
        {(reactionSummary.total > 0 || (post.comments || []).length > 0) && (
            <div className="px-8 py-3 bg-muted/20 flex justify-between items-center text-xs font-black uppercase tracking-widest border-t border-border/20">
              <div className="flex items-center gap-2 cursor-pointer group/likes" onClick={() => setIsReactionsModalOpen(true)}>
                  {reactionSummary.total > 0 && (
                      <div className="flex items-center">
                          <div className="flex -space-x-1.5 mr-3">
                              {reactionSummary.topEmojis.map(r => <span key={r.type} className="text-base transform group-hover/likes:scale-125 transition-transform">{r.emoji}</span>)}
                          </div>
                          <span className="text-muted-foreground group-hover/likes:text-primary transition-colors">{reactionSummary.total} people reacted</span>
                      </div>
                  )}
              </div>
              {(post.comments || []).length > 0 && (
                  <div className="text-muted-foreground hover:text-primary cursor-pointer transition-colors" onClick={() => setShowComments(!showComments)}>
                      {post.comments.length} Comments
                  </div>
              )}
            </div>
        )}
        {showComments && (
          <div className="px-6 pb-8 border-t border-border/30 bg-muted/5 animate-fade-in">
            <CommentSection comments={post.comments || []} users={users} currentUser={currentUser} onAddComment={(t) => onAddComment(post.id, t)} postAuthorId={post.authorId} onDeleteComment={(commentId) => onDeleteComment(post.id, commentId)} />
          </div>
        )}
      </div>
      <ShareModal 
        isOpen={shareModalState.isOpen} 
        onClose={() => setShareModalState({isOpen: false, defaultTab: 'message'})} 
        currentUser={currentUser} 
        users={Object.values(users)} 
        onShareToUser={handleShareToUser} 
        postToShare={post} 
        onSharePost={onSharePost} 
        groups={groups} 
        defaultTab={shareModalState.defaultTab} 
      />
      {isReactionsModalOpen && <ReactionsModal isOpen={isReactionsModalOpen} onClose={() => setIsReactionsModalOpen(false)} reactions={post.reactions} users={users} onNavigate={onNavigate} />}
      {lightboxState.isOpen && post.mediaUrls && <Lightbox images={post.mediaUrls} startIndex={lightboxState.startIndex} onClose={() => setLightboxState({ isOpen: false, startIndex: 0 })} />}
    </div>
  );
};

export default React.memo(PostCard);