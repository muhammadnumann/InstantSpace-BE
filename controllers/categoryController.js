const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const Category = require('../models/categoryModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

const createcategory = catchAsync(async (req, res, next) => {
    const { name, subcategories, role } = req.body;
    const newcategory = new Category({
        name,
        subcategories,
        role
    });
    await newcategory.save();
    res.status(201).json({ message: 'category created successfully' });
});
const Updatecategory = catchAsync(async (req, res, next) => {
    const { name, subcategories, role } = req.body;
    const updateCategory = await Category.findByIdAndUpdate(
        req.params.id,
        { $set: { name, subcategories, role } },
        { new: true },)
    res.status(201).json({
        message: 'Update category successfully',
        category: updateCategory
    });
});
const getAllcategory = factory.getAll(Category)
const deletecategory = factory.deleteOne(Category)
const getcategory = factory.getOne(Category)

const usercategory = async (req, res, next) => {
    const uid = req.params.uid;

    let usercategory;
    try {
        usercategory = await category.find({ userId: uid });
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error fetching records', 500));
    };

    res.json({ usercategory });
};


/**
 * This function fetches category details by ID and returns them as a JSON response.
 * @param req - The req parameter is an object that represents the HTTP request made by the client. It
 * contains information about the request such as the request method, headers, URL, and parameters.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the `http.ServerResponse` class in Node.js. The `res` object has various methods
 * that can be used to send different types of responses such as JSON, HTML, text
 * @param next - `next` is a function that is used to pass control to the next middleware function in
 * the request-response cycle. It is typically used to handle errors or to move on to the next
 * middleware function in the chain. If an error occurs in the current middleware function, it can call
 * `next` with
 * @returns The function `categoryDetails` is returning a JSON response containing the category details
 * of a specific category ID. If the category ID is not found, it will return a 404 error. If there is an
 * error while fetching the record, it will return a 500 error.
 */
const categoryDetails = async (req, res, next) => {
    const sid = req.params.sid;

    let categoryDetails;
    try {
        categoryDetails = await category.findById(sid).populate("spaceId");
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error fetching record', 500));
    };

    if (!categoryDetails) {
        return next(new AppError('No category found against id', 404));
    }

    res.json({ categoryDetails });
};

const addSubcategory = catchAsync(async (req, res, next) => {
    const { cat_id, name } = req.body;
    const updateSubcategory = await Category.updateOne(
        { _id: cat_id },
        {
            $push: {
                subcategories: {
                    $each: [{ name: name }]
                }
            }
        },
        { new: true }
    )
    res.status(200).json({
        message: ' Added subcategory successfully',
    });
});
const updateSubcategory = catchAsync(async (req, res, next) => {
    const { cat_id, sub_cat_id, name } = req.body;
    const updateSubcategory = await Category.updateOne(
        { _id: cat_id, 'subcategories._id': sub_cat_id },
        { $set: { "subcategories.$.name": name } },
        { new: true }
    )
    res.status(201).json({
        message: ' updated subcategory successfully',
    });
});

const deleteSubcategory = catchAsync(async (req, res, next) => {
    const cat_id = req.params.cat_id;
    const sub_cat_id = req.params.sub_cat_id;
    const deleteCategory = await Category.update(
        { _id: cat_id },
        { $pull: { subcategories: { _id: sub_cat_id } } },
        { multi: true }
    )
    res.status(200).json({
        message: 'Delete subcategory successfully'
    });
});

const getRoleCategory = async (req, res, next) => {
    const { role } = req.query;
    let roleCategory;
    try {
        roleCategory = await Category.findOne({ role });
    } catch (error) {
        console.log(error);
        return next(new AppError('Error fetching data', 500));
    }

    res.json({ roleCategory });
};

exports.createcategory = createcategory;
exports.getAllcategory = getAllcategory;
exports.deletecategory = deletecategory;
exports.getcategory = getcategory;
exports.Updatecategory = Updatecategory;
exports.addSubcategory = addSubcategory;
exports.updateSubcategory = updateSubcategory;
exports.deleteSubcategory = deleteSubcategory;
exports.getRoleCategory = getRoleCategory;

