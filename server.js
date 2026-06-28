require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(
  cors({
    origin: "https://mayeso-lazalo-academic-researcher.vercel.app",
  })
);
app.use(express.json());

const PORT = process.env.PORT || 5000;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
app.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: email,
      to: process.env.OWNER_EMAIL,
      subject: `Website Contact: ${subject}`,
      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Email error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running!`");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});