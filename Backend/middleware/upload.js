const multer = require('multer');
// const fs = require('fs');
// const path = require('path');

// const uploadFolder = path.join(__dirname, '../uploads');

// // Ensure the uploads folder exists
// if (!fs.existsSync(uploadFolder)) {
//     fs.mkdirSync(uploadFolder, { recursive: true });
// }

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, uploadFolder);
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//         cb(null, uniqueSuffix + '-' + file.originalname);
//     }
// });

const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;