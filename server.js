const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// I-serve ang mga static files
app.use(express.static(path.join(__dirname)));

let systemData = {
    clients: [
        {
            id: "ACC-10024",
            name: "ruby ferreras",
            phone: "09454197510",
            email: "rubyferreras37@gmail.com",
            area: "Cabatuan",
            plan: "Plan 1000",
            balance: 0.00,
            subDate: "2026-07-27",
            landmark: "near construction",
            status: "Active"
        },
        {
            id: "ACC-92236",
            name: "Stephanie Pajanostan",
            phone: "09123456789",
            email: "stephanie@gmail.com",
            area: "Cabatuan",
            plan: "Plan 1000",
            balance: 0.00,
            subDate: "2026-07-29",
            landmark: "Main Street",
            status: "Active"
        }
    ],
    expenses: [],
    payments: [],
    branches: ["Cabatuan", "Santa Potenciana", "Mapanas Main"]
};

// LOGIN API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'RJPLUS' && password === '123456789') {
        res.status(200).json({ success: true, message: 'Login successful!' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid email/username or password. Please try again.' });
    }
});

// GET DATA API
app.get('/api/data', (req, res) => {
    res.json(systemData);
});

app.listen(PORT, () => {
    console.log(`RJPLUS Node.js server is running on http://localhost:${PORT}`);
});