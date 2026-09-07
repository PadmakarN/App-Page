import express from "express";
import {
    getAllorders
}
from "./orderHdrController.js";

const router = express.Router();

router.get("/", getAllorders); // GET all orders

export default router;