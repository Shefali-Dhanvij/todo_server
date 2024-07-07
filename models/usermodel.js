const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    dob: {
      type: Date,
      required: false,
    },
    bloodGroup: {
      type: String,
      required: false,
      // enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    maritalStatus: {
      type: String,
      required: false,
      // enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    mobileNo: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Please fill a valid mobile number"],
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // automatically add createdAt and updatedAt fields
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
