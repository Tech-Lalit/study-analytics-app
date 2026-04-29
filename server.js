const { setServers } = require('dns').promises;
setServers(["1.1.1.1", "8.8.8.8"]); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // CRITICAL: This must be before your routes

// 1. Connection
mongoose.connect('mongodb+srv://such101105_db_user:aWe0T1iEfNLsdPmW@cluster0.r7xtzxf.mongodb.net/?appName=Cluster0')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// 2. Model
const Session = mongoose.model('Session', new mongoose.Schema({
    userId: String,
    subject: String,
    hours: Number,
    rating: Number,
    date: { type: Date, default: Date.now }
}));

// 3. POST Route
app.post('/api/sessions', async (req, res) => {
    try {
        const s = new Session(req.body);
        await s.save();
        res.status(201).json(s);
    } catch (e) { res.status(400).json(e); }
});

// 4. GET Route (The one causing your 404)
app.get('/api/sessions', async (req, res) => {
    try {
        const data = await Session.find();
        res.status(200).json(data); // Explicitly send 200 OK
    } catch (e) { res.status(500).json(e); }
});

// ... existing dns and express setup ...

// 1. User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 2. Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password });
        await user.save();
        res.status(201).json({ message: "User created!" });
    } catch (err) {
        res.status(400).json({ error: "Email already exists or invalid data" });
    }
});

// 3. Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (user) {
            res.json({ message: "Login successful", email: user.email });
        } else {
            // Sending a specific error message for the frontend to catch
            res.status(401).json({ error: "Invalid email or password. Please try again." });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error. Try again later." });
    }
});
// 4. Update the GET Sessions route to filter by user
app.get('/api/sessions/:email', async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.params.email });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));