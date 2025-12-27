const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = './database.json';
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

if (!fs.existsSync(DB_FILE)) writeDB({ users: [], withdrawals: [], globalStats: { joins: 0, payouts: 0 } });

// AUTH & OTP SIMULATION
app.post('/api/auth/otp', (req, res) => {
    const { email } = req.body;
    // In production, use Nodemailer here. For launch, we simulate sending.
    res.json({ message: "OTP Sent to " + email });
});

app.post('/api/auth/final', (req, res) => {
    const { email, password, name, otp, type } = req.body;
    let db = readDB();
    if (type === 'register') {
        const user = { 
            name, email, password, plan: 'none', isPaid: false, 
            balance: 0, tasksDone: 0, wallet: {}, history: [] 
        };
        db.users.push(user);
        writeDB(db);
        return res.json(user);
    }
    const user = db.users.find(u => u.email === email && u.password === password);
    user ? res.json(user) : res.status(401).send("Error");
});

// ADMIN ONLY ACTIONS
app.post('/api/admin/verify-payment', (req, res) => {
    const { email, plan, secret } = req.body;
    if (secret !== "SUPER_ADMIN_2025") return res.status(403).send("Denied");
    let db = readDB();
    let user = db.users.find(u => u.email === email);
    if (user) {
        user.isPaid = true;
        user.plan = plan; // 700, 1500, or 2500
        writeDB(db);
        res.json({ success: true });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000);
