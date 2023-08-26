const express = require('express');
const { check } = require('express-validator');

const vehicleController = require('../controllers/vehicleController');
const authController = require('../controllers/authController');
const vehicleUpload = require('../middlewares/vehicle-upload');

const router = express.Router();

router.get('/', authController.protect, vehicleController.getAllVehicles);

router.get('/single-vehicle/:sid', authController.protect, vehicleController.getSingleVehicle);

router.get('/user/:uid', authController.protect, vehicleController.getUserVehicles);

router.delete('/:vid', authController.protect, vehicleController.deleteVehicle);

router.post('/add_vehicle', authController.protect, vehicleUpload.any('vehicle_imgs'), [
    check('userId').not().isEmpty(),
    check('company').not().isEmpty(),
    check('model').not().isEmpty(),
    check('type').isString().not().isEmpty(),
    check('regiterNo').isString().not().isEmpty(),
    check('drivingLicenseNo').isString().not().isEmpty()
], vehicleController.addNewVehicle);

router.patch('/update_vehicle/:vehicleId', authController.protect, vehicleUpload.any('vehicle_imgs'), [
    check('userId').not().isEmpty(),
    check('company').not().isEmpty(),
    check('model').not().isEmpty(),
    check('type').isString().not().isEmpty(),
    check('regiterNo').isString().not().isEmpty(),
    check('drivingLicenseNo').isString().not().isEmpty()
], vehicleController.updateVehicle);



module.exports = router;