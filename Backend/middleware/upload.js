const multer = require('multer');

//comment below if vercel
const fs = require('fs');
const path = require('path');

const uploadFolder = path.join(__dirname, '../uploads');

// // comment if vercel
// if (!fs.existsSync(uploadFolder)) {
//     fs.mkdirSync(uploadFolder, { recursive: true });
// }

// // comment if vercel
// const storage = multer.diskStorage({
//     destination: (_req, _file, cb) => {
//         cb(null, uploadFolder);
//     },
//     filename: (_req, file, cb) => {
//         const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//         cb(null, `${uniqueSuffix}-${file.originalname}`);
//     }
// });

// const upload = multer({ storage });

// module.exports = upload;