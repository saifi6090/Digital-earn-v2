// Add this near the top of server.js
let verificationCodes = {}; // Stores { email: "123456" } temporarily

// ENDPOINT: Send Verification Code
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, error: "Email required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = code;

    // In a real professional app, you'd use 'nodemailer' here to email the code.
    // For now, we will log it to the console so you can see it.
    console.log(`[SECURITY] Verification code for ${email}: ${code}`);
    
    res.json({ success: true, message: "Code sent to email!" });
});

// [UPDATE] Register Endpoint with OTP Check
app.post('/api/register', (req, res) => {
    const { email, password, level, otp } = req.body;
    
    // Check if OTP matches
    if (!verificationCodes[email] || verificationCodes[email] !== otp) {
        return res.json({ success: false, error: "Invalid or expired verification code" });
    }

    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.json({ success: false, error: "Email already registered" });

    const newUser = {
        email, password, level,
        balance: 0, is_active: false, daily_count: 0,
        referralCode: "REF" + Math.random().toString(36).substring(7).toUpperCase(),
        history: [], withdrawals: []
    };

    db.users.push(newUser);
    delete verificationCodes[email]; // Clear code after use
    writeDB(db);
    res.json({ success: true, user: newUser });
});
