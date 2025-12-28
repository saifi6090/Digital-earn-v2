const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = './database.json';

// Initialize DB
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], reviews: [] }, null, 2));
}

const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// OTP GATEWAY (Registration Only)
app.post('/api/auth/send-otp', (req, res) => {
    const { email } = req.body;
    // Simulate OTP generation (In production, connect to Nodemailer)
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log(`OTP for ${email}: ${otp}`); 
    res.json({ success: true, message: "OTP sent to " + email });
});

// REGISTRATION
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, referral, otp } = req.body;
    let db = getDB();
    if (db.users.find(u => u.email === email)) return res.status(400).send("User exists");

    const newUser = {
        name, email, password, referral,
        balance: 0, isPaid: false, plan: 'none', tasksDone: 0,
        wallet: { name: '', number: '', method: '' },
        history: [], joinedDate: new Date().toLocaleDateString()
    };
    db.users.push(newUser);
    saveDB(db);
    res.json(newUser);
});

// LOGIN (No OTP needed)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = getDB().users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).send("Invalid email or password");
    res.json(user);
});

// AUTO-EARN & 10% REFERRAL LOGIC
app.post('/api/tasks/claim', (req, res) => {
    const { email } = req.body;
    let db = getDB();
    let user = db.users.find(u => u.email === email);
    
    const config = { '700': { pay: 7, lim: 10 }, '1500': { pay: 10, lim: 20 }, '2500': { pay: 15, lim: 30 } };
    const plan = config[user.plan];

    if (user.tasksDone < plan.lim) {
        user.balance += plan.pay;
        user.tasksDone += 1;
        
        // 10% Referral Bonus
        if (user.referral) {
            let upline = db.users.find(u => u.email === user.referral);
            if (upline) upline.balance += (plan.pay * 0.10);
        }
        saveDB(db);
        res.json({ balance: user.balance, tasksDone: user.tasksDone });
    } else {
        res.status(400).send("Daily Limit Reached");
    }
});

// ADMIN ACTIONS
app.post('/api/admin/verify', (req, res) => {
    const { targetEmail, plan, key } = req.body;
    if (key !== "1122") return res.status(403).send("Forbidden");
    let db = getDB();
    let user = db.users.find(u => u.email === targetEmail);
    if (user) {
        user.isPaid = true;
        user.plan = plan;
        saveDB(db);
        res.send("User Plan Activated");
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure Server Live on Port ${PORT}`));
