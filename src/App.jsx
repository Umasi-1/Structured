import React, { useState, useEffect } from 'react';
import { 
  Book, CheckCircle, Clipboard, History, Layout, Loader2, Save, 
  Sparkles, Target, User, AlertCircle, LogOut, Settings, 
  Lock, Eye, EyeOff, Trash2, ChevronRight 
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

// 1. API KEY SETUP
// FOR LOCAL DEV: Uncomment the line below to use your .env file
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const apiKey = ""; // Keep this empty for the preview to compile

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
const appId = "smart-planner-web";

// --- AI Service ---
const generatePlan = async (userProfile, lastLog, userRequest) => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your settings.";
  }

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
    // UPDATED TO STABLE MODEL 1.5-FLASH
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate the schedule prompt." }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      }
    );
    
    if (!response.ok) {
       const errorData = await response.json();
       console.error("AI API Error:", errorData);
       throw new Error("API Request Failed");
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate plan.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error connecting to AI. Please try again later.";
  }
};

// --- MODERN UI COMPONENTS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false, icon: Icon, type = 'button' }) => {
  const baseStyle = "flex items-center justify-center w-full py-4 rounded-2xl font-bold text-[17px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200/50 hover:bg-indigo-700 hover:shadow-indigo-300/50", 
    secondary: "bg-white text-gray-900 border-2 border-gray-100 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : Icon && <Icon size={20} className="mr-2" strokeWidth={2.5} />}
      {children}
    </button>
  );
};

const Section = ({ title, children, className = '' }) => (
  <div className={`mb-12 animate-fade-in ${className}`}>
    {title && <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">{title}</h2>}
    <div className="space-y-6">{children}</div>
  </div>
);

const InputArea = ({ label, value, onChange, placeholder, rows = 4 }) => (
  <div className="group">
    <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1">{label}</label>
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full p-5 rounded-3xl bg-white text-gray-900 text-lg border-2 border-gray-100 focus:border-indigo-600 outline-none resize-none transition-all placeholder:text-gray-400 shadow-sm"
      rows={rows} placeholder={placeholder}
    />
  </div>
);

const ModernSelect = ({ label, value, onChange, options }) => (
  <div className="group">
    <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative">
      <select 
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full p-5 rounded-3xl bg-white text-gray-900 text-lg border-2 border-gray-100 focus:border-indigo-600 outline-none appearance-none transition-all font-medium shadow-sm"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={20} />
    </div>
  </div>
);

// --- AUTH SCREEN ---
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6 w-full">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex justify-center mb-10">
          <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
            <Sparkles className="text-white" size={32} />
          </div>
        </div>
        <h2 className="text-3xl font-black text-center text-gray-900 mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-center text-gray-400 mb-10 font-medium">Design your perfect day.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 flex items-center font-bold"><AlertCircle size={20} className="mr-3" />{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full p-5 rounded-2xl bg-white border-2 border-gray-100 text-lg font-medium outline-none focus:border-indigo-600 transition-all shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Password" required minLength={6} className="w-full p-5 pr-12 rounded-2xl bg-white border-2 border-gray-100 text-lg font-medium outline-none focus:border-indigo-600 transition-all shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={24} /> : <Eye size={24} />}</button>
          </div>
          <div className="pt-4">
            <Button type="submit" loading={loading} icon={Lock}>{isSignUp ? 'Sign Up' : 'Log In'}</Button>
          </div>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-center text-indigo-600 font-bold hover:text-indigo-700 transition-colors">{isSignUp ? 'Log In' : 'Create Account'}</button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('planner'); 
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [profile, setProfile] = useState({ bio: '', goals: '', constraints: '' });
  const [dailyLogs, setDailyLogs] = useState([]);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [todayRequest, setTodayRequest] = useState('');
  const [newLog, setNewLog] = useState({ summary: '', mood: 'Productive' });

  useEffect(() => { if (saveSuccess) { const timer = setTimeout(() => setSaveSuccess(''), 3000); return () => clearTimeout(timer); } }, [saveSuccess]);

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
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile); setSaveSuccess('Saved'); } catch (e) { setSaveSuccess('Error'); }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    const plan = await generatePlan(profile, dailyLogs[0], todayRequest);
    setGeneratedOutput(plan); setGenerating(false);
  };

  const handleSaveLog = async () => {
    try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs'), { ...newLog, createdAt: serverTimestamp() }); setView('planner'); setSaveSuccess('Logged'); } catch (e) { setSaveSuccess('Error'); }
  };

  const executeDelete = async () => {
    if(window.confirm("Delete account? This is permanent.")) { try { await deleteUser(user); } catch(e) { alert("Please login again to delete."); } }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 font-sans selection:bg-indigo-600 selection:text-white">
      {saveSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-3 rounded-full shadow-2xl z-50 flex items-center animate-fade-in font-bold">
          <CheckCircle size={20} className="mr-2 text-white/80" />{saveSuccess}
        </div>
      )}

      {/* Fluid Container: Stretches to fill screen with padding */}
      <div className="w-full min-h-screen bg-white pb-32 pt-8 px-6 md:px-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200"><Sparkles className="text-white" size={20} /></div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Structured AI</span>
          </div>
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">{view}</div>
        </div>

        {view === 'planner' && (
          <Section title="Today's Plan">
            <InputArea label="Focus for today" value={todayRequest} onChange={setTodayRequest} placeholder="e.g. Finish the report, gym at 6pm..." />
            <Button onClick={handleGeneratePlan} loading={generating} icon={Sparkles}>{generating ? 'Thinking...' : 'Generate Plan'}</Button>
            {generatedOutput && (
              <div className="mt-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 text-lg leading-relaxed text-gray-800 whitespace-pre-wrap mb-4 border-2 border-gray-100 shadow-sm">
                  {generatedOutput}
                </div>
                <Button onClick={() => {navigator.clipboard.writeText(generatedOutput); setSaveSuccess('Copied');}} variant="secondary" icon={Clipboard}>Copy to Clipboard</Button>
              </div>
            )}
          </Section>
        )}

        {view === 'profile' && (
          <Section title="My Context">
            <InputArea label="Bio" value={profile.bio} onChange={(v) => setProfile({...profile, bio: v})} placeholder="Who are you?" rows={3} />
            <InputArea label="Goals" value={profile.goals} onChange={(v) => setProfile({...profile, goals: v})} placeholder="Current major goals?" rows={3} />
            <InputArea label="Constraints" value={profile.constraints} onChange={(v) => setProfile({...profile, constraints: v})} placeholder="Time/Life constraints?" rows={3} />
            <div className="pt-4"><Button onClick={handleSaveProfile} icon={Save}>Save Profile</Button></div>
          </Section>
        )}

        {view === 'log' && (
          <Section title="Log Progress">
            <InputArea label="How did it go?" value={newLog.summary} onChange={(v) => setNewLog({...newLog, summary: v})} placeholder="What did you get done?" />
            <ModernSelect label="Mood" value={newLog.mood} onChange={e => setNewLog({...newLog, mood: e.target.value})} options={["Productive", "Tired", "Procrastinated", "Energetic", "Neutral"]} />
            <div className="pt-4"><Button onClick={handleSaveLog} icon={CheckCircle}>Complete Day</Button></div>
          </Section>
        )}

        {view === 'history' && (
          <Section title="History">
            {dailyLogs.length === 0 && <div className="text-center py-20 text-gray-300 font-bold text-xl">No logs yet</div>}
            {dailyLogs.map(log => (
              <div key={log.id} className="mb-4 p-6 bg-white border-2 border-gray-50 rounded-3xl hover:border-indigo-50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-400 text-sm uppercase">{new Date(log.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                  <span className="bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold shadow-sm text-indigo-600">{log.mood}</span>
                </div>
                <p className="text-gray-800 text-lg">{log.summary}</p>
              </div>
            ))}
          </Section>
        )}

        {view === 'settings' && (
          <Section title="Settings">
            <div className="p-6 bg-white border-2 border-gray-100 rounded-3xl mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Currently logged in as</span>
              <div className="text-xl font-bold mt-1 text-gray-900">{user.email}</div>
            </div>
            <div className="space-y-3">
              <Button onClick={() => signOut(auth)} variant="secondary" icon={LogOut}>Sign Out</Button>
              <Button onClick={executeDelete} variant="danger" icon={Trash2}>Delete Account</Button>
            </div>
          </Section>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-gray-200 shadow-2xl shadow-indigo-200/40 rounded-full p-2 flex justify-between items-center z-50">
        <NavButton active={view === 'planner'} onClick={() => setView('planner')} icon={Layout} />
        <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={User} />
        <NavButton active={view === 'history'} onClick={() => setView('history')} icon={History} />
        <NavButton active={view === 'log'} onClick={() => setView('log')} icon={Book} />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} />
      </div>

    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon }) => (
  <button onClick={onClick} className={`p-4 rounded-full transition-all duration-300 ${active ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
    <Icon size={22} strokeWidth={active ? 3 : 2} />
  </button>
);
