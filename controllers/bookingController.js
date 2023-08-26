const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const AppError = require('../utils/appError');
const Space = require('../models/spaceModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const stripe = require('stripe')('sk_test_51N7wBGI06aS9z6rYIDfQ62UPHoTSjVFqHpW36GxstL0nh2QDGT3ugfuuVczNOMDUIj4bZ0QBEkZ5xIoP3ir2Hw8y00KhX7qHE6');


/**
 * This function creates a new booking by validating user and space details, updating space
 * availability, and saving the new booking.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request body, request parameters, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the Express `Response` object and contains methods like `status`, `json`, `send`,
 * etc. that are used to send the response.
 * @param next - `next` is a function that is called when an error occurs in the current middleware
 * function. It passes the error to the next middleware function in the chain or to the error handling
 * middleware.
 * @returns The function `createBooking` is returning a response to the client with a status code of
 * 201 and a JSON object containing a message indicating that the booking was created successfully.
 */
const createBooking = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new AppError('Invalid data received', 422));
    }

    const { userId, spaceId } = req.body;

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

    const startTime = new Date(req.body.from).getTime();
    const endTime = new Date(req.body.to).getTime();

    let calculatedHours = (endTime - startTime) / 1000;
    calculatedHours /= (60 * 60);

    if (calculatedHours < 0) {
        return next(new AppError('From slot cannot be greater than To slot', 403));
    }

    let charge;

    try {
        charge = await stripe.charges.create({
            amount: parseInt((+req.body.price * calculatedHours) * 100),
            currency: 'usd',
            source: req.body.card,
            customer: userDetails.customerId,
            description: `${userDetails.email} space reservation`,
        });
    } catch (error) {
        console.log({ error });
        return next(new AppError(`Stripe ${error.message}`, 500));
    }

    const newBooking = new Booking({
        ...req.body,
        ownerId: spaceDetails.userId,
        price: req.body.price * calculatedHours,
        paymentId: charge.id,
        payment: true,
        from: new Date(req.body.from),
        to: new Date(req.body.to),
        managers: spaceDetails.managers
    });

    const newConversation = new Conversation({
        members: [req.body.userId, spaceDetails.userId, ...spaceDetails.managers],
    });

    const newMessage = new Message({
        conversationId: newConversation.id,
        sender: spaceDetails.userId,
        message: `${userDetails.fullName} your booking has been created`
    });

    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        await newConversation.save({ session: session });
        await newMessage.save({ session: session });
        await newBooking.save({ session: session });
        await session.commitTransaction();
    } catch (error) {
        console.log(error);
        return next(new AppError("Booking not created", 500));
    }

    res.status(201).json({ message: 'Booking created successfully' });
};

/**
 * This function retrieves all bookings from a database and sends them as a JSON response.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, query parameters, and request body. It is passed
 * as the first parameter to the getAllBookings function.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the Express `Response` object and has methods like `json()`, `send()`, `status()`,
 * etc. that are used to send the response. In the above code
 * @param next - `next` is a function that is used to pass control to the next middleware function. It
 * is typically used to handle errors or to move on to the next function in the middleware chain. If an
 * error occurs in the current middleware function, calling `next` with an error object will trigger
 * the error
 * @returns This function returns a JSON object containing all the bookings fetched from the database.
 * The JSON object has a key "bookings" which holds an array of all the bookings.
 */
const getAllBookings = async (req, res, next) => {

    let allBookings;
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
        totalRecords = await Booking.find().count();
        allBookings = await Booking.find().populate('userId').populate('spaceId').skip(skip).limit(limit);
    } catch (error) {
        console.log({ error });
        return next(new AppError("Error fetching bookings", 500));
    };

    totalPages = Math.ceil(totalRecords / limit);

    res.json({ spaces: allBookings, page, totalRecords, totalPages, limit });
};

/**
 * This function retrieves all bookings made by a user with a given user ID.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` stands for response. It is an object that represents the HTTP response that an
 * Express app sends when it receives an HTTP request. It contains methods for sending the response
 * back to the client, such as `json()` which sends a JSON response.
 * @param next - `next` is a function that is used to pass control to the next middleware function in
 * the request-response cycle. It is typically used to handle errors or to move on to the next
 * middleware function after completing a task. If an error occurs in the current middleware function,
 * calling `next` with an
 * @returns This code returns a JSON object containing an array of booking records that belong to a
 * user with the specified user ID.
 */
const userBookings = async (req, res, next) => {
    const uid = req.params.uid;

    let allBookings;
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    if (req.query.filterBy) {
        try {
            totalRecords = await Booking.find({ userId: uid, subcategoryId: req.query.filterBy }).countDocuments();
            allBookings = await Booking.find({ userId: uid, subcategoryId: req.query.filterBy }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log({ error });
            return next(new AppError('Error fetching records', 500));
        };
    }
    else {
        try {
            totalRecords = await Booking.find({ userId: uid }).countDocuments();
            allBookings = await Booking.find({ userId: uid }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log({ error });
            return next(new AppError('Error fetching records', 500));
        };
    }

    totalPages = Math.ceil(totalRecords / limit);

    res.json({ bookings: allBookings, page, totalRecords, totalPages, limit });
};


/**
 * This function fetches booking details by ID and returns them as a JSON response.
 * @param req - The req parameter is an object that represents the HTTP request made by the client. It
 * contains information about the request such as the request method, headers, URL, and parameters.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the `http.ServerResponse` class in Node.js. The `res` object has various methods
 * that can be used to send different types of responses such as JSON, HTML, text
 * @param next - `next` is a function that is used to pass control to the next middleware function in
 * the request-response cycle. It is typically used to handle errors or to move on to the next
 * middleware function in the chain. If an error occurs in the current middleware function, it can call
 * `next` with
 * @returns The function `bookingDetails` is returning a JSON response containing the booking details
 * of a specific booking ID. If the booking ID is not found, it will return a 404 error. If there is an
 * error while fetching the record, it will return a 500 error.
 */
const bookingDetails = async (req, res, next) => {
    const sid = req.params.sid;

    let bookingDetails;
    try {
        bookingDetails = await Booking.findById(sid).populate("spaceId");
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error fetching record', 500));
    };

    if (!bookingDetails) {
        return next(new AppError('No booking found against id', 404));
    }

    res.json({ bookingDetails });
};

const ownerBookings = async (req, res, next) => {
    const ownerId = req.params.ownerId;

    let allBookings;
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    if (req.query.filterBy) {
        try {
            totalRecords = await Booking.find({ ownerId, subcategoryId: req.query.filterBy }).countDocuments();
            allBookings = await Booking.find({ ownerId, subcategoryId: req.query.filterBy }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching records', 500));
        }
    }
    else {
        try {
            totalRecords = await Booking.find({ ownerId }).countDocuments();
            allBookings = await Booking.find({ ownerId }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching records', 500));
        }
    }

    totalPages = Math.ceil(totalRecords / limit);

    res.json({ bookings: allBookings, page, totalRecords, totalPages, limit });

};

const managerBookings = async (req, res, next) => {
    const managerId = req.params.managerId;

    let allBookings;
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    if (req.query.filterBy) {
        try {
            totalRecords = await Booking.find({ managers: { $in: [managerId] }, subcategoryId: req.query.filterBy }).countDocuments();
            allBookings = await Booking.find({ managers: { $in: [managerId] }, subcategoryId: req.query.filterBy }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching records', 500));
        }
    }
    else {
        try {
            totalRecords = await Booking.find({ managers: { $in: [managerId] } }).countDocuments();
            allBookings = await Booking.find({ managers: { $in: [managerId] } }).populate('userId').populate('spaceId').skip(skip).limit(limit);
        } catch (error) {
            console.log(error);
            return next(new AppError('Error fetching records', 500));
        }
    }

    totalPages = Math.ceil(totalRecords / limit);

    res.json({ bookings: allBookings, page, totalRecords, totalPages, limit });

};

const spaceBookings = async (req, res, next) => {
    const spaceId = req.params.spaceId;

    let allBookings;
    let totalRecords;
    let totalPages;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
        totalRecords = await Booking.find({ spaceId }).countDocuments();
        allBookings = await Booking.find({ spaceId }).populate('userId').populate('spaceId').skip(skip).limit(limit);
    } catch (error) {
        console.log(error);
        return next(new AppError('Error fetching records', 500));
    }

    totalPages = Math.ceil(totalRecords / limit);

    res.json({ bookings: allBookings, page, totalRecords, totalPages, limit });

};

exports.createBooking = createBooking;
exports.getAllBookings = getAllBookings;
exports.userBookings = userBookings;
exports.bookingDetails = bookingDetails;
exports.ownerBookings = ownerBookings;
exports.spaceBookings = spaceBookings;
exports.managerBookings = managerBookings;