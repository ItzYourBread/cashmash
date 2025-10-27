// app.js

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

// --- i18n Configuration ---
i18n.configure({
    locales: ['en', 'bn', 'hi'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    // setting cookie name to null to use session instead
    cookie: null, 
    // Register the translation function 't' as a helper in EJS templates
    register: global, 
    queryParameter: 'lang', // For initial setting via URL (optional)
    syncFiles: true 
});
app.use(i18n.init); // Initialize i18n middleware

// Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
const languageMap = {
    'en': 'English',
    'bn': 'বাংলা',
    'hi': 'हिन्दी'
};
function getLangName(langCode) {
    return languageMap[langCode] || 'English'; // Default to English
}

// --- Language Detection Middleware ---
app.use((req, res, next) => {
    const lang = req.session.lang || 'en';
    
    // Set the language for the current request using i18n
    req.setLocale(lang); 
    
    // Make variables available to all EJS templates
    res.locals.currentLang = lang;
    res.locals.getLangName = getLangName;
    res.locals.user = req.user || null;
    
    // The translation function __() is now available globally (or as res.locals.__)

    next();
});

// --- Language Setting Route ---
app.get('/set-language', (req, res) => {
    const { lang, redirect } = req.query;

    if (Object.keys(languageMap).includes(lang)) {
        // 1. Set the language preference in the session
        req.session.lang = lang;
        // 2. Also set the locale for the current request to ensure instant change
        req.setLocale(lang); 
    }

    // Redirect the user back to the page they were on
    const redirectTo = redirect ? decodeURIComponent(redirect) : '/';
    req.session.save(() => {
        res.redirect(redirectTo);
    });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/user'));
app.use('/', require('./routes/game'));

// HTTP + Socket.IO
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Share io in controllers
app.set('io', io);

// Wrap session for Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket.IO connection
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId || (socket.request.session.passport && socket.request.session.passport.user);
  if (userId) socket.join(userId);
  console.log('🟢 User connected:', userId);
});

// Start Aviator loop
aviatorController.initAviator(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));