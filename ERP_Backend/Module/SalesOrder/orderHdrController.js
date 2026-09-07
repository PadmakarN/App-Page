import{
    getAllOrdersHdrService
} from "./orderHdrService.js";

/* ================= GET ALL ORDERS ================= */
export const getAllorders = async (req,res)=>{
    try{
        const data = await getAllOrdersHdrService(req.query);
        res.status(200).json(data);
    }
    catch(error){
        console.error("GET ORDERS ERROR:",error);
        res.status(500).json({
            message:"Error fetching orders",
            error:error.message
        });
    }
}