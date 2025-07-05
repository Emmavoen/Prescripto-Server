// api for adding doctors
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import Doctor from "../models/doctorsModel.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      experience,
      degree,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !experience ||
      !degree ||
      !about ||
      !fees ||
      !address
    ) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    // validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    // validate password strength
    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({ message: "Password is not strong enough" });
    }

    //hashing password
    const hashedPassword = await bcrypt.hash(password, 10);

    //upload image to cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctor = await Doctor.create({
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      experience,
      degree,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    });
    res.status(201).json({ message: "Doctor added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//API for admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      return res.status(200).json({ token });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
