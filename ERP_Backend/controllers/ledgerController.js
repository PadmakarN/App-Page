import {
  createLedgerService,
  getLedgerByIdService,
  updateLedgerService,
  getLedgersService,
  deleteLedgerService
} from "../Services/ledgerService.js";

/* ================= GET ALL LEDGERS ================= */
export const getLedgers = async (req, res) => {
  try {
    const data = await getLedgersService(req.query);
    res.status(200).json(data);
  } catch (error) {
    console.error("GET LEDGERS ERROR:", error);
    res.status(500).json({
      message: "Error fetching ledgers",
      error: error.message
    });
  }
};

/* ================= GET LEDGER BY ID ================= */
export const getLedger = async (req, res) => {
  try {
    const ledger = await getLedgerByIdService(req.params.id);
    if (!ledger) {
      return res.status(404).json({
        message: "Ledger not found"
      });
    }
    res.status(200).json(ledger);

  } catch (error) {
    console.error("GET LEDGER ERROR:", error);

    res.status(500).json({
      message: "Error fetching ledger",
      error: error.message
    });
  }
};

/* ================= CREATE LEDGER ================= */
export const createLedger = async (req, res) => {
  try {
    const result = await createLedgerService(req.body);
    res.status(201).json({
      message: "Ledger created successfully",
      data: result
    });

  } catch (error) {
    console.error("CREATE LEDGER ERROR:", error);
    res.status(500).json({
      message: "Error creating ledger",
      error: error.message
    });
  }
};

/* ================= UPDATE LEDGER ================= */
export const updateLedger = async (req, res) => {
  try {
    const result = await updateLedgerService(req.params.id, req.body);
    res.status(201).json({
      message: "Ledger updated successfully",
      data: result
    });

  } catch (error) {
    console.error("UPDATE LEDGER ERROR:", error);

    res.status(500).json({
      message: "Error updating ledger",
      error: error.message
    });
  }
};

/* ================= DELETE LEDGER ================= */
export const deleteLedger = async (req, res) => {
  try {
  
    const result = await deleteLedgerService(req.params.id);

    res.status(200).json({
      message: "Ledger deleted successfully",
      data: result
    });

  } catch (error) {
    console.error("DELETE LEDGER ERROR:", error);

    res.status(500).json({
      message: "Error deleting ledger",
      error: error.message
    });
  }
};
