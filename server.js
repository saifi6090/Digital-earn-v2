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
// WITHDRAWAL REQUEST ROUTE
app.post('/api/withdraw', async (req, res) => {
    const { email, amount, number } = req.body;
    try {
        // 1. Check if user has enough balance
        const user = await pool.query('SELECT balance, is_active FROM users WHERE email = $1', [email]);
        const userData = user.rows[0];

        if (!userData.is_active) return res.status(403).json({ error: "Account not active" });
        if (userData.balance < amount) return res.status(400).json({ error: "Insufficient balance" });
        if (amount < 1000) return res.status(400).json({ error: "Minimum withdrawal is 1000 PKR" });

        // 2. Subtract balance from user
        await pool.query('UPDATE users SET balance = balance - $1 WHERE email = $1', [amount, email]);

        // 3. Log the request (Optional: You can create a 'withdrawals' table later)
        console.log(`WITHDRAWAL REQUEST: ${email} requested ${amount} PKR to number ${number}`);

        res.json({ success: true, message: "Request sent to admin!" });
    } catch (e) { res.status(500).json({ error: "Withdrawal failed" }); }
});
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

// TASK COMPLETION ROUTE
app.post('/api/tasks/complete', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const userData = user.rows[0];

        if (!userData.is_active) return res.status(403).json({ error: "Activate account first" });
        if (userData.tasks_completed >= 10) return res.status(400).json({ error: "Daily limit reached" });

        // Update balance by 10 PKR and increment task count
        await pool.query(
            'UPDATE users SET balance = balance + 10, tasks_completed = tasks_completed + 1 WHERE email = $1',
            [email]
        );

        res.json({ success: true, message: "10 PKR added to your wallet!" });
    } catch (e) { res.status(500).json({ error: "Task failed" }); }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running...'));
