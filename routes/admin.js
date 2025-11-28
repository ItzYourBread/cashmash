// routes/admin.js
const express = require('express');
const router = express.Router();
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const transporter = require('../config/nodemailer'); // 👈 Import the configured transporter

// ⚠️ Configuration: Define your SECRET API Key
const ADMIN_API_KEY = '41F89E1A2D9439B3A1CDA16D643A4';

// --- API Key Authentication Function (Internal) ---
const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({ message: 'Unauthorized: Invalid or missing API Key.' });
    }
    next();
};

/* ------------------------------------
   Helper Function: Send Deposit Success Mail (Luxury Theme)
   ------------------------------------ */
const sendDepositSuccessEmail = async (userEmail, amount, method) => {
    try {
        await transporter.sendMail({
            from: `"CashMash Deposits" <${process.env.SMTP_EMAIL || 'security@yourdomain.com'}>`,
            to: userEmail,
            subject: '✅ Deposit Approved: Money Credited to Your Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #333; border-radius: 12px; overflow: hidden; background-color: #000; color: #f0f0f0; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);">
                    
                    <div style="background-color: #f5c542; padding: 15px 25px; text-align: center;">
                        <h1 style="color: #000; margin: 0; font-size: 24px;">CashMash</h1>
                    </div>
                    
                    <div style="padding: 25px;">
                        <h2 style="color: #4CAF50; margin-top: 0; font-size: 20px;">Deposit Approved!</h2>
                        <p style="font-size: 14px; line-height: 1.5;">
                            Your recent deposit request has been successfully approved. The money are now credited to your account, ready for use!
                        </p>
                        
                        <table style="width: 100%; margin: 20px 0; border-collapse: separate; border-spacing: 0; background-color: #1a1a1a; border-radius: 8px;">
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542; border-bottom: 1px solid #333;">Amount:</td>
                                <td style="padding: 10px; border-bottom: 1px solid #333; color: #4CAF50; font-weight: bold;">$${amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542; border-bottom: 1px solid #333;">Method:</td>
                                <td style="padding: 10px; border-bottom: 1px solid #333;">${method}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542;">Status:</td>
                                <td style="padding: 10px; color: #4CAF50; font-weight: bold;">COMPLETED</td>
                            </tr>
                        </table>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #aaa;">Happy gaming!</p>
                    </div>
                    
                    <div style="background-color: #111; padding: 10px 25px; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">CashMash Security & Deposits</p>
                    </div>
                </div>
            `,
        });
        console.log(`Deposit success email sent to ${userEmail}`);
    } catch (mailErr) {
        console.error('Deposit notification email failed:', mailErr);
    }
};

/* ------------------------------------
   Helper: First-Time Deposit + Bonus Email
   ------------------------------------ */
const sendFirstDepositBonusEmail = async (userEmail, amount, bonusAmount, method) => {
    try {
        await transporter.sendMail({
            from: `"CashMash Rewards" <${process.env.SMTP_EMAIL || 'security@yourdomain.com'}>`,
            to: userEmail,
            subject: '🎁 Welcome Bonus Activated – 100% First Deposit Matched!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #333; border-radius: 12px; overflow: hidden; background-color: #000; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    
                    <div style="background-color: #4CAF50; padding: 15px 25px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 26px;">CashMash Welcome Bonus</h1>
                    </div>

                    <div style="padding: 25px;">
                        <h2 style="color: #f5c542; margin-top: 0; font-size: 20px;">Your First Deposit is Boosted!</h2>
                        <p style="font-size: 15px; line-height: 1.5;">
                            Thank you for making your first deposit at CashMash.  
                            As a part of our welcome reward, we have matched your first deposit <b>100%</b>.
                        </p>

                        <table style="width: 100%; margin: 20px 0; background-color: #1a1a1a; border-radius: 8px;">
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542;">Deposit Amount:</td>
                                <td style="padding: 10px; color: #4CAF50; font-weight: bold;">$${amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542;">Bonus Added:</td>
                                <td style="padding: 10px; color: #4CAF50; font-weight: bold;">$${bonusAmount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542;">Method:</td>
                                <td style="padding: 10px;">${method}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #f5c542;">Status:</td>
                                <td style="padding: 10px; color: #4CAF50; font-weight: bold;">COMPLETED + BONUS APPLIED</td>
                            </tr>
                        </table>

                        <p style="font-size: 14px; color: #bbb;">Enjoy your boosted balance and good luck!</p>
                    </div>

                    <div style="background-color: #111; padding: 10px 25px; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">CashMash Rewards Team</p>
                    </div>
                </div>
            `,
        });

        console.log(`First deposit bonus email sent to ${userEmail}`);
    } catch (error) {
        console.error("First deposit bonus email failed:", error);
    }
};


/* =====================================
   🔹 GET PENDING DEPOSITS (GET) - SECURED
   ===================================== */
router.get('/deposits/pending', checkApiKey, async (req, res) => {
    try {
        // Fetch ALL pending deposits. Filtering happens on the client side (agent panel).
        const pendingDeposits = await Deposit.find({ status: 'Pending' })
            .populate('user', 'username email phone')
            .sort({ createdAt: 1 });

        return res.json({
            message: `All pending deposits fetched.`,
            count: pendingDeposits.length,
            deposits: pendingDeposits
        });

    } catch (error) {
        console.error('Error fetching deposits:', error);
        return res.status(500).json({ message: 'Internal server error while fetching deposits.' });
    }
});


/* =====================================
   🔹 UPDATE DEPOSIT STATUS (POST) - SECURED
   ===================================== */
router.post('/deposit/update-status', checkApiKey, async (req, res) => {
    const {
        depositId,
        status,
        agentName,
        agentContact // Passed from the Agent Panel
    } = req.body;

    if (!depositId || !status || !agentName || !agentContact) {
        return res.status(400).json({ message: 'Missing required fields (depositId, status, agentName, agentContact).' });
    }

    const validStatuses = ['Completed', 'Failed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status provided.` });
    }

    try {
        const deposit = await Deposit.findById(depositId);
        if (!deposit) return res.status(404).json({ message: 'Deposit not found.' });
        if (deposit.status !== 'Pending') {
            return res.status(400).json({ message: `Deposit status is '${deposit.status}'. Only 'Pending' deposits can be processed.` });
        }

        let chipsCredited = false;
        const userId = deposit.user;

        // 5a. Update User's Deposit Subdocument Status
        await User.updateOne(
            { "_id": userId, "deposits._id": depositId },
            { "$set": { "deposits.$.status": status } }
        );

        // 5b. If Completed, Credit Chips + Check First Deposit Bonus
        if (status === 'Completed') {
            const user = await User.findById(userId);

            if (!user) {
                console.error(`User ID ${userId} not found for deposit ${depositId}`);
                deposit.status = 'Failed';
                deposit.agentName = 'SYSTEM_ERROR';
                await deposit.save();
                return res.status(500).json({ message: 'Associated user not found, Deposit set to Failed.' });
            }

            // CREDIT NORMAL DEPOSIT
            await user.addChips(deposit.amount);
            chipsCredited = true;

            // CHECK FOR PREVIOUS COMPLETED DEPOSITS
            const previousCompleted = user.deposits.some(
                d => d.status === 'Completed' && d._id.toString() !== depositId.toString()
            );

            // FIRST TIME BONUS
            if (!previousCompleted) {
                const bonus = deposit.amount; // 100% match
                user.balance += bonus;
                await user.save();

                console.log(`🎁 100% First Deposit Bonus Applied: +$${bonus}`);

                // SEND FIRST-TIME BONUS EMAIL
                if (user.email) {
                    await sendFirstDepositBonusEmail(
                        user.email,
                        deposit.amount,
                        bonus,
                        deposit.method
                    );
                }
            } else {
                // SEND NORMAL SUCCESS EMAIL
                if (user.email) {
                    sendDepositSuccessEmail(user.email, deposit.amount, deposit.method);
                }
            }
        }

        // 6. Update Main Deposit Document
        deposit.status = status;
        deposit.agentName = agentName;
        deposit.agentContact = agentContact; // 👈 Ensure this is saved on the Deposit model
        await deposit.save();

        // 7. Response
        return res.json({
            message: `Deposit ${depositId} status updated to ${status}. User history updated.`,
            deposit: deposit,
            chipsCredited: chipsCredited
        });

    } catch (error) {
        console.error('Error processing deposit update:', error);
        return res.status(500).json({ message: 'Internal server error during deposit processing. Data consistency risk.' });
    }
});

module.exports = router;