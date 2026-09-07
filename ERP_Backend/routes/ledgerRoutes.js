import express from "express";
import {
  getLedgers,
  getLedger,
  createLedger,
  updateLedger,
  deleteLedger
} from "../controllers/ledgerController.js";
import { createLedgerService } from "../Services/ledgerService.js";

const router = express.Router();
router.post("/",(req,res,next)=>{
  next();
},createLedger)

router.get("/", getLedgers); // GET all ledgers
router.get("/:id", getLedger); // GET single ledger
router.post("/", createLedger); // CREATE ledger
router.post("/:id", updateLedger); // UPDATE ledger
router.delete("/:id", deleteLedger); // DELETE ledger

export default router;
