import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, FieldValue, FieldPath, db } from './api';
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

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dwhm79co7";
const CLOUDINARY_UPLOAD_PRESET = "campus_connect_uploads";

const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'auto'); 
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Upload failed');
    }
    const data = await response.json();
    return data.secure_url;
};

// Helper to remove HTML tags and return clean text
const stripHtml = (html: string) => {
   if (!html) return "";
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
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

  const lastSystemGroupSigRef = useRef<string>('');
  
  const users = useMemo(() => ({ ...registeredUsers, ...invitedUsers }), [registeredUsers, invitedUsers]);

  const activeUser = useMemo(() => {
      if (!currentUser) return null;
      return users[currentUser.id] || currentUser;
  }, [currentUser, users]);

  useEffect(() => {
    const handleHashChange = () => setCurrentPath(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    const unsubscribeAuth = auth.onAuthStateChanged(async (user: any) => {
        if (user) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const userData = { id: doc.id, ...doc.data() } as User;
                setCurrentUser(userData);
                const landingPaths = ['', '#/', '#/login', '#/signup', '#/welcome'];
                if (landingPaths.includes(window.location.hash)) {
                    switch (userData.tag) {
                        case 'Teacher': window.location.hash = '#/academics'; break;
                        case 'HOD/Dean': window.location.hash = '#/hod'; break;
                        case 'Director': window.location.hash = '#/director'; break;
                        case 'Super Admin': window.location.hash = '#/superadmin'; break;
                        default: window.location.hash = '#/home'; break;
                    }
                }
            }
        } else { setCurrentUser(null); }
        setLoading(false);
    });
    return () => { window.removeEventListener('hashchange', handleHashChange); unsubscribeAuth(); };
  }, []);

  useEffect(() => {
      if (!currentUser) return;
      const safeSnap = (query: any, setter: any) => {
          return query.onSnapshot((snap: any) => setter(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }))), (error: any) => console.log(`Error fetching data:`, error.message));
      };
      let usersQuery = db.collection('users');
      let invitesQuery = db.collection('invites');
      let postsQuery = db.collection('posts');
      let groupsQuery = db.collection('groups');
      let coursesQuery = db.collection('courses');
      let noticesQuery = db.collection('notices');
      let storiesQuery = db.collection('stories');
      let collegesQuery = db.collection('colleges');
      if (currentUser.tag !== 'Super Admin' && currentUser.collegeId) {
          usersQuery = usersQuery.where('collegeId', '==', currentUser.collegeId);
          invitesQuery = invitesQuery.where('collegeId', '==', currentUser.collegeId);
          postsQuery = postsQuery.where('collegeId', '==', currentUser.collegeId);
          groupsQuery = groupsQuery.where('collegeId', '==', currentUser.collegeId);
          coursesQuery = coursesQuery.where('collegeId', '==', currentUser.collegeId);
          noticesQuery = noticesQuery.where('collegeId', '==', currentUser.collegeId);
          storiesQuery = storiesQuery.where('collegeId', '==', currentUser.collegeId);
          collegesQuery = collegesQuery.where(FieldPath.documentId(), '==', currentUser.collegeId);
      }
      const unsubs = [
          usersQuery.onSnapshot((snap: any) => { const u: any = {}; snap.forEach((d: any) => u[d.id] = { id: d.id, ...d.data() }); setRegisteredUsers(u); }),
          invitesQuery.onSnapshot((snap: any) => { const u: any = {}; snap.forEach((d: any) => u[d.id] = { id: d.id, ...d.data(), isRegistered: false, isInvite: true }); setInvitedUsers(u); }),
          safeSnap(postsQuery, setPosts), safeSnap(groupsQuery, setGroups), safeSnap(coursesQuery, setCourses), safeSnap(noticesQuery, setNotices), safeSnap(collegesQuery, setColleges), safeSnap(storiesQuery, setStories),
          safeSnap(db.collection('conversations').where('participantIds', 'array-contains', currentUser.id), setConversations)
      ];
      if (currentUser.collegeId) {
          unsubs.push(
              safeSnap(
                  db.collection('conversations')
                    .where('collegeId', '==', currentUser.collegeId)
                    .where('isGroupChat', '==', true),
                  setGroupConversations
              )
          );
      }
      return () => unsubs.forEach(u => u());
  }, [currentUser?.id, currentUser?.collegeId]); 

  // Ensure system group chats exist for Classes, HODs, Directors, and Teachers
  useEffect(() => {
      if (!currentUser?.collegeId) return;
      const college = colleges.find(c => c.id === currentUser.collegeId);
      if (!college) return;

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
          const years = classMap[dept] || {};
          Object.entries(years).forEach(([yearStr, divs]) => {
              const year = parseInt(yearStr);
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

      const sig = groupDefs.map(g => `${g.id}:${g.participantIds.length}`).sort().join('|');
      if (sig === lastSystemGroupSigRef.current) return;
      lastSystemGroupSigRef.current = sig;

      const ensureGroups = async () => {
          for (const g of groupDefs) {
              try {
                  const ref = db.collection('conversations').doc(g.id);
                  const snap = await ref.get();
                  if (!snap.exists) {
                      await ref.set({
                          participantIds: g.participantIds,
                          name: g.name,
                          isGroupChat: true,
                          creatorId: 'system',
                          collegeId: college.id,
                          messages: []
                      });
                  } else {
                      await ref.set({
                          participantIds: g.participantIds,
                          name: g.name,
                          isGroupChat: true,
                          creatorId: 'system',
                          collegeId: college.id
                      }, { merge: true });
                  }
              } catch (err) {
                  // Ignore error during ensureGroups
              }
          }
      };

      ensureGroups();
  }, [currentUser?.collegeId, currentUser?.department, currentUser?.tag, users, colleges]);

  const handleNavigate = (path: string) => { window.location.hash = path; };
  const handleUpdate = (collection: string, id: string, data: any) => db.collection(collection).doc(id).update(data);
  const handleCreate = (collection: string, data: any) => db.collection(collection).add(data);
  const handleDelete = (collection: string, id: string) => db.collection(collection).doc(id).delete();

  const mergedConversations = useMemo(() => {
      const map = new Map<string, Conversation>();
      conversations.forEach(c => map.set(c.id, c));
      groupConversations.forEach(c => map.set(c.id, c));
      return Array.from(map.values());
  }, [conversations, groupConversations]);

  const handleUpdateAnyUser = (uid: string, data: any) => {
      const collection = registeredUsers[uid] ? 'users' : 'invites';
      return handleUpdate(collection, uid, data);
  };

  const refreshPosts = async () => {
      if (!currentUser) return;
      let query = db.collection('posts');
      if (currentUser.tag !== 'Super Admin' && currentUser.collegeId) {
          query = query.where('collegeId', '==', currentUser.collegeId);
      }
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
      const userSnap = await db.collection('users').where('email', '==', email).get();
      let userId = '';
      if (!userSnap.empty) {
          userId = userSnap.docs[0].id;
          await handleUpdate('users', userId, { tag: 'Director', collegeId, isApproved: true });
      } else {
          const inviteSnap = await db.collection('invites').where('email', '==', email).get();
          if (!inviteSnap.empty) {
              userId = inviteSnap.docs[0].id;
              await handleUpdate('invites', userId, { tag: 'Director', collegeId, isApproved: true });
          } else {
              const inviteRef = await db.collection('invites').add({
                  name: 'Director',
                  email,
                  tag: 'Director',
                  collegeId,
                  isApproved: true,
                  isRegistered: false,
                  createdAt: Date.now()
              });
              userId = inviteRef.id;
          }
      }
      await handleUpdate('colleges', collegeId, { adminUids: [userId] });
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
      onSharePostAsMessage: (cid: string, author: string, content: string, imageUrl?: string) => {
          // 1. Clean HTML logic
          const cleanContent = stripHtml(content);
          
          const messageData: any = { 
              id: Date.now().toString(), 
              senderId: activeUser!.id, 
              // 2. Full Content
              text: `Shared a post from ${author}:\n${cleanContent}`, 
              timestamp: Date.now() 
          };
          
          // 3. Save Image if present
          if (imageUrl) {
              messageData.image = imageUrl;
          }

          handleUpdate('conversations', cid, { 
              messages: FieldValue.arrayUnion(messageData) 
          }); 
      } 
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background text-foreground">Loading CampusConnect...</div>;

  const path = currentPath;
  if (!activeUser) {
      if (path === '#/login') return <LoginPage onNavigate={handleNavigate} />;
      if (path === '#/signup') return <SignupPage onNavigate={handleNavigate} />;
      return <WelcomePage onNavigate={handleNavigate} />;
  }
  
  if (path.startsWith('#/hod')) {
      return <HodPage currentUser={activeUser} onNavigate={handleNavigate} currentPath={currentPath} courses={courses} onCreateCourse={(data) => handleCreate('courses', { ...data, collegeId: activeUser.collegeId })} onUpdateCourse={(id, data) => handleUpdate('courses', id, data)} onDeleteCourse={(id) => handleDelete('courses', id)} notices={notices} users={users} allUsers={Object.values(users)} onCreateNotice={(data) => handleCreate('notices', { ...data, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(id) => handleDelete('notices', id)} departmentChats={[]} onSendDepartmentMessage={()=>{}} onCreateUser={async (data) => { await handleCreate('invites', { ...data, collegeId: activeUser.collegeId, createdAt: Date.now() }); }} onCreateUsersBatch={async (data) => { const batch = db.batch(); data.forEach(u => { const ref = db.collection('invites').doc(); batch.set(ref, { ...u, collegeId: activeUser.collegeId, createdAt: Date.now() }); }); await batch.commit(); return { successCount: data.length, errors: [] }; }} onApproveTeacherRequest={(uid) => handleUpdate('users', uid, { isApproved: true })} onDeclineTeacherRequest={(uid) => handleDelete('users', uid)} colleges={colleges} onUpdateCourseFaculty={(cid, fid) => handleUpdate('courses', cid, { facultyId: fid })} onUpdateCollegeClasses={(cid, dept, classes) => handleUpdate('colleges', cid, { [`classes.${dept}`]: classes })} onUpdateCollege={(cid, data) => handleUpdate('colleges', cid, data)} onDeleteUser={(uid) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onToggleFreezeUser={(uid) => handleUpdate('users', uid, { isFrozen: !users[uid].isFrozen })} onUpdateUserRole={(uid, data) => handleUpdateAnyUser(uid, data)} onUpdateUser={(uid, data) => handleUpdateAnyUser(uid, data)} onCreateOrOpenConversation={handleCreateOrOpenConversation} />
  }

  // Handle Director prefix routing
  if (path.startsWith('#/director')) {
      return <DirectorPage currentUser={activeUser} allUsers={Object.values(users)} allPosts={posts} allGroups={groups} allCourses={courses} usersMap={users} notices={notices} colleges={colleges} onNavigate={handleNavigate} currentPath={currentPath} onDeleteUser={(uid) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onDeletePost={commonFeedProps.onDeletePost} onDeleteComment={commonFeedProps.onDeleteComment} onDeleteGroup={(gid) => handleDelete('groups', gid)} onApproveHodRequest={(uid) => handleUpdateAnyUser(uid, { isApproved: true, tag: 'HOD/Dean' })} onDeclineHodRequest={(uid) => handleDelete(registeredUsers[uid] ? 'users' : 'invites', uid)} onApproveTeacherRequest={(uid) => handleUpdateAnyUser(uid, { isApproved: true })} onDeclineTeacherRequest={(uid) => handleDelete(registeredUsers[uid] ? 'users' : 'invites', uid)} onToggleFreezeUser={(uid) => handleUpdate('users', uid, { isFrozen: !users[uid].isFrozen })} onUpdateUserRole={(uid, data) => handleUpdateAnyUser(uid, data)} onUpdateUser={(uid, data) => handleUpdateAnyUser(uid, data)} onUpdateCollegeClasses={(cid, dept, classes) => handleUpdate('colleges', cid, { [`classes.${dept}`]: classes })} onUpdateCollege={(cid, data) => handleUpdate('colleges', cid, data)} onCreateNotice={(data) => handleCreate('notices', { ...data, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(nid) => handleDelete('notices', nid)} onCreateCourse={(data) => handleCreate('courses', { ...data, collegeId: activeUser.collegeId })} onCreateUser={async (data) => { await handleCreate('invites', { ...data, collegeId: activeUser.collegeId, createdAt: Date.now() }); }} onCreateUsersBatch={async (data) => { const batch = db.batch(); data.forEach(u => { const ref = db.collection('invites').doc(); batch.set(ref, { ...u, collegeId: activeUser.collegeId, createdAt: Date.now() }); }); await batch.commit(); return { successCount: data.length, errors: [] }; }} onDeleteCourse={(cid) => handleDelete('courses', cid)} onUpdateCourse={(cid, data) => handleUpdate('courses', cid, data)} onUpdateCollegeDepartments={(cid, depts) => handleUpdate('colleges', cid, { departments: depts })} onEditCollegeDepartment={()=>{}} onDeleteCollegeDepartment={()=>{}} onUpdateCourseFaculty={(cid, fid) => handleUpdate('courses', cid, { facultyId: fid })} postCardProps={{ ...commonFeedProps, groups: groups }} onCreateOrOpenConversation={commonFeedProps.onCreateOrOpenConversation} />;
  }

  if (path.startsWith('#/academics/')) {
      const parts = path.split('/');
      const courseId = parts[2];
      const tab = parts[3];
      const assignmentId = parts[4]; 
      const course = courses.find(c => c.id === courseId);
      if (course) {
          const userList = Object.values(users) as User[];
          const studentObjects = userList.filter((u) => { if (u.tag !== 'Student') return false; if (course.students?.includes(u.id)) return true; if (u.department === course.department && u.yearOfStudy === course.year) { if (!course.division || u.division === course.division) return true; } return false; }).sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' })).map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, rollNo: u.rollNo, email: u.email }));
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
          return <CourseDetailPage course={course} currentUser={activeUser} allUsers={Object.values(users)} students={studentObjects} onNavigate={handleNavigate} currentPath={currentPath} onAddNote={(cid, n) => handleUpdate('courses', cid, { notes: FieldValue.arrayUnion(n) })} onAddAssignment={(cid, a) => handleUpdate('courses', cid, { assignments: FieldValue.arrayUnion(a) })} onTakeAttendance={(cid, r) => { const newRecords = [...(course.attendanceRecords || []).filter((rec:any) => rec.date !== r.date), r]; handleUpdate('courses', cid, { attendanceRecords: newRecords }); }} onRequestToJoinCourse={(cid) => handleUpdate('courses', cid, { pendingStudents: FieldValue.arrayUnion(activeUser.id) })} onManageCourseRequest={()=>{}} onAddStudentsToCourse={(cid, sids) => handleUpdate('courses', cid, { students: FieldValue.arrayUnion(...sids) })} onRemoveStudentFromCourse={(cid, sid) => handleUpdate('courses', cid, { students: FieldValue.arrayRemove(sid) })} onSendCourseMessage={(cid, text) => handleUpdate('courses', cid, { messages: FieldValue.arrayUnion({ id: Date.now().toString(), senderId: activeUser.id, text, timestamp: Date.now() }) })} onUpdateCoursePersonalNote={()=>{}} onSaveFeedback={()=>{}} onDeleteCourse={(id) => handleDelete('courses', id)} onUpdateCourseFaculty={(cid, fid) => handleUpdate('courses', cid, { facultyId: fid })} onDeleteNote={(cid, note) => handleUpdate('courses', cid, { notes: FieldValue.arrayRemove(note) })} onDeleteAssignment={(cid, assignment) => handleUpdate('courses', cid, { assignments: FieldValue.arrayRemove(assignment) })} initialTab={tab} isReadOnly={false} />
      }
  }

  switch(path) {
      case '#/superadmin':
          return <SuperAdminPage colleges={colleges} users={users} onCreateCollegeAdmin={async (name, email) => { const collegeRef = await handleCreate('colleges', { name, adminUids: [] }); await handleCreate('invites', { name: 'Director', email, tag: 'Director', collegeId: collegeRef.id, isApproved: false, isRegistered: false }); }} onNavigate={handleNavigate} currentUser={activeUser} currentPath={currentPath} onApproveDirector={async (uid, collegeName) => { const user = users[uid]; let collegeId = user.collegeId; if (!collegeId) { const collegeRef = await handleCreate('colleges', { name: collegeName, adminUids: [uid] }); collegeId = collegeRef.id; } handleUpdateAnyUser(uid, { isApproved: true, collegeId }); }} onChangeCollegeAdmin={handleChangeCollegeAdmin} onDeleteUser={(uid) => { const isInvite = invitedUsers[uid]; handleDelete(isInvite ? 'invites' : 'users', uid); }} onDeleteCollege={(cid) => handleDelete('colleges', cid)} />;
      case '#/academics':
          return <AcademicsPage currentUser={activeUser} onNavigate={handleNavigate} currentPath={currentPath} courses={courses} notices={notices} users={users} colleges={colleges} departmentChats={[]} onCreateCourse={(d) => handleCreate('courses', { ...d, collegeId: activeUser.collegeId })} onCreateNotice={(d) => handleCreate('notices', { ...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now() })} onDeleteNotice={(id) => handleDelete('notices', id)} onUpdateCourse={(id, data) => handleUpdate('courses', id, data)} onDeleteCourse={(id) => handleDelete('courses', id)} onRequestToJoinCourse={()=>{}} onSendDepartmentMessage={()=>{}} onCreateUser={async ()=>{}} onCreateUsersBatch={async (data) => { const batch = db.batch(); data.forEach(u => { const ref = db.collection('invites').doc(); batch.set(ref, { ...u, collegeId: activeUser.collegeId, createdAt: Date.now() }); }); await batch.commit(); return { successCount: data.length, errors: [] }; }} onApproveTeacherRequest={()=>{}} onDeclineTeacherRequest={()=>{}} onUpdateCollege={(cid, data) => handleUpdate('colleges', cid, data)} />;
      case '#/groups':
          return <GroupsPage currentUser={activeUser} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onCreateGroup={(d) => handleCreate('groups', { ...d, creatorId: activeUser.id, collegeId: activeUser.collegeId, memberIds: [activeUser.id] })} onJoinGroupRequest={(gid) => handleUpdate('groups', gid, { pendingMemberIds: FieldValue.arrayUnion(activeUser.id) })} onToggleFollowGroup={handleToggleFollowGroup} />;
      case '#/events':
          return <EventsPage currentUser={activeUser} users={users} events={posts.filter(p => p.isEvent)} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} {...commonFeedProps} />;
      case '#/opportunities':
          return <OpportunitiesPage currentUser={activeUser} users={users} posts={posts} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} postCardProps={{ onDeletePost: commonFeedProps.onDeletePost }} onCreateOrOpenConversation={handleCreateOrOpenConversation} />;
      case '#/confessions':
          return <ConfessionsPage currentUser={activeUser} users={users} posts={posts} groups={groups} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} {...commonFeedProps} />;
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
      default:
          if (path.startsWith('#/profile/')) { const uid = path.split('/')[2]; return <ProfilePage profileUserId={uid} currentUser={activeUser} users={users} posts={posts} groups={groups} colleges={colleges} courses={courses} onNavigate={handleNavigate} currentPath={currentPath} onAddPost={(d) => handleCreate('posts', {...d, authorId: activeUser.id, collegeId: activeUser.collegeId, timestamp: Date.now()})} onAddAchievement={(a) => handleUpdate('users', activeUser.id, { achievements: FieldValue.arrayUnion(a) })} onAddInterest={(i) => handleUpdate('users', activeUser.id, { interests: FieldValue.arrayUnion(i) })} onUpdateProfile={async (d, f) => { if (!activeUser) return; let updateData: any = { ...d }; if (f) { try { const avatarUrl = await uploadToCloudinary(f); updateData.avatarUrl = avatarUrl; } catch (err) { console.error("Avatar upload failed", err); } } await handleUpdate('users', activeUser.id, updateData); }} {...commonFeedProps} />; }
          
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
                onDeleteNotice={(id) => handleDelete('notices', id)}
                onReplyToStory={()=>{}} 
                onLikeStory={()=>{}} 
                onRefreshPosts={refreshPosts}
                {...commonFeedProps} 
            />;
  } 
}
export default App;
