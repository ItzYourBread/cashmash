require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const passport = require('passport');
const connectDB = require('./config/db');
const aviatorController = require('./controllers/aviatorController');

const app = express();
connectDB();

// Passport
require('./config/passport')(passport);

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

// User in all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
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
