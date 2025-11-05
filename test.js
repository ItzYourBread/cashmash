// send_test_email.js
const nodemailer = require('nodemailer');
// require('dotenv').config(); // Uncomment if you are using a .env file

// ----------------------------------------------------------------------
// ⚠️ 1. CONFIGURE YOUR REAL NAMECHEAP SMTP CREDENTIALS HERE
// ----------------------------------------------------------------------
const SMTP_HOST = 'mail.privateemail.com'; // Or your cPanel mail server hostname
const SMTP_PORT = 465;                     // Usually 465 (SSL) or 587 (TLS)
const SMTP_USER = 'noreply@watchnsfw.com'; // Your sending email address (must be created on Namecheap)
const SMTP_PASS = 'Q0YvBKycVljNuIbM'; 
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// ⚠️ 2. CONFIGURE THE TEST EMAIL DETAILS
// ----------------------------------------------------------------------
const SENDER_EMAIL = SMTP_USER;
const RECEIVER_EMAIL = 'md9005876@gmail.com'; 
// ----------------------------------------------------------------------


// Create the Transporter
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465, // true for 465, false for 587
    auth: {
        user: SMTP_USER, 
        pass: SMTP_PASS, 
    }
});

/**
 * Sends a test email to the specified receiver.
 */
async function sendTestEmail() {
    console.log(`Attempting to connect to SMTP server: ${SMTP_HOST}:${SMTP_PORT}...`);

    try {
        // 1. Verify Connection (optional but recommended)
        await transporter.verify();
        console.log("✅ SMTP Server connection verified. Sending email...");

        // 2. Send the Mail
        const info = await transporter.sendMail({
            from: `"Node.js Test Mailer" <${SENDER_EMAIL}>`, // Sender address
            to: RECEIVER_EMAIL, // Receiver address
            subject: "🚀 Nodemailer Test Success: Integration Confirmed!", // Subject line
            html: `
                <div style="font-family:sans-serif;padding:20px;background:#1e1e1e;color:#e0e0e0;border-radius:8px;">
                    <h2 style="color:#4CAF50;">Congratulations!</h2>
                    <p>This email was successfully sent using your Namecheap domain's SMTP server.</p>
                    <p>The Nodemailer configuration is correct and ready for integration into your deposit approval process.</p>
                    <table style="margin-top: 15px; color: #e0e0e0;">
                        <tr>
                            <td style="font-weight: bold; padding-right: 10px;">Sent From:</td>
                            <td>${SENDER_EMAIL}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; padding-right: 10px;">Server:</td>
                            <td>${SMTP_HOST}</td>
                        </tr>
                    </table>
                </div>
            `, // HTML body
        });

        console.log(`\n🎉 Success! Test email sent to ${RECEIVER_EMAIL}`);
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Preview URL (if available): ${nodemailer.getTestMessageUrl(info)}`);
        
    } catch (error) {
        console.error("\n❌ FAILED TO SEND EMAIL:");
        console.error("   Error Message:", error.message);
        console.error("\nPossible issues:");
        console.log("1. Check SMTP_HOST, SMTP_PORT, and 'secure' setting.");
        console.log("2. Ensure SMTP_USER and SMTP_PASS are correct.");
        console.log("3. Your hosting provider might require you to enable remote SMTP access.");
        console.log("4. Check your firewall settings if running locally.");
    }
}

sendTestEmail();