const fileUpload = require('../middlewares/docs-upload');
const profileUpload = require('../middlewares/profile-upload');
const driverProfileUpload = require('../middlewares/driverProfile-upload');
const multer = require('multer');
exports.photoUpload = (req, res, next) => {
  console.log(req.user.role);
  if (req.user.role === 'Storage Owner') {
    fileUpload.single('c_docs')(req, res, err => {
      if (
        err instanceof multer.MulterError &&
        err.code === 'LIMIT_UNEXPECTED_FILE'
      ) {
        err = null;
      }
      next(err);
    });
  }
  else if (req.user.role === 'Truck Driver') {
    driverProfileUpload.single('driver_img')(req, res, err => {
      if (
        err instanceof multer.MulterError &&
        err.code === 'LIMIT_UNEXPECTED_FILE'
      ) {
        err = null;
      }
      next(err);
    });
  }
}