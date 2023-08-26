const { validationResult } = require('express-validator');

const AppError = require('../utils/appError');
const Space = require('../models/spaceModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

const getCoordsOfAddress = require('../Helper/location');

/**
 * This function adds a new space to a database with images and returns a success message or an error
 * message if there are any issues.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * contains methods like `status` to set the HTTP status code, `json` to send a JSON response, and
 * `send` to send a plain text response. In this code, `res`
 * @param next - next is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions.
 * @returns The function `addNewSpace` is returning a response to the client. If there are validation
 * errors in the request, it returns an error response with a status code of 422 and an error message.
 * If there are no validation errors, it creates a new `Space` object with the request body and the
 * paths of the uploaded images, saves it to the database, and returns a success response with
 */
const addNewSpace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    let coordinates;
    try {
        coordinates = await getCoordsOfAddress(req.body.location);
    } catch (error) {
        return next(error);
    }

    const imagesPath = req?.files.map(img => img.path);

    const newSpace = new Space({
        ...req.body,
        location: {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat]
        },
        address: req.body.location,
        images: imagesPath
    });

    try {
        await newSpace.save();
    } catch (error) {
        console.log(error);
        return next(new AppError("Error adding new space", 500));
    }
    res.status(201).json({ message: 'Space added successfully' });
};

const areaSpaces = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    let coordinates;
    try {
        coordinates = await getCoordsOfAddress(req.body.address);
    } catch (error) {
        return next(error);
    }

    let filteredSpaces;
    try {
        filteredSpaces = await Space.find(
            {
                location:
                {
                    $near:
                    {
                        $geometry: { type: "Point", coordinates: [parseFloat(coordinates.lng), parseFloat(coordinates.lat)] },
                        $maxDistance: 50 * 1000
                    }
                }
            }
        ).populate('userId', 'role email');
    } catch (error) {
        console.log(error);
        return next(new AppError('Error fetching spaces', 500));
    }

    res.json({ filteredSpaces });

};

/**
 * This function updates a space's properties and images in a database.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * contains methods like `status`, `json`, `send`, etc. that are used to set the response status code,
 * headers, and body. In this code snippet, `res` is used to
 * @param next - `next` is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions.
 * @returns a JSON response with a message indicating that the space was updated successfully, with a
 * status code of 200.
 */
const updateSpace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    const spaceId = req.params.spaceId;
    const { body, files } = req;

    let updatedSpace;
    try {
        updatedSpace = await Space.findById(spaceId);
    } catch (error) {
        console.log(error);
        return next(new AppError("Error retrieving space", 500));
    }

    if (!updatedSpace) {
        return next(new AppError("Space not found", 404));
    }

    // Update space properties
    updatedSpace.category = body.category;
    updatedSpace.area = body.area;
    updatedSpace.contact = body.contact;
    updatedSpace.security = body.security;
    updatedSpace.cameras = body.cameras;
    updatedSpace.capacity = body.capacity;
    updatedSpace.fuel = body.fuel;
    updatedSpace.rate_hour = body.rate_hour;
    updatedSpace.rate_day = body.rate_day;
    updatedSpace.rate_week = body.rate_week;
    updatedSpace.rate_month = body.rate_month;
    updatedSpace.location = body.location;
    updatedSpace.description = body.description;

    if (files && files.length > 0) {
        const imagesPath = files.map(img => img.path);
        updatedSpace.images = imagesPath;
    }

    try {
        await updatedSpace.save();
    } catch (error) {
        console.log(error);
        return next(new AppError("Error updating space", 500));
    }

    res.status(200).json({ message: 'Space updated successfully' });
};



/**
 * This function retrieves all spaces from a database and sends them as a JSON response.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, query parameters, and request body. It is passed
 * as the first parameter to this function.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the `http.ServerResponse` class in Node.js. The `res.json()` method is used to
 * send a JSON response to the client with the `spaces` property containing the array
 * @param next - "next" is a function that is called when an error occurs or when the current
 * middleware function has completed its task and wants to pass control to the next middleware function
 * in the chain. It is typically used in Express.js middleware functions to pass control to the error
 * handling middleware or to the next middleware function
 * @returns This function is returning a JSON object with a key of "spaces" and a value of an array of
 * all the spaces fetched from the database using the Mongoose `find()` method. If there is an error,
 * it will return a custom error message with a status code of 500.
 */
const getAllSpaces = async (req, res, next) => {
    let allSpaces;
    let updated = [];
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    if (req.query.filterby) {
        try {
            totalRecords = await Space.find({ subCategoryId: req.query.filterby, available: true }).count();
            allSpaces = await Space.find({ subCategoryId: req.query.filterby, available: true })
                .populate('managers')
                .populate('userId')
                .populate('categoryId')
                .skip(skip)
                .limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching spaces', 500));
        }

    }
    else {
        try {
            totalRecords = await Space.find({ available: true }).count();
            allSpaces = await Space.find({ available: true })
                .populate('managers')
                .populate('userId')
                .populate('categoryId')
                .skip(skip)
                .limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching spaces', 500));
        }
    }

    totalPages = Math.ceil(totalRecords / limit);

    updated = allSpaces.filter((key) => {
        key.categoryId.subcategories.filter((subkey) => {
            if (subkey._id.toString() == key.subCategoryId.toString()) {
                return key.categoryId.subcategories = subkey;
            }
        });

        return key;
    });

    res.json({ spaces: updated, page, totalRecords, totalPages, limit });
};


const getSpacesBySubcatId = async (req, res, next) => {
    const subcatId = req.params.subcatId;

    let subcatSpaces;
    try {
        subcatSpaces = await Space.find({ subCategoryId: subcatId });
    } catch (error) {
        console.log(error);
        return next(new AppError('Error fetching records', 500));
    }

    res.json({ subcatSpaces });
};

/**
 * This function retrieves a single space by its ID and returns it as a JSON object in the response.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the Express `Response` object and has methods like `json()`, `send()`, `status()`,
 * etc. that are used to send the response back to the client.
 * @param next - `next` is a function that is used to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions. If an error occurs in the current middleware function, it can call `next` with
 * @returns This code defines an asynchronous function called `getSingleSpace` that takes in a request
 * object (`req`), a response object (`res`), and a `next` function as parameters.
 */
const getSingleSpace = async (req, res, next) => {
    const sid = req.params.sid;

    let singleSpace;
    try {
        singleSpace = await Space.findById(sid).populate('managers').populate('userId').populate('categoryId');
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error finding space', 500));
    };

    if (!singleSpace) {
        return next(new AppError('No space found against id', 404));
    }

    singleSpace.categoryId.subcategories.filter((subkey) => {
        if (subkey._id.toString() == singleSpace.subCategoryId.toString()) {
            return singleSpace.categoryId.subcategories = subkey;
        }
    });

    res.json({ space: singleSpace });
};

const deleteSpace = async (req, res, next) => {
    const sid = req.params.sid;

    let singleSpace;
    try {
        singleSpace = await Space.findByIdAndDelete(sid);
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error finding space', 500));
    };

    if (!singleSpace) {
        return next(new AppError('No space found against id', 404));
    }

    res.json({ space: singleSpace, message: 'Space deleted successfully' });
};
/**
 * This function retrieves all spaces associated with a user ID and returns them as a JSON object.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request parameters, headers, and body.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the Express `Response` object and has methods like `json()`, `send()`, `status()`,
 * etc. that are used to send the response data and set the response
 * @param next - next is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions.
 * @returns This code defines an asynchronous function called `getUserSpaces` that takes in a request
 * object (`req`), a response object (`res`), and a `next` function as parameters.
 */
const getUserSpaces = async (req, res, next) => {
    const uid = req.params.uid;

    let allSpaces;
    let updated = [];
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let userDetails;
    try {
        userDetails = await User.findById(uid);
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error finding spaces', 500));
    };

    if (!userDetails) {
        return next(new AppError('No user found against id', 404));
    }

    if (req.query.filterby) {
        console.log(req.query.filterby);
        try {
            totalRecords = await Space.find({ subCategoryId: req.query.filterby, userId: userDetails.id }).count();
            allSpaces = await Space.find({ subCategoryId: req.query.filterby, userId: userDetails.id })
                .populate('managers')
                .populate('userId')
                .populate('categoryId')
                .skip(skip)
                .limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching spaces', 500));
        }
    }
    else {
        try {
            totalRecords = await Space.find({ userId: userDetails.id }).count();
            allSpaces = await Space.find({ userId: userDetails.id })
                .populate('managers')
                .populate('userId')
                .populate('categoryId')
                .skip(skip)
                .limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching spaces', 500));
        }
    }

    totalPages = Math.ceil(totalRecords / limit);

    updated = allSpaces.filter((key) => {
        key.categoryId.subcategories.filter((subkey) => {
            if (subkey._id.toString() == key.subCategoryId.toString()) {
                return key.categoryId.subcategories = subkey;
            }
        });

        return key;
    });

    res.json({ spaces: updated, page, totalRecords, totalPages, limit });

};

/**
 * This function adds a review to a space and returns a success message.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It contains methods like `json()` to send a JSON response, `send()` to send a plain
 * text response, and `status()` to set the HTTP status code of the response.
 * @param next - `next` is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions.
 * @returns a JSON response with a message "Review added successfully" if the review is added
 * successfully to the space details. If there are any errors during the process, it will call the next
 * middleware function with an error message.
 */
const addReview = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    const { userId, spaceId, review, rating } = req.body;

    let userDetails;
    try {
        userDetails = await User.findById(userId);
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error finding user', 500));
    };

    if (!userDetails) {
        return next(new AppError('No user found against id', 404));
    }

    let userBookingDetails;
    try {
        userBookingDetails = await Booking.findOne({ userId, spaceId });
    } catch (error) {
        console.log({ error });
        return next(new AppError('User cannot post a review on this space', 401));
    };

    let spaceDetails;
    try {
        spaceDetails = await Space.findById(spaceId);
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error finding space', 500));
    }

    if (!spaceDetails) {
        return next(new AppError('No space found against id', 404));
    }

    spaceDetails.reviews.push({
        userId,
        review,
        rating
    });

    try {
        await spaceDetails.save();
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error adding review', 500));
    }

    res.json({ message: 'Review added successfully' });
};

const filterSpaces = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    let filteredSpaces;
    try {
        filteredSpaces = await Space.find(
            {
                location:
                {
                    $near:
                    {
                        $geometry: { type: "Point", coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] },
                        $maxDistance: +req.query.radius * 1000
                    }
                }
            }
        ).populate('userId');
    } catch (error) {
        console.log(error);
        return next(new AppError('Error fetching spaces', 500));
    }

    res.json({ filteredSpaces });
};

const changeAvailability = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    let existingSpace;
    try {
        existingSpace = await Space.findById(req.body.spaceId);
    } catch (error) {
        console.log(error);
        return next(new AppError('Error finding space', 500));
    }

    if (!existingSpace) {
        return next(new AppError('No space found against id', 404));
    }

    existingSpace.available = req.body.availability;

    try {
        await existingSpace.save();
    } catch (error) {
        console.log(error);
        return next(new AppError('Error updating availability', 500));
    };

    res.json({ message: 'Space availability updated successfully' });
};

exports.addNewSpace = addNewSpace;
exports.getAllSpaces = getAllSpaces;
exports.getSingleSpace = getSingleSpace;
exports.getUserSpaces = getUserSpaces;
exports.addReview = addReview;
exports.updateSpace = updateSpace;
exports.deleteSpace = deleteSpace;
exports.getSpacesBySubcatId = getSpacesBySubcatId;
exports.filterSpaces = filterSpaces;
exports.changeAvailability = changeAvailability;
exports.areaSpaces = areaSpaces;

