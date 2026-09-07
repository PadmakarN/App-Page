import { getMenu as getMenuModel } from "../models/menuModal.js";

const getMenu = async (req, res) => {
  try {
    const menuData = await getMenuModel(); // ✅ DIRECT function call

    res.status(200).json({
      success: true,
      menuData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"+error.message
    });
  }
};

export default getMenu;
