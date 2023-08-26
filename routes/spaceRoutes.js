const express = require('express');
const { check } = require('express-validator');

const spaceController = require('../controllers/spaceController');
const authController = require('./../controllers/authController');
const spaceUpload = require('../middlewares/space-upload');

const router = express.Router();

router.get('/', spaceController.getAllSpaces);

router.get('/cat-spaces/:subcatId', authController.protect, spaceController.getSpacesBySubcatId);

router.get('/single_space/:sid', authController.protect, spaceController.getSingleSpace);

router.get('/space/:uid', spaceController.getUserSpaces);

router.post('/area-spaces', [
    check('address').not().isEmpty(),
], spaceController.areaSpaces);

router.post('/filter-spaces', [
    check('lng').isFloat().not().isEmpty(),
    check('lat').isFloat().not().isEmpty(),
], spaceController.filterSpaces);

router.post('/change-availability',
    authController.protect,
    [
        check('spaceId').not().isEmpty(),
        check('availability').isBoolean().not().isEmpty(),
    ],
    spaceController.changeAvailability
)

router.post('/add_space', authController.protect, spaceUpload.any('space_imgs'), [
    check('userId').not().isEmpty(),
    check('categoryId').not().isEmpty(),
    check('subCategoryId').not().isEmpty(),
    check('area').isString().not().isEmpty(),
    check('contact').isString().not().isEmpty(),
    check('security').optional({ checkFalsy: true }).isString().not().isEmpty(),
    check('cameras').isString().not().isEmpty(),
    check('ownerSite').isString().not().isEmpty(),
    check('paidStaff').isString().not().isEmpty(),
    check('paidSecurity').isString().not().isEmpty(),
    check('climateControl').isString().not().isEmpty(),
    check('capacity').isString().not().isEmpty(),
    check('fuel').optional({ checkFalsy: true }).isString().not().isEmpty(),
    check('rate_hour').isInt().not().isEmpty(),
    check('rate_day').isInt().not().isEmpty(),
    check('rate_week').isInt().not().isEmpty(),
    check('rate_month').isInt().not().isEmpty(),
    check('location').isString().not().isEmpty(),
    check('description').isString().not().isEmpty(),
], spaceController.addNewSpace);

router.post('/add_review', authController.protect, spaceUpload.any('space_imgs'), [
    check('userId').not().isEmpty(),
    check('spaceId').not().isEmpty(),
    check('review').isString().not().isEmpty(),
    check('rating').isDecimal().not().isEmpty(),
], spaceController.addReview);

router.patch('/update_space/:spaceId', authController.protect, spaceUpload.any('space_imgs'), [
    check('category').isString().isIn(['Truck', 'Car', 'Warehouse', 'Storage']).withMessage('Enter correct category value').not().isEmpty(),
    check('area').isString().not().isEmpty(),
    check('contact').isString().not().isEmpty(),
    check('security').optional({ checkFalsy: true }).isString().not().isEmpty(),
    check('cameras').isString().not().isEmpty(),
    check('capacity').isString().not().isEmpty(),
    check('fuel').optional({ checkFalsy: true }).isString().not().isEmpty(),
    check('rate_hour').isInt().not().isEmpty(),
    check('rate_day').isInt().not().isEmpty(),
    check('rate_week').isInt().not().isEmpty(),
    check('rate_month').isInt().not().isEmpty(),
    check('location').isString().not().isEmpty(),
    check('description').isString().not().isEmpty(),
], spaceController.updateSpace);

router.delete('/delete-space/:sid', spaceController.deleteSpace)

module.exports = router;