// config/nodemailer.js
const nodemailer = require('nodemailer');

// ⚠️ IMPORTANT: Load these credentials from your .env file
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;       
const SMTP_USER = process.env.SMTP_EMAIL; 
const SMTP_PASS = process.env.SMTP_PASS; 

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465, 
    auth: {
        user: SMTP_USER, 
        pass: SMTP_PASS, 
    }
});

module.exports = transporter;