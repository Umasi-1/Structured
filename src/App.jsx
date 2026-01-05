import React, { useState, useEffect } from 'react';
import { 
  Book, CheckCircle, Clipboard, History, Layout, Loader2, Save, 
  Sparkles, Target, User, AlertCircle, LogOut, Settings, 
  Lock, Eye, EyeOff, Trash2, X 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, deleteUser, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  serverTimestamp, addDoc, deleteDoc 
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. PASTE YOUR GOOGLE GEMINI API KEY HERE
const apiKey = "AIzaSyDBz9R1xbxRC5pBrGVAIYLH11k7Ixkb4ak"; 

// 2. YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBMMW1Pm_vwX7y77P5Pt0LVeRQ0UCFr4Pk",
  authDomain: "structured-a214f.firebaseapp.com",
  projectId: "structured-a214f",
  storageBucket: "structured-a214f.firebasestorage.app",
  messagingSenderId: "109160598702",
  appId: "1:109160598702:web:ea2cd6ae9a2c50e1ddb13f",
  measurementId: "G-68FVSGTBDC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use a fixed ID for the web app
const appId = "smart-planner-web";

// --- AI Service ---
const generatePlan = async (userProfile, lastLog, userRequest) => {
  const systemPrompt = `
    You are an expert productivity strategist.
    Your Goal: Create a specific, actionable natural language plan for the user's day.
    Context:
    - User's Long Term Goals: ${userProfile.goals || 'Not specified'}
    - User's Identity/Bio: ${userProfile.bio || 'Not specified'}
    - User's Preferred Schedule/Constraints: ${userProfile.constraints || 'Standard 9-5'}
    History: ${lastLog ? `Date: ${new Date(lastLog.createdAt?.seconds * 1000).toDateString()}\nSummary: ${lastLog.summary}\nMood: ${lastLog.mood}` : 'No previous logs.'}
    Request: ${userRequest || 'Productive day aligned with goals.'}
    Instructions: Create a narrative paragraph describing the perfect schedule. Format purely as text.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate the schedule prompt." }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate plan.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error connecting to AI. Check your API Key.";
  }
};

// --- COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false, icon: Icon, type = 'button' }) => {
  const baseStyle = "flex items-center justify-center px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={24} className="animate-spin mr-2" /> : Icon && <Icon size={24} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl border border-gray-100 md:border-gray-200 md:shadow-sm ${className}`}>{children}</div>
);

const InputArea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="mb-6">
    <label className="block text-base font-bold text-gray-900 mb-3">{label}</label>
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 focus:ring-0 outline-none resize-none bg-gray-50 focus:bg-white transition-all text-lg"
      rows={rows} placeholder={placeholder}
    />
  </div>
);

const AuthScreen = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message.includes('auth/') ? "Invalid email or password." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-200"><Sparkles className="text-white" size={40} /></div></div>
        <h2 className="text-3xl font-black text-center text-gray-900 mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-center text-gray-500 mb-8 font-medium">Your personal AI productivity architect.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 flex items-center font-medium"><AlertCircle size={20} className="mr-3" />{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
            <input type="email" required className="w-full p-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-indigo-600 bg-gray-50 focus:bg-white transition-all font-medium" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required minLength={6} className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 outline-none focus:border-indigo-600 bg-gray-50 focus:bg-white transition-all font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={24} /> : <Eye size={24} />}</button>
            </div>
          </div>
          <Button type="submit" className="w-full mt-2" loading={loading} icon={Lock}>{isSignUp ? 'Sign Up' : 'Log In'}</Button>
        </form>
        <div className="mt-8 text-center text-base font-medium text-gray-600">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-indigo-600 font-bold hover:underline">{isSignUp ? 'Log In' : 'Sign Up'}</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('planner'); 
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profile, setProfile] = useState({ bio: '', goals: '', constraints: '' });
  const [dailyLogs, setDailyLogs] = useState([]);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [todayRequest, setTodayRequest] = useState('');
  const [newLog, setNewLog] = useState({ summary: '', mood: 'Productive' });

  useEffect(() => {
    if (saveSuccess) { const timer = setTimeout(() => setSaveSuccess(''), 3000); return () => clearTimeout(timer); }
  }, [saveSuccess]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });
    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs'), (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDailyLogs(logs);
    });
    return () => { unsubProfile(); unsubLogs(); };
  }, [user]);

  const handleSaveProfile = async () => {
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile); setSaveSuccess('Profile saved!'); }
    catch (e) { setSaveSuccess('Error saving.'); }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    const plan = await generatePlan(profile, dailyLogs[0], todayRequest);
    setGeneratedOutput(plan); setGenerating(false);
  };

  const handleSaveLog = async () => {
    try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs'), { ...newLog, createdAt: serverTimestamp() }); setView('planner'); setSaveSuccess('Log saved!'); }
    catch (e) { setSaveSuccess('Error saving.'); }
  };

  const executeDelete = async () => {
    if(window.confirm("Delete account? This is permanent.")) {
      try { await deleteUser(user); setShowDeleteModal(false); } catch(e) { alert("Please login again to delete."); }
    }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
  if (!user) return <AuthScreen />;

  return (
    // FIX: Pure white background everywhere, remove all grayness
    <div className="min-h-screen w-full bg-white text-gray-800 font-sans relative overflow-x-hidden">
      
      {saveSuccess && <div className="fixed top-6 right-6 bg-black text-white px-6 py-4 rounded-full shadow-2xl z-50 flex items-center animate-bounce-in font-bold"><CheckCircle size={24} className="mr-3" />{saveSuccess}</div>}
      
      {/* MAIN CONTENT - Removed max-width constraints on mobile to fill screen */}
      <div className="w-full h-full min-h-screen pb-32 md:pb-10 md:pl-80">
        <div className="max-w-5xl mx-auto p-6 md:p-12 w-full">
          
          {/* Header Mobile */}
          <div className="md:hidden flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Structured AI</h1>
            <div className="bg-indigo-600 p-2 rounded-xl"><Sparkles className="text-white" size={24} /></div>
          </div>

          {view === 'planner' && (
            <div className="space-y-8 animate-fade-in">
              <header className="hidden md:block"><h2 className="text-4xl font-black text-gray-900 tracking-tight">Today's Plan</h2></header>
              <div className="bg-white md:bg-white md:border md:border-gray-100 md:rounded-3xl md:p-8">
                <InputArea label="Focus for today?" value={todayRequest} onChange={setTodayRequest} placeholder="e.g., Heavy coding, gym in evening." />
                <Button onClick={handleGeneratePlan} loading={generating} icon={Sparkles} className="w-full shadow-lg shadow-indigo-200">{generating ? 'Thinking...' : 'Generate Plan'}</Button>
                {generatedOutput && <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 mt-8 prose prose-lg prose-indigo text-gray-800 whitespace-pre-wrap leading-relaxed">{generatedOutput}<div className="mt-6"><Button onClick={() => {navigator.clipboard.writeText(generatedOutput); setSaveSuccess('Copied!');}} variant="secondary" icon={Clipboard} size="sm" className="w-full">Copy to Clipboard</Button></div></div>}
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="space-y-8 animate-fade-in">
              <header className="hidden md:block"><h2 className="text-4xl font-black text-gray-900 tracking-tight">My Context</h2></header>
              <div className="bg-white md:bg-white md:border md:border-gray-100 md:rounded-3xl md:p-8 space-y-8">
                <InputArea label="Bio" value={profile.bio} onChange={(v) => setProfile({...profile, bio: v})} placeholder="Who are you?" />
                <InputArea label="Goals" value={profile.goals} onChange={(v) => setProfile({...profile, goals: v})} placeholder="What do you want to achieve?" />
                <InputArea label="Constraints" value={profile.constraints} onChange={(v) => setProfile({...profile, constraints: v})} placeholder="Schedule constraints?" />
                <Button onClick={handleSaveProfile} icon={Save} className="w-full">Save Profile</Button>
              </div>
            </div>
          )}

          {view === 'log' && (
            <div className="space-y-8 animate-fade-in">
              <header className="hidden md:block"><h2 className="text-4xl font-black text-gray-900 tracking-tight">Log Progress</h2></header>
              <div className="bg-white md:bg-white md:border md:border-gray-100 md:rounded-3xl md:p-8 space-y-8">
                <InputArea label="How did it go?" value={newLog.summary} onChange={(v) => setNewLog({...newLog, summary: v})} placeholder="I finished the tasks..." />
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">Mood</label>
                  {/* FIX: Dark text, white background for visibility */}
                  <select className="w-full p-5 border-2 border-gray-100 rounded-2xl bg-white text-gray-900 font-bold focus:border-indigo-600 outline-none appearance-none text-lg" value={newLog.mood} onChange={e => setNewLog({...newLog, mood: e.target.value})}>
                    <option value="Productive">Productive</option>
                    <option value="Tired">Tired</option>
                    <option value="Procrastinated">Procrastinated</option>
                    <option value="Energetic">Energetic</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                </div>
                <Button onClick={handleSaveLog} icon={CheckCircle} className="w-full">Complete Day</Button>
              </div>
            </div>
          )}

          {view === 'history' && (
            <div className="space-y-6 animate-fade-in">
               <header className="hidden md:block"><h2 className="text-4xl font-black text-gray-900 tracking-tight">History</h2></header>
               {dailyLogs.length === 0 && <p className="text-gray-400 text-center py-20 text-xl font-medium">No history yet.</p>}
               {dailyLogs.map(log => <div key={log.id} className="p-6 border-2 border-gray-50 rounded-3xl hover:border-indigo-50 transition-colors"><div className="flex justify-between mb-3 font-bold text-indigo-600 text-lg"><span>{new Date(log.createdAt?.seconds * 1000).toLocaleDateString()}</span><span className="bg-indigo-50 px-4 py-1 rounded-full text-sm text-indigo-700">{log.mood}</span></div><p className="text-gray-600 text-lg leading-relaxed">{log.summary}</p></div>)}
            </div>
          )}

          {view === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              <header className="hidden md:block"><h2 className="text-4xl font-black text-gray-900 tracking-tight">Settings</h2></header>
              <div className="flex flex-col gap-6">
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100"><span className="text-gray-500 font-medium">Logged in as</span><br/><span className="font-bold text-xl text-gray-900">{user.email}</span></div>
                <Button onClick={() => signOut(auth)} variant="secondary" icon={LogOut} className="w-full justify-center">Sign Out</Button>
                <Button onClick={executeDelete} variant="danger" icon={Trash2} className="w-full justify-center">Delete Account</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION BAR - Floating Style on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:w-80 md:h-screen bg-white/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-gray-100 z-50 flex md:flex-col justify-around md:justify-start p-2 md:p-8 space-y-0 md:space-y-4 pb-safe-area">
        <div className="hidden md:flex items-center space-x-4 mb-10 px-2"><div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200"><Sparkles className="text-white" size={28} /></div><h1 className="text-2xl font-black text-gray-900 tracking-tight">Structured AI</h1></div>
        <NavButton active={view === 'planner'} onClick={() => setView('planner')} icon={Layout} label="Planner" />
        <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={User} label="Context" />
        <NavButton active={view === 'history'} onClick={() => setView('history')} icon={History} label="History" />
        <NavButton active={view === 'log'} onClick={() => setView('log')} icon={Book} label="Log" />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Settings" />
      </div>

    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col md:flex-row items-center md:space-x-4 p-2 md:px-6 md:py-4 rounded-2xl transition-all duration-200 w-full md:w-auto ${active ? 'text-indigo-600 bg-indigo-50/50 md:bg-indigo-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
    <Icon size={28} className={active ? "text-indigo-600" : "text-gray-400"} strokeWidth={active ? 3 : 2} />
    <span className={`text-[10px] md:text-lg font-bold ${active ? 'text-indigo-700' : 'text-gray-500'}`}>{label}</span>
  </button>
);
