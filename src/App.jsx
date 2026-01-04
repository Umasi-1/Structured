import React, { useState, useEffect } from 'react';
import { 
  Book, CheckCircle, Clipboard, History, Layout, Loader2, Save, 
  Sparkles, Target, User, AlertCircle, LogOut, Settings, 
  Lock, Eye, EyeOff, Trash2, X 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, deleteUser 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  serverTimestamp, addDoc 
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

// Use a fixed ID for the web app since we aren't using the Canvas ID anymore
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
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const InputArea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none bg-gray-50 focus:bg-white"
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6"><div className="bg-indigo-600 p-3 rounded-xl shadow-lg"><Sparkles className="text-white" size={32} /></div></div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center"><AlertCircle size={16} className="mr-2" />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="w-full p-3 rounded-lg border border-gray-200 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required minLength={6} className="w-full p-3 pr-10 rounded-lg border border-gray-200 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
          </div>
          <Button type="submit" className="w-full mt-4" loading={loading} icon={Lock}>{isSignUp ? 'Sign Up' : 'Log In'}</Button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-indigo-600 font-semibold hover:underline">{isSignUp ? 'Log In' : 'Sign Up'}</button>
        </div>
      </Card>
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative">
      {saveSuccess && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"><CheckCircle size={20} className="mr-2" />{saveSuccess}</div>}
      
      <div className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:w-64 md:h-full bg-white border-t md:border-r border-gray-200 z-10 flex md:flex-col justify-around md:justify-start p-2 md:p-6 space-y-0 md:space-y-2 shadow-lg md:shadow-none">
        <div className="hidden md:flex items-center space-x-3 mb-8 px-2"><div className="bg-indigo-600 p-2 rounded-lg"><Sparkles className="text-white" size={24} /></div><h1 className="text-xl font-bold text-gray-900 tracking-tight">Structured AI</h1></div>
        <NavButton active={view === 'planner'} onClick={() => setView('planner')} icon={Layout} label="Daily Planner" />
        <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={User} label="My Context" />
        <NavButton active={view === 'history'} onClick={() => setView('history')} icon={History} label="History" />
        <NavButton active={view === 'log'} onClick={() => setView('log')} icon={Book} label="Log Progress" />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Settings" />
        <div className="flex-grow hidden md:block" />
        <div className="hidden md:block px-4 py-2 text-xs text-gray-400">{user.email}</div>
      </div>

      <div className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-4xl mx-auto">
        {view === 'planner' && (
          <div className="space-y-6">
            <header><h2 className="text-2xl font-bold text-gray-900">Today's Plan</h2></header>
            <Card className="p-6">
              <InputArea label="Focus for today?" value={todayRequest} onChange={setTodayRequest} placeholder="e.g., Heavy coding, gym in evening." />
              <Button onClick={handleGeneratePlan} loading={generating} icon={Sparkles}>{generating ? 'Thinking...' : 'Generate Plan'}</Button>
              {generatedOutput && <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 mt-4 prose text-gray-700 whitespace-pre-wrap">{generatedOutput}<div className="mt-4"><Button onClick={() => {navigator.clipboard.writeText(generatedOutput); setSaveSuccess('Copied!');}} variant="secondary" icon={Clipboard} size="sm">Copy</Button></div></div>}
            </Card>
          </div>
        )}

        {view === 'profile' && (
          <div className="space-y-6">
            <header><h2 className="text-2xl font-bold text-gray-900">My Context</h2></header>
            <Card className="p-6 space-y-6">
              <InputArea label="Bio" value={profile.bio} onChange={(v) => setProfile({...profile, bio: v})} placeholder="Who are you?" />
              <InputArea label="Goals" value={profile.goals} onChange={(v) => setProfile({...profile, goals: v})} placeholder="What do you want to achieve?" />
              <InputArea label="Constraints" value={profile.constraints} onChange={(v) => setProfile({...profile, constraints: v})} placeholder="Schedule constraints?" />
              <div className="flex justify-end"><Button onClick={handleSaveProfile} icon={Save}>Save Profile</Button></div>
            </Card>
          </div>
        )}

        {view === 'log' && (
          <div className="space-y-6">
            <header><h2 className="text-2xl font-bold text-gray-900">Log Progress</h2></header>
            <Card className="p-6 space-y-6">
              <InputArea label="How did it go?" value={newLog.summary} onChange={(v) => setNewLog({...newLog, summary: v})} placeholder="I finished the tasks..." />
              <div><label className="block text-sm font-semibold mb-2">Mood</label><select className="w-full p-2 border rounded" value={newLog.mood} onChange={e => setNewLog({...newLog, mood: e.target.value})}><option>Productive</option><option>Tired</option><option>Procrastinated</option></select></div>
              <div className="flex justify-end"><Button onClick={handleSaveLog} icon={CheckCircle}>Complete Day</Button></div>
            </Card>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
             <header><h2 className="text-2xl font-bold text-gray-900">History</h2></header>
             {dailyLogs.map(log => <Card key={log.id} className="p-4"><div className="flex justify-between mb-2 font-semibold text-indigo-600"><span>{new Date(log.createdAt?.seconds * 1000).toLocaleDateString()}</span><span>{log.mood}</span></div><p>{log.summary}</p></Card>)}
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6">
            <header><h2 className="text-2xl font-bold text-gray-900">Settings</h2></header>
            <Card className="p-6 flex justify-between">
              <Button onClick={() => signOut(auth)} variant="secondary" icon={LogOut}>Sign Out</Button>
              <Button onClick={executeDelete} variant="danger" icon={Trash2}>Delete Account</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors w-full md:w-auto ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
    <Icon size={20} /><span className="hidden md:inline">{label}</span>
  </button>
);