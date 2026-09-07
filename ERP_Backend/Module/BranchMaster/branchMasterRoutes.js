import express from "express"
import {getAllBranches,createBranch,getBranch,updateBranch, deleteBranch} from './branchMasterController.js'

const router =express.Router();
router.get("/",getAllBranches);
router.post("/", createBranch); // CREATE Branch
router.get("/:id", getBranch); // GET single Branch
router.post("/:id",updateBranch);//Update Branch
router.delete("/:id",deleteBranch);
export default router;