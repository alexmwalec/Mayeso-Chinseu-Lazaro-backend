require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // avoid Render's IPv6 routing issue

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: 'https://mayeso-lazalo-academic-researcher.vercel.app',
    credentials: true,
  })
);

app.use(express.json());

// Sanity-check required env vars at boot instead of failing silently later
const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "OWNER_EMAIL"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required env vars: ${missingEnvVars.join(", ")}`);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4, // force IPv4 - fixes ENETUNREACH/ETIMEDOUT on Render
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // fail fast (10s) instead of hanging
  greetingTimeout: 10000,
  socketTimeout: 10000,
  pool: true,
  maxConnections: 1,
  rateDelta: 1000,
  rateLimit: 5,
  logger: true,  // logs SMTP protocol exchange
  debug: true,   // verbose debug outputr
});

// Verify SMTP connection on startup so failures show up in logs immediately,
// not just when the first form submission comes in
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection verify FAILED:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });
  } else {
    console.log("SMTP connection verify SUCCESS - server ready to send emails");
  }
});

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Server running!!",
  });
});

// Diagnostic route - hit this manually to test SMTP without submitting the form
app.get("/debug/smtp", async (req, res) => {
  try {
    await transporter.verify();
    res.status(200).json({ success: true, message: "SMTP connection OK" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      code: error.code,
      command: error.command,
    });
  }
});

// Contact Form Route
app.post("/contact", async (req, res) => {
  const requestId = Date.now(); // simple correlation id for log tracing
  console.log(`[${requestId}] Contact form submission received`, {
    name: req.body?.name,
    email: req.body?.email,
    subject: req.body?.subject,
  });

  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      console.warn(`[${requestId}] Validation failed: missing fields`);
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn(`[${requestId}] Validation failed: invalid email`, email);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const mailOptions = {
      from: `"Website Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      replyTo: email,
      subject: `Website Contact: ${subject}`,
      text: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3>Message</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    };

    console.log(`[${requestId}] Attempting to send email...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${requestId}] Email sent successfully`, {
      messageId: info.messageId,
      response: info.response,
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error(`[${requestId}] Email Error:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      stack: error.stack,
    });

    let errorMessage = "Failed to send message";
    if (error.code === 'EAUTH') {
      errorMessage = "Email authentication failed. Please check your credentials.";
    } else if (error.code === 'ECONNECTION' || error.code === 'EDNS') {
      errorMessage = "Network connection issue. Please try again later.";
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      errorMessage = "Connection to email server timed out. Please try again later.";
    } else if (error.code === 'ENETUNREACH') {
      errorMessage = "Network routing issue reaching email server.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      code: error.code, // include in response temporarily while debugging
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});