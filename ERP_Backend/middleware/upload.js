import multer from "multer";
import path from "path";
import fs from "fs";

// ensure upload folder exists
const createFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// dynamic storage function
export const createUploader = (folderName = "uploads") => {
  const uploadPath = path.join(process.cwd(), folderName);

  createFolder(uploadPath);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  };

  return multer({ storage, fileFilter });
};