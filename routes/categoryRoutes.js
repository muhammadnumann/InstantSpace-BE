const express = require('express');
const { check } = require('express-validator');
const categoryController = require('../controllers/categoryController');
// const authController = require('../controllers/authController');

const router = express.Router();
router
  .route('/')
  .get(categoryController.getAllcategory)
  .post([
    check('name').not().isEmpty(),
    check('subcategories.*.name').not().isEmpty()
  ], categoryController.createcategory);

router.get('/specific', categoryController.getRoleCategory);

router
  .route('/:id')
  .get(categoryController.getcategory)
  .patch([
    check('name').not().isEmpty(),
    check('subcategories.*.name').not().isEmpty()
  ], categoryController.Updatecategory)
  .delete(categoryController.deletecategory);

// sub category
router
  .route('/subcategory/addSubcategory')
  .put(categoryController.addSubcategory);
router
  .route('/subcategory/update')
  .put(categoryController.updateSubcategory);
router
  .route('/subcategory/:cat_id/:sub_cat_id')
  .delete(categoryController.deleteSubcategory);

module.exports = router;