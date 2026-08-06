const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for active OTP codes and agent accounts
const otpStore = new Map();
const agentPasswords = new Map([
  ['karanamharish93@gmail.com', '123456'],
  ['adithya@gmail.com', '123456'],
  ['naveen@gmail.com', '123456']
]);

// Configure Gmail SMTP Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

transporter.verify((error) => {
  if (error) {
    console.error('[SMTP SETUP ERROR] Check Gmail App Password & User:', error);
  } else {
    console.log('[SMTP READY] Google Mail Server connected successfully!');
  }
});

// Endpoint: Send OTP to any Gmail Address
app.post('/api/send-otp', async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid Gmail address is required.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  const subjectText = purpose === 'RESET' 
    ? 'Dairy Vision - Password Reset OTP' 
    : 'Dairy Vision - Verification OTP Code';

  const mailOptions = {
    from: `"Dairy Vision Portal" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: subjectText,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f4f7f6; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1b4332;">
        <h2 style="color: #1b4332; text-align: center; margin-bottom: 5px;">Dairy Vision Center</h2>
        <p style="text-align: center; color: #555; font-size: 14px; margin-top: 0;">Palamaner Collection Station, Chittoor AP</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
        <p style="font-size: 15px; color: #333;">Hello,</p>
        <p style="font-size: 15px; color: #333;">Your 6-digit One-Time Password (OTP) for <strong>${purpose || 'Verification'}</strong> is:</p>
        <div style="text-align: center; background: #1b4332; color: #ffb703; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">Developed by: K Harish, N Adithya, and A Naveen</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] OTP email sent to: ${email}`);
    res.json({ success: true, message: `OTP code sent to ${email}` });
  } catch (error) {
    console.error('[SMTP ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email via SMTP.' });
  }
});

// Endpoint: Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP required.' });
  }

  const storedData = otpStore.get(email.toLowerCase());

  if (!storedData) {
    return res.status(400).json({ success: false, message: 'No OTP requested for this email.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'OTP has expired. Request a new code.' });
  }

  if (storedData.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your Gmail.' });
  }

  otpStore.delete(email.toLowerCase());
  res.json({ success: true, message: 'Gmail OTP verified successfully!' });
});

// Endpoint: Agent Password Reset
app.post('/api/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and new password required.' });
  }

  agentPasswords.set(email.toLowerCase(), newPassword);
  res.json({ success: true, message: 'Agent password successfully reset!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`[SERVER ONLINE] Dairy Vision Backend running on http://localhost:${PORT}`);
  console.log(`=================================================`);
});