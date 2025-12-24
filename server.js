const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// DATABASE FILE (Simple JSON file to store users)
const DB_FILE = 'database.json';

// Helper: Read Database
function readDB() {
    if (!fs.existsSync(DB_FILE)) return { users: [] };
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
}

// Helper: Write Database
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. SERVE HTML (The Face)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. REGISTER API
app.post('/api/register', (req, res) => {
    const { email, password, referral_by } = req.body;
    const db = readDB();
    
    // Check if user exists
    if (db.users.find(u => u.email === email)) {
        return res.json({ success: false, error: "User already exists!" });
    }

    // Create new user
    const newUser = {
        email,
        password, // In a real app, you should encrypt this!
        balance: 0,
        referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referral_by: referral_by || null,
        referral_income: 0,
        task_income: 0,
        is_active: false, // User must pay 700 PKR to activate
        joined_at: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, user: newUser });
});

// 3. LOGIN API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, error: "Invalid Email or Password" });
    }
});

// 4. TASK API (Earn 10 PKR)
app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) return res.json({ success: false, error: "User not found" });
    if (!user.is_active) return res.json({ success: false, error: "Account not active" });

    // Add Balance
    user.balance += 10;
    user.task_income = (user.task_income || 0) + 10;
    
    writeDB(db);
    res.json({ success: true, new_balance: user.balance });
});

// 5. WITHDRAW API
app.post('/api/withdraw', (req, res) => {
    const { email, amount, number } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) return res.json({ success: false, error: "User not found" });
    if (user.balance < amount) return res.json({ success: false, error: "Insufficient Balance" });

    // Deduct Balance
    user.balance -= Number(amount);
    
    // Log the withdrawal (Optional: You could save this to a 'withdrawals' array)
    console.log(`WITHDRAW REQUEST: ${email} wants ${amount} PKR to ${number}`);

    writeDB(db);
    res.json({ success: true, new_balance: user.balance });
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
