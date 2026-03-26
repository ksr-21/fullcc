import React from 'react';

// FIX: Removed the 'Director/Principle' type as it was redundant. The value 'Director' is used.
export type UserTag = 'Student' | 'Teacher' | 'HOD/Dean' | 'Director' | 'Super Admin';
export type ConfessionMood = 'love' | 'funny' | 'sad' | 'chaos' | 'deep';

export type SkillBadge = {
    id: string;
    name: string;
    icon: string; // Emoji or icon name
    color: string;
}

// FIX: Added PersonalNote type to be used in User profile
export type PersonalNote = {
    id: string;
    title: string;
    content: string;
    timestamp: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  department: string;
  tag: UserTag;
  collegeId?: string;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  skills?: string[]; // Added for Skill Gap Analysis
  resumeScore?: number; // Added for Resume Builder
  badges?: SkillBadge[]; // Added for Gamification
  achievements?: Achievement[];
  yearOfStudy?: number;
  rollNo?: string; // Added for Student ID/Roll Number
  division?: string; // Added for Class Division
  designation?: string;
  qualification?: string;
  followingGroups?: string[];
  savedPosts?: string[];
  isApproved?: boolean;
  isRegistered?: boolean; // Tracks if the user has set a password/completed signup
  isFrozen?: boolean;
  requestedCollegeName?: string; // For pending directors who haven't had their college created yet
  tempPassword?: string; // Temporary password set by HOD for signup verification
  // FIX: Added personalNotes property to User type
  personalNotes?: PersonalNote[];
}

export type TimeSlot = {
    id: string;
    label: string; 
}

export type TimetableCell = {
    subjectId?: string;
    subjectIds?: string[];
    facultyId?: string;
    facultyIds?: string[];
    roomId?: string;
    type?: 'lecture' | 'practical';
    batches?: {
        id?: string;
        name?: string;
        subjectId?: string;
        facultyIds?: string[];
        roomId?: string;
    }[];
}

export type TimetableData = {
    [day: string]: {
        [slotId: string]: TimetableCell;
    }
}

export type CollegeStatus = 'active' | 'suspended' | 'pending';

export type College = {
  id: string;
  name: string;
  adminUids: string[];
  departments?: string[];
  classes?: {
    [department: string]: {
        [year: number]: string[]; // array of division names
    }
  };
  timetable?: { [classId: string]: TimetableData }; // Changed to support multiple classes (Key format: "Year-Division")
  timeSlots?: TimeSlot[];
  timeSlotsByClass?: { [classId: string]: TimeSlot[] };
  status?: CollegeStatus;
  createdAt?: number;
  location?: string;
  website?: string;
}

export type Achievement = {
    title: string;
    description: string;
}

export type Comment = {
    id:string;
    authorId: string;
    text: string;
    timestamp: number;
}

export type SharedPostInfo = {
  originalId: string;
  originalAuthorId: string;
  originalTimestamp: number;
  originalContent: string;
  originalMediaUrls?: string[];
  originalMediaType?: 'image' | 'video';
  originalIsEvent?: boolean;
  originalEventDetails?: {
      title: string;
      date: string;
      location: string;
      link?: string;
  };
  originalIsConfession?: boolean;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type Post = {
    id:string;
    authorId: string;
    collegeId?: string;
    content: string; // Used for description in opportunities
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    timestamp: number;
    reactions?: { [key in ReactionType]?: string[] };
    comments: Comment[];
    groupId?: string;
    isEvent?: boolean;
    eventDetails?: {
        title: string;
        date: string;
        location: string;
        link?: string;
        // Extended Event Props
        category?: string;
        organizer?: string;
        attendees?: string[]; // User IDs
        tags?: string[];
        maxSeats?: number;
    };
    isConfession?: boolean;
    confessionMood?: ConfessionMood;
    sharedPost?: SharedPostInfo;
    isOpportunity?: boolean;
    opportunityDetails?: {
        title: string;
        organization: string;
        applyLink?: string;
        type?: 'Internship' | 'Job' | 'Volunteer' | 'Campus Role'; // Added
        stipend?: string; // Added
        location?: 'Remote' | 'On-site' | 'Hybrid'; // Added
        tags?: string[]; // Added for filtering
        lastDateToApply?: string; // YYYY-MM-DD
    };
    isProject?: boolean;
    projectDetails?: {
        title: string;
        description: string;
        techStack: string[];
        githubUrl?: string;
        demoUrl?: string;
        lookingFor?: string[]; // e.g. ["Frontend Dev", "Designer"]
    };
    isRoadmap?: boolean;
    roadmapDetails?: Omit<CareerRoadmap, 'id'>;
}

export type Story = {
  id: string;
  authorId: string;
  collegeId?: string;
  textContent?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  backgroundColor?: string;
  timestamp: number;
  viewedBy: string[];
  likedBy?: string[]; // Added for story likes
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: string;
  groupId?: string;
}

export type GroupCategory = 'Academic' | 'Cultural' | 'Sports' | 'Tech' | 'Social' | 'Other';
export type GroupPrivacy = 'public' | 'private';

export type GroupResource = {
    id: string;
    title: string;
    url: string; // Can be a link or a file URL
    type: 'pdf' | 'image' | 'link' | 'other';
    uploadedBy: string;
    timestamp: number;
}

export type Group = {
    id: string;
    name: string;
    description: string;
    category?: GroupCategory;
    privacy?: GroupPrivacy;
    collegeId?: string;
    memberIds: string[];
    creatorId: string;
    pendingMemberIds?: string[];
    invitedMemberIds?: string[];
    messages?: Message[];
    followers?: string[];
    resources?: GroupResource[];
    // Optional tagline if we want a short bio
    tagline?: string;
    coverImage?: string;
    imageUrl?: string;
    visibilitySettings?: {
        about: boolean;
        feed: boolean;
        events: boolean;
        members: boolean;
        resources: boolean;
    };
}

export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
    deletedFor?: string[];
    isDeleted?: boolean;
    image?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'file';
}

export type Conversation = {
    id: string;
    participantIds: string[];
    collegeId?: string;
    messages: Message[];
    name?: string; // For group chats
    isGroupChat?: boolean;
    creatorId?: 'system' | string;
    systemKey?: string;
}

export type FeedPreferences = {
  showRegularPosts: boolean;
  showEvents: boolean;
  showOpportunities: boolean;
  showSharedPosts: boolean;
};

// --- Academics Types ---

export type Student = {
    id: string;
    name: string;
    avatarUrl?: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceRecord = {
    date: number; // timestamp for the day
    label?: string; // e.g. "Lecture 1", "Extra Class"
    records: Record<string, { status: AttendanceStatus; note?: string }>; // studentId -> { status, optional note }
};

export type Note = {
    id: string;
    title: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: number;
};

export type Assignment = {
    id: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    postedAt: number;
    dueDate: number;
    submissions?: Record<string, {
        submitted: boolean;
        submittedAt?: number;
        fileUrl?: string;
        grade?: string;
        feedback?: string;
    }>;
};

export type Feedback = {
    studentId: string;
    rating: number;
    comment: string;
    timestamp: number;
}

export type Course = {
    id: string;
    subject: string;
    department: string;
    year: number;
    division?: string;
    facultyId: string; // Added to identify the instructor
    collegeId?: string;
    description?: string;
    notes?: Note[];
    assignments?: Assignment[];
    attendanceRecords?: AttendanceRecord[];
    facultyIds?: string[]; // Multiple instructors support
    students?: string[]; // array of enrolled student IDs
    pendingStudents?: string[]; // array of student IDs requesting to join
    messages?: Message[]; // For in-course chat
    personalNotes?: { [userId: string]: string; }; // Private notes for faculty and students
    feedback?: Feedback[];
};


// --- Notice Board Types ---
export type Notice = {
  id: string;
  authorId: string;
  title: string;
  content: string; // HTML content from editor
  timestamp: number | string;
  collegeId?: string;
  mediaUrl?: string; // Added to support images in notices
  imageUrl?: string; // Kept for backward compatibility
  // FIX: Add optional properties for targeted notices to resolve type errors.
  targetDepartments?: string[];
  targetYears?: number[];
  targetClasses?: string[]; // Format: "Year-Division"
  // Added missing fields to fix property missing errors in DirectorPage and HodPage
  targetDept?: string | null;
  targetYear?: number | string | null;
  targetDiv?: string | null;
  targetCourseId?: string | null;
  targetAudience?: string;
};

export type DepartmentChat = {
    id: string; // Department name
    collegeId?: string;
    department?: string;
    channel?: string;
    messages: Message[];
};

// --- Career & Roadmap Types ---

export type RoadmapStep = {
    title: string;
    description: string;
    resources: { name: string; url: string }[];
    duration: string;
}

export type CareerRoadmap = {
    id: string;
    title: string; // e.g., "Data Scientist", "Full Stack Dev"
    description: string;
    steps: RoadmapStep[];
    avgSalary: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    color: string; // Tailwind class for gradient/color
}

export type Mentor = {
    id: string;
    userId: string; // Link to existing user if applicable
    name: string;
    role: string;
    company: string;
    expertise: string[];
    availableFor: ('Resume Review' | 'Career Guidance' | 'Mock Interview')[];
    rating: number;
    avatarUrl?: string;
}

export type Project = {
    id: string;
    title: string;
    description: string;
    techStack: string[];
    githubUrl?: string;
    demoUrl?: string;
    lookingFor?: string[]; // e.g. ["Frontend Dev", "Designer"]
    authorId: string;
    timestamp: number;
}

// FIX: Added HodPageProps interface definition.
export interface HodPageProps {
  currentUser: User;
  onNavigate: (path: string) => void;
  currentPath: string;
  courses: Course[];
  onCreateCourse: (courseData: any) => void;
  onUpdateCourse: (id: string, data: any) => void;
  onDeleteCourse: (id: string) => void;
  notices: Notice[];
  users: { [key: string]: User };
  allUsers: User[];
  onCreateNotice: (noticeData: any) => void;
  onDeleteNotice: (id: string) => void;
  departmentChats: DepartmentChat[];
  onSendDepartmentMessage: (department: string, channel: string, text: string) => void;
  onCreateUser: (userData: any) => Promise<void>;
  onCreateUsersBatch: (usersData: any[]) => Promise<{ successCount: number; errors: any[] }>;
  onApproveTeacherRequest: (uid: string) => void;
  onDeclineTeacherRequest: (uid: string) => void;
  colleges: College[];
  onUpdateCourseFaculty: (cid: string, fid: string) => void;
  onUpdateCollegeClasses: (cid: string, dept: string, classes: any) => void;
  onUpdateCollege: (cid: string, data: any) => void;
  onDeleteUser: (uid: string) => void;
  onToggleFreezeUser: (uid: string) => void;
  onUpdateUserRole: (uid: string, data: any) => void;
  onUpdateUser: (uid: string, data: any) => void; 
  onCreateOrOpenConversation: (uid: string) => Promise<string>;
}

export type PlatformSettings = {
    maintenanceMode: boolean;
    enableChat: boolean;
    enableOpportunities: boolean;
    enableEvents: boolean;
    globalAnnouncement?: string;
}
