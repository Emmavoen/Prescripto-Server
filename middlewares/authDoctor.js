import jwt from "jsonwebtoken";
import "dotenv/config";

// Middleware to authenticate users
export const authDoctor = async (req, res, next) => {
  try {
    // const token = req.headers.authorization.split(" ")[1];
    const { dtoken } = req.headers;
    if (!dtoken) {
      return res.status(401).json({ message: "Not Authorized. Login Again" });
    }
    const decoded = jwt.verify(dtoken, process.env.JWT_SECRET);
    req.docId = decoded.id;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
