const { validationResult } = require('express-validator');

const AppError = require('../utils/appError');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

/**
 * This function adds a new Vehicle to a database with images and returns a success message or an error
 * message if there are any issues.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * contains methods like `status` to set the HTTP status code, `json` to send a JSON response, and
 * `send` to send a plain text response. In this code, `res`
 * @param next - next is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions.
 * @returns The function `addNewVehicle` is returning a response to the client. If there are validation
 * errors in the request, it returns an error response with a status code of 422 and an error message.
 * If there are no validation errors, it creates a new `Vehicle` object with the request body and the
 * paths of the uploaded images, saves it to the database, and returns a success response with
 */
const addNewVehicle = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  const imagesPath = req?.files.map(img => img.path);

  const newVehicle = new Vehicle({
    ...req.body,
    images: imagesPath
  });

  try {
    await newVehicle.save();
  } catch (error) {
    console.log(error);
    return next(new AppError('Error adding new Vehicle', 500));
  }
  res.status(201).json({ message: 'Vehicle added successfully' });
};


const updateVehicle = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  const VehicleId = req.params.VehicleId;
  const { body, files } = req;

  let updatedVehicle;
  try {
    updatedVehicle = await Vehicle.findById(VehicleId);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error retrieving Vehicle', 500));
  }

  if (!updatedVehicle) {
    return next(new AppError('Vehicle not found', 404));
  }
  // Update Vehicle properties
  updatedVehicle.company = body.company;
  updatedVehicle.model = body.model;
  updatedVehicle.type = body.type;
  updatedVehicle.regiterNo = body.regiterNo;
  updatedVehicle.drivingLicenseNo = body.drivingLicenseNo;

  if (files && files.length > 0) {
    const imagesPath = files.map(img => img.path);
    updatedVehicle.images = imagesPath;
  }

  try {
    await updatedVehicle.save();
  } catch (error) {
    console.log(error);
    return next(new AppError('Error updating Vehicle', 500));
  }

  res.status(200).json({ message: 'Vehicle updated successfully' });
};


const getAllVehicles = async (req, res, next) => {
  let allVehicles;
  let totalRecords;
  let totalPages;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    totalRecords = await Vehicle.find({}).count();
    allVehicles = await Vehicle.find({}).skip(skip).limit(limit);
  } catch (error) {
    console.log({ error });
    return next(new AppError('Error fetching Vehicles', 500));
  }

  totalPages = Math.ceil(totalRecords / limit);

  res.json({ vehicles: allVehicles, page, totalRecords, totalPages, limit });
};


const getSingleVehicle = async (req, res, next) => {
  const sid = req.params.sid;
  let singleVehicle;
  try {
    singleVehicle = await Vehicle.findById(sid);
  } catch (error) {
    console.log({ error });
    return next(new AppError('Error finding Vehicle', 500));
  }

  if (!singleVehicle) {
    return next(new AppError('No Vehicle found against id', 404));
  }

  res.json({ Vehicle: singleVehicle });
};

const deleteVehicle = async (req, res, next) => {
  const vid = req.params.vid;

  let singleVehicle;
  try {
    singleVehicle = await Vehicle.findByIdAndDelete(vid);
  } catch (error) {
    console.log({ error });
    return next(new AppError('Error finding Vehicle', 500));
  }

  if (!singleVehicle) {
    return next(new AppError('No Vehicle found against id', 404));
  }

  res.json({ message: 'Deleted Successfully' });
};

const getUserVehicles = async (req, res, next) => {
  const uid = req.params.uid;

  let allVehicles;
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
    return next(new AppError('Error finding Vehicles', 500));
  }

  if (!userDetails) {
    return next(new AppError('No user found against id', 404));
  }

  try {
    totalRecords = await Vehicle.find({ userId: uid }).countDocuments();
    allVehicles = await Vehicle.find({ userId: uid }).skip(skip).limit(limit);
  } catch (error) {
    console.log({ error });
    return next(new AppError('Error finding Vehicles', 500));
  }

  totalPages = Math.ceil(totalRecords / limit);

  res.json({ vehicles: allVehicles, page, totalRecords, totalPages, limit });
};



exports.addNewVehicle = addNewVehicle;
exports.getAllVehicles = getAllVehicles;
exports.getSingleVehicle = getSingleVehicle;
exports.getUserVehicles = getUserVehicles;
exports.updateVehicle = updateVehicle;
exports.deleteVehicle = deleteVehicle;
