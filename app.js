// Global State
let allSessions = [];
let myChart = null;

// ================= ROUTE GUARDS =================
(function() {
    const user = localStorage.getItem("user");
    const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

    if (!user && !isLoginPage) {
        window.location.replace("index.html");
    } else if (user && isLoginPage) {
        window.location.replace("dashboard.html");
    }
})();

// ================= AUTHENTICATION =================
let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById("auth-title").innerText = isLoginMode ? "Login" : "Register";
    document.getElementById("auth-btn").innerText = isLoginMode ? "Login" : "Register";
    document.getElementById("toggle-text").innerText = isLoginMode 
        ? "Don't have an account? Register" 
        : "Already have an account? Login";
}

async function handleAuth() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");
    const endpoint = isLoginMode ? 'login' : 'register';

    if (!email || !password) {
        if (errorMsg) errorMsg.innerText = "Please fill all fields";
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            if (isLoginMode) {
                localStorage.setItem("user", data.email);
                window.location.href = "dashboard.html";
            } else {
                alert("Registration successful! Now please login.");
                toggleAuthMode();
            }
        } else {
            if (errorMsg) errorMsg.innerText = data.error;
        }
    } catch (err) {
        console.error("Auth error:", err);
    }
}

// ================= NAVIGATION =================
function goToAdd() { window.location.href = "add-session.html"; }
function goToAnalytics() { window.location.href = "analytics.html"; }
function goBack() { window.location.href = "dashboard.html"; }
function logout() { 
    localStorage.clear(); 
    window.location.replace("index.html"); 
}

// ================= SAVE DATA =================
async function saveSession() {
    const sessionData = {
        userId: localStorage.getItem("user"),
        subject: document.getElementById("subject").value,
        hours: Number(document.getElementById("hours").value),
        rating: Number(document.getElementById("rating").value)
    };

    try {
        const response = await fetch('http://localhost:3000/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });
        if (response.ok) {
            alert("Session Saved!");
            window.location.href = "dashboard.html";
        }
    } catch (e) { console.error("Save failed", e); }
}

// ================= DATA LOADING =================
async function loadData() {
    const userEmail = localStorage.getItem("user");
    if (!userEmail) return;

    try {
        const res = await fetch(`http://localhost:3000/api/sessions/${userEmail}`);
        allSessions = await res.json();

        if (window.location.pathname.includes("dashboard.html")) {
            document.getElementById("totalHours").innerText = allSessions.reduce((acc, s) => acc + s.hours, 0);
            document.getElementById("totalSubjects").innerText = new Set(allSessions.map(s => s.subject)).size;
        }

        if (window.location.pathname.includes("analytics.html")) {
            displayAnalytics(allSessions);
        }
    } catch (err) {
        console.error("Load failed:", err);
    }
}

// ================= ANALYTICS & STREAK LOGIC =================
function displayAnalytics(data, titleText = "All-Time Statistics") {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const monthName = today.toLocaleString('default', { month: 'long' });
    
    const monthDisplay = document.getElementById("monthDisplay");
    if (monthDisplay) monthDisplay.innerText = `${monthName} ${year}`;

    // 1. Get unique study dates formatted as YYYY-MM-DD for easy checking
    const studyDates = [...new Set(allSessions.map(s => {
        const d = new Date(s.date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }))];

    // 2. Build the Circular Calendar Grid (for analytics.html)
    const grid = document.getElementById("calendarGrid");
    if (grid) {
        grid.innerHTML = "";
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        // Padding for the first week
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month}-${day}`;
            const isStudied = studyDates.includes(dateKey);
            
            const dayCell = document.createElement("div");
            dayCell.className = `day-cell ${isStudied ? 'studied-day' : ''}`;
            dayCell.innerText = day;
            
            // Add click event to filter chart by specific day
            dayCell.onclick = () => {
                const filtered = allSessions.filter(s => {
                    const d = new Date(s.date);
                    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
                });
                displayAnalytics(filtered, `Statistics for ${day} ${monthName}`);
            };

            grid.appendChild(dayCell);
        }
    }

    // 3. Calculate Current Streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        
        if (studyDates.includes(key)) {
            streak++;
        } else {
            // If i=0, they haven't logged today yet, so don't break the streak yet
            if (i !== 0) break;
        }
    }

    const currStreakEl = document.getElementById("currStreak");
    const totalSessEl = document.getElementById("totalSessions");
    if (currStreakEl) currStreakEl.innerText = streak.toString().padStart(2, '0');
    if (totalSessEl) totalSessEl.innerText = allSessions.length.toString().padStart(2, '0');

    // 4. Calculate Stats for the Chart
    let subjects = {};
    let totalScore = 0;
    let totalHours = 0;

    data.forEach(s => {
        subjects[s.subject] = (subjects[s.subject] || 0) + s.hours;
        totalScore += (s.hours * s.rating);
        totalHours += s.hours;
    });

    const efficiency = (totalScore / (totalHours || 1)).toFixed(1);

    const reportEl = document.getElementById("report");
    if (reportEl) {
        reportEl.innerHTML = `
        <div class="stat-card">
            <h2 style="font-size: 1rem; margin-bottom: 10px; color: #4361ee;">${titleText}</h2>
            <h3>Focus Efficiency: ${efficiency} / 5.0</h3>
            <p>Hours in this view: ${totalHours}</p>
        </div>
    `;
    }

    // 5. Render/Update Chart
    const ctx = document.getElementById("chart");
    if (!ctx) return;

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(subjects),
            datasets: [{
                label: 'Hours Studied',
                data: Object.values(subjects),
                backgroundColor: '#4361ee',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
        }
    });
}

// ================= GLOBAL THEME LOGIC =================

// 1. Function to apply theme on page load
function applyTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add('dark-mode');
    }
}

// 2. Toggle function
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem("theme", isDark ? "dark" : "light");
    
    // Update button icon if needed
    const btn = document.querySelector('.theme-toggle-btn');
    if(btn) btn.innerHTML = isDark ? "☀️" : "🌙";
}

// Execute immediately
applyTheme();

// ================= NAVIGATION =================
function goToPomodoro() { window.location.href = "pomodoro.html"; }

// ================= POMODORO LOGIC =================
let timerInterval;
let totalPlannedTime = 25 * 60; // in seconds
let timeLeft = 25 * 60; 
let isRunning = false;

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const el = document.getElementById("timerDisplay");
    if (el) el.innerText = display;
    document.title = isRunning ? `(${display}) Focusing...` : "Study Tracker";
}

function startTimer() {
    if (isRunning) return;
    
    const subject = document.getElementById("timerSubject").value;
    const customMins = document.getElementById("customMinutes").value;

    if (!subject) return alert("Enter a subject name!");
    
    // Set custom time if provided
    if (customMins && customMins > 0) {
        totalPlannedTime = customMins * 60;
        timeLeft = totalPlannedTime;
    }

    isRunning = true;
    updateTimerDisplay();

    // Toggle Button Visibility
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("stopBtn").style.display = "block";
    
    if (Notification.permission !== "granted") Notification.requestPermission();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            stopTimer(); // Auto-save when hits zero
        }
    }, 1000);
}

async function stopTimer() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;

    const subject = document.getElementById("timerSubject").value;
    
    // Calculate how much time was actually spent
    const secondsSpent = totalPlannedTime - timeLeft;
    const hoursSpent = (secondsSpent / 3600).toFixed(2);

    // Only save if at least 10 seconds were studied
    if (secondsSpent > 10) {
        await logSession(subject, hoursSpent);
        alert(`Focus stopped. ${Math.floor(secondsSpent / 60)}m ${secondsSpent % 60}s added to analytics.`);
    }

    // Reset UI
    document.getElementById("startBtn").style.display = "block";
    document.getElementById("stopBtn").style.display = "none";
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = 25 * 60;
    document.getElementById("startBtn").style.display = "block";
    document.getElementById("stopBtn").style.display = "none";
    updateTimerDisplay();
}

async function logSession(subject, hours) {
    const sessionData = {
        userId: localStorage.getItem("user"),
        subject: subject,
        hours: parseFloat(hours),
        rating: 5, // Defaulting to 5 as it was a focus session
        date: new Date()
    };

    try {
        await fetch('http://localhost:3000/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });
    } catch (e) {
        console.error("Save failed", e);
    }
}

// Make sure your existing loadData also calls applyTheme if necessary, 
// though the immediate call above handles it best.
window.onload = loadData;