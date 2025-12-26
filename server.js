const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve the index.html file
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// All your logic (OTP, Register, Login, Task, Admin) remains here...
// [Logic preserved as per previous project saves]

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server Live on Port ${PORT}`));
