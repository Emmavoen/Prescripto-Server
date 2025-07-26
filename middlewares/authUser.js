import jwt from "jsonwebtoken";
import "dotenv/config";

// Middleware to authenticate users
export const authUser = async (req, res, next) => {
  try {
    // const token = req.headers.authorization.split(" ")[1];
    const { token } = req.headers;
    if (!token) {
      return res.status(401).json({ message: "Not Authorized. Login Again" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
