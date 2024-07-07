require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const connectDB = require("./db/db");
const User = require("./models/usermodel");
const Register = require("./models/registerModel");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

app.use(cors());

app.use(express.json());

connectDB();

app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check for existing user
  const existingUser = await Register.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // Create new user
  const user = new Register({
    firstName,
    lastName,
    email,
    password,
  });

  try {
    const savedUser = await user.save();
    res
      .status(201)
      .json({ message: "User created successfully!", user: savedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check for missing fields
  if (!email || !password) {
    return res.status(400).json({ message: "Please enter email and password" });
  }

  try {
    // Find user by email
    const user = await Register.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" }); // Unauthorized
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" }); // Unauthorized
    }

    // Generate JWT token
    const payload = { userId: user._id }; // Include user ID in payload
    const secret = "tmdto"; // Replace with a strong, environment variable-stored secret
    const token = jwt.sign(payload, secret, { expiresIn: "1h" }); // Token expires in 1 hour

    res.json({ message: "Login successful!", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/addUser", async (req, res) => {
  const {
    firstName,
    lastName,
    gender,
    dob,
    bloodGroup,
    maritalStatus,
    email,
    mobileNo,
    note,
  } = req.body;

  try {
    // Create a new user instance
    const newUser = new User({
      firstName,
      lastName,
      gender,
      dob,
      bloodGroup,
      maritalStatus,
      email,
      mobileNo,
      note,
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    res
      .status(201)
      .json({ message: "User added successfully", user: savedUser });
  } catch (err) {
    console.error("Error saving user:", err.message);
    res.status(500).json({ message: "Failed to add user" });
  }
});

app.post("/updateUser/:id", async (req, res) => {
  const userId = req.params.id;
  const {
    firstName,
    lastName,
    gender,
    dob,
    bloodGroup,
    maritalStatus,
    email,
    mobileNo,
    note,
  } = req.body;

  try {
    // Find the user by ID
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.gender = gender;
    user.dob = dob;
    user.bloodGroup = bloodGroup;
    user.maritalStatus = maritalStatus;
    user.email = email;
    user.mobileNo = mobileNo;
    user.note = note;

    // Save updated user
    const updatedUser = await user.save();

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err.message);
    res.status(500).json({ message: "Failed to update user" });
  }
});

app.delete("/deleteUser/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID and delete
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully", user: deletedUser });
  } catch (err) {
    console.error("Error deleting user:", err.message);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.get("/viewAllUsers", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/viewUser/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await Register.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_ADDRESS,
    subject: "Password Reset OTP",
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
           Your OTP is: ${otp}\n\n
           If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error("Error sending email:", err);
      return res
        .status(500)
        .json({ message: "Error sending email", error: err.message });
    }
    res.status(200).json({ message: "OTP sent to your email" });
  });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const user = await Register.findOne({ email });

  if (
    !user ||
    user.resetPasswordOtp !== otp ||
    user.resetPasswordExpires < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.resetPasswordOtp = null;
  user.resetPasswordExpires = null;
  await user.save();

  res
    .status(200)
    .json({ message: "OTP verified, you can now reset your password" });
});

app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await Register.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.password = newPassword; // Make sure to hash the password before saving it
  await user.save();

  res.status(200).json({ message: "Password has been reset successfully" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
