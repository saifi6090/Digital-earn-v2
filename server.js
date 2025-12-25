const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- CRITICAL FIX: SERVE THE FRONTEND ---
// This line tells the server to send your index.html when you visit the site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize Database
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

let tempOTP = {}; 

// --- API ROUTES ---

// 1. Send OTP
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, error: "Email required" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    tempOTP[email] = code;
    console.log(`\n[SECURITY] OTP for ${email} is: ${code}\n`);
    res.json({ success: true, message: "Code sent!" });
});

// 2. Register
app.post('/api/register', (req, res) => {
    const { email, password, level, otp } = req.body;
    if (tempOTP[email] !== otp) return res.json({ success: false, error: "Invalid OTP Code" });

    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.json({ success: false, error: "User exists" });

    const newUser = {
        email, password, 
        level: Number(level) || 1,
        balance: 0,
        is_active: (email === 'admin@digitalearn.com'), 
        daily_count: 0,
        referralCode: "DE" + Math.random().toString(36).substring(7).toUpperCase(),
        referralCount: 0,
        history: [],
        withdrawals: []
    };

    db.users.push(newUser);
    writeDB(db);
    delete tempOTP[email];
    res.json({ success: true, user: newUser });
});

// 3. Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user });
    else res.json({ success: false, error: "Wrong Credentials" });
});

// 4. Task Execution
app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user.is_active) return res.json({ success: false, error: "Account Inactive" });

    const PLANS = { 1: 10, 2: 20, 3: 30 };
    user.balance += PLANS[user.level];
    user.daily_count += 1;
    user.history.unshift({ type: "Reward", amount: PLANS[user.level], date: new Date().toLocaleString() });
    writeDB(db);
    res.json({ success: true, user });
});

// 5. Admin Actions
app.post('/api/admin/activate', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (user) { user.is_active = true; writeDB(db); res.json({ success: true }); }
    else res.json({ success: false });
});

app.get('/api/admin/all-users', (req, res) => {
    res.json({ success: true, users: readDB().users });
});

// 6. Withdraw
app.post('/api/withdraw', (req, res) => {
    const { email, amount, method, accountTitle, accountNumber } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (user.balance < amount) return res.json({ success: false, error: "Low Balance" });

    user.balance -= Number(amount);
    user.withdrawals.unshift({ id: Date.now(), amount, method, accountTitle, accountNumber, status: "Pending", date: new Date().toLocaleString() });
    writeDB(db);
    res.json({ success: true, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server Shield Active on Port ${PORT}`));
