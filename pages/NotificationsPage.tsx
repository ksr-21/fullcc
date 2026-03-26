import React, { useState, useMemo, useEffect } from 'react';
import type { User, Notice, Course, College } from '../types';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';
import { auth, db, FieldValue } from '../api';
import {
    MegaphoneIcon, PlusIcon, TrashIcon, ClockIcon,
    CheckCircleIcon, EyeIcon, CalendarIcon, UserIcon,
    ChevronRightIcon
} from '../components/Icons';
import CreateNoticeModal from '../components/CreateNoticeModal';

interface NotificationsPageProps {
    currentUser: User;
    notices: Notice[];
    courses: Course[];
    colleges: College[];
    users: { [key: string]: User };
    onNavigate: (path: string) => void;
    currentPath: string;
    onCreateNotice: (data: any) => void;
    onDeleteNotice: (id: string) => void;
    onMarkAsRead: (id: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({
    currentUser, notices, courses, colleges, users, onNavigate, currentPath, onCreateNotice, onDeleteNotice, onMarkAsRead
}) => {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const handleLogout = async () => { await auth.signOut(); onNavigate('#/'); };

    const college = colleges.find(c => c.id === currentUser.collegeId);

    const visibleNotices = useMemo(() => {
        return notices.filter(n => {
            // Logic to check if notice is relevant to the current user
            const isAuthor = n.authorId === currentUser.id;
            const isForMyDept = n.targetDept === currentUser.department || n.targetDept === 'All' || !n.targetDept;
            const isGlobal = n.collegeId === currentUser.collegeId;

            // Further filtering by Year/Div if Student
            if (currentUser.tag === 'Student' && n.targetAudience === 'Student') {
                if (n.targetYear && n.targetYear !== currentUser.yearOfStudy) return false;
                if (n.targetDiv && n.targetDiv !== currentUser.division) return false;
            }

            return (isAuthor || isForMyDept || isGlobal);
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notices, currentUser]);

    const filteredNotices = useMemo(() => {
        if (filter === 'unread') {
            return visibleNotices.filter(n => !(currentUser.readNoticeIds || []).includes(n.id));
        }
        return visibleNotices;
    }, [visibleNotices, filter, currentUser.readNoticeIds]);

    const unreadCount = useMemo(() => {
        return visibleNotices.filter(n => !(currentUser.readNoticeIds || []).includes(n.id)).length;
    }, [visibleNotices, currentUser.readNoticeIds]);

    const canPost = currentUser.tag === 'Director' || currentUser.tag === 'HOD/Dean' || currentUser.tag === 'Teacher';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />

            <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 pb-32">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
                            <MegaphoneIcon className="w-8 h-8 text-primary" />
                            Notice Board
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">Stay updated with the latest campus announcements.</p>
                    </div>
                    {canPost && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <PlusIcon className="w-5 h-5"/> Post Notice
                        </button>
                    )}
                </div>

                <div className="flex p-1 bg-muted/40 rounded-xl border border-border w-full sm:w-fit mb-8">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'unread' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Unread
                        {unreadCount > 0 && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </button>
                </div>

                <div className="space-y-4">
                    {filteredNotices.length > 0 ? (
                        filteredNotices.map((notice) => {
                            const isRead = (currentUser.readNoticeIds || []).includes(notice.id);
                            const author = users[notice.authorId];
                            const date = new Date(notice.timestamp);

                            return (
                                <div
                                    key={notice.id}
                                    className={`bg-card border-2 rounded-3xl overflow-hidden transition-all duration-300 hover:border-primary/30 group relative ${!isRead ? 'border-primary/20 shadow-lg shadow-primary/5' : 'border-border'}`}
                                    onClick={() => onMarkAsRead(notice.id)}
                                >
                                    {!isRead && <div className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.8)]"></div>}

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar src={author?.avatarUrl} name={author?.name || 'Admin'} size="sm" />
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{author?.name || 'Campus Admin'}</p>
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                                        {author?.tag || 'Staff'} • {date.toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {currentUser.id === notice.authorId && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete notice?')) onDeleteNotice(notice.id); }}
                                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-black text-foreground mb-3 tracking-tight group-hover:text-primary transition-colors">{notice.title}</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">{notice.content.replace(/<[^>]*>/g, '')}</p>

                                        {(notice.mediaUrl || notice.imageUrl) && (
                                            <div className="mb-4 rounded-2xl overflow-hidden h-48 border border-border/50">
                                                <img src={notice.mediaUrl || notice.imageUrl} alt="Notice" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground border border-border uppercase tracking-wide">
                                                To: {notice.targetAudience || 'All'}
                                            </span>
                                            {notice.targetDept && (
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                                                    {notice.targetDept}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 bg-card border border-border border-dashed rounded-[2rem]">
                            <div className="p-5 bg-muted rounded-full mb-4 inline-flex"><MegaphoneIcon className="w-10 h-10 text-muted-foreground"/></div>
                            <h3 className="font-bold text-lg text-foreground">No Notices Found</h3>
                            <p className="text-muted-foreground text-sm mt-1">You're all caught up with campus news!</p>
                        </div>
                    )}
                </div>
            </main>

            {isCreateModalOpen && (
                <CreateNoticeModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreateNotice={onCreateNotice}
                    currentUser={currentUser}
                    college={college!}
                    courses={courses}
                />
            )}

            <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
        </div>
    );
};

export default NotificationsPage;
