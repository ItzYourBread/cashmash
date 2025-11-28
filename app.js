require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const passport = require('passport');
const i18n = require("i18n"); 
const connectDB = require('./config/db');
const aviatorController = require('./controllers/aviatorController');

const app = express();
connectDB();

// Passport
require('./config/passport')(passport);

// Rakeback Job
require('./cron/rakebackJob');

// --- i18n Configuration ---
i18n.configure({
    locales: ['en'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    cookie: null, 
    register: global, 
    queryParameter: 'lang', 
    syncFiles: true 
});
app.use(i18n.init);

// Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- CORS ---
const cors = require('cors');
app.use(cors({
  origin: [
    'https://cashmash.onrender.com', 
    'https://cashmash.watchnsfw.com',
    'https://visionary-mermaid-550163.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://0.0.0.0:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'cashmashsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// --- Language Utilities ---
const languageMap = { 'en': 'English' };
function getLangName(langCode) { return languageMap[langCode] || 'English'; }

app.use((req, res, next) => {
    const lang = req.session.lang || 'en';
    req.setLocale(lang); 
    res.locals.currentLang = lang;
    res.locals.getLangName = getLangName;
    res.locals.user = req.user || null;
    next();
});

app.get('/set-language', (req, res) => {
    const { lang, redirect } = req.query;
    if (Object.keys(languageMap).includes(lang)) {
        req.session.lang = lang;
        req.setLocale(lang); 
    }
    const redirectTo = redirect ? decodeURIComponent(redirect) : '/';
    req.session.save(() => { res.redirect(redirectTo); });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/user'));
app.use('/', require('./routes/game'));
app.use('/', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));

// HTTP + Socket.IO
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.set('io', io);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// --- REAL-TIME CONNECTION LOGIC ---
io.on('connection', (socket) => {
    
    // 1. Get Real Count & Broadcast to Everyone
    const onlineCount = io.engine.clientsCount;
    io.emit('updateOnlineCount', onlineCount);

    // 2. Handle Disconnect (Update count when user leaves)
    socket.on('disconnect', () => {
        const newCount = io.engine.clientsCount;
        io.emit('updateOnlineCount', newCount);
    });

    // --- Existing Aviator Logic ---
    socket.on('placeBet', (data, ack) => {
        aviatorController.socketPlaceBet(socket, data, ack);
    });

    socket.on('cashOut', (data, ack) => {
        aviatorController.socketCashOut(socket, data, ack);
    });
});

aviatorController.initAviator(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));