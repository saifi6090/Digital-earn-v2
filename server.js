const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = './database.json';
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// 1. REGISTRATION & LOGIN (Point 1)
app.post('/api/auth', (req, res) => {
    const { email, password, type, name } = req.body;
    let db = readDB();
    if (type === 'register') {
        if (db.users.find(u => u.email === email)) return res.status(400).send("User exists");
        const newUser = { name, email, password, isPaid: false, balance: 0, history: [], status: 'Pending' };
        db.users.push(newUser);
        writeDB(db);
        // Point 3: In a real server, this triggers the Email API. 
        return res.json({ message: "Verification Code Sent to " + email, user: newUser });
    }
    const user = db.users.find(u => u.email === email && u.password === password);
    user ? res.json(user) : res.status(401).send("Invalid Credentials");
});

// 10. ADMIN SYSTEM (Accept Payments/Withdraws)
app.get('/api/admin/data', (req, res) => res.json(readDB()));
app.post('/api/admin/approve', (req, res) => {
    const { email, action } = req.body; // action: 'pay' or 'withdraw'
    let db = readDB();
    let user = db.users.find(u => u.email === email);
    if (action === 'pay') user.isPaid = true;
    writeDB(db);
    res.send("Updated");
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000);
