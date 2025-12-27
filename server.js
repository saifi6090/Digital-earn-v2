const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize Database structure if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], withdrawals: [] }, null, 2));
}

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// --- 1. REGISTRATION WITH "LOCKED" STATUS ---
app.post('/api/register', (req, res) => {
    const { email, password, name } = req.body;
    let db = readDB();

    if (db.users.find(u => u.email === email)) return res.status(400).json({ message: "Email already registered" });

    const newUser = {
        name,
        email,
        password,
        isVerified: false, // Must verify email first
        isPaid: false,     // Admin must approve payment to unlock tasks
        balance: 0,
        paymentDetails: null, // Saved in Settings
        tasksCompletedToday: 0,
        lastTaskDate: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    writeDB(db);
    res.json({ message: "Registration successful. Please verify email.", user: newUser });
});

// --- 2. ADMIN APPROVAL LOGIC (The Trust Builder) ---
// Use this to unlock a user after they pay Rs. 1000
app.post('/api/admin/approve-user', (req, res) => {
    const { email, adminKey } = req.body;
    if (adminKey !== "SUPER_SECRET_KEY_2025") return res.status(403).json({ message: "Unauthorized" });

    let db = readDB();
    let user = db.users.find(u => u.email === email);
    if (user) {
        user.isPaid = true;
        writeDB(db);
        return res.json({ message: `User ${email} is now ACTIVE.` });
    }
    res.status(404).json({ message: "User not found" });
});

// --- 3. TASK LOGIC WITH 12 PM RESET ---
app.post('/api/complete-task', (req, res) => {
    const { email } = req.body;
    let db = readDB();
    let user = db.users.find(u => u.email === email);

    if (!user.isPaid) return res.status(403).json({ message: "Tasks Locked. Pay registration fee first." });

    const today = new Date().toISOString().split('T')[0];
    
    // Reset tasks if it's a new day
    if (user.lastTaskDate !== today) {
        user.tasksCompletedToday = 0;
        user.lastTaskDate = today;
    }

    if (user.tasksCompletedToday >= 10) {
        return res.status(400).json({ message: "Daily limit reached. Resets at 12:00 PM." });
    }

    user.balance += 20; // Example: Rs. 20 per video
    user.tasksCompletedToday += 1;
    writeDB(db);

    res.json({ message: "Task Complete!", balance: user.balance, remaining: 10 - user.tasksCompletedToday });
});

// --- 4. WITHDRAWAL WITH RS. 1000 LIMIT ---
app.post('/api/withdraw', (req, res) => {
    const { email, amount } = req.body;
    let db = readDB();
    let user = db.users.find(u => u.email === email);

    if (amount < 1000) return res.status(400).json({ message: "Minimum withdrawal is Rs. 1000" });
    if (user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    user.balance -= amount;
    db.withdrawals.push({ email, amount, date: new Date(), status: "Pending" });
    writeDB(db);

    res.json({ message: "Withdrawal request submitted for approval." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Global Engine Active on Port ${PORT}`));
