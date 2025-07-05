import jwt from "jsonwebtoken";
import "dotenv/config";

// Middleware to authenticate admin users
export const authAdmin = async (req, res, next) => {
  try {
    // const token = req.headers.authorization.split(" ")[1];
    const { atoken } = req.headers;
    if (!atoken) {
      return res.status(401).json({ message: "Not Authorized. Login Again" });
    }
    const decoded = jwt.verify(atoken, process.env.JWT_SECRET);
    if (decoded === process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
      next();
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
