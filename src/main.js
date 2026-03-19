import './style.css';
import { auth, db } from './firebase.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, increment, updateDoc } from "firebase/firestore";
import questionsData from './questions.json';

// State variables
let currentQuestionIndex = 0;
let score = 0;
let incorrectScore = 0;
let totalAnswersAttempted = 0;
let shuffledQuestions = [];
let originalTotal = 50;
let currentUser = null;
let forcedFail = false;
let currentStudyPage = 1;
const questionsPerPage = 25;
let offlineQueue = JSON.parse(localStorage.getItem('offline_exams') || '[]');

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const mainLanding = document.getElementById('main-landing');
const studyResources = document.getElementById('study-resources');
const authScreen = document.getElementById('auth-screen');
const landingScreen = document.getElementById('landing-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const adminAuthScreen = document.getElementById('admin-auth-screen');
const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
const userHeader = document.getElementById('user-header');

// Nav Buttons
const navHome = document.getElementById('nav-home');
const navStudy = document.getElementById('nav-study');
const navLoginBtn = document.getElementById('nav-login-btn');
const heroExamBtn = document.getElementById('hero-exam-btn');
const heroStudyBtn = document.getElementById('hero-study-btn');
const studyBackBtn = document.getElementById('study-back-btn');
const questionsListStudy = document.getElementById('questions-list-study');
const studyPagination = document.getElementById('study-pagination');

const landingUserInfo = document.getElementById('landing-user-info');
const landingUserEmail = document.getElementById('landing-user-email');
const landingLogoutBtn = document.getElementById('landing-logout-btn');

const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userPhoto = document.getElementById('user-photo');
const headerUserEmail = document.getElementById('header-user-email');
const readinessLabel = document.getElementById('readiness-label');
const viewDashboardBtn = document.getElementById('view-dashboard-btn');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const skipBtn = document.getElementById('skip-btn');
const restartBtn = document.getElementById('restart-btn');
const goDashBtn = document.getElementById('go-dash-btn');
const goHomeBtn = document.getElementById('go-home-btn');
const dashBackBtn = document.getElementById('dash-back-btn');
const authBackBtn = document.getElementById('auth-back-btn');
const landingBackBtn = document.getElementById('landing-back-btn');
const exitBtn = document.getElementById('exit-btn');

const openAdminLink = document.getElementById('open-admin-link');
const adminPinInput = document.getElementById('admin-pin');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminBackBtn = document.getElementById('admin-back-btn');
const adminExitBtn = document.getElementById('admin-exit-btn');
const adminClearCacheBtn = document.getElementById('admin-clear-cache-btn');
const totalVisitsVal = document.getElementById('total-visits-val');
const footerVisitsVal = document.getElementById('footer-visits-val');
const totalUsersVal = document.getElementById('total-users-val');
const adminUsersList = document.getElementById('admin-users-list');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackArea = document.getElementById('feedback-area');
const feedbackTitle = document.getElementById('feedback-title');
const explanationText = document.getElementById('explanation-text');

const currentQuestionNum = document.getElementById('current-question-num');
const progressBar = document.getElementById('progress-bar');
const correctCountDisplay = document.getElementById('correct-count');
const incorrectCountDisplay = document.getElementById('incorrect-count');

const resultTitle = document.getElementById('result-title');
const scorePercentage = document.getElementById('score-percentage');
const statusBadge = document.getElementById('status-badge');
const finalCorrect = document.getElementById('final-correct');
const resultMessage = document.getElementById('result-message');

// Dashboard Elements
const learningProgressVal = document.getElementById('learning-progress-val');
const examsCountVal = document.getElementById('exams-count-val');
const readinessText = document.getElementById('readiness-text');
const historyList = document.getElementById('history-list');

// --- Firebase Auth Logic ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    localStorage.setItem('cached_user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }));
    
    headerUserEmail.textContent = user.displayName || user.email;
    if (user.photoURL) {
      userPhoto.src = user.photoURL;
      userPhoto.style.display = 'block';
    }
    
    // If user just logged in and is on the auth screen, take them to the landing screen
    if (!authScreen.classList.contains('hidden')) {
      showSection(landingScreen);
    }
    
    navLoginBtn.style.display = 'none';
    landingUserInfo.classList.remove('hidden');
    landingUserEmail.textContent = user.displayName || user.email;
    
    updateDashboard();
    syncOfflineData();
  } else {
    currentUser = null;
    localStorage.removeItem('cached_user');
    localStorage.removeItem('user_history');
    userHeader.classList.add('hidden');
    navLoginBtn.style.display = 'block';
    landingUserInfo.classList.add('hidden');
    // If we were in an auth-only section, go back to main landing
    if (!quizScreen.classList.contains('hidden') || !resultsScreen.classList.contains('hidden') || !dashboardScreen.classList.contains('hidden') || !landingScreen.classList.contains('hidden')) {
      showSection(mainLanding);
    }
  }
});

// Initial Restore from Cache
const cachedUser = localStorage.getItem('cached_user');
if (cachedUser && !currentUser) {
  currentUser = JSON.parse(cachedUser);
  headerUserEmail.textContent = currentUser.displayName || currentUser.email;
  navLoginBtn.style.display = 'none';
  landingUserInfo.classList.remove('hidden');
  landingUserEmail.textContent = currentUser.displayName || currentUser.email;
  updateDashboard();
}

function showSection(section) {
  [mainLanding, studyResources, authScreen, landingScreen, quizScreen, resultsScreen, dashboardScreen, adminAuthScreen, adminDashboardScreen].forEach(s => s.classList.add('hidden'));
  section.classList.remove('hidden');
  
  // Header visibility
  if (currentUser && (section === landingScreen || section === quizScreen || section === resultsScreen || section === dashboardScreen)) {
    userHeader.classList.remove('hidden');
  } else {
    userHeader.classList.add('hidden');
  }
}

// Navigation Events
navHome.addEventListener('click', () => showSection(mainLanding));
navStudy.addEventListener('click', () => {
  currentStudyPage = 1;
  renderStudyQuestions();
  showSection(studyResources);
});
studyBackBtn.addEventListener('click', () => showSection(mainLanding));
heroStudyBtn.addEventListener('click', () => {
  currentStudyPage = 1;
  renderStudyQuestions();
  showSection(studyResources);
});

function enterExamFlow() {
  if (currentUser) {
    showSection(landingScreen);
  } else {
    showSection(authScreen);
  }
}

navLoginBtn.addEventListener('click', () => showSection(authScreen));
heroExamBtn.addEventListener('click', enterExamFlow);
goDashBtn.addEventListener('click', () => showSection(dashboardScreen));
authBackBtn.addEventListener('click', () => showSection(mainLanding));
landingBackBtn.addEventListener('click', () => showSection(mainLanding));
goHomeBtn.addEventListener('click', () => showSection(mainLanding));

viewDashboardBtn.addEventListener('click', () => {
  updateDashboard();
  showSection(dashboardScreen);
});
dashBackBtn.addEventListener('click', () => showSection(landingScreen));

function renderStudyQuestions() {
  questionsListStudy.innerHTML = '';
  
  const startIndex = (currentStudyPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const paginatedQuestions = questionsData.slice(startIndex, endIndex);

  paginatedQuestions.forEach((q, index) => {
    const actualIndex = startIndex + index;
    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'flex-start';
    item.style.cursor = 'default';
    item.innerHTML = `
      <div style="font-weight: 600; color: #fff; margin-bottom: 0.5rem;">${actualIndex + 1}. ${q.question}</div>
      <div style="color: var(--primary); font-weight: 700; margin-bottom: 0.5rem;">Respuesta: ${q.answer}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${q.explanation}</div>
    `;
    questionsListStudy.appendChild(item);
  });

  renderStudyPagination();
  questionsListStudy.scrollTop = 0;
}

function renderStudyPagination() {
  studyPagination.innerHTML = '';
  const totalPages = Math.ceil(questionsData.length / questionsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.style.padding = '0.5rem 0.8rem';
    btn.style.borderRadius = '8px';
    btn.style.border = '1px solid rgba(255,255,255,0.1)';
    btn.style.background = (i === currentStudyPage) ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
    btn.style.color = (i === currentStudyPage) ? '#fff' : 'var(--text-muted)';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s';
    
    btn.addEventListener('click', () => {
      currentStudyPage = i;
      renderStudyQuestions();
    });
    
    studyPagination.appendChild(btn);
  }
}

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, authEmail.value, authPassword.value);
  } catch (err) {
    authError.style.display = 'block';
    authError.textContent = "Error: " + err.message;
  }
});

googleLoginBtn.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Create document immediately for new users
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date().toISOString(),
        history: []
      });
    }
  } catch (err) {
    authError.style.display = 'block';
    authError.textContent = "Error: " + err.message;
  }
});

registerBtn.addEventListener('click', async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    const user = userCredential.user;
    
    // Create document immediately for new users
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      createdAt: new Date().toISOString(),
      history: []
    });
  } catch (err) {
    authError.style.display = 'block';
    authError.textContent = "Error: " + err.message;
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));
landingLogoutBtn.addEventListener('click', () => signOut(auth));

// --- Dashboard Logic ---
async function updateDashboard() {
  if (!currentUser) return;
  
  // Try to load from cache first
  const cachedHistory = localStorage.getItem('user_history');
  if (cachedHistory) {
    renderDashboardWithData(JSON.parse(cachedHistory));
  }

  if (navigator.onLine) {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const history = data.history || [];
        localStorage.setItem('user_history', JSON.stringify(history));
        renderDashboardWithData(history);
      } else {
        // Create the document for new users so the admin can see them
        await setDoc(userRef, {
          email: currentUser.email,
          createdAt: new Date().toISOString(),
          history: []
        });
        localStorage.setItem('user_history', JSON.stringify([]));
        renderDashboardWithData([]);
      }
    } catch (e) {
      console.error("Dashboard error:", e);
    }
  }
}

function renderDashboardWithData(history) {
  // Update Stats
  examsCountVal.textContent = history.length;
  
  if (history.length > 0) {
    const totalCorrect = history.reduce((acc, curr) => acc + curr.score, 0);
    const totalPossible = history.length * 50; 
    const avgScore = Math.round((totalCorrect / totalPossible) * 100);
    learningProgressVal.textContent = `${avgScore}%`;
    
    // Readiness Logic: Last 3 exams passed?
    const lastThree = history.slice(-3);
    const passedCount = lastThree.filter(h => h.passed).length;
    
    if (passedCount >= 2 && avgScore >= 80) {
      readinessText.textContent = "¡ESTÁS LISTO! Estás aprobando con consistencia.";
      readinessLabel.textContent = "Listo para el examen";
      readinessLabel.style.color = "var(--success)";
      document.getElementById('readiness-card').style.background = "rgba(16, 185, 129, 0.1)";
    } else {
      readinessText.textContent = "Sigue practicando. Necesitas más regularidad.";
      readinessLabel.textContent = "Sigue practicando...";
      readinessLabel.style.color = "var(--primary)";
      document.getElementById('readiness-card').style.background = "rgba(255, 215, 0, 0.1)";
    }

    // Render History
    historyList.innerHTML = '';
    [...history].reverse().forEach(item => {
      const div = document.createElement('div');
      div.className = `history-item ${item.passed ? 'pass' : 'fail'}`;
      const date = new Date(item.date).toLocaleDateString();
      div.innerHTML = `
        <div>
          <div style="font-weight: 600;">${date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${item.passed ? 'Aprobado' : 'Reprobado'}</div>
        </div>
        <div style="font-weight: 700;">${item.score}/50</div>
      `;
      historyList.appendChild(div);
    });
  }
}

// --- Quiz Logic ---
function initQuiz() {
  shuffledQuestions = [...questionsData].sort(() => Math.random() - 0.5);
  originalTotal = 50; 
  shuffledQuestions = shuffledQuestions.slice(0, 50); 
  
  currentQuestionIndex = 0;
  score = 0;
  incorrectScore = 0;
  totalAnswersAttempted = 0;
  forcedFail = false;
  
  correctCountDisplay.textContent = 0;
  incorrectCountDisplay.textContent = 0;
  
  updateProgress();
  showQuestion();
  
  showSection(quizScreen);
}

function showQuestion() {
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  currentQuestionNum.textContent = totalAnswersAttempted + 1;
  updateProgress();
  
  questionText.textContent = currentQuestion.question;
  optionsContainer.innerHTML = '';
  feedbackArea.classList.remove('show');
  nextBtn.style.display = 'none';
  skipBtn.style.display = 'block';
  
  currentQuestion.options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'option-btn';
    button.innerHTML = `<span class="icon">○</span> ${option}`;
    button.addEventListener('click', () => handleOptionSelect(option, button));
    optionsContainer.appendChild(button);
  });
}

function handleOptionSelect(selectedOption, selectedButton) {
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const buttons = optionsContainer.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);
  
  const isCorrect = (selectedOption === currentQuestion.answer);
  
  if (isCorrect) {
    score++;
    correctCountDisplay.textContent = score;
    selectedButton.classList.add('correct');
    selectedButton.querySelector('.icon').textContent = '✓';
    feedbackTitle.textContent = '¡Correcto!';
    feedbackTitle.style.color = 'var(--success)';
  } else {
    incorrectScore++;
    incorrectCountDisplay.textContent = incorrectScore;
    selectedButton.classList.add('incorrect');
    selectedButton.querySelector('.icon').textContent = '✗';
    feedbackTitle.textContent = 'Incorrecto';
    feedbackTitle.style.color = 'var(--error)';
    
    buttons.forEach(btn => {
      if (btn.textContent.includes(currentQuestion.answer)) {
        btn.classList.add('correct');
        btn.querySelector('.icon').textContent = '✓';
      }
    });
  }
  
  totalAnswersAttempted++;
  explanationText.textContent = currentQuestion.explanation;
  feedbackArea.classList.add('show');
  nextBtn.style.display = 'block';
  skipBtn.style.display = 'none';

  // Logic for 10 errors
  if (incorrectScore >= 10 && !forcedFail) {
      forcedFail = true;
      feedbackTitle.textContent = "¡Límite de Errores!";
      explanationText.textContent = "Has cometido 10 errores. En el examen real esto significa que has fallado. ¿Deseas detenerte aquí o continuar practicando?";
      
      nextBtn.innerHTML = "Continuar Practicando";
      const endBtn = document.createElement('button');
      endBtn.className = "btn btn-outline";
      endBtn.style.marginTop = "0.5rem";
      endBtn.textContent = "Finalizar Examen Ahora";
      endBtn.onclick = finishQuiz;
      feedbackArea.appendChild(endBtn);
      
      nextBtn.onclick = () => {
        endBtn.remove();
        goToNext();
      };
      return;
  }

  nextBtn.textContent = (totalAnswersAttempted === shuffledQuestions.length) ? 'Ver Resultados' : 'Siguiente Pregunta';
  nextBtn.onclick = goToNext;
}

function goToNext() {
  if (totalAnswersAttempted < shuffledQuestions.length) {
    currentQuestionIndex++;
    showQuestion();
  } else {
    finishQuiz();
  }
}

function skipQuestion() {
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  shuffledQuestions.push(currentQuestion);
  currentQuestionIndex++;
  showQuestion();
}

function updateProgress() {
  const progress = (totalAnswersAttempted / originalTotal) * 100;
  progressBar.style.width = `${progress}%`;
}

async function finishQuiz() {
  showSection(resultsScreen);
  
  const percentage = Math.round((score / originalTotal) * 100);
  scorePercentage.textContent = `${percentage}%`;
  finalCorrect.textContent = score;
  
  const passed = (percentage >= 80 && incorrectScore < 10);
  
  statusBadge.textContent = passed ? 'APROBADO' : 'REPROBADO';
  statusBadge.className = `status-badge ${passed ? 'status-pass' : 'status-fail'}`;
  
  if (incorrectScore >= 10) {
    resultTitle.textContent = 'Examen Suspendido / Reprobado';
    resultMessage.textContent = 'Has alcanzado el límite de 10 errores. Debes estudiar más el manual.';
  } else if (passed) {
    resultTitle.textContent = '¡Felicidades!';
    resultMessage.textContent = 'Has demostrado un gran conocimiento. Estás listo para el examen real.';
  } else {
    resultTitle.textContent = 'Faltó poco';
    resultMessage.textContent = 'No alcanzaste el 80%. Estudia y vuelve a intentarlo.';
  }

  // Save Exam Result
  const examResult = {
    date: new Date().toISOString(),
    score: score,
    incorrect: incorrectScore,
    passed: passed
  };

  if (currentUser) {
    // Save to Local Cache immediately
    const cachedHistory = JSON.parse(localStorage.getItem('user_history') || '[]');
    cachedHistory.push(examResult);
    localStorage.setItem('user_history', JSON.stringify(cachedHistory));
    renderDashboardWithData(cachedHistory);

    if (navigator.onLine) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        const prevData = userDoc.exists() ? userDoc.data() : { history: [] };
        
        await setDoc(userRef, {
          email: currentUser.email,
          history: [...prevData.history, examResult]
        }, { merge: true });
      } catch (e) {
        console.error("Error saving score to Firebase:", e);
        // Fallback: save to offline queue
        queueForOfflineSync(examResult);
      }
    } else {
      // Offline: save to queue
      queueForOfflineSync(examResult);
      alert('Examen guardado localmente. Se sincronizará cuando recuperes conexión.');
    }
  }
}

function queueForOfflineSync(result) {
  offlineQueue.push(result);
  localStorage.setItem('offline_exams', JSON.stringify(offlineQueue));
}

async function syncOfflineData() {
  if (!currentUser || !navigator.onLine || offlineQueue.length === 0) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    let history = userDoc.exists() ? userDoc.data().history || [] : [];
    
    // Add all offline results
    history = [...history, ...offlineQueue];
    
    await setDoc(userRef, {
      email: currentUser.email,
      history: history
    }, { merge: true });

    // Clear queue
    offlineQueue = [];
    localStorage.removeItem('offline_exams');
    updateDashboard(); // Refresh UI
    console.log('Offline data synced successfully');
  } catch (e) {
    console.error("Error syncing offline data:", e);
  }
}

window.addEventListener('online', syncOfflineData);

// Event Listeners
startBtn.addEventListener('click', initQuiz);
skipBtn.addEventListener('click', skipQuestion);
restartBtn.addEventListener('click', initQuiz);

exitBtn.addEventListener('click', () => {
  if (confirm('¿Seguro que quieres salir del examen? Tu progreso se perderá.')) {
    showSection(mainLanding);
  }
});

// --- Admin Logic ---
openAdminLink.addEventListener('click', () => showSection(adminAuthScreen));
adminBackBtn.addEventListener('click', () => showSection(mainLanding));
adminExitBtn.addEventListener('click', () => showSection(mainLanding));

if (adminClearCacheBtn) {
  adminClearCacheBtn.addEventListener('click', async () => {
    if (confirm('¿Seguro? Esto desinstalará el Service Worker, borrará la caché local y reiniciará la app. Úsalo si ves errores de "MIME type" o fallos al cargar.')) {
      try {
        // Unregister SW
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
        }
        
        // Clear Caches
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }
        
        // Clear Storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Final Reload
        alert('Caché limpiada con éxito. La aplicación se reiniciará ahora.');
        window.location.reload(true);
      } catch (err) {
        alert('Error al limpiar caché: ' + err.message);
      }
    }
  });
}

adminLoginBtn.addEventListener('click', () => {
  if (adminPinInput.value === '1619') {
    adminPinInput.value = '';
    loadAdminDashboard();
    showSection(adminDashboardScreen);
  } else {
    alert('PIN Incorrecto');
  }
});

async function loadAdminDashboard() {
  try {
    // Get Stats
    const statsRef = doc(db, "stats", "global");
    const statsDoc = await getDoc(statsRef);
    if (statsDoc.exists()) {
      totalVisitsVal.textContent = (statsDoc.data().visits || 0).toLocaleString();
    }

    // Get Users
    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(50));
    const querySnapshot = await getDocs(q);
    
    totalUsersVal.textContent = querySnapshot.size;
    adminUsersList.innerHTML = '';

    if (querySnapshot.empty) {
      adminUsersList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay usuarios registrados todavía.</div>';
    } else {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div style="font-size: 0.85rem;">
            <div style="font-weight: 600; color: #fff;">${data.email || 'Usuario sin email'}</div>
            <div style="color: var(--text-muted); font-size: 0.75rem;">Exámenes: ${data.history?.length || 0}</div>
          </div>
          <div style="font-size: 0.75rem; color: var(--primary);">${new Date(data.history?.[data.history.length-1]?.date || data.createdAt || Date.now()).toLocaleDateString()}</div>
        `;
        adminUsersList.appendChild(item);
      });
    }
  } catch (err) {
    console.error("Admin load error:", err);
    adminUsersList.innerHTML = `<div style="text-align: center; color: var(--error); padding: 2rem;">Error al cargar usuarios: ${err.message}</div>`;
  }
}

async function trackVisit() {
  if (!navigator.onLine) return;
  
  try {
    const statsRef = doc(db, "stats", "global");
    
    // Check if we've already tracked this session
    const sessionTracked = sessionStorage.getItem('visit_tracked');
    
    if (!sessionTracked) {
      await setDoc(statsRef, { visits: increment(1) }, { merge: true });
      sessionStorage.setItem('visit_tracked', 'true');
    }
    
    // Fetch the updated count to show in footer
    const statsDoc = await getDoc(statsRef);
    if (statsDoc.exists()) {
      const count = statsDoc.data().visits || 0;
      if (footerVisitsVal) footerVisitsVal.textContent = count.toLocaleString();
      if (totalVisitsVal) totalVisitsVal.textContent = count.toLocaleString();
    }
  } catch (err) {
    console.error("Visit tracking error:", err);
  }
}

// Initial View & Tracking
trackVisit();
showSection(mainLanding);

window.addEventListener('load', () => {
  setTimeout(() => {
    splashScreen.style.opacity = '0';
    splashScreen.style.visibility = 'hidden';
  }, 2000);
});
