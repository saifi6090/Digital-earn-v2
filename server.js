const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

let tempOTP = {};
const SETTINGS = {
    plans: { 1: 10, 2: 25, 3: 50 }, // Reward per task
    limits: { 1: 10, 2: 20, 3: 30 } // Daily limits
};

// --- AUTH & OTP ---
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    tempOTP[email] = code;
    console.log(`[AUTH] Code for ${email}: ${code}`);
    res.json({ success: true });
});

app.post('/api/register', (req, res) => {
    const { email, password, otp, level } = req.body;
    if (tempOTP[email] !== otp) return res.json({ success: false, error: "Invalid OTP" });
    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.json({ success: false, error: "Exists" });

    const user = {
        email, password, level: Number(level), balance: 0, is_active: (email === 'admin@digitalearn.com'),
        daily_count: 0, refCode: "DE" + Math.random().toString(36).substring(7).toUpperCase(),
        withdrawals: [], tasks_history: []
    };
    db.users.push(user);
    writeDB(db);
    res.json({ success: true, user });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    user ? res.json({ success: true, user }) : res.json({ success: false, error: "Failed" });
});

// --- TASK LOGIC ---
app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user.is_active) return res.json({ success: false, error: "Inactive" });
    
    if (user.daily_count >= SETTINGS.limits[user.level]) return res.json({ success: false, error: "Limit Reached" });

    user.balance += SETTINGS.plans[user.level];
    user.daily_count += 1;
    user.tasks_history.unshift({ amount: SETTINGS.plans[user.level], date: new Date().toLocaleString() });
    writeDB(db);
    res.json({ success: true, user });
});

// --- ADMIN & WITHDRAW ---
app.post('/api/admin/activate', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.email === req.body.email);
    if (user) { user.is_active = true; writeDB(db); res.json({ success: true }); }
});

app.post('/api/withdraw', (req, res) => {
    const { email, amount, method, title, num } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (user.balance < amount) return res.json({ success: false });
    
    user.balance -= Number(amount);
    user.withdrawals.unshift({ amount, method, title, num, status: "Pending", date: new Date().toLocaleString() });
    writeDB(db);
    res.json({ success: true, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
