// [NEW] Admin Action: Activate User
app.post('/api/admin/activate', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (user) {
        user.is_active = true;
        writeDB(db);
        res.json({ success: true, message: "Account Activated!" });
    } else res.json({ success: false, error: "User not found" });
});

// [NEW] Admin Action: Approve Withdrawal
app.post('/api/admin/approve-withdraw', (req, res) => {
    const { email, withdrawId } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (user) {
        const req = user.withdrawals.find(w => w.id === withdrawId);
        if (req) {
            req.status = "Success";
            writeDB(db);
            res.json({ success: true });
        }
    }
});

// [NEW] Admin: Get All Data
app.get('/api/admin/all-users', (req, res) => {
    const db = readDB();
    res.json({ success: true, users: db.users });
});
