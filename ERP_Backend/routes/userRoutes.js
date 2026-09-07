import express from "express";
import {
  createUser,
  getUserById,
  updateUser,
  getUsers,
  deleteUser
} from "../controllers/userController.js";
import { createUploader } from "../middleware/upload.js";
const upload = createUploader("uploads/UserMaster");
const router = express.Router();

router.post("/", upload.single("image"), createUser);
router.get("/:userid", getUserById);
router.put("/:userid", upload.single("image"), updateUser);
router.get("/", getUsers);
router.delete("/:id", deleteUser);

export default router;