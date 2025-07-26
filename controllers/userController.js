import validator from "validator";
import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorsModel.js";
import appointmentModel from "../models/appointmentModel.js";
import razorpay from "razorpay";
import paystackClient from "../config/paystackClient.js";
//api to register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all the fields" });
    }
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password should be at least 8 characters long",
      });
    }
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const userData = await userModel.findById(userId).select("-password");
    res.status(200).json({ success: true, userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, phone, address, dob, gender } = req.body;
    const imageFile = req.file;
    if (!name && !email && !phone && !address && !dob && !gender) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill at least one field" });
    }

    await userModel.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        address: JSON.parse(address),
        dob,
        gender,
      },
      { new: true }
    );
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      await userModel.findByIdAndUpdate(userId, {
        image: imageUpload.secure_url,
      });
    }
    res.status(200).json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { docId, slotDate, slotTime } = req.body;

    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData.available) {
      return res
        .status(200)
        .json({ success: false, message: "Doctor is not available" });
    }
    let slots_booked = docData.slots_booked;
    // checking for slot availability
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res
          .status(200)
          .json({ success: false, message: "Slot already booked" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }
    const userData = await userModel.findById(userId).select("-password");
    delete docData.slots_booked;

    const appointments = {
      userId,
      docId,
      slotDate,
      slotTime,
      userData,
      docData,
      date: Date.now(),
      amount: docData.fees,
    };
    const newAppointment = new appointmentModel(appointments);
    await newAppointment.save();
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.status(200).json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    const appointments = await appointmentModel.find({ userId });
    // .populate("docId");
    res.status(200).json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.userId;
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData.userId !== userId) {
      return res
        .status(400)
        .json({ success: false, message: "You are not authorized" });
    }
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });
    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const docData = await doctorModel.findById(docId).select("-password");
    let slots_booked = docData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (time) => time !== slotTime
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.status(200).json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payWithPaystack = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res
        .status(200)
        .json({ success: false, message: "Appointment ID is required" });
    }
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.status(200).json({
        success: false,
        message: "Appointment cancelled or  not found",
      });
    }
    console.log();
    const response = await paystackClient.post("/transaction/initialize", {
      amount: appointmentData.amount * 100,
      email: appointmentData.userData.email,

      callback_url: `${process.env.CLIENT_BASE_URL}/paystack/verify?appointmentId=${appointmentId}`,
    }); // loalhost://5123/tickets/verify?appointementId=1234&reference=rtssdoq3

    res.status(200).json({
      success: true,
      authorizationUrl: response.data.data.authorization_url,
    });
  } catch (error) {
    console.error(error?.response?.data);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPaystackPayment = async (req, res) => {
  try {
    console.log("entered verifyPaystackPayment");
    const { reference, appointmentId } = req.body;
    const response = await paystackClient.get(
      `/transaction/verify/${reference}`
    );
    if (response.data.data.status === "success") {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        payment: true,
      });
      res.status(200).json({ success: true, message: "Payment successful" });
    } else {
      res.status(200).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
