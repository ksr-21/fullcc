import React, { useState, useRef } from 'react';
import { auth, FieldValue, db } from '../api';
import type { User } from '../types';
import { MailIcon, LockIcon, CameraIcon, UserIcon, XCircleIcon, ShieldIcon } from '../components/Icons';

// Cloudinary Config
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
    
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.secure_url;
};

interface SignupPageProps {
    onNavigate: (path: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    
    // Avatar
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 700 * 1024) { 
                alert("Profile picture must be smaller than 700KB.");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const cleanEmail = email.trim().toLowerCase();

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        let createdAuthUser: any = null;
        let isExistingAuth = false;

        try {
            // 1. Try to Create/Verify Auth User
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(cleanEmail, password);
                createdAuthUser = userCredential.user;
            } catch (authErr: any) {
                if (authErr.code === 'auth/email-already-in-use') {
                    try {
                        const signInCredential = await auth.signInWithEmailAndPassword(cleanEmail, password);
                        createdAuthUser = signInCredential.user;
                        const existingDoc = await db.collection('users').doc(createdAuthUser.uid).get();
                        if (existingDoc.exists && existingDoc.data().isRegistered) {
                             throw new Error("Account already active. Please Log In instead.");
                        }
                        isExistingAuth = true;
                    } catch (signInErr: any) {
                        if (signInErr.message === "Account already active. Please Log In instead.") throw signInErr;
                        throw new Error("Email already in use. Please Log In or reset password.");
                    }
                } else {
                    throw authErr;
                }
            }

            // 2. Find Invite Document
            let inviteDoc = null;
            let sourceCollection = '';
            
            // Check 'invites' collection
            const invitesQuery = await db.collection('invites').where('email', '==', cleanEmail).get();
            if (!invitesQuery.empty) {
                inviteDoc = invitesQuery.docs[0];
                sourceCollection = 'invites';
            }

            // Fallback to 'users' (Legacy or direct additions)
            if (!inviteDoc) {
                const usersQuery = await db.collection('users').where('email', '==', cleanEmail).get();
                const potentialDocs = usersQuery.docs.filter((doc: any) => doc.id !== createdAuthUser.uid);
                inviteDoc = potentialDocs.find((doc: any) => !doc.data().isRegistered) || potentialDocs[0];
                if (inviteDoc) sourceCollection = 'users';
            }

            if (!inviteDoc) {
                 throw new Error("NO_INVITE");
            }

            const inviteData = inviteDoc.data();
            const oldId = inviteDoc.id;
            const newId = createdAuthUser.uid;

            // Validate Invite Code
            if (inviteData.tempPassword && inviteData.tempPassword.trim() !== "") {
                if (inviteData.tempPassword !== inviteCode.trim()) {
                    if (!isExistingAuth && createdAuthUser) await createdAuthUser.delete();
                    throw new Error("INVALID_CODE");
                }
            }

            // 3. Resolve College (For Directors invited by Super Admin)
            let resolvedCollegeId = inviteData.collegeId;
            let resolvedCollegeDoc = null;

            if (!resolvedCollegeId && inviteData.tag === 'Director') {
                const collegeQuery = await db.collection('colleges').where('adminUids', 'array-contains', oldId).get();
                if (!collegeQuery.empty) {
                    resolvedCollegeDoc = collegeQuery.docs[0];
                    resolvedCollegeId = resolvedCollegeDoc.id;
                }
            }

            // 4. Upload Avatar
            let avatarUrl = inviteData.avatarUrl;
            if (avatarFile) {
                try {
                    avatarUrl = await uploadToCloudinary(avatarFile);
                } catch (uploadErr) {
                    console.warn("Failed to upload avatar:", uploadErr);
                }
            }

            // 5. Prepare New User Data
            const newUserData = {
                ...inviteData,
                id: newId,
                name: name.trim() || inviteData.name,
                email: cleanEmail,
                collegeId: resolvedCollegeId || null,
                isRegistered: true,
                isFrozen: false,
                createdAt: Date.now(),
                avatarUrl: avatarUrl || undefined,
                tempPassword: FieldValue.delete()
            };
            
            // 6. Execute Migration (Batch Write)
            // Simplified for MongoDB direct API as batch is not fully implemented in mock
            const newUserRef = db.collection('users').doc(newId);
            await newUserRef.set(newUserData, { merge: true });

            if (sourceCollection === 'invites') {
                await db.collection('invites').doc(oldId).delete();
            } else if (sourceCollection === 'users' && oldId !== newId) {
                await db.collection('users').doc(oldId).delete();
            }

            // Relational Migrations if ID changed
            if (oldId !== newId) {
                // College Admin Update
                if (inviteData.tag === 'Director' && resolvedCollegeId) {
                    const collegeRef = db.collection('colleges').doc(resolvedCollegeId);
                    const collegeSnap = resolvedCollegeDoc || await collegeRef.get();
                    if (collegeSnap.exists) {
                        const cData = collegeSnap.data();
                        const newAdmins = (cData.adminUids || []).filter((id: string) => id !== oldId).concat(newId);
                        await collegeRef.update({ adminUids: newAdmins });
                    }
                }

                // Courses (Faculty)
                const facultyCoursesSnap = await db.collection('courses').where('facultyId', '==', oldId).get();
                for (const doc of facultyCoursesSnap.docs) {
                    await db.collection('courses').doc(doc.id).update({ facultyId: newId });
                }

                // Courses (Students)
                const studentCoursesSnap = await db.collection('courses').where('students', 'array-contains', oldId).get();
                for (const doc of studentCoursesSnap.docs) {
                    const sData = doc.data();
                    const newStudents = (sData.students || []).filter((id: string) => id !== oldId).concat(newId);
                    await db.collection('courses').doc(doc.id).update({ students: newStudents });
                }

                // Groups (Membership & Creator)
                const groupMembersSnap = await db.collection('groups').where('memberIds', 'array-contains', oldId).get();
                for (const doc of groupMembersSnap.docs) {
                    const gData = doc.data();
                    const newMembers = (gData.memberIds || []).filter((id: string) => id !== oldId).concat(newId);
                    await db.collection('groups').doc(doc.id).update({ memberIds: newMembers });
                }
                const groupCreatorSnap = await db.collection('groups').where('creatorId', '==', oldId).get();
                for (const doc of groupCreatorSnap.docs) {
                    await db.collection('groups').doc(doc.id).update({ creatorId: newId });
                }
            }
            window.location.reload();

        } catch (err: any) {
            console.error("Signup Error:", err);
            if (createdAuthUser && !isExistingAuth && err.message !== "Account already active. Please Log In instead.") {
                await createdAuthUser.delete().catch(() => {});
            }

            if (err.message === "NO_INVITE") {
                setError("No pending invitation found for this email. Ensure your email matches the invitation exactly.");
            } else if (err.message === "Account already active. Please Log In instead.") {
                setError("This email is already registered. Please Log In.");
            } else if (err.message === "INVALID_CODE") {
                setError("Invalid Temporary Password / Invite Code.");
            } else if (err.code === 'permission-denied' || err.message?.includes('permission')) {
                setError("Security Block: Missing or insufficient permissions. Contact support to verify your invite permissions.");
            } else {
                setError(err.message || 'An unexpected error occurred during signup.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full bg-background font-sans">
             <div className="hidden lg:flex lg:w-1/2 relative bg-secondary overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-95"></div>
                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <div className="relative z-10 p-12 text-white max-w-lg text-center">
                     <div className="mb-8 bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl mx-auto">
                        <LockIcon className="w-10 h-10 text-white/90"/>
                     </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight drop-shadow-md">
                        Activate Account
                    </h1>
                    <p className="text-lg font-light text-slate-300 leading-relaxed">
                        CampusConnect is invite-only. Use the email address where you received your invitation to activate your profile.
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
                <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50 transition-all duration-300">
                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                            Complete Setup
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter your details to validate your invite.
                        </p>
                    </div>

                    {error && (
                         <div className="mb-6 rounded-xl bg-destructive/10 p-4 animate-fade-in border border-destructive/20">
                            <div className="flex items-start">
                                <XCircleIcon className="w-5 h-5 text-destructive mt-0.5 mr-3 flex-shrink-0" />
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-5 animate-fade-in">
                        <div className="flex flex-col items-center mb-2">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all bg-muted">
                                    <img src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`} alt="Avatar" className="w-full h-full object-cover"/>
                                </div>
                                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform border border-card">
                                    <CameraIcon className="w-3 h-3"/>
                                </div>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-wide">Upload Photo</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Full Name</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" className="appearance-none block w-full pl-9 pr-3 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 sm:text-sm"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Institutional Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MailIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your.name@college.edu" className="appearance-none block w-full pl-9 pr-3 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 sm:text-sm"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Invite Code / Temporary Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ShieldIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Optional (if provided)" className="appearance-none block w-full pl-9 pr-3 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 sm:text-sm"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Create New Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" className="appearance-none block w-full pl-9 pr-3 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 sm:text-sm"/>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/30">
                            {isLoading ? (
                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Verifying & Creating...</span>
                            ) : (
                                'Complete Registration'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <span className="text-xs text-muted-foreground">Already active? </span>
                        <a onClick={() => onNavigate('#/login')} className="text-xs font-bold text-primary cursor-pointer hover:underline">Log In</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;