import { sql,poolPromise } from "../../db.js";

/* ================= CREATE BRANCH ================= */

export const createBranchMasterService = async (data) => {
    try {
        const pool = await poolPromise;
        console.log("Branch Data received:", data);
        const result = await pool
            .request()
            .input("BranchID",sql.Int,data.branchid || null)
            .input("BranchName", sql.NVarChar(64), data.branchname || null)
            .input("ShortName",sql.NVarChar(8),data.shortname || null)
            .input("OnAcID", sql.Int, data.onacid || null)
            .input("CurrencyCode", sql.NVarChar(16), data.currencycode || null)
            .input("InvPrefix",sql.NVarChar(16),data.invprefix || null)
            .input("Address", sql.NVarChar(250), data.address || null)
            .input("Remarks", sql.NVarChar(250), data.remarks || null)
            .input("Pincode", sql.NVarChar(10), data.pincode || null)
            .input("Place",sql.NVarChar(64),data.place || null)
            .input("ContactPerson",sql.NVarChar(64),data.contactperson || null)
            .input("ContactNo",sql.Numeric,data.contactno || null)
            .input("EmailID",sql.NVarChar(64),data.emailid || null)
            .input("Gst_StateCode",sql.Int,data.gst_statecode || null)
            .input("CUID", sql.Int, data.cuid || null)
            .input("CDT", sql.DateTime, data.cdt || null)
            .input("MUID", sql.Int, data.muid || null)
            .input("MDT", sql.DateTime, data.mdt || null)
            .input("Status", sql.NVarChar(8), data.status || null)
            .input("Bank", sql.NVarChar(64), data.bank || null)
            .input("Gst_No", sql.NVarChar(20), data.gstno || null)
            .input("Gst_Date", sql.DateTime,data.gst_date || null)
            .execute("Usp_BranchMaster_IN");

            return result.recordset[0];
    } catch (error) {
        console.error("Branch Master Insert Error:", error);
        throw error;
    }
};
/* ================= UPDATE BRANCH DATA ================= */
export const updateBranchMasterService =async (branchid,data)=>{
    try{
        const pool=await poolPromise;
    const result = await pool
            .request()
            .input("BranchID",sql.Int,branchid || null)
            .input("BranchName", sql.NVarChar(64), data.branchname || null)
            .input("ShortName",sql.NVarChar(8),data.shortname || null)
            .input("OnAcID", sql.Int, data.onacid || null)
            .input("CurrencyCode", sql.NVarChar(16), data.currencycode || null)
            .input("InvPrefix",sql.NVarChar(16),data.invprefix || null)
            .input("Address", sql.NVarChar(250), data.address || null)
            .input("Remarks", sql.NVarChar(250), data.remarks || null)
            .input("Pincode", sql.NVarChar(10), data.pincode || null)
            .input("Place",sql.NVarChar(64),data.place || null)
            .input("ContactPerson",sql.NVarChar(64),data.contactperson || null)
            .input("ContactNo",sql.Numeric,data.contactno || null)
            .input("EmailID",sql.NVarChar(64),data.emailid || null)
            .input("Gst_StateCode",sql.Int,data.gst_statecode || null)
            .input("CUID", sql.Int, data.cuid || null)
            .input("CDT", sql.DateTime, data.cdt || null)
            .input("MUID", sql.Int, data.muid || null)
            .input("MDT", sql.DateTime, data.mdt || null)
            .input("Status", sql.NVarChar(8), data.status || null)
            .input("Bank", sql.NVarChar(64), data.bank || null)
            .input("Gst_No", sql.NVarChar(20), data.gstno || null)
            .input("Gst_Date", sql.DateTime,data.gst_date || null)
            .execute("Usp_BranchMaster_UP");

            return result.recordset[0]
    }catch(error){
        console.error("Branch Record Update Error:"+error)
        throw error;
    }
}

/* ================= GET ALL BRANCH DATA ================= */
export const getAllBranchMasterService =async (query)=>{
 const pool = await poolPromise;
 const page = parseInt(query.page||1);
 const limit =parseInt(query.limit||100);
 const offset= (page-1)*limit;

const result = await pool
.request()
.input("offset", sql.Int, offset)
.input("limit", sql.Int, limit).
query(`
      SELECT *
      FROM BranchMaster
      ORDER BY BranchID DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
   return result.recordset;
}

/* ================= GET BRANCH BY ID ================= */
export const getBranchByIDService = async (BranchID)=>{
    try{
     const pool =await poolPromise;
     const result =await pool.request().input("BranchID",sql.Int,BranchID)
     .execute("Usp_BranchMaster_GET");
     return result.recordset[0];
    }catch(error){
        console.error("Get Branch By ID  Service Error:", error);
        throw error;
    }
};

/* ================= DELETE BRANCH  ================= */
export const deleteBranchMasterService =async (BranchID)=>{
    try{
        const pool =await poolPromise;
        const result=await pool.request().input("BranchID",sql.Int,BranchID)
        .execute("Usp_BranchMaster_Delete");
        return result.recordset[0];
    }
    catch(error){
        console.error("Branch Delete Erorr:",error);
        throw error;
    }
}





