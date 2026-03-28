import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, FieldValue, FieldPath, db, api, uploadToCloudinary, storage } from './api';
import { User, Post, Group, Story, Notice, Course, College, Conversation, UserTag, ReactionType } from './types';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import AcademicsPage from './pages/AcademicsPage';
import CourseDetailPage from './pages/CourseDetailPage';
import MonthlyAttendancePage from './pages/MonthlyAttendancePage';
import DirectorPage from './pages/DirectorPage';
import HodPage from './pages/HodPage';
import SuperAdminPage from './pages/SuperAdminPage';
import ConfessionsPage from './pages/ConfessionsPage';
import PersonalNotesPage from './pages/PersonalNotesPage';
import NoticeBoardPage from './pages/NoticeBoardPage';
import NotificationsPage from './pages/NotificationsPage';

// Helper to remove HTML tags and return clean text
const stripHtml = (html: string) => {
   if (!html) return "";
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

const normalizeInvitePayload = (data: any, collegeId?: string) => {
    const normalizedYear = data.yearOfStudy ?? data.year;
    const normalizedDivision = data.division ?? data.div;
    const normalizedRollNo = typeof data.rollNo === 'string' ? data.rollNo.trim() : data.rollNo;

    return {
        ...data,
        collegeId: collegeId ?? data.collegeId,
        yearOfStudy: normalizedYear,
        year: normalizedYear,
        division: normalizedDivision,
        div: normalizedDivision,
        rollNo: normalizedRollNo
    };
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  
  const [registeredUsers, setRegisteredUsers] = useState<{ [key: string]: User }>({});
  const [invitedUsers, setInvitedUsers] = useState<{ [key: string]: User }>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);

  const pendingSystemGroupKeysRef = useRef<Set<string>>(new Set());
  
  const users = useMemo(() => ({ ...registeredUsers, ...invitedUsers }), [registeredUsers, invitedUsers]);

  useMemo(() => {
      if (!currentUser) return 0;
      const count = notices.filter(n => {
          const isForMyDept = n.targetDept === currentUser.department || n.targetDept === 'All' || !n.targetDept;
          const isGlobal = n.collegeId === currentUser.collegeId;
          if (currentUser.tag === 'Student' && n.targetAudience === 'Student') {
              if (n.targetYear && n.targetYear !== currentUser.yearOfStudy) return false;
              if (n.targetDiv && n.targetDiv !== currentUser.division) return false;
          }
          return (isForMyDept || isGlobal);
      }).filter(n => !(currentUser.readNoticeIds || []).includes(n.id)).length;
      (window as any).unreadNoticesCount = count;
      return count;
  }, [notices, currentUser]);

  const activeUser = useMemo(() => {
      if (!currentUser) return null;
      const syncedUser = users[currentUser.id];
      const syncedUserIsUsable = !!syncedUser
          && typeof syncedUser.name === 'string'
          && syncedUser.name.trim().length > 0
          && typeof syncedUser.tag === 'string'
          && syncedUser.tag.trim().length > 0;

      return syncedUserIsUsable ? { ...currentUser, ...syncedUser } : currentUser;
  }, [currentUser, users]);

  const hasUsableProfile = useMemo(() => {
      return !!activeUser && typeof activeUser.name === 'string' && activeUser.name.trim().length > 0 && typeof activeUser.tag === 'string' && activeUser.tag.trim().length > 0;
  }, [activeUser]);

  useEffect(() => {
    const handleHashChange = () => {
        const nextPath = window.location.hash || '#/';
        setCurrentPath(nextPath);
        // Reset scroll position on navigation
        window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);

    // Safety net: never stay on loading screen longer than 10 seconds
    const safetyTimer = setTimeout(() => setLoading(false), 10000);

    const unsubscribeAuth = auth.onAuthStateChanged(async (user: any) => {
        if (user) {
            const fallbackUser = { id: user.uid || user.id, uid: user.uid || user.id, ...user } as User;
            const hasFallbackProfile = typeof fallbackUser.name === 'string' && fallbackUser.name.trim().length > 0 && typeof fallbackUser.tag === 'string' && fallbackUser.tag.trim().length > 0;
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const userData = { id: doc.id, ...doc.data() } as User;
                    setCurrentUser(userData);
                    const currentHash = window.location.hash;
                    const landingPaths = ['', '#/', '#/login', '#/signup', '#/welcome'];
                    const shouldRedirectFromHome = currentHash === '#/home' && userData.tag !== 'Student';
                    if (landingPaths.includes(currentHash) || shouldRedirectFromHome || (userData.tag === 'Super Admin' && currentHash === '#/director')) {
                        switch (userData.tag) {
                            case 'Teacher': window.location.hash = '#/academics'; break;
                            case 'HOD/Dean': window.location.hash = '#/hod'; break;
                            case 'Director': window.location.hash = '#/director'; break;
                            case 'Super Admin': window.location.hash = '#/superadmin'; break;
                            default: window.location.hash = '#/home'; break;
                        }
                    }
                } else {
                    if (hasFallbackProfile) {
                        setCurrentUser(fallbackUser);
                    } else {
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        setCurrentUser(null);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user profile from backend:', err);
                if (hasFallbackProfile) {
                    setCurrentUser(fallbackUser);
                } else {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setCurrentUser(null);
                }
            }
        } else { setCurrentUser(null); }
        clearTimeout(safetyTimer);
        setLoading(false);
    });
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
        clearTimeout(safetyTimer);
        unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
      if (!currentUser) return;
      const safeSnap = (query: any, setter: any) => {
          return query.onSnapshot((snap: any) => setter(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }))), (error: any) => console.log(`Error fetching data:`, error.message));
      };

      const isSA = currentUser.tag === 'Super Admin';
      const cid = currentUser.collegeId;

      if (!isSA && !cid) {
          setLoading(false);
          return;
      }

      const usersQuery = (isSA ? db.collection('users') : db.collection('users').where('collegeId', '==', cid)) as any;
      const invitesQuery = (isSA ? db.collection('invites') : db.collection('invites').where('collegeId', '==', cid)) as any;
      const postsQuery = (isSA ? db.collection('posts') : db.collection('posts').where('collegeId', '==', cid)) as any;
      const groupsQuery = (isSA ? db.collection('groups') : db.collection('groups').where('collegeId', '==', cid)) as any;
      const coursesQuery = (isSA ? db.collection('courses') : db.collection('courses').where('collegeId', '==', cid)) as any;
      const noticesQuery = (isSA ? db.collection('notices') : db.collection('notices').where('collegeId', '==', cid)) as any;
      const storiesQuery = (isSA ? db.collection('stories') : db.collection('stories').where('collegeId', '==', cid)) as any;
      const collegesQuery = (isSA ? db.collection('colleges') : db.collection('colleges').where(FieldPath.documentId(), '==', cid)) as any;

      const unsubs = [
          usersQuery.onSnapshot((snap: any) => { const u: any = {}; snap.forEach((d: any) => u[d.id] = { id: d.id, ...d.data() }); setRegisteredUsers(u); }),
          invitesQuery.onSnapshot((snap: any) => { const u: any = {}; snap.forEach((d: any) => u[d.id] = { id: d.id, ...d.data(), isRegistered: false, isInvite: true }); setInvitedUsers(u); }),
          safeSnap(postsQuery, setPosts), 
          safeSnap(groupsQuery, setGroups), 
          safeSnap(coursesQuery, setCourses), 
          safeSnap(noticesQuery, setNotices), 
          safeSnap(collegesQuery, setColleges), 
          safeSnap(storiesQuery, setStories),
          safeSnap(db.collection('conversations').where('participantIds', 'array-contains', currentUser.id), setConversations)
      ];

      if (cid) {
          unsubs.push(
              safeSnap(
                  (db.collection('conversations')
                    .where('collegeId', '==', cid)
                    .where('isGroupChat', '==', true)) as any,
                  setGroupConversations
              )
          );
      }
      return () => unsubs.forEach(u => u());
  }, [currentUser?.id, currentUser?.collegeId, currentUser?.tag]);

  // Ensure system group chats exist for Classes, HODs, Directors, and Teachers
  useEffect(() => {
      if (!currentUser?.collegeId) return;
      const college = colleges.find(c => c.id === currentUser.collegeId);
      if (!college) return;

      const pendingSystemGroupKeys = pendingSystemGroupKeysRef.current;
      groupConversations.forEach(conversation => {
          if (conversation.systemKey) {
              pendingSystemGroupKeys.delete(conversation.systemKey);
          }
      });

      const allUsersList = Object.values(users).filter(u => u.collegeId === college.id);
      if (allUsersList.length === 0) return;

      const slug = (value: string) =>
          (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const groupDefs: { id: string; name: string; participantIds: string[] }[] = [];
      const includeAdminInAll = currentUser.tag === 'Director' || currentUser.tag === 'Super Admin';

      const withAdmin = (ids: string[]) => {
          if (includeAdminInAll && currentUser.id && !ids.includes(currentUser.id)) {
              return [...ids, currentUser.id];
          }
          return ids;
      };

      const directorIds = allUsersList.filter(u => u.tag === 'Director').map(u => u.id);
      if (directorIds.length > 0) {
          groupDefs.push({ id: `grp_${college.id}_directors`, name: 'Directors', participantIds: withAdmin(directorIds) });
      }

      const hodIds = allUsersList.filter(u => u.tag === 'HOD/Dean').map(u => u.id);
      if (hodIds.length > 0) {
          groupDefs.push({ id: `grp_${college.id}_hods`, name: 'HODs', participantIds: withAdmin(hodIds) });
      }

      const teacherIds = allUsersList.filter(u => u.tag === 'Teacher').map(u => u.id);
      if (teacherIds.length > 0) {
          groupDefs.push({ id: `grp_${college.id}_teachers`, name: 'Teachers', participantIds: withAdmin(teacherIds) });
      }

      const classMap = college.classes || {};
      const deptList = (currentUser.tag === 'Director' || currentUser.tag === 'Super Admin')
          ? Object.keys(classMap)
          : (currentUser.department ? [currentUser.department] : []);

      deptList.forEach(dept => {
          const years = classMap[dept];
          if (!years || typeof years !== 'object') return;
          Object.entries(years).forEach(([yearStr, divs]) => {
              const year = parseInt(yearStr);
              if (!Array.isArray(divs)) return;
              (divs as string[]).forEach(div => {
                  const participantIds = withAdmin(allUsersList
                      .filter(u => {
                          if (u.department !== dept) return false;
                          if (u.tag === 'Student') {
                              const divMatch = (u.division || '').toUpperCase() === String(div).toUpperCase();
                              return u.yearOfStudy === year && divMatch;
                          }
                          return u.tag === 'Teacher' || u.tag === 'HOD/Dean';
                      })
                      .map(u => u.id));

                  if (participantIds.length > 0) {
                      const id = `grp_${college.id}_${slug(dept)}_${year}_${slug(String(div))}`;
                      groupDefs.push({ id, name: `Class ${dept} - Year ${year}${div}`, participantIds });
                  }
              });
          });
      });

      const sameParticipants = (left: string[] = [], right: string[] = []) => {
          if (left.length !== right.length) return false;
          const leftSorted = [...left].sort();
          const rightSorted = [...right].sort();
          return leftSorted.every((id, index) => id === rightSorted[index]);
      };

      const ensureGroups = async () => {
          for (const g of groupDefs) {
              const existing = groupConversations.find(c => c.systemKey === g.id)
                  || groupConversations.find(c => c.name === g.name && c.collegeId === college.id && c.isGroupChat);

              if (!existing && pendingSystemGroupKeys.has(g.id)) {
                  continue;
              }

              const payload = {
                  systemKey: g.id,
                  participantIds: g.participantIds,
                  name: g.name,
                  isGroupChat: true,
                  creatorId: 'system',
                  collegeId: college.id
              };

              try {
                  if (!existing) {
                      pendingSystemGroupKeys.add(g.id);
                      await db.collection('conversations').add({
                          ...payload,
                          messages: []
                      });
                      continue;
                  }

                  const needsUpdate =
                      existing.systemKey !== g.id
                      || existing.name !== g.name
                      || existing.isGroupChat !== true
                      || existing.creatorId !== 'system'
                      || existing.collegeId !== college.id
                      || !sameParticipants(existing.participantIds, g.participantIds);

                  if (needsUpdate) {
                      await db.collection('conversations').doc(existing.id).update(payload);
                  }
              } catch (err) {
                  pendingSystemGroupKeys.delete(g.id);
                  console.error('Failed to ensure system group conversation:', err);
              }
          }
      };

      ensureGroups();
  }, [currentUser?.collegeId, currentUser?.department, currentUser?.tag, users, colleges, groupConversations]);

  const handleNavigate = (path: string) => { window.location.hash = path; };
  const handleUpdate = (collection: string, id: string, data: any) => db.collection(collection).doc(id).update(data);
  const handleCreate = (collection: string, data: any) => db.collection(collection).add(data);
  const handleDelete = (collection: string, id: string) => db.collection(collection).doc(id).delete();
  const syncCollegeInState = (collegeData: any) => {
      if (!collegeData) return;
      const normalizedCollege = { ...collegeData, id: collegeData._id || collegeData.id } as College;

      setColleges(prev => {
          const existingIndex = prev.findIndex(college => college.id === normalizedCollege.id);
          if (existingIndex === -1) {
              return [...prev, normalizedCollege];
          }

          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...normalizedCollege };
          return next;
      });
  };
  const ensureCollegeDocument = async (collegeId: string) => {
      const existingCollege = colleges.find(college => college.id === collegeId);
      if (existingCollege) {
          return existingCollege;
      }

      const seedCollege = {
          _id: collegeId,
          name: activeUser?.requestedCollegeName?.trim() || 'College Workspace',
          adminUids: activeUser?.id ? [activeUser.id] : [],
          departments: [],
          classes: {},
          timetable: {},
          timeSlots: [],
          timeSlotsByClass: {},
          status: 'active',
      };

      try {
          const createdCollege = await api.post('/colleges', seedCollege);
          syncCollegeInState(createdCollege);
          return createdCollege;
      } catch (error) {
          console.warn('Unable to seed missing college document before retrying update:', error);
          return null;
      }
  };
  const handleCollegeUpdate = async (collegeId: string, data: any) => {
      try {
          const updatedCollege = await handleUpdate('colleges', collegeId, data);
          syncCollegeInState(updatedCollege);
          return updatedCollege;
      } catch (error: any) {
          if (error instanceof Error && error.message === 'College not found') {
              await ensureCollegeDocument(collegeId);
              const updatedCollege = await handleUpdate('colleges', collegeId, data);
              syncCollegeInState(updatedCollege);
              return updatedCollege;
          }

          throw error;
      }
  };
  const handleCreateUsersBatch = async (data: any[], collegeId?: string) => {
      try {
          const users = data.map(userData => normalizeInvitePayload(userData, collegeId ?? userData.collegeId ?? activeUser?.collegeId));
          const response = await api.post('/invites/batch', { users });
          return response;
      } catch (err: any) {
          return {
              successCount: 0,
              errors: [{ email: 'Batch operation', reason: err?.message || 'Failed to process batch' }]
          };
      }
  };

  const mergedConversations = useMemo(() => {
      const map = new Map<string, Conversation>();
      conversations.forEach(c => map.set(c.id, c));
      groupConversations.forEach(c => map.set(c.id, c));
      return Array.from(map.values());
  }, [conversations, groupConversations]);

  const handleUpdateAnyUser = async (uid: string, data: any) => {
      const isRegistered = !!registeredUsers[uid];
      const collection = isRegistered ? 'users' : 'invites';
      try {
          await handleUpdate(collection, uid, data);
      } catch (error: any) {
          console.error(`Failed to update ${collection} with ID ${uid}:`, error);
          // Fallback check: maybe they just registered?
          if (!isRegistered && registeredUsers[uid]) {
              await handleUpdate('users', uid, data);
          } else {
              throw error;
          }
      }
  };

  const refreshPosts = async () => {
      if (!currentUser) return;
      const isSA = currentUser.tag === 'Super Admin';
      const cid = currentUser.collegeId;
      if (!isSA && !cid) return;

      const query: any = isSA ? db.collection('posts') : db.collection('posts').where('collegeId', '==', cid);
      const snap = await query.get();
      setPosts(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
  };

  const handleReaction = async (postId: string, reaction: ReactionType) => {
      if (!activeUser) return;
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const currentReactions = post.reactions || {};
      const alreadyHasThis = (currentReactions[reaction] || []).includes(activeUser.id);
      const updates: any = {};
      Object.keys(currentReactions).forEach(type => { if ((currentReactions[type as ReactionType] || []).includes(activeUser.id)) updates[`reactions.${type}`] = FieldValue.arrayRemove(activeUser.id); });
      if (!alreadyHasThis) updates[`reactions.${reaction}`] = FieldValue.arrayUnion(activeUser.id);
      await handleUpdate('posts', postId, updates);
  };

  const handleAddComment = async (postId: string, text: string) => {
      if (!activeUser) return;
      const comment = { id: Math.random().toString(36).substring(7), authorId: activeUser.id, text, timestamp: Date.now() };
      await handleUpdate('posts', postId, { comments: FieldValue.arrayUnion(comment) });
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const comment = post.comments.find(c => c.id === commentId);
      if (comment) await handleUpdate('posts', postId, { comments: FieldValue.arrayRemove(comment) });
  };

  const handleToggleSavePost = async (postId: string) => {
      if (!activeUser) return;
      const isSaved = activeUser.savedPosts?.includes(postId);
      await handleUpdate('users', activeUser.id, { savedPosts: isSaved ? FieldValue.arrayRemove(postId) : FieldValue.arrayUnion(postId) });
  };

  const handleSharePost = async (originalPost: Post, commentary: string, target: { type: 'feed' | 'group', id?: string }) => {
      if (!activeUser) return;
      const newPost: Partial<Post> = { authorId: activeUser.id, collegeId: activeUser.collegeId, content: commentary, timestamp: Date.now(), comments: [], sharedPost: { originalId: originalPost.id, originalAuthorId: originalPost.authorId, originalTimestamp: originalPost.timestamp, originalContent: originalPost.content, originalMediaUrls: originalPost.mediaUrls, originalMediaType: originalPost.mediaType, originalIsEvent: originalPost.isEvent, originalEventDetails: originalPost.eventDetails, originalIsConfession: originalPost.isConfession } };
      if (target.type === 'group' && target.id) newPost.groupId = target.id;
      await handleCreate('posts', newPost);
  };

  const handleCreateOrOpenConversation = async (uid: string) => {
      if (!activeUser) return "";
      const existing = conversations.find(c => !c.isGroupChat && c.participantIds.includes(uid) && c.participantIds.includes(activeUser.id));
      if (existing) return existing.id;
      const ref = await handleCreate('conversations', { participantIds: [activeUser.id, uid], collegeId: activeUser.collegeId, messages: [], isGroupChat: false });
      return ref.id;
  };
  
  const handleMarkNoticeAsRead = async (noticeId: string) => {
      if (!activeUser) return;
      const readNoticeIds = activeUser.readNoticeIds || [];
      if (readNoticeIds.includes(noticeId)) return;
      await handleUpdate('users', activeUser.id, { readNoticeIds: FieldValue.arrayUnion(noticeId) });
  };

  const handleToggleFollowGroup = async (gid: string) => {
      if (!activeUser) return;
      const following = activeUser.followingGroups || [];
      const newFollowing = following.includes(gid) 
        ? following.filter(id => id !== gid) 
        : [...following, gid];
      handleUpdate('users', activeUser.id, { followingGroups: newFollowing });
      
      const isFollowing = following.includes(gid);
      handleUpdate('groups', gid, {
          followers: isFollowing ? FieldValue.arrayRemove(activeUser.id) : FieldValue.arrayUnion(activeUser.id)
      });
  };

  const handleInviteMemberToGroup = (gid: string, uid: string) => {
      handleUpdate('groups', gid, { 
          invitedMemberIds: FieldValue.arrayUnion(uid),
          pendingMemberIds: FieldValue.arrayRemove(uid)
      });
  };

  const handleWithdrawJoinRequest = (gid: string) => {
      if (!activeUser) return;
      handleUpdate('groups', gid, {
          pendingMemberIds: FieldValue.arrayRemove(activeUser.id)
      });
  };

  const handleAcceptGroupInvite = (gid: string) => {
      if (!activeUser) return;
      handleUpdate('groups', gid, {
          memberIds: FieldValue.arrayUnion(activeUser.id),
          invitedMemberIds: FieldValue.arrayRemove(activeUser.id)
      });
  };

  const handleDeclineGroupInvite = (gid: string) => {
      if (!activeUser) return;
      handleUpdate('groups', gid, {
          invitedMemberIds: FieldValue.arrayRemove(activeUser.id)
      });
  };

  const handleDeleteMessagesForSelf = async (conversationId: string, messageIds: string[]) => {
      if (!activeUser) return;
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const updatedMessages = conversation.messages.map(msg => {
          if (messageIds.includes(msg.id)) {
              const deletedFor = msg.deletedFor || [];
              if (!deletedFor.includes(activeUser.id)) {
                  return { ...msg, deletedFor: [...deletedFor, activeUser.id] };
              }
          }
          return msg;
      });

      await handleUpdate('conversations', conversationId, { messages: updatedMessages });
  };

  const handleDeleteMessagesForEveryone = async (conversationId: string, messageIds: string[]) => {
      if (!activeUser) return;
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const updatedMessages = conversation.messages.map(msg => {
          if (messageIds.includes(msg.id) && msg.senderId === activeUser.id) {
              return { ...msg, isDeleted: true, text: "" };
          }
          return msg;
      });

      await handleUpdate('conversations', conversationId, { messages: updatedMessages });
  };

  const handleChangeCollegeAdmin = async (collegeId: string, email: string) => {
      try {
          const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
          if (!userSnap.empty) {
              const userId = userSnap.docs[0].id;
              await handleUpdate('users', userId, { tag: 'Director', collegeId, isApproved: true });
              await handleUpdate('colleges', collegeId, { adminUids: [userId] });
          } else {
              const inviteSnap = await db.collection('invites').where('email', '==', email).limit(1).get();
              if (!inviteSnap.empty) {
                  const userId = inviteSnap.docs[0].id;
                  await handleUpdate('invites', userId, { tag: 'Director', collegeId, isApproved: true });
                  await handleUpdate('colleges', collegeId, { adminUids: [userId] });
              } else {
                  const inviteRef = await db.collection('invites').add({
                      name: 'Director',
                      email,
                      tag: 'Director',
                      collegeId,
                      isApproved: false,
                      isRegistered: false,
                      createdAt: Date.now()
                  });
                  await handleUpdate('colleges', collegeId, { adminUids: [inviteRef.id] });
              }
          }
      } catch (error) {
          console.error('Error changing college admin:', error);
          throw error;
      }
  };

  const commonFeedProps = { 
      onReaction: handleReaction, 
      onAddComment: handleAddComment, 
      onDeleteComment: handleDeleteComment, 
      onToggleSavePost: handleToggleSavePost, 
      onSharePost: handleSharePost, 
      onDeletePost: (pid: string) => handleDelete('posts', pid), 
      onCreateOrOpenConversation: handleCreateOrOpenConversation, 
      
      // --- FIXED: Accept image URL and save it ---
      onSharePostAsMessages: async (uids: string[], author: string, content: string, imageUrl?: string) => {
          const cleanContent = stripHtml(content);
          
          for (const uid of uids) {
              try {
                  const cid = await handleCreateOrOpenConversation(uid);
                  const messageData: any = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      senderId: activeUser!.id,
                      text: `Shared a post from ${author}:\n${cleanContent}`,
                      timestamp: Date.now()
                  };

                  if (imageUrl) {
                      messageData.image = imageUrl;
                  }

                  handleUpdate('conversations', cid, {
                      messages: FieldValue.arrayUnion(messageData)
                  });
              } catch (err) {
                  console.error(`Failed to share to user ${uid}:`, err);
              }
          }
      } 
  };

  const path = currentPath;

  if (loading) {
      return <div className="h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest animate-pulse">Initializing Virtual Campus...</div>;
  }

  if (!activeUser || !hasUsableProfile) {
      if (path === '#/login') return <LoginPage onNavigate={handleNavigate} />;
      if (path === '#/signup') return <SignupPage onNavigate={handleNavigate} />;
      return <WelcomePage onNavigate={handleNavigate} />;
  }

  if (activeUser.tag === 'Super Admin' && path !== '#/superadmin') {
      if (window.location.hash !== '#/superadmin') {
          window.location.hash = '#/superadmin';
      }
      return <div className="h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest animate-pulse">Redirecting to Super Admin Panel...</div>;
  }
  
  if (path.startsWith('#/hod')) {
      return <HodPage currentUser={activeUser} onNavigate={handleNavigate} currentPath={currentPath} courses={courses} onCreateCourse={(data: any) => handleCreate('courses', { ...data, collegeId: activeUser.collegeId })} onUpdateCourse={(id: string, data: any) => handleUpdate('courses', id, data)} onDeleteCourse={(id: string) => handleDelete('courses', id)} notices={notices} users={users} allUsers={Object.values(users) as User[]} onCreateNotice={(data: any) => handleCreate('notices', { ...data, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(id: string) => handleDelete('notices', id)} departmentChats={[]} onSendDepartmentMessage={()=>{}} onCreateUser={async (data: any) => { const invitePayload = normalizeInvitePayload(data, activeUser.collegeId || data.collegeId); await api.post('/invites', invitePayload); await handleCreate('invites', { ...invitePayload, createdAt: Date.now() }); }} onCreateUsersBatch={(data: any[]) => handleCreateUsersBatch(data, activeUser.collegeId)} onApproveTeacherRequest={(uid: string) => handleUpdate('users', uid, { isApproved: true })} onDeclineTeacherRequest={(uid: string) => handleDelete('users', uid)} colleges={colleges} onUpdateCourseFaculty={(cid: string, fid: string) => handleUpdate('courses', cid, { facultyId: fid })} onUpdateCollegeClasses={(cid: string, dept: string, classes: any) => handleCollegeUpdate(cid, { [`classes.${dept}`]: classes })} onUpdateCollege={(cid: string, data: any) => handleCollegeUpdate(cid, data)} onDeleteUser={(uid: string) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onToggleFreezeUser={(uid: string) => handleUpdate('users', uid, { isFrozen: !users[uid].isFrozen })} onUpdateUserRole={(uid: string, data: any) => handleUpdateAnyUser(uid, data)} onUpdateUser={(uid: string, data: any) => handleUpdateAnyUser(uid, data)} onCreateOrOpenConversation={handleCreateOrOpenConversation} />;
  }

  // Handle Director prefix routing
  if (path.startsWith('#/director')) {
      if (activeUser.tag === 'Super Admin') {
          if (window.location.hash !== '#/superadmin') {
              window.location.hash = '#/superadmin';
          }
          return <div className="h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest animate-pulse">Redirecting to Super Admin Panel...</div>;
      }
      if (activeUser.tag !== 'Director') {
          if (window.location.hash !== '#/home') {
              window.location.hash = '#/home';
          }
          return <div className="h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest animate-pulse">Access Denied: Redirecting...</div>;
      }
      return <DirectorPage currentUser={activeUser} allUsers={Object.values(users) as User[]} allPosts={posts} allGroups={groups} allCourses={courses} usersMap={users} notices={notices} colleges={colleges} onNavigate={handleNavigate} currentPath={currentPath} onDeleteUser={(uid: string) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onDeletePost={commonFeedProps.onDeletePost} onDeleteComment={commonFeedProps.onDeleteComment} onDeleteGroup={(gid: string) => handleDelete('groups', gid)} onApproveHodRequest={(uid: string) => handleUpdateAnyUser(uid, { isApproved: true, tag: 'HOD/Dean' })} onDeclineHodRequest={(uid: string) => handleDelete(registeredUsers[uid] ? 'users' : 'invites', uid)} onApproveTeacherRequest={(uid: string) => handleUpdateAnyUser(uid, { isApproved: true })} onDeclineTeacherRequest={(uid: string) => handleDelete(registeredUsers[uid] ? 'users' : 'invites', uid)} onToggleFreezeUser={(uid: string) => handleUpdate('users', uid, { isFrozen: !users[uid].isFrozen })} onUpdateUserRole={(uid: string, data: any) => handleUpdateAnyUser(uid, data)} onUpdateUser={(uid: string, data: any) => handleUpdateAnyUser(uid, data)} onUpdateCollegeClasses={(cid: string, dept: string, classes: any) => handleCollegeUpdate(cid, { [`classes.${dept}`]: classes })} onUpdateCollege={(cid: string, data: any) => handleCollegeUpdate(cid, data)} onCreateNotice={(data: any) => handleCreate('notices', { ...data, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(nid: string) => handleDelete('notices', nid)} onCreateCourse={(data: any) => handleCreate('courses', { ...data, collegeId: activeUser.collegeId })} onCreateUser={async (data: any) => { const invitePayload = normalizeInvitePayload(data, activeUser.collegeId || data.collegeId); await api.post('/invites', invitePayload); await handleCreate('invites', { ...invitePayload, createdAt: Date.now() }); }} onCreateUsersBatch={(data: any[]) => handleCreateUsersBatch(data, activeUser.collegeId)} onDeleteCourse={(cid: string) => handleDelete('courses', cid)} onUpdateCourse={(cid: string, data: any) => handleUpdate('courses', cid, data)} onUpdateCollegeDepartments={(cid: string, depts: string[]) => handleCollegeUpdate(cid, { departments: depts })} onEditCollegeDepartment={()=>{}} onDeleteCollegeDepartment={()=>{}} onUpdateCourseFaculty={(cid: string, fid: string) => handleUpdate('courses', cid, { facultyId: fid })} postCardProps={{ ...commonFeedProps, groups: groups }} onCreateOrOpenConversation={commonFeedProps.onCreateOrOpenConversation} />;
  }

  if (path.startsWith('#/academics/')) {
      const parts = path.split('/');
      const courseId = parts[2];
      const tab = parts[3];
      const assignmentId = parts[4]; 
      const course = courses.find(c => c.id === courseId);
      if (course) {
          const userList = Object.values(users) as User[];
          const studentObjects = userList.filter((u) => { if (u.tag !== 'Student') return false; if (course.students?.includes(u.id)) return true; if (u.department === course.department && u.yearOfStudy === course.year) { if (!course.division || u.division === course.division) return true; } return false; }).sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' })).map((u) => ({ id: u.id, name: u.name || 'Student', avatarUrl: u.avatarUrl, rollNo: u.rollNo, email: u.email }));
          if (tab === 'attendance' && assignmentId === 'monthly') {
              return (
                  <MonthlyAttendancePage
                      course={course}
                      currentUser={activeUser}
                      students={studentObjects}
                      onNavigate={handleNavigate}
                      currentPath={currentPath}
                  />
              );
          }
          return <CourseDetailPage course={course} currentUser={activeUser} allUsers={Object.values(users)} students={studentObjects} onNavigate={handleNavigate} currentPath={currentPath} onAddNote={(cid, n) => handleUpdate('courses', cid, { notes: FieldValue.arrayUnion(n) })} onAddAssignment={(cid, a) => handleUpdate('courses', cid, { assignments: FieldValue.arrayUnion(a) })} onTakeAttendance={async (cid, r) => { try { await api.post(`/academics/courses/${cid}/attendance`, r); } catch (err) { console.error('Attendance save failed:', err); alert('Failed to save attendance'); } }} onRequestToJoinCourse={(cid) => handleUpdate('courses', cid, { pendingStudents: FieldValue.arrayUnion(activeUser.id) })} onManageCourseRequest={()=>{}} onAddStudentsToCourse={(cid, sids) => handleUpdate('courses', cid, { students: FieldValue.arrayUnion(...sids) })} onRemoveStudentFromCourse={(cid, sid) => handleUpdate('courses', cid, { students: FieldValue.arrayRemove(sid) })} onSendCourseMessage={(cid, text) => handleUpdate('courses', cid, { messages: FieldValue.arrayUnion({ id: Date.now().toString(), senderId: activeUser.id, text, timestamp: Date.now() }) })} onUpdateCoursePersonalNote={()=>{}} onSaveFeedback={()=>{}} onDeleteCourse={(id) => handleDelete('courses', id)} onUpdateCourseFaculty={(cid, fid) => handleUpdate('courses', cid, { facultyId: fid })} onDeleteNote={(cid, note) => handleUpdate('courses', cid, { notes: FieldValue.arrayRemove(note) })} onDeleteAssignment={(cid, assignment) => handleUpdate('courses', cid, { assignments: FieldValue.arrayRemove(assignment) })} initialTab={tab} isReadOnly={false} />
      }
  }

  switch(path) {
      case '#/superadmin':
          return <SuperAdminPage colleges={colleges} users={users} onCreateCollegeAdmin={async (name, email) => { 
              const cleanEmail = email.trim().toLowerCase();
              // Check if user already exists with this email
              const existingUser = Object.values(users).find((u: any) => u.email === cleanEmail);
              const collegeRef = await handleCreate('colleges', { 
                  name, 
                  adminUids: existingUser ? [existingUser.id] : [], 
                  status: existingUser ? 'active' : 'pending' 
              }); 
              // Update user's collegeId if they already exist
              if (existingUser) {
                  handleUpdateAnyUser(existingUser.id, { collegeId: collegeRef.id, tag: 'Director' });
              } else {
                  // Create invite via backend for proper MongoDB sync
              await api.post('/invites', {
                  name: 'Director',
                  email: cleanEmail,
                  tag: 'Director',
                  collegeId: collegeRef.id
              });
              }
          }} onNavigate={handleNavigate} currentUser={activeUser} currentPath={currentPath} onApproveDirector={async (uid, collegeName) => { const user = users[uid]; let collegeId = user.collegeId; if (!collegeId) { const collegeRef = await handleCreate('colleges', { name: collegeName, adminUids: [uid], status: 'active' }); collegeId = collegeRef.id; } else { await handleUpdate('colleges', collegeId, { adminUids: FieldValue.arrayUnion(uid), status: 'active' }); } handleUpdateAnyUser(uid, { isApproved: true, collegeId }); }} onChangeCollegeAdmin={handleChangeCollegeAdmin} onDeleteUser={(uid) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onDeleteCollege={(cid) => handleDelete('colleges', cid)} />;
      case '#/academics':
          return <AcademicsPage currentUser={activeUser} onNavigate={handleNavigate} currentPath={currentPath} courses={courses} notices={notices} users={users} colleges={colleges} departmentChats={[]} onCreateCourse={(d: any) => handleCreate('courses', { ...d, collegeId: activeUser.collegeId })} onCreateNotice={(d: any) => handleCreate('notices', { ...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(id: string) => handleDelete('notices', id)} onUpdateCourse={(id: string, data: any) => handleUpdate('courses', id, data)} onDeleteCourse={(id: string) => handleDelete('courses', id)} onRequestToJoinCourse={()=>{}} onSendDepartmentMessage={()=>{}} onCreateUser={async (data: any)=>{ const invitePayload = normalizeInvitePayload(data, activeUser.collegeId || data.collegeId); await api.post('/invites', invitePayload); await handleCreate('invites', { ...invitePayload, createdAt: Date.now() }); }} onCreateUsersBatch={(data: any[]) => handleCreateUsersBatch(data, activeUser.collegeId)} onApproveTeacherRequest={(uid: string) => handleUpdate('users', uid, { isApproved: true })} onDeclineTeacherRequest={(uid: string) => handleDelete('users', uid)} onUpdateCollege={(cid: string, data: any) => handleCollegeUpdate(cid, data)} />;
      case '#/groups':
          return <GroupsPage currentUser={activeUser} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onCreateGroup={(d) => handleCreate('groups', { ...d, creatorId: activeUser.id, collegeId: activeUser.collegeId, memberIds: [activeUser.id] })} onJoinGroupRequest={(gid) => handleUpdate('groups', gid, { pendingMemberIds: FieldValue.arrayUnion(activeUser.id) })} onToggleFollowGroup={handleToggleFollowGroup} />;
      case '#/events':
          return <EventsPage currentUser={activeUser} users={users} events={posts.filter(p => p.isEvent)} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now(), isEvent: !!d.eventDetails})} {...commonFeedProps} />;
      case '#/opportunities':
          return <OpportunitiesPage currentUser={activeUser} users={users} posts={posts} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now(), isEvent: !!d.eventDetails})} postCardProps={{ onDeletePost: commonFeedProps.onDeletePost }} onCreateOrOpenConversation={handleCreateOrOpenConversation} />;
      case '#/confessions':
          return <ConfessionsPage currentUser={activeUser} users={users} posts={posts} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now(), isEvent: !!d.eventDetails})} {...commonFeedProps} />;
        case '#/chat':
            return <ChatPage 
                currentUser={activeUser} 
                users={users} 
                conversations={mergedConversations} 
                courses={courses}
                onNavigate={handleNavigate} 
                currentPath={currentPath} 
                onSendMessage={(cid, text) => { handleUpdate('conversations', cid, { messages: FieldValue.arrayUnion({ id: Date.now().toString(), senderId: activeUser.id, text, timestamp: Date.now() }) }); }} 
                onSendCourseMessage={(cid, text) => { handleUpdate('courses', cid, { messages: FieldValue.arrayUnion({ id: Date.now().toString(), senderId: activeUser.id, text, timestamp: Date.now() }) }); }}
                onDeleteMessagesForEveryone={handleDeleteMessagesForEveryone} 
                onDeleteMessagesForSelf={handleDeleteMessagesForSelf} 
                onDeleteConversations={(conversationIds) => conversationIds.forEach(id => handleDelete('conversations', id))} 
              onCreateOrOpenConversation={handleCreateOrOpenConversation} 
          />;
      case '#/search':
          return <SearchPage currentUser={activeUser} users={Object.values(users)} posts={posts} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} {...commonFeedProps} />;
      case '#/notes':
          return <PersonalNotesPage currentUser={activeUser} onNavigate={handleNavigate} currentPath={currentPath} onCreateNote={(t, c) => handleUpdate('users', activeUser.id, { personalNotes: FieldValue.arrayUnion({ id: Date.now().toString(), title: t, content: c, timestamp: Date.now() }) })} onUpdateNote={(nid, t, c) => { const notes = activeUser.personalNotes?.map(n => n.id === nid ? { ...n, title: t, content: c, timestamp: Date.now() } : n) || []; handleUpdate('users', activeUser.id, { personalNotes: notes }); }} onDeleteNote={(nid) => { const notes = activeUser.personalNotes?.filter(n => n.id !== nid) || []; handleUpdate('users', activeUser.id, { personalNotes: notes }); }} />;
      case '#/notifications':
          return <NotificationsPage currentUser={activeUser} notices={notices} courses={courses} colleges={colleges} users={users} onNavigate={handleNavigate} currentPath={currentPath} onCreateNotice={(data: any) => handleCreate('notices', { ...data, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(id: string) => handleDelete('notices', id)} onMarkAsRead={handleMarkNoticeAsRead} />;
      default:
          if (path.startsWith('#/profile/')) { const uid = path.split('/')[2]; return <ProfilePage profileUserId={uid} currentUser={activeUser} users={users} posts={posts} groups={groups} colleges={colleges} courses={courses} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} onAddAchievement={(a) => handleUpdate('users', activeUser.id, { achievements: FieldValue.arrayUnion(a) })} onAddInterest={(i) => handleUpdate('users', activeUser.id, { interests: FieldValue.arrayUnion(i) })} onUpdateProfile={async (d, f) => {
            if (!activeUser) return;
            let updateData: any = { ...d };
            let uploadSuccess = true;

            if (f) {
                try {
                    // Use the more robust storage ref from api.ts
                    const uploadTask = await storage.ref(`avatars/${activeUser.id}`).put(f);
                    const avatarUrl = await uploadTask.ref.getDownloadURL();
                    updateData.avatarUrl = avatarUrl;
                } catch (err) {
                    console.error("Avatar upload failed", err);
                    uploadSuccess = false;
                }
            }

            try {
                // Optimistic update
                setRegisteredUsers(prev => ({
                    ...prev,
                    [activeUser.id]: { ...prev[activeUser.id], ...updateData }
                }));
                setCurrentUser(prev => prev ? { ...prev, ...updateData } : null);

                await handleUpdate('users', activeUser.id, updateData);

                if (uploadSuccess) {
                    alert("Profile updated successfully!");
                } else {
                    alert("Profile info updated, but image upload failed.");
                }
            } catch (err) {
                console.error("Profile update failed", err);
                alert("Failed to update profile. Please try again.");
            }
          }} {...commonFeedProps} />; }
          
          if (path.startsWith('#/groups/')) { 
              const gid = path.split('/')[2]; 
              const group = groups.find(g => g.id === gid); 
              if (group) return <GroupDetailPage 
                  group={group} 
                  currentUser={activeUser} 
                  users={users} 
                  posts={posts.filter(p => p.groupId === gid)} 
                  groups={groups} 
                  onNavigate={handleNavigate} 
                  currentPath={currentPath} 
                  onAddPost={(d) => handleCreate('posts', {...d, groupId: gid, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} 
                  onAddStory={()=>{}} 
                  onJoinGroupRequest={(gid) => handleUpdate('groups', gid, { pendingMemberIds: FieldValue.arrayUnion(activeUser.id) })} 
                  onApproveJoinRequest={(gid, uid) => handleUpdate('groups', gid, { memberIds: FieldValue.arrayUnion(uid), pendingMemberIds: FieldValue.arrayRemove(uid) })} 
                  onDeclineJoinRequest={(gid, uid) => handleUpdate('groups', gid, { pendingMemberIds: FieldValue.arrayRemove(uid) })} 
                  onDeleteGroup={(gid) => handleDelete('groups', gid)} 
                  onSendGroupMessage={(gid, text) => handleUpdate('groups', gid, { messages: FieldValue.arrayUnion({ id: Date.now().toString(), senderId: activeUser.id, text, timestamp: Date.now() }) })} 
                  onRemoveGroupMember={(gid, uid) => handleUpdate('groups', gid, { memberIds: FieldValue.arrayRemove(uid) })} 
                  onToggleFollowGroup={handleToggleFollowGroup} 
                  onUpdateGroup={(gid, d) => handleUpdate('groups', gid, d)} 
                  onInviteMemberToGroup={handleInviteMemberToGroup} 
                  onWithdrawJoinRequest={handleWithdrawJoinRequest}
                  onAcceptGroupInvite={handleAcceptGroupInvite}
                  onDeclineGroupInvite={handleDeclineGroupInvite}
                  {...commonFeedProps} 
              />; 
          }
          if (path.startsWith('#/events/')) { const eid = path.split('/')[2]; return <EventDetailPage eventId={eid} posts={posts} users={users} currentUser={activeUser} onNavigate={handleNavigate} onRegister={(id) => handleUpdate('posts', id, { 'eventDetails.attendees': FieldValue.arrayUnion(activeUser.id) })} onUnregister={(id) => handleUpdate('posts', id, { 'eventDetails.attendees': FieldValue.arrayRemove(activeUser.id) })} onDeleteEvent={(id) => handleDelete('posts', id)} />; }
          return <HomePage 
              currentUser={activeUser} 
              users={users} 
              posts={posts} 
              stories={stories} 
              groups={groups} 
              events={posts.filter(p => p.isEvent)} 
              notices={notices} 
              onNavigate={handleNavigate} 
              currentPath={currentPath} 
              onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} 
              onAddStory={(d) => handleCreate('stories', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} 
              onMarkStoryAsViewed={(id) => handleUpdate('stories', id, { viewedBy: FieldValue.arrayUnion(activeUser.id) })} 
              onDeleteStory={(id) => handleDelete('stories', id)} 
              onDeleteNotice={(id: string) => handleDelete('notices', id)}
              onReplyToStory={()=>{}} 
              onLikeStory={()=>{}} 
              onRefreshPosts={refreshPosts}
              onReaction={commonFeedProps.onReaction}
              onAddComment={commonFeedProps.onAddComment}
              onDeleteComment={commonFeedProps.onDeleteComment}
              onToggleSavePost={commonFeedProps.onToggleSavePost}
              onSharePost={commonFeedProps.onSharePost}
              onDeletePost={commonFeedProps.onDeletePost}
              onSharePostAsMessages={commonFeedProps.onSharePostAsMessages}
              onCreateOrOpenConversation={commonFeedProps.onCreateOrOpenConversation}
          />;
  } 
}
export default App;
