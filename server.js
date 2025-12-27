const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'database.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }));
}

// Helper to read/write database
const getDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// 1. Register/Login Route
app.post('/api/auth', (req, res) => {
    const { email, password, name, type } = req.body;
    let db = getDB();

    if (type === 'register') {
        if (db.users.find(u => u.email === email)) return res.status(400).json({ error: "Email exists" });
        const newUser = { name, email, password, balance: 0, isPaid: false, withdrawDetails: {} };
        db.users.push(newUser);
        saveDB(db);
        return res.json(newUser);
    } else {
        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    }
});

// 2. Admin: Get All Users
app.get('/api/admin/users', (req, res) => {
    res.json(getDB().users);
});

// 3. Admin: Approve Payment
app.post('/api/admin/approve', (req, res) => {
    const { email } = req.body;
    let db = getDB();
    const user = db.users.find(u => u.email === email);
    if (user) {
        user.isPaid = true;
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
