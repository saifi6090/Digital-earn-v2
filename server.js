app.post('/api/withdraw', (req, res) => {
    const { email, amount, number } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) return res.json({ success: false, error: "User not found" });
    if (user.balance < amount) return res.json({ success: false, error: "Insufficient Balance" });

    // Deduct Balance
    user.balance -= Number(amount);

    // NEW: Add to History List
    if(!user.withdrawals) user.withdrawals = [];
    user.withdrawals.unshift({
        date: new Date().toLocaleDateString(),
        amount: amount,
        status: "Pending" // You can change this to 'Paid' via admin later
    });

    writeDB(db);
    res.json({ success: true, new_balance: user.balance, user: user });
});
