const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = './database.json';
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

if (!fs.existsSync(DB_FILE)) {
    writeDB({ users: [], globalStats: { joins: 0, payouts: 0 } });
}

// AUTH & OTP SYSTEM
app.post('/api/auth/otp', (req, res) => {
    // Logic for sending OTP to Gmail (Simulated for security)
    res.json({ success: true, message: "OTP Sent to Gmail" });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, referredBy } = req.body;
    let db = readDB();
    if (db.users.find(u => u.email === email)) return res.status(400).send("Email exists");
    
    const newUser = {
        name, email, password, referredBy,
        isPaid: false, plan: 'none', balance: 0, 
        tasksDone: 0, history: [], lastReset: new Date().toLocaleDateString()
    };
    db.users.push(newUser);
    writeDB(db);
    res.json(newUser);
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = readDB().users.find(u => u.email === email && u.password === password);
    user ? res.json(user) : res.status(401).send("Invalid Credentials");
});

// AUTO-WALLET & 10% REFERRAL LOGIC
app.post('/api/tasks/complete', (req, res) => {
    const { email } = req.body;
    let db = readDB();
    let user = db.users.find(u => u.email === email);
    
    const plans = { '700': { limit: 10, pay: 7 }, '1500': { limit: 20, pay: 10 }, '2500': { limit: 30, pay: 15 } };
    const config = plans[user.plan];

    if (user.tasksDone < config.limit) {
        user.balance += config.pay;
        user.tasksDone += 1;
        
        // 10% Referral Bonus Auto-Added
        if (user.referredBy) {
            let upline = db.users.find(u => u.email === user.referredBy);
            if (upline) upline.balance += (config.pay * 0.10);
        }
        writeDB(db);
        res.json({ balance: user.balance, tasksDone: user.tasksDone });
    } else {
        res.status(400).send("Limit reached");
    }
});

// ADMIN BLOCK (PRIVATE)
app.post('/api/admin/approve', (req, res) => {
    const { email, plan, adminKey } = req.body;
    if (adminKey !== "1122") return res.status(403).send("Wrong Key");
    let db = readDB();
    let user = db.users.find(u => u.email === email);
    if (user) {
        user.isPaid = true;
        user.plan = plan;
        writeDB(db);
        res.send("Approved");
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000);
