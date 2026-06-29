import { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="#8c6cea" strokeWidth="1.5"/>
    <path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="#8c6cea" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconBook = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="#8c6cea" strokeWidth="1.5"/>
    <path d="M5 6h6M5 9h4" stroke="#8c6cea" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconEmail = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="#8c6cea" strokeWidth="1.5"/>
    <path d="M2 5l6 4.5L14 5" stroke="#8c6cea" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#8c6cea" strokeWidth="1.5"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="#8c6cea" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

function FieldGroup({ label, icon, children }) {
  return (
    <div className="auth-field-group">
      <div className="auth-field-label">{label}</div>
      <div className="auth-input-wrap">
        <span className="auth-input-icon">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const saveUserToFirestore = async (uid, displayName, subjectField) => {
    await setDoc(doc(db, "users", uid), {
      name: displayName,
      subject: subjectField,
      createdAt: new Date().toISOString(),
    });
  };

  const handleEmailAuth = async () => {
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name.trim()) { setError("Please enter your name"); setLoading(false); return; }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await auth.currentUser.reload();
        await saveUserToFirestore(result.user.uid, name, subject);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", ""));
    }
    setLoading(false);
  };
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setError(null);
      alert("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Check if the email is correct.");
    } finally {
      setLoading(false);
    }
  };  
  return (
    <div className="screen auth-screen">
      <div className="auth-hero">
        <h1 className="welcome-title">lectraid</h1>
        <p className="welcome-username">your AI lecture companion</p>
      </div>

      <div className="auth-form">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <div className="auth-fields">
          {!isLogin && (
            <>
              <FieldGroup label="Username" icon={<IconUser />}>
                <input
                  className="auth-input"
                  placeholder="Your username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Subject" icon={<IconBook />}>
                <input
                  className="auth-input"
                  placeholder="e.g. Medicine, Law..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </FieldGroup>
            </>
          )}

          <FieldGroup label="Email" icon={<IconEmail />}>
            <input
              className="auth-input"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup 
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Password</span>
                {isLogin && (
                  <span className="forgot-link" onClick={handleForgotPassword}>
                    Forgot?
                  </span>
                )}
              </div>
            } 
            icon={<IconLock />}
          >
            <input
              className="auth-input"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
            />
          </FieldGroup>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-btn primary" onClick={handleEmailAuth} disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">{isLogin ? "NEW HERE?" : "HAVE AN ACCOUNT?"}</span>
          <span className="auth-divider-line" />
        </div>

        <p className="auth-footer-note">
          {isLogin ? (
            <>Don't have an account? <span onClick={() => setIsLogin(false)}>Create one</span></>
          ) : (
            <>Already have an account? <span onClick={() => setIsLogin(true)}>Sign in</span></>
          )}
        </p>
      </div>
    </div>
  );
}