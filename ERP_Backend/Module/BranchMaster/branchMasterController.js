import{
    getAllBranchMasterService,
    createBranchMasterService,
    getBranchByIDService,
    updateBranchMasterService,
    deleteBranchMasterService
} from "./branchMasterService.js";

/* ================= GET ALL ORDERS ================= */
export const getAllBranches = async (req,res)=>{
    try{
        const data = await getAllBranchMasterService(req.query);
        res.status(200).json(data);
    }
    catch(error){
        console.error("GET BRANCH ERROR:",error);
        res.status(500).json({
            message:"Error fetching orders",
            error:error.message
        });
    }
}

/*================Create Branch =========================*/
export const createBranch = async (req,res)=>{
    try{
        const data = await createBranchMasterService(req.body);
        res.status(200).json(data);
    }
    catch(error){
        console.error("CREATE BRANCH ERROR:",error);
        res.status(500).json({
            message:"Error To Crate Branch",
            error:error.message
        });
    }
}

/*================Update  Branch =========================*/
export const updateBranch =async (req,res)=>{
    try{
        const data= await updateBranchMasterService(req.params.id,req.body)
        res.status(200).json(data);
    }catch(error){
        console.error("Update Branch Error ",error)
        res.status(500).json({
            message:"Error To Update Branch",
            error:error.message
        })
    }
}
/*================Delete Branch =========================*/
export const deleteBranch = async (req,res)=>{
    try{
        const data=await deleteBranchMasterService(req.params.id)
        res.status(200).json(data);
    }
    catch(error){
        console.error("Delete Branch Error ",error)
        res.status(500).json({
            message:"Error To Delete Branch",
            error:error.message
        })
    }
}

/*================Create Branch BYID=========================*/
export const getBranch =async (req,res)=>{
  try{
     const branch =await getBranchByIDService(req.params.id);
      if(!branch){
        return res.status(404).json({
        message: "Branch not found"
      });
      }
      res.status(200).json(branch);
  }catch (error) {
    console.error("GET LEDGER ERROR:", error);

    res.status(500).json({
      message: "Error fetching ledger",
      error: error.message
    });
  }
}

/*================Create Branch BYID=========================*/
export const DeleteBranch =async (req,res)=>{
  try{
     const branch =await updateBranchMasterService(req.params.id);
      if(!branch){
        return res.status(404).json({
        message: "Branch not found"
      });
      }
      res.status(200).json(branch);
  }catch (error) {
    console.error("GET LEDGER ERROR:", error);

    res.status(500).json({
      message: "Error fetching ledger",
      error: error.message
    });
  }
}