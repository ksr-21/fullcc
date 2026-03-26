import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom'; 
import type { User, Post, Group, Story, Notice, ReactionType } from '../types';
import Header from '../components/Header';
import Feed from '../components/Feed';
import BottomNavBar from '../components/BottomNavBar';
import StoriesReel from '../components/StoriesReel';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import StoryViewerModal from '../components/StoryViewerModal';
import StoryCreatorModal from '../components/StoryCreatorModal';
import CreatePostModal from '../components/CreatePostModal';
import CreateOpportunityModal from '../components/CreateOpportunityModal';
import CreateProjectModal from '../components/CreateProjectModal';
import CreateRoadmapModal from '../components/CreateRoadmapModal';
import InlineCreatePost from '../components/InlineCreatePost';
import { auth } from '../api';
import { SparkleIcon, CloseIcon } from '../components/Icons';

// --- NEW HELPER COMPONENT WITH PORTAL AND MAX Z-INDEX ---
const ImageLightbox = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    // Prevent scrolling when lightbox is open
    useEffect(() => {
        if (src) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [src]);

    if (!src) return null;

    // Use React Portal + Inline Z-Index to force it above everything
    return ReactDOM.createPortal(
        <div 
            style={{ zIndex: 2147483647 }} // Maximum allowable Z-Index in browsers
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in touch-none" 
            onClick={onClose} 
        >
            <button 
                onClick={onClose} 
                style={{ zIndex: 2147483647 }} // Ensure button is also at max height
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:rotate-90 backdrop-blur-md border border-white/10 shadow-2xl cursor-pointer"
            >
                <CloseIcon className="w-8 h-8"/>
            </button>
            <div 
                className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} 
            >
                <img 
                    src={src} 
                    alt="Full View" 
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/5 bg-black" 
                />
            </div>
        </div>,
        document.body
    );
};

interface HomePageProps {
  currentUser: User;
  users: { [key: string]: User };
  posts: Post[];
  stories: Story[];
  groups: Group[];
  events: Post[];
  notices: Notice[];
  onNavigate: (path: string) => void;
  onAddPost: (postDetails: any) => void;
  onAddStory: (storyDetails: any) => void;
  onMarkStoryAsViewed: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onReplyToStory: (authorId: string, text: string) => void;
  onLikeStory: (storyId: string) => void;
  onRefreshPosts: () => Promise<void>;
  currentPath: string;
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessage: (conversationId: string, authorName: string, postContent: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
  onDeleteNotice: (noticeId: string) => void;
}

const HomePage: React.FC<HomePageProps> = (props) => {
    const { 
        currentUser, users, posts, stories, groups, events, notices, 
        onNavigate, onAddPost, onAddStory, onMarkStoryAsViewed, onDeleteStory, 
        onReplyToStory, onLikeStory, onRefreshPosts, currentPath, ...postCardProps 
    } = props;

    const [viewingStoryEntityId, setViewingStoryEntityId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null); // State for Image Lightbox
    const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false);
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateRoadmapModalOpen, setIsCreateRoadmapModalOpen] = useState(false);
    const [createPostType, setCreatePostType] = useState<'post' | 'event'>('post');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const safeFirstName = (currentUser?.name || 'Friend').split(' ')[0];

    const sortedPosts = useMemo(() => {
        return [...posts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [posts]);

    const handleLogout = async () => {
        await auth.signOut();
        onNavigate('#/');
    };

    const handleCreateClick = (type: 'post' | 'event' | 'opportunity' | 'project' | 'roadmap') => {
        if (type === 'post' || type === 'event') {
            setCreatePostType(type);
            setIsCreatePostModalOpen(true);
        } else if (type === 'opportunity') {
            setIsCreateOpportunityModalOpen(true);
        } else if (type === 'project') {
            setIsCreateProjectModalOpen(true);
        } else if (type === 'roadmap') {
            setIsCreateRoadmapModalOpen(true);
        }
    };

    const usersArray = Object.values(users);

    return (
        <div className="bg-background min-h-screen flex flex-col relative">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
                <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-secondary/5 blur-[100px]"></div>
            </div>

            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
            
            <main className="flex-1 container mx-auto px-0 sm:px-4 lg:px-8 py-4 lg:py-8 pb-24 lg:pb-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Sidebar */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 space-y-6">
                            <LeftSidebar currentUser={currentUser} onNavigate={onNavigate} currentPath={currentPath} />
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-6 space-y-8">
                        {/* Mobile Welcome / Stories Section */}
                        <div className="space-y-6">
                            <StoriesReel 
                                stories={stories}
                                users={users}
                                groups={groups}
                                currentUser={currentUser}
                                onAddStoryClick={() => setIsStoryCreatorOpen(true)}
                                onViewStoryEntity={setViewingStoryEntityId}
                            />
                        </div>
                        
                        <div className="px-4 sm:px-0">
                            <InlineCreatePost user={currentUser} onOpenCreateModal={handleCreateClick} />
                        </div>

                        <div className="px-2 sm:px-0">
                            <div className="flex items-center gap-3 mb-6 px-2">
                                <div className="h-6 w-1 bg-primary rounded-full"></div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Latest Updates</h3>
                                <button
                                    onClick={async () => {
                                        if (isRefreshing) return;
                                        setIsRefreshing(true);
                                        try { await onRefreshPosts(); } finally { setIsRefreshing(false); }
                                    }}
                                    className="ml-auto text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-all disabled:opacity-50"
                                    disabled={isRefreshing}
                                >
                                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                                </button>
                            </div>
                            <Feed 
                                posts={sortedPosts} 
                                users={users} 
                                currentUser={currentUser} 
                                groups={groups} 
                                onNavigate={onNavigate}
                                onViewImage={setViewingImage} // Pass the handler here
                                {...postCardProps}
                            />
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block lg:col-span-3">
                        <RightSidebar 
                            groups={groups} 
                            events={events} 
                            currentUser={currentUser} 
                            onNavigate={onNavigate} 
                            users={usersArray}
                            notices={notices}
                        />
                    </div>
                </div>
            </main>

            {/* Modals */}
            
            <ImageLightbox 
                src={viewingImage} 
                onClose={() => setViewingImage(null)} 
            />

            {isStoryCreatorOpen && (
                <StoryCreatorModal 
                    currentUser={currentUser}
                    adminOfGroups={groups.filter(g => g.creatorId === currentUser.id)}
                    onClose={() => setIsStoryCreatorOpen(false)}
                    onAddStory={onAddStory}
                />
            )}

            {viewingStoryEntityId && (
                <StoryViewerModal
                    stories={stories}
                    users={users}
                    groups={groups}
                    currentUser={currentUser}
                    startEntityId={viewingStoryEntityId}
                    onClose={() => setViewingStoryEntityId(null)}
                    onMarkStoryAsViewed={onMarkStoryAsViewed}
                    onDeleteStory={onDeleteStory}
                    onReplyToStory={onReplyToStory}
                    onLikeStory={onLikeStory}
                />
            )}

            <CreatePostModal 
                isOpen={isCreatePostModalOpen}
                onClose={() => setIsCreatePostModalOpen(false)}
                user={currentUser}
                onAddPost={onAddPost}
                defaultType={createPostType}
            />

            <CreateOpportunityModal
                isOpen={isCreateOpportunityModalOpen}
                onClose={() => setIsCreateOpportunityModalOpen(false)}
                onAddPost={onAddPost}
            />

            <CreateProjectModal 
                isOpen={isCreateProjectModalOpen}
                onClose={() => setIsCreateProjectModalOpen(false)}
                onAddPost={onAddPost}
            />

            <CreateRoadmapModal
                isOpen={isCreateRoadmapModalOpen}
                onClose={() => setIsCreateRoadmapModalOpen(false)}
                onAddPost={onAddPost}
            />

            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

export default HomePage;
