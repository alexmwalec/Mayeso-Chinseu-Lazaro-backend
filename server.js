require("dotenv").config();

const express = require("express");
const cors = require("cors");
const  nodemailer = require('express');
const { use } = require("react");


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL
  })
);
app.use(express.json());

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth: {
  user:process.env.EMAIL_USER,
  pass:process.env.EMAIL_PASS,
  },
})

app.get("/", (req, res) => {
  res.send("Backend is okay");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});