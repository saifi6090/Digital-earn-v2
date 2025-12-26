const express = require('express'); // Only one declaration to prevent crash
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- DATABASE SETUP ---
const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], withdrawals: [] }, null, 2));
}

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// --- ROUTES ---

// 1. Serve the Interface (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Auth: Register (Signup Interface)
app.post('/api/register', (req, res) => {
    const { email, password, otp } = req.body;
    const db = readDB();
    
    // OTP Check (Using your provided payment info) [cite: 2025-12-25]
    if (otp !== "ACTIVATE2025") { 
        return res.status(400).json({ message: "Invalid OTP. Pay to 03707340477 first." }); 
    }

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: "User already exists." });
    }

    const newUser = { 
        email, 
        password, 
        balance: 0, 
        taskIncome: 0, 
        refIncome: 0, 
        team: 0, 
        refCode: "DE-" + Math.floor(1000 + Math.random() * 9000) 
    };
    
    db.users.push(newUser);
    writeDB(db);
    res.json({ message: "Account Created!", user: newUser });
});

// 3. Auth: Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    res.json({ message: "Success", user });
});

// 4. Task Reward Logic [cite: 2025-12-24]
app.post('/api/complete-task', (req, res) => {
    const { email } = req.body;
    let db = readDB();
    let user = db.users.find(u => u.email === email);
    
    if (user) {
        user.balance += 10;
        user.taskIncome += 10;
        writeDB(db);
        return res.json({ newBalance: user.balance });
    }
    res.status(404).json({ message: "User not found" });
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
