const express = require('express');
const fs = require('fs');
const EventEmitter = require('events');
const path = require('path');

const app = express();
const PORT = 3000;

// file paths
const usersFile = path.join(__dirname, 'users.json');
const auditFile = path.join(__dirname, 'audit.log');

// middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// file helper fns

function readUsers() {
    const data = fs.readFileSync(usersFile, 'utf-8');

    if (!data.trim()) {
        return [];
    }

    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(
        usersFile,
        JSON.stringify(users, null, 2),
        'utf-8'
    );
}


// EventEmitter


const userEvents = new EventEmitter();

// sgnup event
userEvents.on('signup', (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] SIGNUP: New account created for ${user.name} (${user.email})\n`;

    fs.appendFileSync(auditFile, message, 'utf-8');

    console.log(message.trim());
});

// login event
userEvents.on('login', (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] LOGIN: User authenticated - ${user.name} (${user.email})\n`;

    fs.appendFileSync(auditFile, message, 'utf-8');

    console.log(message.trim());
});

// sign up

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please fill in all fields.'
        });
    }

    const users = readUsers();

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: 'An account with this email already exists.'
        });
    }

    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);

    saveUsers(users);

    // trigger signup event
    userEvents.emit('signup', newUser);

    res.status(201).json({
        success: true,
        message: 'Account created successfully!'
    });
});

// login

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please enter your email and password.'
        });
    }

    const users = readUsers();

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password.'
        });
    }

    // trigger login event
    userEvents.emit('login', user);

    res.json({
        success: true,
        message: 'Login successful!',
        name: user.name
    });
});

// start server

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});