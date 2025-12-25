const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DB_FILE = path.join(__dirname, 'database.json');

// Auto-create database if missing
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

const PLANS = {
    1: { name: "Basic", daily_tasks: 10, per_task: 10 },
    2: { name: "Silver", daily_tasks: 20, per_task: 15 },
    3: { name: "Gold", daily_tasks: 30, per_task: 20 }
};

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/register', (req, res) => {
    const { email, password, level } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.json({ success: false, error: "User exists" });
    const newUser = {
        email, password, balance: 0, level: Number(level) || 1, 
        is_active: false, daily_count: 0, last_task_date: "", withdrawals: []
    };
    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user });
    else res.json({ success: false, error: "Invalid credentials" });
});

app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !user.is_active) return res.json({ success: false, error: "Account Inactive" });
    const plan = PLANS[user.level || 1];
    const today = new Date().toLocaleDateString();
    if (user.last_task_date !== today) { user.daily_count = 0; user.last_task_date = today; }
    if (user.daily_count >= plan.daily_tasks) return res.json({ success: false, error: "Limit reached" });
    user.balance += plan.per_task;
    user.daily_count += 1;
    writeDB(db);
    res.json({ success: true, new_balance: user.balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
