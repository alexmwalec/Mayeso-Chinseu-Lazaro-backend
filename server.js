require("dotenv").config();

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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true, // Use pooled connections
  maxConnections: 1,
  rateDelta: 1000,
  rateLimit: 5,
});

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Server running!!",
  });
});

// Contact Form Route
app.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("Email Error:", error);
    
    // Send more specific error message
    let errorMessage = "Failed to send message";
    if (error.code === 'EAUTH') {
      errorMessage = "Email authentication failed. Please check your credentials.";
    } else if (error.code === 'ECONNECTION' || error.code === 'EDNS') {
      errorMessage = "Network connection issue. Please try again later.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});