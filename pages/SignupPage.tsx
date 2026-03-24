import React, { useState, useRef } from 'react';
import { auth, api } from '../api';
import { MailIcon, LockIcon, CameraIcon, UserIcon, XCircleIcon, ShieldIcon, ArrowRightIcon } from '../components/Icons';

interface SignupPageProps {
    onNavigate: (path: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Verification
    const [email, setEmail] = useState('');
    const [inviteInfo, setInviteInfo] = useState<{
        tag: string;
        collegeId?: string;
        department?: string;
        requiresInviteCode: boolean;
    } | null>(null);

    // Step 2: Profile
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 3: Password
    const [password, setPassword] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const info = await api.post('/auth/verify-invite', { email: email.trim().toLowerCase() });
            setInviteInfo(info);
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Invitation verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (inviteInfo?.requiresInviteCode && !inviteCode.trim()) {
            setError('Please enter your invitation code.');
            return;
        }
        setError('');
        setStep(3);
    };

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
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);
        try {
            let avatarUrl = '';
            if (avatarFile) {
                const uploadRes = await api.upload(avatarFile);
                avatarUrl = uploadRes.url;
            }

            await api.post('/auth/register', {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                inviteCode: inviteCode.trim(),
                avatarUrl
            });

            // Auto-login after registration
            await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full bg-slate-900 font-sans text-left">
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>
                <div className="relative z-10 text-center max-w-md">
                    <div className="mb-8 bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl mx-auto">
                        <ShieldIcon className="w-10 h-10 text-white/90"/>
                    </div>
                    <h1 className="text-5xl font-black text-white mb-6 tracking-tighter">Verify Invitation</h1>
                    <p className="text-lg text-slate-300 font-light leading-relaxed">
                        CampusConnect is a private network. Enter the email where you received your invitation to proceed.
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Activate Account</h2>
                        <div className="flex justify-center gap-2 mt-4">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-shake">
                            <XCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400">{error}</p>
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleVerify} className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Institutional Email</label>
                                <div className="relative">
                                    <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        placeholder="your.name@college.edu"
                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : 'Check Invitation'} <ArrowRightIcon className="w-4 h-4" />
                            </button>
                            <p className="text-center text-xs font-bold text-slate-500 mt-6">
                                Already active? <button onClick={() => onNavigate('#/login')} className="text-indigo-600 hover:underline">Log In</button>
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleProfileNext} className="space-y-6 animate-fade-in">
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-200 dark:bg-slate-700">
                                        <img src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800 group-hover:scale-110 transition-transform">
                                        <CameraIcon className="w-4 h-4" />
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-500 mt-3 tracking-widest">Upload Avatar</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Full Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        placeholder="John Doe"
                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {inviteInfo?.requiresInviteCode && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Invite Code</label>
                                    <div className="relative">
                                        <ShieldIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={e => setInviteCode(e.target.value)}
                                            required
                                            placeholder="Enter 6-digit code"
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">Back</button>
                                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">Next Step <ArrowRightIcon className="w-4 h-4" /></button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSignup} className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Account Password</label>
                                <div className="relative">
                                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        placeholder="Min. 6 characters"
                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">Back</button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating Account...' : 'Finish Registration'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
