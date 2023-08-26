const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const Space = require('./../models/spaceModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/email');
const { validationResult } = require('express-validator');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: '../config.env' });
const stripe = require('stripe')('sk_test_51N7wBGI06aS9z6rYIDfQ62UPHoTSjVFqHpW36GxstL0nh2QDGT3ugfuuVczNOMDUIj4bZ0QBEkZ5xIoP3ir2Hw8y00KhX7qHE6');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }
  // const filteredBody = filterObj(req.body);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(200).json({
    status: 'success',
    data: null
  });
});
/* This code exports a function called `updateUserProfile` that updates the user profile based on the
user's role. It first extracts the necessary fields from the request body and the user object. Then,
it checks the user's role and updates the user's profile accordingly. If the user's role is not
recognized, it returns an error. Finally, it updates the user's profile in the database and returns
a success message with the updated user object. */
exports.updateUserProfile = catchAsync(async (req, res, next) => {
  const options = { validateBeforeSave: false };
  const user = await User.findByIdAndUpdate(req.user.id, {
    ...req.body,
    photo: req.file.path
  }, {
    new: true
  }).setOptions(options);

  if (!user) {
    return next(
      new AppError("No User Find Please Double Check What's the Issue", 400)
    );
  }
  res.status(200).json({
    status: 'Success',
    message: 'User Profile Update',
    data: {
      user
    }
  });
});

exports.updateUserCompany = catchAsync(async (req, res, next) => {
  const {
    companyName,
    companyPhone,
    companyLicenseNo,
    companyAddress,
    companyType
  } = req.body;
  const { role } = req.user;
  const options = { validateBeforeSave: false };
  let updatedFields = {};

  if (role === 'Truck Driver') {
    updatedFields = {
      ...req.body,
      licensePhoto: req.file?.path
    };
  }
  else if (role === 'Storage Owner') {
    const companyDocpath = req.file?.path;
    updatedFields = {
      companyName,
      companyPhone,
      companyLicenseNo,
      companyAddress,
      companyDoc: companyDocpath,
      companyType
    };
  }
  else {
    return next(new AppError('Invalid fields', 400));
  }
  const user = await User.findByIdAndUpdate(req.user.id, updatedFields, {
    new: true
  }).setOptions(options);

  if (!user) {
    return next(
      new AppError("No User Find Please Double Check What's the Issue", 400)
    );
  }
  res.status(200).json({
    status: 'Success',
    message: 'User Profile Update',
    data: {
      user
    }
  });
});

exports.signupWithGoogle = catchAsync(async (req, res, next) => {
  const user = new User({
    name: req.user.displayName,
    email: req.user.emails[0].value
  });
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ user: user });
});

exports.managerInvitation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: req.body.email });
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching data', 500));
  };

  if (existingUser) {
    return next(new AppError('Email already registered with another account', 401));
  }

  if (!req.body.branch.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid branch', 404));
  }

  let existingSpace;
  try {
    existingSpace = await Space.findById(req.body.branch);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching data', 500));

  }

  if (!existingSpace) {
    return next(new AppError('No branch found', 404));
  }

  const token = Math.floor(1000 + Math.random() * 9000).toString();

  let hashedToken;
  try {
    hashedToken = await bcrypt.hash(token, 12);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error sending invitation', 500));
  }

  let message = '';

  message = `${process.env.SERVER_BASE_URL}/api/v1/users/verify-manager-invitation?token=${hashedToken}&email=${req.body.email}&branch=${req.body.branch}`;

  const newManager = new User({
    ...req.body,
    managerToken: hashedToken
  })

  try {
    await newManager.save({ validateBeforeSave: false });
  } catch (error) {
    console.log(error);
    return (new AppError('Error sending invitation', 500))
  }

  try {
    await sendEmail({
      email: req.body.email,
      subject: 'Manager Invitation',
      message
    })
    res.status(200).json({
      status: 'success',
      message: 'Invitation sent to manager'
    });
  } catch (err) {
    user.userValidotp = undefined;
    await user.save({ validateBeforeSave: false });
    return (new AppError('somting wrong to send email ', 500))
  }

};

exports.verifyInvitation = async (req, res, next) => {
  const { token, email, branch } = req.query;

  let existingManager;
  try {
    existingManager = await User.findOne({ email });
  } catch (error) {
    console.log(error);
    return (new AppError('Error fetching manager', 500))
  }

  if (!existingManager) {
    return (new AppError('No manager found', 404));
  }

  if (existingManager.managerToken !== token) {
    return res.send("ERROR");
  }

  res.redirect(`${process.env.FRONTEND_URL}/auth/manager/register?email=${existingManager.email}&branch=${branch}`);

};

exports.managerRegister = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  const { email, password, passwordConfirm, spaceId } = req.body;

  const findUser = await User.findOne({ email });
  if (!findUser) {
    return next(new AppError('User not found', 404));
  }

  let findSpace;
  try {
    findSpace = await Space.findById(spaceId);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching branch', 500));
  }

  if (!findSpace) {
    return next(new AppError('No branch found', 404));
  }

  const checkManager = findSpace.managers.some(
    (manager) => manager.toString() === findUser.id.toString()
  );

  if (checkManager) {
    return next(new AppError('Manager already exists in branch', 401));
  }

  const customer = await stripe.customers.create({
    description: `${email} customer Id`,
  });

  findUser.password = password
  findUser.passwordConfirm = passwordConfirm
  findUser.customerId = customer.id
  findUser.subcategoryId = findSpace.subCategoryId

  findSpace.managers.push(findUser.id);

  let ResetOtp;
  try {
    ResetOtp = await findUser.createotp();
  } catch (error) {
    console.log(error);
    return next(new AppError('Error creating OTP', 500));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await findSpace.save({ session: session });
    await findUser.save({ validateBeforeSave: false, session: session });
    await session.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new AppError('Error updating data', 500));
  }

  const message = `Please verify your account with this OTP: ${ResetOtp}.`;

  try {
    await sendEmail({
      email: findUser.email,
      subject: 'Your Verify Account OTP (valid for 10 minutes)',
      message,
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Error sending email', 500));
  }

  res.json({ message: 'Records updated successfully' });
});

exports.addUserCard = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  let existingUser;
  try {
    existingUser = await User.findById(req.body.userId);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching user', 500));
  };

  if (!existingUser) {
    return next(new AppError('No user found', 404));
  }

  let token;
  try {
    token = await stripe.tokens.create({
      card: {
        number: req.body.cardNo,
        exp_month: req.body.expMonth,
        exp_year: req.body.expYear,
        cvc: req.body.cvc,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Error creating token', 500));
  };

  let card;
  try {
    card = await stripe.customers.createSource(
      existingUser.customerId,
      {
        source: token.id
      }
    );
  } catch (error) {
    console.log(error.message);
    return next(new AppError(error.message, 500));
  };

  res.status(201).json({ message: 'User card saved successfully' });
});

exports.getUserCards = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid user id format', 500));
  }

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching user', 500));
  };

  if (!existingUser) {
    return next(new AppError('No user found', 404));
  }

  let cards;
  try {
    cards = await stripe.customers.listSources(
      existingUser.customerId,
      { object: 'card' }
    );
  } catch (error) {
    console.log(error);
    return next(new AppError('Error fetching cards', 500));
  };

  res.json({ cards });
});

exports.getOwnerManagers = catchAsync(async (req, res, next) => {
  const ownerId = req.params.ownerId;

  let ownerManagers;
  let totalRecords;
  let totalPages;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  if (req.query.filterBy) {
    try {
      totalRecords = await User.find({ role: 'Manager', managerOwner: ownerId, subcategoryId: req.query.filterBy }).count();
      ownerManagers = await User.find({ role: 'Manager', managerOwner: ownerId, subcategoryId: req.query.filterBy }).select('+isTrue').populate('branch').skip(skip).limit(limit);
    } catch (error) {
      console.log(error);
      return next(new AppError('Error fetching managers', 500));
    }
  }
  else {
    try {
      totalRecords = await User.find({ role: 'Manager', managerOwner: ownerId }).count();
      ownerManagers = await User.find({ role: 'Manager', managerOwner: ownerId }).select('+isTrue').populate('branch').skip(skip).limit(limit);
    } catch (error) {
      console.log(error);
      return next(new AppError('Error fetching managers', 500));
    }
  }

  totalPages = Math.ceil(totalRecords / limit);

  res.json({ managers: ownerManagers, page, totalRecords, totalPages, limit });
});


exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);
exports.createUser = factory.createOne(User);
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
