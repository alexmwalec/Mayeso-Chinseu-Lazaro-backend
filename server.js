require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY); 

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(
  cors({
    origin: process.env.CLIENT_URL
  })
);

const PORT = process.env.PORT || 5000;

app.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: process.env.OWNER_EMAIL,
      subject: `Website Contact: ${subject}`,
      reply_to: email,
      html: `
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Message:</b><br/>${message}</p>
      `,
    });

    res.json({
      success: true,
      message: "Message sent successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is okay");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});