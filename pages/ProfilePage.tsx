


import React, { useState, useMemo } from 'react';
import type { User, Post, Group, ReactionType, Achievement, UserTag, College, Course } from '../types';
import Header from '../components/Header';
import Feed from '../components/Feed';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import AchievementCard from '../components/AchievementCard';
import AddAchievementModal from '../components/AddAchievementModal';
import EditProfileModal from '../components/EditProfileModal';
import ProjectCard from '../components/ProjectCard';
import CreatePostModal from '../components/CreatePostModal';
import CreateOpportunityModal from '../components/CreateOpportunityModal';
import CreateProjectModal from '../components/CreateProjectModal';
import CreateRoadmapModal from '../components/CreateRoadmapModal';
import InlineCreatePost from '../components/InlineCreatePost';
import { auth } from '../api';
import { 
    PostIcon, UsersIcon, StarIcon, BookmarkIcon, ArrowLeftIcon, 
    PlusIcon, BriefcaseIcon, CodeIcon, TrophyIcon, CheckCircleIcon,
    ChartBarIcon, ShieldIcon, SparkleIcon
} from '../components/Icons';

interface ProfilePageProps {
  profileUserId?: string;
  currentUser: User;
  users: { [key: string]: User };
  posts: Post[];
  groups: Group[];
  colleges: College[];
  courses: Course[];
  onNavigate: (path: string) => void;
  currentPath: string;
  onAddPost: (postDetails: { content: string; mediaUrls?: string[] | null; mediaType?: "image" | "video" | null; eventDetails?: { title: string; date: string; location: string; link?: string; }; }) => void;
  onAddAchievement: (achievement: Achievement) => void;
  onAddInterest: (interest: string) => void;
  onUpdateProfile: (updateData: { name: string; bio: string; department?: string; tag?: UserTag; yearOfStudy?: number }, avatarFile?: File | null) => void;
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessages: (userIds: string[], authorName: string, postContent: string, imageUrl?: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
  isAdminView?: boolean;
  onBackToAdmin?: () => void;
}

const StatItem = ({ label, value, active }: any) => (
    <div className="flex flex-col items-center sm:items-start group">
        <div className={`font-black text-xl sm:text-2xl leading-none transition-colors ${active ? 'text-primary' : 'text-foreground'}`}>
            {value}
        </div>
        <span className="text-[9px] uppercase font-black tracking-widest mt-1 text-muted-foreground/60">{label}</span>
    </div>
);

const ProfileTabBtn = ({ id, label, icon: Icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
            active
            ? 'bg-primary/10 text-primary border-primary/10'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }`}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-primary' : 'opacity-50 group-hover:opacity-100'}`} />
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{label}</span>
    </button>
);

const ProfilePage: React.FC<ProfilePageProps> = (props) => {
    const { profileUserId, currentUser, users, posts, groups, onNavigate, currentPath, onAddPost, onAddAchievement, onAddInterest, onUpdateProfile, onReaction, onAddComment, onDeletePost, onDeleteComment, onCreateOrOpenConversation, onSharePostAsMessages, onSharePost, onToggleSavePost, isAdminView, onBackToAdmin, colleges, courses } = props;

    const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'projects' | 'saved'>('posts');
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingAchievement, setIsAddingAchievement] = useState(false);
    const [newInterest, setNewInterest] = useState('');

    // Creation Modals State
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false);
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateRoadmapModalOpen, setIsCreateRoadmapModalOpen] = useState(false);
    const [createPostType, setCreatePostType] = useState<'post' | 'event'>('post');

    // Resolve User
    const profileUser = (profileUserId && profileUserId !== currentUser.id) 
        ? users[profileUserId] 
        : (users[currentUser.id] || currentUser);

    const isOwnProfile = !profileUserId || profileUser?.id === currentUser.id;
    const isDirector = currentUser.tag === 'Director';
    const isFacultyView = ['Teacher', 'HOD/Dean', 'Director', 'Super Admin'].includes(currentUser.tag);

    // --- Derived Data ---
    const userPosts = useMemo(() => {
        if (!profileUser) return [];
        return posts
            .filter(p => p.authorId === profileUser.id && !p.isConfession && !p.isProject)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [posts, profileUser]);

    const userProjects = useMemo(() => posts.filter(p => p.authorId === profileUser?.id && p.isProject).sort((a, b) => b.timestamp - a.timestamp), [posts, profileUser]);

    const profileInsights = useMemo(() => {
        if (!profileUser) return { reactions: 0, projects: 0 };
        const totalReactions = userPosts.reduce((acc, p) => {
            const count = Object.values(p.reactions || {}).reduce((sum, uids) => sum + (uids?.length || 0), 0);
            return acc + count;
        }, 0);
        return {
            reactions: totalReactions,
            projects: userProjects.length
        };
    }, [profileUser, userPosts, userProjects]);

    const trendingProjects = useMemo(() => {
        return posts
            .filter(p => p.isProject)
            .map(p => {
                const reactionCount = Object.values(p.reactions || {}).reduce((sum, uids) => sum + (uids?.length || 0), 0);
                return { ...p, reactionCount };
            })
            .sort((a, b) => b.reactionCount - a.reactionCount)
            .slice(0, 3);
    }, [posts]);
    
    // Corrected logic to find groups user is part of
    const userGroups = useMemo(() => {
        if (!profileUser) return [];
        return groups.filter(g => 
            (g.memberIds && g.memberIds.includes(profileUser.id)) || 
            (profileUser.followingGroups && profileUser.followingGroups.includes(g.id))
        );
    }, [groups, profileUser]);

    const savedPosts = useMemo(() => {
        if (!isOwnProfile) return [];
        return posts.filter(p => currentUser.savedPosts?.includes(p.id));
    }, [posts, currentUser.savedPosts, isOwnProfile]);

    const academicStats = useMemo(() => {
        if (!profileUser) return null;
        const enrolledCourses = courses.filter(c => c.students?.includes(profileUser.id));
        
        let totalClasses = 0;
        let presentClasses = 0;
        enrolledCourses.forEach(c => {
            c.attendanceRecords?.forEach(r => {
                if (r.records[profileUser.id]) {
                    totalClasses++;
                    if (r.records[profileUser.id].status === 'present') presentClasses++;
                }
            });
        });
        
        const attendance = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
        return {
            enrolled: enrolledCourses.length,
            attendance: attendance,
            assignments: enrolledCourses.reduce((acc, c) => acc + (c.assignments?.length || 0), 0)
        };
    }, [courses, profileUser]);

    const handleLogout = async () => {
        await auth.signOut();
        onNavigate('#/');
    };

    const handleAddInterestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newInterest.trim()) {
            onAddInterest(newInterest.trim());
            setNewInterest('');
        }
    };

    const handleStartConversation = async () => {
        if (isOwnProfile || !profileUser) return;
        await onCreateOrOpenConversation(profileUser.id);
        onNavigate(`#/chat`);
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
    
    if (!profileUser) return <div className="min-h-screen flex items-center justify-center">User not found.</div>;

    return (
        <div className="bg-background min-h-screen relative flex flex-col">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[15%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[15%] w-[35%] h-[35%] rounded-full bg-secondary/5 blur-[100px]"></div>
            </div>

            {/* Director's View Mode Header */}
            {isDirector && !isOwnProfile && (
                <div className="bg-slate-950 text-white px-6 py-3 flex items-center justify-between shadow-2xl z-50 sticky top-0 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onNavigate('#/director')} 
                            className="flex items-center gap-2 text-[10px] font-black text-white/70 hover:text-white bg-white/5 px-4 py-2 rounded-xl transition-all border border-white/5 hover:border-white/10 active:scale-95 uppercase tracking-widest"
                        >
                            <ArrowLeftIcon className="w-4 h-4"/> Command Center
                        </button>
                        <div className="h-6 w-px bg-white/10"></div>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/20 rounded-lg"><ShieldIcon className="w-3.5 h-3.5 text-primary"/></div>
                            <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Profile Observer</span>
                        </div>
                    </div>
                </div>
            )}

            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
            
            <main className="flex-1 container mx-auto px-4 lg:px-8 py-6 relative z-10">
                 {(isAdminView && onBackToAdmin) && (
                    <button onClick={onBackToAdmin} className="flex items-center text-sm text-primary hover:underline mb-4 font-medium">
                        <ArrowLeftIcon className="w-4 h-4 mr-2"/> Back to Admin
                    </button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Sidebar: Tabs & Account */}
                    <div className="lg:col-span-3 hidden lg:block sticky top-24 space-y-8">
                        <div className="space-y-2">
                            <h3 className="px-6 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-4">The Atelier</h3>
                            <div className="space-y-1">
                                <ProfileTabBtn id="posts" label="Posts" icon={PostIcon} active={activeTab === 'posts'} onClick={setActiveTab} />
                                <ProfileTabBtn id="about" label="About" icon={StarIcon} active={activeTab === 'about'} onClick={setActiveTab} />
                                <ProfileTabBtn id="projects" label="Projects" icon={CodeIcon} active={activeTab === 'projects'} onClick={setActiveTab} />
                                {isOwnProfile && <ProfileTabBtn id="saved" label="Saved" icon={BookmarkIcon} active={activeTab === 'saved'} onClick={setActiveTab} />}
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mx-6"></div>

                        <div className="space-y-1">
                            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all group">
                                <ArrowLeftIcon className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity rotate-180" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Center Content: Header Card + Feed */}
                    <div className="lg:col-span-6 space-y-6">
                        {/* Profile Header Card */}
                        <div className="bg-card rounded-[2.5rem] border border-border/60 shadow-xl overflow-hidden relative group/header">
                            <div className="p-8 flex flex-col sm:flex-row items-center sm:items-start gap-8">
                                <div className="relative group cursor-pointer" onClick={() => isOwnProfile && setIsEditing(true)}>
                                    <Avatar 
                                        src={profileUser.avatarUrl} 
                                        name={profileUser.name} 
                                        size="xl" 
                                        className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-background bg-muted object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {isOwnProfile && (
                                        <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2.5 rounded-2xl shadow-xl border-4 border-card group-hover:scale-110 transition-transform">
                                            <PlusIcon className="w-4 h-4 rotate-45" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left pt-2">
                                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none mb-1">
                                        {profileUser.name}
                                    </h1>
                                    <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">
                                        {profileUser.tag === 'Director' ? 'Director of Visual Systems' : `${profileUser.tag} • ${profileUser.department}`}
                                    </p>

                                    {profileUser.bio && (
                                        <p className="text-sm font-medium text-muted-foreground/80 max-w-md mb-6 line-clamp-2">
                                            {profileUser.bio}
                                        </p>
                                    )}

                                    <div className="flex gap-8 mb-8">
                                        <StatItem label="Clubs" value={userGroups.length} />
                                        <StatItem label="Posts" value={userPosts.length} />
                                        <StatItem label="Projects" value={userProjects.length} />
                                    </div>

                                    <div className="flex gap-3 w-full sm:w-auto">
                                        {isOwnProfile ? (
                                            <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none py-3 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                                Edit Profile
                                            </button>
                                        ) : (
                                            <>
                                                <button className="flex-1 sm:flex-none py-3 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                                    Follow
                                                </button>
                                                <button onClick={handleStartConversation} className="flex-1 sm:flex-none py-3 px-8 rounded-2xl bg-muted/50 text-foreground font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all border border-border active:scale-95">
                                                    Message
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Tabs */}
                        <div className="lg:hidden flex bg-card rounded-2xl border border-border p-1 overflow-x-auto no-scrollbar mb-4">
                            {['posts', 'about', 'projects', ...(isOwnProfile ? ['saved'] : [])].map((tab: any) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-[300px]">
                            {activeTab === 'posts' && (
                                <div className="animate-fade-in space-y-6">
                                    {isOwnProfile && (
                                        <InlineCreatePost user={currentUser} onOpenCreateModal={handleCreateClick} />
                                    )}
                                    <Feed
                                        key={profileUser.id}
                                        posts={userPosts}
                                        users={users}
                                        currentUser={currentUser}
                                        groups={groups}
                                        onNavigate={onNavigate}
                                        onReaction={onReaction}
                                        onAddComment={onAddComment}
                                        onDeletePost={onDeletePost}
                                        onDeleteComment={onDeleteComment}
                                        onCreateOrOpenConversation={onCreateOrOpenConversation}
                                        onSharePostAsMessages={onSharePostAsMessages}
                                        onSharePost={onSharePost}
                                        onToggleSavePost={onToggleSavePost}
                                    />
                                </div>
                            )}

                            {activeTab === 'about' && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-card p-6 rounded-[2rem] border border-border/60 shadow-sm">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                                                    <StarIcon className="w-4 h-4 text-amber-500"/> Interests
                                                </h3>
                                                {isOwnProfile && (
                                                    <form onSubmit={handleAddInterestSubmit} className="flex">
                                                        <input
                                                            type="text"
                                                            value={newInterest}
                                                            onChange={e => setNewInterest(e.target.value)}
                                                            placeholder="Add..."
                                                            className="bg-muted/30 border border-border/50 rounded-l-xl px-3 py-1.5 text-[10px] font-bold w-20 focus:w-28 transition-all outline-none"
                                                        />
                                                        <button type="submit" className="bg-primary text-white px-3 rounded-r-xl text-xs font-black transition-colors shadow-lg shadow-primary/10">+</button>
                                                    </form>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {profileUser.interests?.map((interest, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-muted/40 text-foreground rounded-xl text-[10px] font-bold border border-border/50 transition-colors hover:border-primary/30">
                                                        {interest}
                                                    </span>
                                                ))}
                                                {(!profileUser.interests || profileUser.interests.length === 0) && <p className="text-[10px] text-muted-foreground font-black uppercase opacity-50 italic">No interests added.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-card p-6 rounded-[2rem] border border-border/60 shadow-sm">
                                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <UsersIcon className="w-4 h-4 text-blue-500"/> Joined Clubs
                                            </h3>
                                            <div className="flex flex-col gap-3">
                                                {userGroups.length > 0 ? userGroups.map(group => (
                                                    <div key={group.id} onClick={() => onNavigate(`#/groups/${group.id}`)} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 rounded-2xl cursor-pointer transition-all group/item border border-transparent hover:border-border/50">
                                                        <img src={group.imageUrl || 'https://via.placeholder.com/40'} alt={group.name} className="w-10 h-10 rounded-xl object-cover bg-muted shadow-sm group-hover/item:scale-105 transition-transform" />
                                                        <div className="min-w-0">
                                                            <p className="font-black text-[11px] text-foreground truncate group-hover/item:text-primary transition-colors">{group.name}</p>
                                                            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{group.category}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase opacity-50 italic">Not a member of any clubs yet.</p>
                                                )}
                                            </div>
                                        </div>

                                        {(isOwnProfile || isFacultyView) && profileUser.tag === 'Student' && (
                                            <div className="bg-card p-6 rounded-[2rem] border border-border/60 shadow-sm md:col-span-2">
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-6 flex items-center gap-2">
                                                    <ChartBarIcon className="w-4 h-4 text-emerald-500"/> Academic Performance
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 group/stat hover:border-primary/30 transition-all">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 group-hover:text-primary transition-colors">Total Attendance</p>
                                                        <p className="text-3xl font-black text-foreground tracking-tighter">{academicStats?.attendance}%</p>
                                                    </div>
                                                    <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 group/stat hover:border-secondary/30 transition-all">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 group-hover:text-secondary transition-colors">Active Assignments</p>
                                                        <p className="text-3xl font-black text-foreground tracking-tighter">{academicStats?.assignments}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'projects' && (
                                <div className="animate-fade-in">
                                    {userProjects.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {userProjects.map(proj => (
                                                <ProjectCard
                                                    key={proj.id}
                                                    project={proj}
                                                    author={profileUser}
                                                    currentUser={currentUser}
                                                    onDeleteProject={onDeletePost}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-24 bg-card rounded-[2.5rem] border border-border border-dashed opacity-50">
                                            <CodeIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30"/>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">No projects showcased yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'saved' && (
                                <div className="animate-fade-in space-y-6">
                                     <Feed
                                        posts={savedPosts}
                                        users={users}
                                        currentUser={currentUser}
                                        groups={groups}
                                        onNavigate={onNavigate}
                                        onReaction={onReaction}
                                        onAddComment={onAddComment}
                                        onDeletePost={onDeletePost}
                                        onDeleteComment={onDeleteComment}
                                        onCreateOrOpenConversation={onCreateOrOpenConversation}
                                        onSharePostAsMessages={onSharePostAsMessages}
                                        onSharePost={onSharePost}
                                        onToggleSavePost={onToggleSavePost}
                                    />
                                    {savedPosts.length === 0 && (
                                        <div className="text-center py-24 bg-card rounded-[2.5rem] border border-border border-dashed opacity-50">
                                            <BookmarkIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30"/>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">No saved posts found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar: Insights & Trending */}
                    <div className="lg:col-span-3 hidden lg:block sticky top-24 space-y-6">
                        <div className="bg-card rounded-[2rem] border border-border/60 p-6 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-6 flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-emerald-500"/> Profile Insights
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Reactions</p>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-black text-foreground">{profileInsights.reactions.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Project Contributions</p>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-black text-foreground">{profileInsights.projects}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-[2rem] border border-border/60 p-6 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-6 flex items-center gap-2">
                                <SparkleIcon className="w-4 h-4 text-primary"/> Trending Projects
                            </h3>
                            <div className="space-y-4">
                                {trendingProjects.length > 0 ? trendingProjects.map((proj, idx) => (
                                    <div key={proj.id} onClick={() => onNavigate(`#/profile/${proj.authorId}`)} className="flex items-center gap-3 group cursor-pointer">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-foreground truncate group-hover:text-primary transition-colors">{proj.projectDetails?.title || 'Untitled Project'}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">{proj.reactionCount} reactions</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-[10px] text-muted-foreground font-black uppercase opacity-50 italic">No trending projects found.</p>
                                )}
                            </div>
                        </div>

                        <div className="px-6 space-y-4 pt-4 text-center">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">
                                <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                                <a href="#" className="hover:text-primary transition-colors">Terms</a>
                                <a href="#" className="hover:text-primary transition-colors">Help</a>
                            </div>
                            <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">
                                &copy; 2025 LUMINA SOCIAL INC.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {isOwnProfile && (
                <>
                    <EditProfileModal
                        isOpen={isEditing}
                        onClose={() => setIsEditing(false)}
                        currentUser={profileUser}
                        onUpdateProfile={onUpdateProfile}
                        colleges={colleges}
                    />
                    <AddAchievementModal
                        isOpen={isAddingAchievement}
                        onClose={() => setIsAddingAchievement(false)}
                        onAddAchievement={onAddAchievement}
                    />
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
                </>
            )}
            
            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

export default ProfilePage;
