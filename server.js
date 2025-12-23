const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: 'postgres://frankfurt:P6ROik1jn232QPYNfiN9P8iwrekgroq5@dpg-d50osmhr0fns73904lf0-a/digitalearn',
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(process.env.PORT || 3000, () => console.log('Ready'));
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

// Initialize Database Tables
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
        console.log("Database tables are ready.");
    } catch (err) { console.error("Database Error:", err); }
}
initDB();

// Signup Route
app.post('/api/signup', async (req, res) => {
    const { email, password, ref } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const myRefCode = Math.random().toString(36).substring(2, 8);
        await pool.query(
            'INSERT INTO users (email, password, referral_code, referred_by) VALUES ($1, $2, $3, $4)',
            [email, hashedPassword, myRefCode, ref || null]
        );
        res.json({ success: true, message: "Registered! Please Login." });
    } catch (e) { res.status(400).json({ error: "Email already exists" }); }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                return res.json({ success: true, user: { email: user.email, is_active: user.is_active, balance: user.balance } });
            }
        }
        res.status(401).json({ error: "Invalid credentials" });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(process.env.PORT || 3000, () => console.log('Server running...'));
