const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

// 1. DATABASE SETUP
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance DECIMAL DEFAULT 0.00,
                is_active BOOLEAN DEFAULT false,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                tasks_completed INTEGER DEFAULT 0,
                last_task_date DATE DEFAULT CURRENT_DATE
            );
        `);
        console.log("Database ready.");
    } catch (err) { console.error("DB Error:", err); }
}
initDB();

// 2. AUTH ROUTES
app.post('/api/signup', async (req, res) => {
    const { email, password, ref } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const code = Math.random().toString(36).substring(2, 8);
        await pool.query(
            'INSERT INTO users (email, password, referral_code, referred_by) VALUES ($1, $2, $3, $4)',
            [email, hashed, code, ref || null]
        );
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Email exists" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0 && await bcrypt.compare(password, result.rows[0].password)) {
        return res.json({ success: true, user: result.rows[0] });
    }
    res.status(401).json({ error: "Wrong credentials" });
});

// 3. TASK & WITHDRAW ROUTES
app.post('/api/tasks/complete', async (req, res) => {
    const { email } = req.body;
    await pool.query('UPDATE users SET balance = balance + 10, tasks_completed = tasks_completed + 1 WHERE email = $1 AND tasks_completed < 10', [email]);
    res.json({ success: true });
});

app.post('/api/withdraw', async (req, res) => {
    const { email, amount, number } = req.body;
    const user = await pool.query('SELECT balance FROM users WHERE email = $1', [email]);
    if (user.rows[0].balance >= amount && amount >= 1000) {
        await pool.query('UPDATE users SET balance = balance - $1 WHERE email = $2', [amount, email]);
        console.log(`WITHDRAW: ${email} to ${number} amount ${amount}`);
        return res.json({ success: true });
    }
    res.status(400).json({ error: "Invalid request" });
});

// 4. ADMIN APPROVAL
app.get('/api/admin/approve', async (req, res) => {
    const { email, secret } = req.query;
    if (secret !== "Saif_786") return res.status(403).send("Wrong Secret");
    const result = await pool.query('UPDATE users SET is_active = true WHERE email = $1 RETURNING referred_by', [email]);
    if (result.rows[0]?.referred_by) {
        await pool.query('UPDATE users SET balance = balance + 70 WHERE referral_code = $1', [result.rows[0].referred_by]);
    }
    res.send("User Activated!");
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(process.env.PORT || 3000);
