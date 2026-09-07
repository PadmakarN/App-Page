import {
  createUserService,
  getUserByIdService,
  updateUserService,
  getUsersService,
  deleteUserService
} from "../Services/userService.js";

// CREATE
export const createUser = async (req, res) => {
  try {
    const result = await createUserService(req.body, req.file);
   res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY ID
export const getUserById = async (req, res) => {
  try {
    const result = await getUserByIdService(req.params.userid);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateUser = async (req, res) => {
  try {
    const result = await updateUserService(req.params.userid, req.body, req.file);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LIST
export const getUsers = async (req, res) => {
  try {
    const result = await getUsersService(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteUser = async (req, res) => {
  try {
    const result = await deleteUserService(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
