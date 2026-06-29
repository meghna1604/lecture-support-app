//Main App Functionality

import { useState, useEffect, useRef } from "react";
import "./App.css";
import { useAuth } from "./AuthContext";
import AuthScreen from "./AuthScreen";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { 
  deleteUser, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  setDoc 
} from "firebase/firestore";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const askGemini = async (prompt) => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("GOOGLE API ERROR:", data.error.message);
      return "";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Network Error:", error);
    return "";
  }
};

// SCREEN: Welcome & Module 

function WelcomeScreen({ onNavigate }) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modules, setModules] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletePassword, setDeletePassword] = useState("");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || "");

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "users", user.uid, "modules"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
            }));
      setModules(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleAddModule = async () => {
    if (!newModuleName.trim() || !user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "modules"), {
        title: newModuleName.trim(),
        createdAt: serverTimestamp(),
        lectureCount: 0,
      });
      setNewModuleName("");
      setShowAdd(false);
    } catch (e) {
      console.error("Add module error:", e);
    }
  };

 const handleDeleteModule = async (moduleId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "modules", moduleId));
    } catch (e) {
      console.error("Delete module error:", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleConfirmDelete = async (password) => {
  const user = auth.currentUser;

  if (!user) {
    alert("No user found.");
    return;
  }

  if (!password.trim()) {
    alert("Please enter your password.");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await deleteUser(user);

    alert("Goodbye!");
    setDeletePassword("");
    setShowConfirm(false);
    setShowSettings(false);
  } catch (error) {
    alert("Error: " + error.message);
  }
};

const handleUpdateDisplayName = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser || !newDisplayName.trim()) {
    alert("Please enter a valid name.");
    return;
  }

  try {
    await updateProfile(currentUser, {
      displayName: newDisplayName.trim(),
    });

    await setDoc(
      doc(db, "users", currentUser.uid),
      { name: newDisplayName.trim() },
      { merge: true }
    );

    await currentUser.reload();

    setShowEditProfile(false);
    setShowSettings(false);

    alert("Profile updated.");
  } catch (error) {
    alert("Error: " + error.message);
  }
};

  return (
    <div className="screen welcome-screen">
      <div className="welcome-header">
        <div style={{ position: "relative" }}>
          <button
            className="nav-link"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowConfirm(false);
              setShowEditProfile(false)
            }}
          >
            Settings ▾
          </button>

          {showSettings && (
            <div className="settings-dropdown">
              {showConfirm ? (
                <div className="settings-panel">
                  <p className="settings-text">
                    Are you sure? This cannot be undone.
                  </p>

                  <input
                    type="password"
                    placeholder="Enter password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="settings-input"
                  />

                  <div className="settings-action-row">
                    <button
                      onClick={() => handleConfirmDelete(deletePassword)}
                      className="settings-confirm-btn"
                    >
                      Yes, delete
                    </button>

                    <button
                      onClick={() => {
                        setShowConfirm(false);
                        setDeletePassword("");
                      }}
                      className="settings-cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showEditProfile ? (
                <div className="settings-panel">
                  <p className="settings-text">
                    Enter a new display name.
                  </p>

                  <input
                    type="text"
                    placeholder="New display name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="settings-input"
                  />

                  <div className="settings-action-row">
                    <button
                      onClick={handleUpdateDisplayName}
                      className="settings-save-btn"
                    >
                      Save
                    </button>

                    <button
                      onClick={() => {
                        setShowEditProfile(false);
                        setNewDisplayName(user?.displayName || "");
                      }}
                      className="settings-cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="delete-btn"
                    onClick={() => {
                      setShowConfirm(true);
                      setShowEditProfile(false);
                    }}
                  >
                    Delete account
                  </button>

                  <button
                    className="edit-profile"
                    onClick={() => {
                      setShowEditProfile(true);
                      setShowConfirm(false);
                      setNewDisplayName(user?.displayName || "");
                    }}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button className="nav-link" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* ── Welcome Hero ── */}
      <div className="welcome-hero">
        <h1 className="welcome-title">Welcome</h1>
        <p className="welcome-username">______{user?.displayName || user?.email}______</p>
      </div>

      {/* ── Modules Section ── */}
      <div className="module-section">
        <h2 className="section-label">Modules:</h2>

        <button className="add-lecture-btn" onClick={() => setShowAdd(!showAdd)}>
          + new module
        </button>

        {showAdd && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", marginTop: "8px" }}>
            <input
              className="auth-input"
              placeholder="Module name (e.g. Biology)"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleAddModule}
              style={{
                padding: "10px 16px",
                background: "var(--purple-mid)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontFamily: "Syne, sans-serif",
                fontWeight: "800",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-text">Loading modules...</div>
        ) : modules.length === 0 ? (
          <div className="loading-text">No modules yet — create your first one!</div>
        ) : (
          <div className="modules-grid">
            {modules.map((m) => (
              <div key={m.id} className="module-card">
                <div className="module-info" onClick={() => onNavigate("lectures", m)}>
                  <h3 className="module-card-title">{m.title}</h3>
                </div>
                <div className="module-actions">
                  <button
                    className="revise-pill-btn"
                    onClick={() => onNavigate("revision", m)}
                  >
                    Revise
                  </button>
                  <button
                    className="delete-icon-btn"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this module?")) {
                        handleDeleteModule(m.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SCREEN: Lecture ─────────────────────────────────────────────────────────
function LecturesScreen({ module, onNavigate }) {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use module.id in the check to prevent unnecessary re-runs
    if (!user || !module?.id) return;

    setLoading(true);

    const q = query(
      collection(db, "users", user.uid, "modules", module.id, "lectures"),
      orderBy("createdAt", "desc")
    );

    // This listener is what makes it feel "Instant"
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          // Handle the tiny delay when serverTimestamp is null
          createdAt: data.createdAt || { seconds: Date.now() / 1000 }
        };
      });
      setLectures(items);
      setLoading(false);
    }, (error) => {
      console.error("Lectures listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, module?.id]); // Only re-run if the user changes or the actual ID changes

  const handleDeleteLecture = async (lectureId) => {
  if (!user || !module?.id) return;

  try {
    await deleteDoc(
      doc(db, "users", user.uid, "modules", module.id, "lectures", lectureId)
    );
  } catch (e) {
    console.error("Delete lecture error:", e);
    alert("Could not delete lecture");
  }
};

  return (
    <div className="screen modules-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => onNavigate("welcome")}>
          BACK ←
        </button>
        <button className="home-btn" onClick={() => onNavigate("welcome")}>🏠 Home</button>
      </div>

      <h2 className="screen-title">{module?.title || "Module"}</h2>
      <p className="your-lectures">Your saved lectures</p>
      
      <button
        className="add-lecture-btn"
        onClick={() => onNavigate("transcribe", { id: module.id, title: module.title })}
      >
        + new lecture
      </button>

      {loading ? (
        <div className="loading-text">Loading lectures...</div>
      ) : lectures.length === 0 ? (
        <div className="loading-text">No lectures yet — create your first one!</div>
      ) : (
        <div className="lectures-list">
        {lectures.map((lecture) => (
          <div
            key={lecture.id}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <button
              className="lecture-item"
              style={{ flex: 1 }}
              onClick={() => onNavigate("transcribe", { ...module, lecture })}
            >
              <span className="lecture-title">
                {lecture.title || "Untitled Lecture"}
              </span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this lecture?")) {
                  handleDeleteLecture(lecture.id);
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-red)",
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px",
              }}
            >
              ✕
            </button>
          </div>
        ))}
</div>
      )}
    </div>
  );
}

// ── SCREEN: Transcribe ─────────────────────────────────────────────────────────
function TranscribeScreen({ module, onNavigate }) {
  const { user } = useAuth();
  const [lectureTitle, setLectureTitle] = useState(module?.lecture?.title || "");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(module?.lecture?.transcript || "");
  const [showAsk, setShowAsk] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [highlighted, setHighlighted] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summary, setSummary] = useState("");
  const recognitionRef = useRef(null);
  const [isLoading, setIsLoading] = useState({ summary: false, answer: false, highlight: false });
  const transcriptRef = useRef(module?.lecture?.transcript || "");

  useEffect(() => {
    // Reset or load data only when the lecture ID changes
    const currentLecture = module?.lecture;
    
    setLectureTitle(currentLecture?.title || "");
    setTranscript(currentLecture?.transcript || "");
    transcriptRef.current = currentLecture?.transcript || "";
    setSummary(currentLecture?.summary || "");
    setHighlighted(currentLecture?.highlighted || []);
  }, [module?.lecture?.id]); // Single, correct dependency

  const saveLectureToFirebase = async () => {
    if (!user || !module?.id) return;
    if (!transcript.trim()) { alert("No transcript to save"); return; }

    setIsLoadingSummary(true)

    try {
      const lectureData = {
        title: lectureTitle || "Untitled Lecture",
        transcript: transcript,
        summary: summary,
        highlighted: highlighted,
        updatedAt: serverTimestamp(),
      };

      const moduleRef = collection(db, "users", user.uid, "modules", module.id, "lectures");

      if (module.lecture?.id) {
        await setDoc(doc(moduleRef, module.lecture.id), lectureData, { merge: true });
      } else {
        await addDoc(moduleRef, { ...lectureData, createdAt: serverTimestamp() });
      }
      
      //onNavigate("lectures", module);
    } catch (e) {
      console.error("Save failed:", e);
      alert("Check your Firestore Rules!");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const startTranscribing = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Live transcription requires Google Chrome or Edge. Please open this app in Chrome.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    let finalTranscript = transcriptRef.current || "";

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      transcriptRef.current = finalTranscript;
      setTranscript((finalTranscript + interimTranscript).trim());
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsTranscribing(true);
    setSummary("");
    setAnswer("");
    setHighlighted([]);
  };

  const stopTranscribing = () => {
    recognitionRef.current?.stop();
    setIsTranscribing(false);
  };

  const EditTranscript = () => {
  if (isEditingTranscript) {
    transcriptRef.current = transcript;
    setHighlighted([]);
  }
  setIsEditingTranscript(!isEditingTranscript);
};

  //--SUMMARISE
  const handleSummarise = async () => {
    const currentText = transcript || transcriptRef.current;
    
    if (!currentText.trim()) {
      alert("The transcript is empty. Please record some audio first.");
      return;
    }

    setIsLoadingSummary(true);
    try {
      const result = await askGemini(`Summarise this briefly : ${currentText}`);
      setSummary(result);
    } catch (e) {
      setSummary("Error generating summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // ── ASK ──
  const handleAsk = async () => {
    const currentText = transcript || transcriptRef.current;
    if (!question.trim() || !currentText.trim()) return;

    setIsLoadingAnswer(true);
    try {
      const result = await askGemini(
        `Based on this transcript: "${currentText}", answer this: ${question}`
      );
      setAnswer(result);
    } catch (e) {
      setAnswer("Error.");
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  // ── HIGHLIGHT ──
  const handleHighlight = async () => {
    const currentText = transcript || transcriptRef.current;
    if (!currentText.trim()) return;

    try {
      const raw = await askGemini(
        `Extract the most important technical terms from this text as a simple JSON array of strings. No intro, no backticks. Text: ${currentText}`
      );
      
      // This regex finds the [ ] even if the AI adds "Here is your JSON:"
      const jsonMatch = raw.match(/\[.*\]/s);
      if (jsonMatch) {
        const keywords = JSON.parse(jsonMatch[0]);
        setHighlighted(keywords);
      }
    } catch (e) {
      console.error("Highlighting failed to parse:", e);
    }
  };

  const renderTranscript = () => {
    const text = transcript || (isTranscribing ? "" : "Transcribed text will appear here");
    
    // If no highlights, just show text
    if (!highlighted || highlighted.length === 0) return <span>{text}</span>;

    let result = text;
    highlighted.forEach((phrase) => {
      // We use a unique separator to split the string safely
      result = result.split(phrase).join(`|||${phrase}|||`);
    });

    return result.split("|||").map((part, i) => {
      // If the part matches one of our keywords, wrap it in <mark>
      if (highlighted.includes(part)) {
        return <mark key={i} className="highlight-mark">{part}</mark>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="screen transcribe-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => {
           if (window.confirm("Ensure you have saved transcript before continuing")) {
              onNavigate("lectures");
            }
          }}>
          BACK ←
        </button>
        <button className="home-btn" onClick={() => onNavigate("welcome")}>🏠 Home</button>
      </div>

      <h2 className="screen-title">{module?.title || "Module"}</h2>
      <input
        className="auth-input"
        placeholder="Lecture title (e.g. Week 1 Intro)"
        value={lectureTitle}
        onChange={(e) => setLectureTitle(e.target.value)}
        style={{ marginBottom: "22px", marginTop: "12px" }}
      />

      <button
        className={`transcribe-btn ${isTranscribing ? "stop" : "start"}`}
        onClick={isTranscribing ? stopTranscribing : startTranscribing}
      >
        {isTranscribing ? "STOP TRANSCRIBING" : "START TRANSCRIBING"}
      </button>

      <div className="save-edit-row">

      <button
        onClick={saveLectureToFirebase}
        className="save-btn"
      >
        SAVE
      </button>

      <button
        onClick={EditTranscript}
        disabled={isTranscribing}
        className={`edit-btn ${isTranscribing ? "disabled-btn" : ""}`}
      >
        EDIT
      </button>

      </div>
      <div className="transcript-box">
        {isLoadingSummary ? (
          <div className="loading-text">Generating summary...</div>
        ) : summary ? (
          <div className="summary-wrapper">
            
            <button
              className="close-summary-btn"
              onClick={() => setSummary("")}
              aria-label="Close summary"
            >
              ×
            </button>

            <div className="summary-text">{summary}</div>

          </div>
        )
        : isEditingTranscript ? (
          <textarea
            className="transcript-editor"
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            placeholder="Transcript text will appear here"
          />
        ) : (
          <div className="transcript-text">{renderTranscript()}</div>
        )}
      </div>

      {showAsk && (
        <div className="ask-overlay">
          <div className="ask-box">
            <input
              className="ask-input"
              placeholder="Enter your question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            />

            {isLoadingAnswer ? (
              <div className="loading-text">Thinking...</div>
            ) : answer ? (
              <div className="answer-text">{answer}</div>
            ) : null}

            <button className="ask-submit-btn" onClick={handleAsk}>
              Ask
            </button>
            <button
              className="ask-close-btn"
              onClick={() => {
                setShowAsk(false);
                setAnswer("");
                setQuestion("");
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="action-buttons">

        <button className="action-btn summarise" onClick={handleSummarise}>
          SUMMARISE
        </button>
        <button className="action-btn ask" onClick={() => setShowAsk(true)}>
          ASK
        </button>
        <button
          className="action-btn visualise"
          onClick={() => {
            if (window.confirm("Ensure you have saved transcript before continuing")) {
              onNavigate("visualise", { transcript: transcript || transcriptRef.current });
            }
          }}
        >
          VISUALISE
        </button>
        <button className="action-btn highlight" onClick={handleHighlight}>
          HIGHLIGHT
        </button>

      </div>
      <button
        className="help-btn"
        onClick={() => setShowHelp(true)}
      >
        Need Help?
      </button>
      
      {showHelp && (
        <div className="ask-overlay">
          <div className="ask-box">
            <h3>Features</h3>

            <p><strong>Summarise:</strong> Creates a short summary.</p>
            <p><strong>Ask:</strong> Ask questions about transcript.</p>
            <p><strong>Visualise:</strong> Makes a flowchart.</p>
            <p><strong>Highlight:</strong> Highlights key terms.</p>
            <p><strong>Edit:</strong> Lets you edit transcript.</p>
            <p><strong>Save:</strong> Saves lecture.</p>

            <button
              className="ask-close-btn"
              onClick={() => setShowHelp(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

// ── SCREEN: Visualise ──────────────────────────────────────────────────────────
function VisualiseScreen({ data, onNavigate }) {
  const [mermaidCode, setMermaidCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    generateFlowchart();
  }, []);

  useEffect(() => {
    if (mermaidCode && window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: "default",themeVariables: {fontSize: "38px"} });
      window.mermaid
        .render("mermaid-diagram", mermaidCode)
        .then(({ svg }) => {
          if (containerRef.current) containerRef.current.innerHTML = svg;
        })
        .catch(console.error);
    } else if (mermaidCode && !window.mermaid) {
      // Wait a second and try again if the script is still loading
      const timer = setTimeout(() => generateFlowchart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [mermaidCode]);

  const generateFlowchart = async () => {
    setIsLoading(true);

    try {
      const rawCode = await askGemini(
        `Create a very simple Mermaid.js flowchart for this transcript. 
        Rules:
        1. Start with "graph TD".
        2. Do NOT use parentheses ( ) or brackets [ ] inside the node text.
        3. Use only alphanumeric characters and spaces.
        4. Return ONLY the code, no backticks, no markdown, no intro.
        5. Create a simple Mermaid flowchart from this lecture content.
        6. Do not use more than 20 nodes.
        7. Keep each label under 4 words where possible.
        8. Only include the main ideas.
        9. Use a top-down structure.
        
        Transcript: ${data?.transcript || SAMPLE_TRANSCRIPT}`
      );

      // 1. Clean out markdown backticks and the word "mermaid"
      let cleanCode = rawCode.replace(/```mermaid|```|mermaid/gi, "").trim();

      // 2. Mermaid fails if there are parentheses inside labels. 
      // This regex removes them just in case the AI ignored our rules.
      cleanCode = cleanCode.replace(/[()]/g, "");
      setMermaidCode(cleanCode);
    } catch (e) {
      console.error("Flowchart generation failed", e);
      setMermaidCode("");
    }

    setIsLoading(false);
  };

  return (
    <div className="screen visualise-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => onNavigate("transcribe")}>
          BACK ←
        </button>
        <button className="home-btn" onClick={() => onNavigate("welcome")}>🏠 Home</button>
      </div>

      <h2 className="screen-title">Visualisation</h2>

      <div className="visualise-box">
        {isLoading ? (
          <div className="loading-text">Generating flowchart...</div>
        ) : mermaidCode ? (
          <div ref={containerRef} className="mermaid-container" />
        ) : (
          <div className="loading-text">Could not generate flowchart. Try again.</div>
        )}
      </div>

      <button className="action-btn regenerate" onClick={generateFlowchart}>
        Regenerate
      </button>
    </div>
  );
}

// ── SCREEN: Revision ───────────────────────────────────────────────────────────
function RevisionScreen({ onNavigate, module }) {
  const { user } = useAuth();
  const [transcripts, setTranscripts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!module) return <div className="screen">Loading module...</div>;

  useEffect(() => {
    if (!user?.uid || !module?.id) return;

    const lecturesRef = collection(db, "users", user.uid, "modules", module.id, "lectures");
    const fetchLectures = async () => {
      const q = query(lecturesRef, orderBy("updatedAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTranscripts(items);
    };

    fetchLectures();
  }, [user?.uid, module?.id]);
  

  const generateFlashcards = async (t) => {
    const content = t.text || t.transcript || "";

    if(!content.trim())
    {
      alert("No transcript text found to generate cards from!")
      return;
    }

   // if (!t.text) return;
    setSelected(t);
    setIsLoading(true);
    setFlashcards([]);

    try {
      const raw = await askGemini(
        `Create 5 flashcards from this text. Return ONLY a JSON array: [{"front": "Q", "back": "A"}]. Text: ${content}`
      );
      //Regex for AI - Gemini sometimes add converational text
      //This regex ensures we only grab the valid JSON array
      const jsonMatch = raw.match(/\[.*\]/s);  
      if (jsonMatch) {
        setFlashcards(JSON.parse(jsonMatch[0]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="screen revision-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => onNavigate("welcome")}>
          BACK ←
        </button>
        <button className="home-btn" onClick={() => onNavigate("welcome")}>🏠 Home</button>
      </div>

      <h2 className="screen-title">Revision</h2>

      {!selected ? (
        <div className="transcripts-list">
          <p className="section-label">Saved Transcripts</p>
          {transcripts.map((t) => (
            <button
              key={t.id}
              className="transcript-item"
              onClick={() => generateFlashcards(t)}
            >
              <span className="transcript-title">{t.title}</span>
              <span className="transcript-date">{t.date}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flashcards-section">
          <button className="back-to-list" onClick={() => setSelected(null)}>
            ← Back to transcripts
          </button>

          <p className="section-label">{selected.title}</p>

          {isLoading ? (
            <div className="loading-text">Generating flashcards...</div>
          ) : flashcards.length > 0 ? (
            <>
              <div className="flashcard" onClick={() => setFlipped(!flipped)}>
                <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
                  <div className="flashcard-front">
                    <p>{flashcards[currentCard]?.front}</p>
                    <span className="flip-hint">Tap to reveal answer</span>
                  </div>
                  <div className="flashcard-back">
                    <p>{flashcards[currentCard]?.back}</p>
                  </div>
                </div>
              </div>

              <div className="flashcard-nav">
                <button
                  className="nav-card-btn"
                  onClick={() => {
                    setCurrentCard(Math.max(0, currentCard - 1));
                    setFlipped(false);
                  }}
                  disabled={currentCard === 0}
                >
                  ←
                </button>

                <span className="card-counter">
                  {currentCard + 1} / {flashcards.length}
                </span>

                <button
                  className="nav-card-btn"
                  onClick={() => {
                    setCurrentCard(Math.min(flashcards.length - 1, currentCard + 1));
                    setFlipped(false);
                  }}
                  disabled={currentCard === flashcards.length - 1}
                >
                  →
                </button>
              </div>
            </>
          ) : (
            <div className="loading-text">Could not generate flashcards.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("welcome");
  const [screenData, setScreenData] = useState(null);
  const transcribeDataRef = useRef(null);
  

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  if (!user) {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <AuthScreen />
        </div>
      </div>
    );
  }

  const navigate = (dest, data) => {
    setScreen(dest);
    setScreenData(data || null);
    
  if (dest === "transcribe" && data) {
    transcribeDataRef.current = data;
  }
  
  // CRITICAL FIX: If we are going back to lectures from transcribe, 
  // and data is missing, use the ref we saved earlier.
  if (dest === "lectures" && !data && transcribeDataRef.current) {
    setScreenData(transcribeDataRef.current);
  } else {
    setScreenData(data || null);
  }
  
  setScreen(dest);
};

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <svg
          className="wavy-border"
          viewBox="10 10 355 760"
          preserveAspectRatio="none"
        >
          {/* outer top */}
          <path
            className="wave-line"
            d="M22 18 C60 12, 95 24, 130 18 C165 12, 200 24, 235 18 C270 12, 305 24, 350 18"
          />

          {/* inner top */}
          <path
            className="wave-line faint-line"
            d="M28 24 C66 18, 98 30, 132 24 C166 18, 198 30, 232 24 C266 18, 298 30, 344 24"
          />

          {/* outer bottom */}
          <path
            className="wave-line"
            d="M22 762 C60 756, 95 768, 130 762 C165 756, 200 768, 235 762 C270 756, 305 768, 350 762"
          />

          {/* inner bottom */}
          <path
            className="wave-line faint-line"
            d="M28 756 C66 750, 98 762, 132 756 C166 750, 198 762, 232 756 C266 750, 298 762, 344 756"
          />

          {/* outer left */}
          <path
            className="wave-line"
            d="M18 24
              C12 70, 28 110, 18 150
              C8 190, 28 230, 18 270
              C8 310, 28 350, 18 390
              C8 430, 28 470, 18 510
              C8 550, 28 590, 18 630
              C8 670, 28 710, 18 756"
          />

          {/* inner left */}
          <path
            className="wave-line faint-line"
            d="M24 30
              C18 76, 34 114, 24 152
              C14 190, 34 228, 24 266
              C14 304, 34 342, 24 380
              C14 418, 34 456, 24 494
              C14 532, 34 570, 24 608
              C14 646, 34 688, 24 748"
          />

          {/* outer right */}
          <path
            className="wave-line"
            d="M356 24
              C362 70, 346 110, 356 150
              C366 190, 346 230, 356 270
              C366 310, 346 350, 356 390
              C366 430, 346 470, 356 510
              C366 550, 346 590, 356 630
              C366 670, 346 710, 356 756"
          />

          {/* inner right */}
          <path
            className="wave-line faint-line"
            d="M350 30
              C356 76, 340 114, 350 152
              C360 190, 340 228, 350 266
              C360 304, 340 342, 350 380
              C360 418, 340 456, 350 494
              C360 532, 340 570, 350 608
              C360 646, 340 688, 350 748"
          />

        </svg>
        {screen === "welcome" && <WelcomeScreen onNavigate={navigate} />}
        {screen === "lectures" && (<LecturesScreen module={screenData} onNavigate={navigate} />)}
        {screen === "transcribe" && (
          <TranscribeScreen module={transcribeDataRef.current} onNavigate={navigate} />
        )}
        {screen === "visualise" && (
          <VisualiseScreen data={screenData} onNavigate={navigate} />
        )}
        {screen === "revision" && (
          <RevisionScreen 
          user={user}
          onNavigate={navigate}
          module={screenData} />
        )}
      </div>
    </div>
  );
}