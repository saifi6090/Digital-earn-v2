// Add these Plan definitions at the top
const PLANS = {
    1: { name: "Basic", fee: 700, daily_tasks: 10, per_task: 10 },
    2: { name: "Silver", fee: 1500, daily_tasks: 20, per_task: 15 },
    3: { name: "Gold", fee: 2500, daily_tasks: 30, per_task: 20 }
};

// Update Task API
app.post('/api/task', (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user.is_active) return res.json({ success: false, error: "Upgrade to a Plan first!" });

    const plan = PLANS[user.level || 1];
    
    // Check if daily limit reached
    const today = new Date().toLocaleDateString();
    if (user.last_task_date === today && user.daily_count >= plan.daily_tasks) {
        return res.json({ success: false, error: `Daily limit of ${plan.daily_tasks} tasks reached!` });
    }

    // Update count
    if (user.last_task_date !== today) {
        user.daily_count = 0;
        user.last_task_date = today;
    }

    user.balance += plan.per_task;
    user.daily_count += 1;
    
    writeDB(db);
    res.json({ success: true, new_balance: user.balance, remaining: plan.daily_tasks - user.daily_count });
});
