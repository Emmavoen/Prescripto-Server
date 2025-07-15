import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
//app config
const app = express();
const port = process.env.PORT || 5000;
connectDB();
connectCloudinary();

//middleware
app.use(cors());
app.use(express.json());

//routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
// localhost:5000/api/admin/add-doctor
app.get("/", (req, res) => {
  res.status(200).send("API is running well");
});

//listen
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
