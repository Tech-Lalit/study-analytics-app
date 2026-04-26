// ================= LOGIN =================
function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (email && password) {
        localStorage.setItem("user", email);
        window.location.href = "dashboard.html";
    } else {
        alert("Enter details");
    }
}

// ================= NAVIGATION =================
function goToAdd() {
    window.location.href = "add-session.html";
}

function goToAnalytics() {
    window.location.href = "analytics.html";
}

function goBack() {
    window.location.href = "dashboard.html";
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= DARK MODE =================
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

// ================= SAVE STUDY SESSION =================
function saveSession() {
    let subject = document.getElementById("subject").value;
    let hours = document.getElementById("hours").value;
    let rating = document.getElementById("rating").value;

    if (!subject || !hours || !rating) {
        alert("Please fill all fields");
        return;
    }

    hours = Number(hours);
    rating = Number(rating);

    let score = hours * rating;

    let session = {
        subject,
        hours,
        rating,
        score,
        date: new Date().toISOString()
    };

    let data = JSON.parse(localStorage.getItem("sessions")) || [];
    data.push(session);

    localStorage.setItem("sessions", JSON.stringify(data));

    alert("Saved!");

    // Clear inputs
    document.getElementById("subject").value = "";
    document.getElementById("hours").value = "";
    document.getElementById("rating").value = "";
}

// ================= DASHBOARD STATS =================
if (window.location.pathname.includes("dashboard.html")) {
    let data = JSON.parse(localStorage.getItem("sessions")) || [];

    let totalHours = 0;
    let subjects = new Set();

    data.forEach(s => {
        totalHours += Number(s.hours);
        subjects.add(s.subject);
    });

    let hoursEl = document.getElementById("totalHours");
    let subjectsEl = document.getElementById("totalSubjects");

    if (hoursEl) hoursEl.innerText = totalHours;
    if (subjectsEl) subjectsEl.innerText = subjects.size;
}

// ================= ANALYTICS =================
if (window.location.pathname.includes("analytics.html")) {

    let data = JSON.parse(localStorage.getItem("sessions")) || [];

    let subjects = {};
    let totalScore = 0;

    let today = new Date();
    let last7Days = new Date();
    last7Days.setDate(today.getDate() - 7);

    let weeklyHours = 0;

    data.forEach(s => {
        // Subject-wise hours
        subjects[s.subject] = (subjects[s.subject] || 0) + Number(s.hours);

        // Total productivity score
        totalScore += Number(s.score || 0);

        // Weekly hours calculation
        let sessionDate = new Date(s.date);
        if (sessionDate >= last7Days) {
            weeklyHours += Number(s.hours);
        }
    });

    let labels = Object.keys(subjects);
    let values = Object.values(subjects);

    // ================= CHART =================
    new Chart(document.getElementById("chart"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Hours Studied",
                data: values,
                backgroundColor: ["#007bff", "#28a745", "#ffc107", "#dc3545", "#6f42c1"]
            }]
        },
        options: {
            animation: {
                duration: 2000,
                easing: 'easeInOutBounce'
            }
        }
    });

    // ================= REPORT =================
    let reportEl = document.getElementById("report");
    if (reportEl) {
        reportEl.innerHTML = `
            <h3>Total Productivity Score: ${totalScore}</h3>
            <h3>Last 7 Days Study Hours: ${weeklyHours}</h3>
        `;
    }

    // ================= SMART INSIGHT =================
    let insightText = "";

    if (weeklyHours < 5) {
        insightText = "⚠️ You are studying less this week!";
    } else if (weeklyHours >= 5 && weeklyHours < 15) {
        insightText = "👍 Good, but you can improve your consistency.";
    } else {
        insightText = "🔥 Excellent study performance this week!";
    }

    let insightEl = document.getElementById("insight");
    if (insightEl) {
        insightEl.innerHTML = `<h3>${insightText}</h3>`;
    }
}