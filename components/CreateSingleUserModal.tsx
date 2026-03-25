import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { CloseIcon, LockIcon } from './Icons';
import { yearOptions } from '../constants';

interface CreateSingleUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: string;
    role: 'Student' | 'Teacher';
    onCreateUser: (userData: Omit<User, 'id'>, password?: string) => Promise<void>;
    availableYears?: number[];
    availableDivisions?: string[];
    activeClasses?: { year: number; division: string }[];
    existingEmails?: string[];
}

const CreateSingleUserModal: React.FC<CreateSingleUserModalProps> = ({
    isOpen,
    onClose,
    department,
    role,
    onCreateUser,
    availableYears = [],
    availableDivisions = [],
    activeClasses = [],
    existingEmails = []
}) => {
    const derivedAvailableYears = useMemo(() => {
        if (availableYears.length > 0) return availableYears;
        const years = Array.from(new Set(activeClasses.map(c => c.year))).sort((a, b) => a - b);
        return years.length > 0 ? years : [1];
    }, [activeClasses, availableYears]);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [year, setYear] = useState(derivedAvailableYears[0] || 1);
    const effectiveAvailableDivisions = useMemo(() => {
        const classDivisions = activeClasses
            .filter(c => c.year === year)
            .map(c => c.division)
            .filter(Boolean);
        const source = classDivisions.length > 0 ? classDivisions : availableDivisions;
        return Array.from(new Set(source)).sort();
    }, [activeClasses, availableDivisions, year]);
    const [division, setDivision] = useState(effectiveAvailableDivisions[0] || '');
    const [rollNo, setRollNo] = useState('');
    const [designation, setDesignation] = useState('');
    const [qualification, setQualification] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setYear(derivedAvailableYears[0] || 1);
    }, [derivedAvailableYears, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (!effectiveAvailableDivisions.includes(division)) {
            setDivision(effectiveAvailableDivisions[0] || '');
        }
    }, [division, effectiveAvailableDivisions, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Normalize for check
        const emailToCheck = email.trim().toLowerCase();

        // 1. Check for duplicate email
        if (existingEmails.map(e => e.toLowerCase()).includes(emailToCheck)) {
            alert(`A ${role.toLowerCase()} with this email (${email}) already exists.`);
            return;
        }

        // Student validations
        if (role === 'Student') {
            if (!year || Number.isNaN(year) || year < 1) {
                alert('Please select a valid year for student.');
                setIsLoading(false);
                return;
            }
            if (!division || division.trim() === '') {
                alert('Please select a division for student.');
                setIsLoading(false);
                return;
            }
            if (!rollNo.trim()) {
                alert('Please provide roll number for student.');
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        try {
            const userData: Omit<User, 'id'> = {
                name,
                email: emailToCheck,
                department,
                tag: role,
                isApproved: true,
                isRegistered: false,
                isFrozen: false,
                tempPassword: tempPassword.trim() || undefined
            };
            if (role === 'Student') {
                userData.yearOfStudy = year;
                userData.division = division;
                userData.rollNo = rollNo.trim();
            } else if (role === 'Teacher') {
                userData.designation = designation.trim();
                userData.qualification = qualification.trim();
            }

            await onCreateUser(userData, tempPassword.trim() || undefined);
            onClose();
            setName('');
            setEmail('');
            setYear(derivedAvailableYears[0] || 1);
            setDivision(effectiveAvailableDivisions[0] || '');
            setRollNo('');
            setDesignation('');
            setQualification('');
            setTempPassword('');
        } catch (error) {
            console.error("Failed to create user", error);
            const message = error instanceof Error ? error.message : "Failed to create user";
            alert(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="font-bold text-lg text-foreground">Add {role}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            required 
                            placeholder="Full Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            required 
                            placeholder="Email Address"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Temporary Password / Invite Code</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input 
                                type="text" 
                                value={tempPassword} 
                                onChange={e => setTempPassword(e.target.value)} 
                                className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                placeholder="Optional (e.g. Welcome123)"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">If set, the user must enter this code to sign up.</p>
                    </div>
                    {role === 'Student' && (
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Year</label>
                                <select 
                                    value={year} 
                                    onChange={e => setYear(Number(e.target.value))}
                                    className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                >
                                    {derivedAvailableYears.length > 0 ? (
                                        derivedAvailableYears.map(y => (
                                            <option key={y} value={y}>Year {y}</option>
                                        ))
                                    ) : (
                                        yearOptions.map(opt => (
                                            <option key={opt.val} value={opt.val}>{opt.label}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Division</label>
                                <select
                                    value={division}
                                    onChange={e => setDivision(e.target.value)}
                                    className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                >
                                    <option value="">Select Div</option>
                                    {effectiveAvailableDivisions.length > 0 ? (
                                        effectiveAvailableDivisions.map(div => <option key={div} value={div}>{div}</option>)
                                    ) : (
                                        ['A', 'B', 'C', 'D'].map(div => <option key={div} value={div}>{div}</option>)
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Roll No</label>
                                <input 
                                    type="text" 
                                    value={rollNo} 
                                    onChange={e => setRollNo(e.target.value)} 
                                    className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                    placeholder="e.g. 101"
                                />
                            </div>
                        </div>
                    )}
                    {role === 'Teacher' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Designation</label>
                                <input 
                                    type="text" 
                                    value={designation} 
                                    onChange={e => setDesignation(e.target.value)} 
                                    className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                    placeholder="e.g. Asst. Professor"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Qualification</label>
                                <input 
                                    type="text" 
                                    value={qualification} 
                                    onChange={e => setQualification(e.target.value)} 
                                    className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                    placeholder="e.g. M.Tech, PhD"
                                />
                            </div>
                        </div>
                    )}
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {isLoading ? 'Adding...' : 'Add User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSingleUserModal;
