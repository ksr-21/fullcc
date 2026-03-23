


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
import { auth } from '../firebase';
import { 
    PostIcon, UsersIcon, StarIcon, BookmarkIcon, ArrowLeftIcon, 
    PlusIcon, BriefcaseIcon, CodeIcon, TrophyIcon, CheckCircleIcon,
    ChartBarIcon, ShieldIcon
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
  onUpdateProfile: (updateData: { name: string; bio: string; department: string; tag: UserTag; yearOfStudy?: number }, avatarFile?: File | null) => void;
  onReaction: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCreateOrOpenConversation: (otherUserId: string) => Promise<string>;
  onSharePostAsMessage: (conversationId: string, authorName: string, postContent: string) => void;
  onSharePost: (originalPost: Post, commentary: string, shareTarget: { type: 'feed' | 'group'; id?: string }) => void;
  onToggleSavePost: (postId: string) => void;
  isAdminView?: boolean;
  onBackToAdmin?: () => void;
}

const StatItem = ({ label, value, icon: Icon, onClick, active }: any) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`flex flex-col items-center sm:items-start group min-w-[60px] transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
    >
        <div className={`flex items-center gap-1.5 font-black text-2xl sm:text-3xl leading-none transition-colors ${active ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
            {Icon && <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-primary'}`}/>}
            {value}
        </div>
        <span className={`text-[10px] sm:text-xs uppercase font-bold tracking-widest mt-1.5 transition-colors ${active ? 'text-primary/80' : 'text-muted-foreground group-hover:text-primary/80'}`}>{label}</span>
    </button>
);

const ProfilePage: React.FC<ProfilePageProps> = (props) => {
    const { profileUserId, currentUser, users, posts, groups, onNavigate, currentPath, onAddPost, onAddAchievement, onAddInterest, onUpdateProfile, onReaction, onAddComment, onDeletePost, onDeleteComment, onCreateOrOpenConversation, onSharePostAsMessage, onSharePost, onToggleSavePost, isAdminView, onBackToAdmin, colleges, courses } = props;

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
        <div className="bg-background min-h-screen pb-20">
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
            
            <main className="container mx-auto px-0 md:px-4 pt-0 md:pt-6 max-w-4xl text-left">
                 {(isAdminView && onBackToAdmin) && (
                    <button onClick={onBackToAdmin} className="flex items-center text-sm text-primary hover:underline mb-4 font-medium px-4 md:px-0">
                        <ArrowLeftIcon className="w-4 h-4 mr-2"/> Back to Admin
                    </button>
                )}

                {/* Profile Header Card */}
                <div className="bg-card md:rounded-3xl border-b md:border border-border shadow-sm overflow-hidden relative mb-6">
                    <div className="h-32 md:h-48 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                    </div>

                    <div className="px-4 md:px-8 pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-12 mb-4">
                            <div className="relative">
                                <div className="p-1 bg-card rounded-full">
                                    <Avatar 
                                        src={profileUser.avatarUrl} 
                                        name={profileUser.name} 
                                        size="xl" 
                                        className="w-24 h-24 md:w-32 md:h-32 border-4 border-card bg-card object-cover shadow-md"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-4 sm:mt-0 sm:mb-2 w-full sm:w-auto">
                                {isOwnProfile ? (
                                    <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none py-2 px-6 rounded-full border border-border font-bold text-sm hover:bg-muted transition-colors bg-background">
                                        Edit Profile
                                    </button>
                                ) : (
                                    <button onClick={handleStartConversation} className="flex-1 sm:flex-none py-2 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-shadow shadow-md">
                                        Message
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-foreground flex flex-col sm:flex-row sm:items-center gap-2">
                                {profileUser.name}
                                <span className={`text-xs self-start sm:self-auto px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                                    profileUser.tag === 'Student' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 
                                    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                }`}>
                                    {profileUser.tag}
                                </span>
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                                <BriefcaseIcon className="w-3.5 h-3.5"/> {profileUser.department} 
                                {profileUser.tag === 'Student' && <span>• Year {profileUser.yearOfStudy || 1}</span>}
                            </p>
                            
                            {profileUser.bio && (
                                <p className="mt-3 text-sm leading-relaxed max-w-2xl text-foreground/90">{profileUser.bio}</p>
                            )}

                            <div className="flex gap-8 mt-8 border-t border-border pt-5 overflow-x-auto no-scrollbar pb-2">
                                {/* Removed Attendance Stat Item */}
                                <StatItem 
                                    label="Clubs" 
                                    value={userGroups.length} 
                                    icon={UsersIcon} 
                                    onClick={() => setActiveTab('about')}
                                    active={activeTab === 'about'} 
                                />
                                <StatItem 
                                    label="Posts" 
                                    value={userPosts.length} 
                                    icon={PostIcon} 
                                    onClick={() => setActiveTab('posts')}
                                    active={activeTab === 'posts'}
                                />
                                <StatItem 
                                    label="Projects" 
                                    value={userProjects.length} 
                                    icon={CodeIcon} 
                                    onClick={() => setActiveTab('projects')}
                                    active={activeTab === 'projects'}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex px-4 md:px-8 border-t border-border gap-6 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'posts', label: 'Posts' },
                            { id: 'about', label: 'About' },
                            { id: 'projects', label: 'Projects' },
                            ...(isOwnProfile ? [{ id: 'saved', label: 'Saved' }] : [])
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-2 md:px-0 min-h-[300px]">
                    {activeTab === 'posts' && (
                        <div className="animate-fade-in">
                            {isOwnProfile && (
                                <div className="mb-6">
                                    <InlineCreatePost user={currentUser} onOpenCreateModal={handleCreateClick} />
                                </div>
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
                                onSharePostAsMessage={onSharePostAsMessage}
                                onSharePost={onSharePost}
                                onToggleSavePost={onToggleSavePost}
                            />
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-foreground flex items-center gap-2">
                                            <StarIcon className="w-5 h-5 text-amber-500"/> Interests
                                        </h3>
                                        {isOwnProfile && (
                                            <form onSubmit={handleAddInterestSubmit} className="flex">
                                                <input 
                                                    type="text" 
                                                    value={newInterest} 
                                                    onChange={e => setNewInterest(e.target.value)} 
                                                    placeholder="Add..." 
                                                    className="bg-muted/50 border-none rounded-l-lg px-3 py-1 text-xs w-24 focus:w-32 focus:ring-0 transition-all"
                                                />
                                                <button type="submit" className="bg-muted hover:bg-primary hover:text-primary-foreground px-2 rounded-r-lg text-xs font-bold transition-colors">+</button>
                                            </form>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {profileUser.interests?.map((interest, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-800/50">
                                                {interest}
                                            </span>
                                        ))}
                                        {(!profileUser.interests || profileUser.interests.length === 0) && <p className="text-sm text-muted-foreground italic">No interests added.</p>}
                                    </div>
                                </div>

                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                        <UsersIcon className="w-5 h-5 text-blue-500"/> Joined Clubs
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {userGroups.length > 0 ? userGroups.map(group => (
                                            <div key={group.id} onClick={() => onNavigate(`#/groups/${group.id}`)} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-border/50">
                                                <img src={group.imageUrl || 'https://via.placeholder.com/40'} alt={group.name} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground truncate">{group.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{group.category}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-muted-foreground italic">Not a member of any clubs yet.</p>
                                        )}
                                    </div>
                                </div>

                                {(isOwnProfile || isFacultyView) && profileUser.tag === 'Student' && (
                                    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                            <ChartBarIcon className="w-5 h-5 text-emerald-500"/> Academic Overview
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                                <p className="text-xs font-bold text-muted-foreground uppercase">Attendance</p>
                                                <p className="text-xl font-black text-foreground mt-1">{academicStats?.attendance}%</p>
                                            </div>
                                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                                <p className="text-xs font-bold text-muted-foreground uppercase">Assignments</p>
                                                <p className="text-xl font-black text-foreground mt-1">{academicStats?.assignments}</p>
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
                                <div className="text-center py-16 bg-card rounded-2xl border border-border border-dashed">
                                    <CodeIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30"/>
                                    <p className="text-muted-foreground font-medium">No projects showcased yet.</p>
                                </div>
                            )}
                        </div>
                    )}
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