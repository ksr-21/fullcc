
import React, { useState, useMemo, useEffect } from 'react';
import type { User, College, PlatformSettings, CollegeStatus } from '../types';
import { 
    BuildingIcon, MailIcon, PlusIcon, UsersIcon, CheckCircleIcon, XCircleIcon, 
    AlertTriangleIcon, SearchIcon, TrashIcon, CloseIcon, ClockIcon,
    ShieldIcon, ActivityIcon, FilterIcon, ListIcon, SettingsIcon, MegaphoneIcon,
    InfoIcon, ChartBarIcon, GlobeIcon, DownloadIcon, LayoutGridIcon,
    ChevronDownIcon, ArrowRightIcon, MoreVerticalIcon, UserPlusIcon, EditIcon, MessageIcon, CalendarIcon, BriefcaseIcon
} from '../components/Icons';
import Header from '../components/Header';
import { auth } from '../api';
import { db } from '../api';
import BottomNavBar from '../components/BottomNavBar';
import Avatar from '../components/Avatar';

interface SuperAdminPageProps {
  colleges: College[];
  users: { [key: string]: User };
  onCreateCollegeAdmin: (collegeName: string, email: string) => Promise<void>;
  onNavigate: (path: string) => void;
  currentUser: User;
  currentPath: string;
  onApproveDirector: (directorId: string, collegeName: string) => void;
  onChangeCollegeAdmin: (collegeId: string, email: string) => Promise<void>;
  onDeleteUser: (userId: string) => void;
  onDeleteCollege: (collegeId: string) => void;
}

type AdminTab = 'dashboard' | 'colleges' | 'requests' | 'platform' | 'audit';

const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ 
    colleges, users, onCreateCollegeAdmin, onNavigate, 
    currentUser, currentPath, onApproveDirector, onChangeCollegeAdmin, onDeleteUser, onDeleteCollege 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [collegeName, setCollegeName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CollegeStatus | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Change Admin Modal State
  const [changeAdminCollegeId, setChangeAdminCollegeId] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isChangingAdmin, setIsChangingAdmin] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    onNavigate('#/');
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onCreateCollegeAdmin(collegeName, adminEmail.trim().toLowerCase()); 
      setCollegeName('');
      setAdminEmail('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAdminSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!changeAdminCollegeId || !newAdminEmail.trim()) return;
      
      setIsChangingAdmin(true);
      try {
          await onChangeCollegeAdmin(changeAdminCollegeId, newAdminEmail.trim().toLowerCase());
          setChangeAdminCollegeId(null);
          setNewAdminEmail('');
          alert("Director reassigned successfully.");
      } catch (err: any) {
          alert("Failed to change admin: " + err.message);
      } finally {
          setIsChangingAdmin(false);
      }
  };
  
  const pendingRequests = useMemo(() => {
      const allUsers = Object.values(users || {}) as User[];
      return allUsers.filter(u => !u.isApproved && (u.tag === 'Director' || !!u.requestedCollegeName));
  }, [users]);

  const filteredColleges = useMemo(() => {
      let filtered = colleges;
      if (searchTerm.trim()) {
          filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      if (statusFilter !== 'all') {
          filtered = filtered.filter(c => (c.status || 'active') === statusFilter);
      }
      return filtered;
  }, [colleges, searchTerm, statusFilter]);
  
  const stats = useMemo(() => {
      // FIX: Explicitly cast Object.values(users) to User[] to fix 'unknown' type error on isRegistered and isFrozen
      const allUsersArray = Object.values(users) as User[];
      return {
          totalColleges: colleges.length,
          approvedColleges: colleges.filter(c => (c.status || 'active') === 'active').length,
          pendingRequests: pendingRequests.length,
          suspendedColleges: colleges.filter(c => c.status === 'suspended').length,
          totalUsers: allUsersArray.length,
          activeUsers: allUsersArray.filter(u => u.isRegistered && !u.isFrozen).length
      };
  }, [colleges, users, pendingRequests]);

  const toggleStatus = async (collegeId: string, currentStatus: CollegeStatus) => {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      if (window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this college?`)) {
          await db.collection('colleges').doc(collegeId).update({ status: newStatus });
      }
  };

  // UI Components
  const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                  <Icon className="w-6 h-6" />
              </div>
              {trend && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {trend > 0 ? '+' : ''}{trend}%
                  </span>
              )}
          </div>
          <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <h3 className="text-3xl font-black text-foreground">{value}</h3>
          </div>
      </div>
  );

  const NavButton = ({ id, label, icon: Icon }: { id: AdminTab, label: string, icon: any }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
      >
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <Header currentUser={currentUser} onLogout={handleLogout} onNavigate={onNavigate} currentPath={currentPath} />
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-12 max-w-7xl">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest mb-1">
                    <ShieldIcon className="w-3 h-3" /> System Root Access
                </div>
                <h1 className="text-4xl font-black text-foreground tracking-tight">Super Admin Hub</h1>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex-1 md:flex-none px-6 py-3 bg-foreground text-background rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" /> Add College
                </button>
                <button className="px-6 py-3 bg-card border border-border rounded-xl font-black text-xs uppercase tracking-widest hover:bg-muted transition-all shadow-sm flex items-center justify-center gap-2">
                    <DownloadIcon className="w-5 h-5" /> Export Data
                </button>
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 mb-4 border-b border-border">
            <NavButton id="dashboard" label="Dashboard" icon={LayoutGridIcon} />
            <NavButton id="colleges" label="Manage Colleges" icon={BuildingIcon} />
            <NavButton id="requests" label={`Requests (${stats.pendingRequests})`} icon={ClockIcon} />
            <NavButton id="platform" label="Platform Settings" icon={SettingsIcon} />
            <NavButton id="audit" label="Audit Logs" icon={ActivityIcon} />
        </div>

        {activeTab === 'dashboard' && (
            <div className="animate-fade-in space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Institutions" value={stats.totalColleges} icon={BuildingIcon} color="blue" />
                    <StatCard label="Pending Approval" value={stats.pendingRequests} icon={ClockIcon} color="amber" />
                    <StatCard label="Total Reach" value={stats.totalUsers} icon={UsersIcon} color="purple" />
                    <StatCard label="System Status" value="Healthy" icon={CheckCircleIcon} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-card rounded-[2rem] border border-border shadow-sm p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                                    <ActivityIcon className="w-6 h-6 text-primary"/> System Activity Pulse
                                </h3>
                                <button onClick={() => setActiveTab('audit')} className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">Full Audit</button>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 border-2 border-dashed border-border rounded-2xl">
                                <ActivityIcon className="w-12 h-12 mb-4 opacity-20"/>
                                <p className="font-bold text-sm uppercase tracking-widest">No recent activity logs available</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-all pointer-events-none">
                                <MegaphoneIcon className="w-48 h-48 rotate-12" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2 tracking-tight">Platform Broadcast</h3>
                                <p className="text-indigo-200 mb-8 max-w-lg">Push an urgent announcement to every college dashboard across the ecosystem.</p>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Type message here..." 
                                        className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                    />
                                    <button className="bg-white text-indigo-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Broadcast</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-8 sticky top-24">
                            <h3 className="text-xl font-black text-foreground mb-8 flex items-center gap-3">
                                <ClockIcon className="w-6 h-6 text-amber-500"/> Action Queue
                            </h3>
                            {pendingRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingRequests.slice(0, 5).map(req => (
                                        <div key={req.id} className="p-4 bg-muted/30 rounded-2xl border border-border/50 group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Avatar src={req.avatarUrl} name={req.name} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{req.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{req.requestedCollegeName || 'New Director'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setActiveTab('requests')}
                                                    className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-md"
                                                >
                                                    Review
                                                </button>
                                                <button 
                                                    onClick={() => {if(window.confirm('Delete this request?')) onDeleteUser(req.id)}}
                                                    className="p-2 text-muted-foreground hover:text-rose-500 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setActiveTab('requests')}
                                        className="w-full py-4 mt-4 border-2 border-dashed border-border rounded-2xl text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all"
                                    >
                                        View All Requests ({stats.pendingRequests})
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <CheckCircleIcon className="w-16 h-16 text-emerald-500 opacity-20 mx-auto mb-4"/>
                                    <p className="text-sm font-bold text-muted-foreground">Queue is Clear</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'colleges' && (
            <div className="animate-fade-in space-y-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
                    <div className="relative flex-1 w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search by college name, admin, or location..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-muted/40 border border-transparent focus:bg-background focus:border-primary rounded-2xl pl-12 pr-6 py-3.5 text-sm focus:outline-none transition-all shadow-inner font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border border-border rounded-2xl text-sm font-bold text-muted-foreground group hover:border-primary/40 transition-all cursor-pointer">
                            <FilterIcon className="w-4 h-4"/>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="bg-transparent focus:outline-none appearance-none cursor-pointer pr-4"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="suspended">Suspended</option>
                                <option value="pending">Pending Registration</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredColleges.length > 0 ? filteredColleges.map(college => {
                        const adminUid = college.adminUids?.[0];
                        const adminUser = adminUid ? users[adminUid] : null;
                        const status = college.status || 'active';
                        
                        return (
                            <div key={college.id} className={`bg-card rounded-[2.5rem] border transition-all duration-500 overflow-hidden flex flex-col group relative ${status === 'suspended' ? 'border-rose-200/50 grayscale-[0.3]' : 'border-border shadow-sm hover:shadow-2xl hover:border-primary/20 hover:-translate-y-2'}`}>
                                <div className={`h-1.5 w-full ${status === 'active' ? 'bg-emerald-500' : status === 'suspended' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                
                                <div className="p-8 flex-1">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 duration-500 ${status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            <BuildingIcon className="w-8 h-8"/>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                            status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                            status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                            'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                            {status}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl font-black text-foreground tracking-tighter mb-6 group-hover:text-primary transition-colors line-clamp-2 min-h-[4rem]">{college.name}</h3>

                                    <div className="space-y-4 pt-6 border-t border-border/50">
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Principal Director</p>
                                                <button onClick={() => setChangeAdminCollegeId(college.id)} className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest">Reassign</button>
                                            </div>
                                            {adminUser ? (
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={adminUser.avatarUrl} name={adminUser.name} size="sm" className="ring-2 ring-background shadow-sm" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-foreground truncate">{adminUser.name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">{adminUser.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 px-3 py-2 rounded-xl">
                                                    <AlertTriangleIcon className="w-3.5 h-3.5"/> No Admin Assigned
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/10 border-t border-border/40 grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => toggleStatus(college.id, status)}
                                        className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                                            status === 'suspended' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-500/10 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white'
                                        }`}
                                    >
                                        {status === 'suspended' ? 'Restore' : 'Suspend'}
                                    </button>
                                    <button 
                                        onClick={() => {if(window.confirm('PERMANENTLY delete college?')) onDeleteCollege(college.id)}}
                                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5"
                                    >
                                        <TrashIcon className="w-3 h-3"/> Delete
                                    </button>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="col-span-full py-32 text-center bg-card rounded-[3rem] border-2 border-dashed border-border shadow-inner">
                            <BuildingIcon className="w-20 h-20 mx-auto text-muted-foreground/10 mb-6"/>
                            <h3 className="text-2xl font-black text-muted-foreground/30 uppercase tracking-[0.2em]">No colleges matching records</h3>
                            <button onClick={() => {setSearchTerm(''); setStatusFilter('all');}} className="mt-6 text-primary font-bold hover:underline">Reset Inventory Search</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'requests' && (
            <div className="animate-fade-in space-y-10 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-foreground tracking-tighter">Onboarding Queue</h2>
                        <p className="text-muted-foreground text-lg">Approve institutional license requests from prospective Directors.</p>
                    </div>
                    <div className="px-5 py-2 bg-amber-500/10 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2 shadow-sm">
                        <ClockIcon className="w-4 h-4" /> {pendingRequests.length} Active Requests
                    </div>
                </div>

                <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/30 text-muted-foreground font-black text-[10px] uppercase tracking-[0.25em] border-b border-border">
                                <tr>
                                    <th className="p-6">Applicant & Institution</th>
                                    <th className="p-6">Email Identity</th>
                                    <th className="p-6 text-center">Time Log</th>
                                    <th className="p-6 text-right">Review Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {pendingRequests.length > 0 ? pendingRequests.map(director => {
                                    const isProcessing = approvingId === director.id;
                                    return (
                                        <tr key={director.id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="relative">
                                                        <Avatar src={director.avatarUrl} name={director.name} size="md" className="shadow-md ring-2 ring-card group-hover:ring-primary/20 transition-all"/>
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-card flex items-center justify-center">
                                                            <PlusIcon className="w-3 h-3 text-white stroke-[4]"/>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-foreground tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{director.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">{director.requestedCollegeName || 'New Director'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm font-black text-foreground/80">{director.email}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground/50 uppercase">Verified EDU Domain</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border">Received: {new Date().toLocaleDateString()}</span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button 
                                                        onClick={() => {if(window.confirm('Reject and delete request?')) onDeleteUser(director.id)}}
                                                        className="px-5 py-2.5 bg-rose-500/10 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            setApprovingId(director.id);
                                                            let cName = director.requestedCollegeName;
                                                            if (!cName) cName = prompt("Finalize college name:") || '';
                                                            if (cName) await onApproveDirector(director.id, cName);
                                                            setApprovingId(null);
                                                        }}
                                                        disabled={isProcessing}
                                                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2"
                                                    >
                                                        {isProcessing ? 'Onboarding...' : 'Approve Identity'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} className="p-24 text-center">
                                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircleIcon className="w-10 h-10"/>
                                            </div>
                                            <p className="text-muted-foreground font-black text-xl uppercase tracking-tighter opacity-40">Queue cleared successfully</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'platform' && (
            <div className="animate-fade-in max-w-4xl mx-auto space-y-10">
                <h2 className="text-3xl font-black text-foreground tracking-tighter">Global Ecosystem Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card border border-border rounded-[3rem] p-8 shadow-sm space-y-8">
                        <h3 className="text-xl font-black flex items-center gap-3">
                            <ShieldIcon className="w-6 h-6 text-primary"/> Core Protocols
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                <div>
                                    <p className="text-sm font-black text-rose-600 uppercase tracking-tight">Maintenance Mode</p>
                                    <p className="text-[10px] text-rose-500 font-medium">Suspend all user sessions globally</p>
                                </div>
                                <button className="w-12 h-6 bg-muted rounded-full relative transition-colors"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div></button>
                            </div>

                            {[
                                { id: 'chat', label: 'Global Chat Infrastructure', icon: MessageIcon },
                                { id: 'events', label: 'Events & Engagement Engine', icon: CalendarIcon },
                                { id: 'opps', label: 'Career Opportunities API', icon: BriefcaseIcon }
                            ].map(feat => (
                                <div key={feat.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <feat.icon className="w-4 h-4 text-muted-foreground"/>
                                        <p className="text-sm font-bold text-foreground">{feat.label}</p>
                                    </div>
                                    <button className="w-12 h-6 bg-emerald-500 rounded-full relative transition-colors"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-[3rem] p-8 shadow-sm space-y-8">
                         <h3 className="text-xl font-black flex items-center gap-3">
                            <MegaphoneIcon className="w-6 h-6 text-amber-500"/> Ecosystem Broadcast
                        </h3>
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground font-medium">Deploy a banner announcement that appears at the top of every page for all users in the system.</p>
                            <textarea 
                                rows={6}
                                className="w-full bg-muted/40 border border-border rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-inner resize-none"
                                placeholder="Alert: System upgrade scheduled for midnight..."
                            />
                            <button className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                                Deploy Global Banner
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'audit' && (
            <div className="animate-fade-in max-w-6xl mx-auto space-y-8 text-left">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Audit Trail</h2>
                    <button className="px-5 py-2.5 bg-card border border-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-muted transition-all shadow-sm flex items-center gap-2">
                        <DownloadIcon className="w-4 h-4" /> Download Logs
                    </button>
                </div>

                <div className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/10 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                            <input type="text" placeholder="Filter logs by admin or action..." className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/20 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-5">Timestamp</th>
                                    <th className="p-5">Authorized Admin</th>
                                    <th className="p-5">Security Action</th>
                                    <th className="p-5">Target Entity</th>
                                    <th className="p-5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-muted-foreground/30 font-black uppercase tracking-[0.2em]">
                                        <ShieldIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        Secure trail is currently empty
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Manual Add College Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
            <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-md border border-border p-10" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 text-left">
                    <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Onboard College</h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Manual Provisioning</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleAddCollege} className="space-y-6 text-left">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Institute Full Name</label>
                        <input
                            type="text"
                            value={collegeName}
                            onChange={(e) => setCollegeName(e.target.value)}
                            required
                            placeholder="e.g. Stanford University"
                            className="w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold shadow-inner"
                        />
                    </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Primary Admin Identity (Email)</label>
                        <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required
                            placeholder="director@institute.edu"
                            className="w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold shadow-inner"
                        />
                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-4">
                            <InfoIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-600 font-bold leading-relaxed">System will send an activation link to this address. They will serve as the top-level Director.</p>
                        </div>
                    </div>
                    {error && <p className="text-xs font-bold text-center text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-4 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all">Discard</button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all transform active:scale-95"
                        >
                            {isLoading ? 'Syncing...' : 'Provision & Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Change Admin Modal */}
      {changeAdminCollegeId && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setChangeAdminCollegeId(null)}>
              <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-md border border-border p-10" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-10 text-left">
                      <div>
                          <h2 className="text-2xl font-black text-foreground tracking-tight">Reassign Director</h2>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Institutional Handover</p>
                      </div>
                      <button onClick={() => setChangeAdminCollegeId(null)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><CloseIcon className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleChangeAdminSubmit} className="space-y-6 text-left">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Director Identity (Email)</label>
                          <input
                              type="email"
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              required
                              placeholder="new.director@institute.edu"
                              className="w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold shadow-inner"
                          />
                          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-4">
                              <InfoIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-amber-600 font-bold leading-relaxed">The previous director will remain in the system as a 'Teacher' but will lose all institutional administrative control immediately.</p>
                          </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setChangeAdminCollegeId(null)} className="flex-1 px-4 py-4 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all">Cancel</button>
                          <button 
                              type="submit" 
                              disabled={isChangingAdmin || !newAdminEmail.trim()} 
                              className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all transform active:scale-95"
                          >
                              {isChangingAdmin ? 'Transferring...' : 'Authorize Transfer'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="z-50">
        <BottomNavBar currentUser={currentUser} onNavigate={onNavigate} currentPage={currentPath}/>
      </div>
    </div>
  );
};

export default SuperAdminPage;
