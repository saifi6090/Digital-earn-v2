const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron'); // Optional: npm install node-cron

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const DB_FILE = path.join(__dirname, 'database.json');
function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// --- NEW: DAILY RESET LOGIC ---
// This resets the daily_count for ALL users every day
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        const db = readDB();
        db.users.forEach(u => u.daily_count = 0);
        writeDB(db);
        console.log("LOG: Daily tasks reset for all users.");
    }
}, 60000); // Checks every minute

// --- YOUR PLAN SETTINGS (Edit here easily) ---
const SETTINGS = {
    plans: { 1: 10, 2: 25, 3: 50 }, // Earnings per task for Basic, Silver, Gold
    dailyLimit: { 1: 10, 2: 20, 3: 30 } // Tasks per day
};

// ... (Rest of your Send OTP, Register, and Login routes remain the same) ...

// --- IMPROVED TASK ROUTE ---
app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    
    if (!user.is_active) return res.json({ success: false, error: "Account not activated." });
    
    const limit = SETTINGS.dailyLimit[user.level] || 10;
    if (user.daily_count >= limit) return res.json({ success: false, error: "Daily limit reached! Come back tomorrow." });

    const reward = SETTINGS.plans[user.level] || 10;
    user.balance += reward;
    user.daily_count += 1;
    writeDB(db);
    res.json({ success: true, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Digital Earn Pro Live on ${PORT}`));
