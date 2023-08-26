const { promisify } = require('util')
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const sendEmail = require('../utils/email');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt')
const stripe = require('stripe')('sk_test_51N7wBGI06aS9z6rYIDfQ62UPHoTSjVFqHpW36GxstL0nh2QDGT3ugfuuVczNOMDUIj4bZ0QBEkZ5xIoP3ir2Hw8y00KhX7qHE6');

const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = id => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPRISE_IN }
  )
}

/**
 * The function creates and sends a JWT token to the client along with user data and a success message.
 * @param user - The user object that contains the user's information, including their ID and password.
 * @param statusCode - The HTTP status code to be sent in the response. It can be any valid HTTP status
 * code such as 200, 201, 400, 401, 404, 500, etc.
 * @param res - `res` is the response object that is used to send the HTTP response back to the client.
 * It is typically passed as a parameter to an Express route handler function.
 * @param message - The message parameter is a custom message that can be passed to the function to be
 * included in the response JSON object. It can be used to provide additional information or context
 * about the response.
 */
const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    message: message,
    data: {
      user
    }
  });
};
exports.signup = catchAsync(async (req, res) => {
  const { email, password, role, passwordConfirm, categories, companyType } = req.body;
  const srtipe = await stripe.customers.create({
    description: `${email} customer Id`,
  });
  const user = new User({
    email,
    password,
    role,
    passwordConfirm,
    companyType,
    customerId: srtipe.id
  });
  const ResetOtp = await user.createotp();
  await user.save();
  const message = `Please Vierify your Account with This OTP ${ResetOtp}.`
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Verify Account otp (valid for 10 mint)',
      message
    })
    res.status(200).json({
      status: 'success',
      message: 'OTP send into email'
    });
  } catch (err) {
    user.userValidotp = undefined;
    await user.save({ validateBeforeSave: false });
    return (new AppError('somting wrong to send email ', 500))
  }
}
)
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body
  if (!(email, otp)) {
    return next(new AppError('please provide email and otp !', 400))
  }
  const user = await User.findOne({ email }).select('+password')
  if (!user || !await user.correctotp(otp, user.otp)) {
    return next(new AppError('otp and email are incorrect!', 401))
  }
  if (user.otpExpireTime < Date.now()) {
    return next(new AppError('OTP is invalid and expire', 400))
  }
  user.isTrue = true;
  user.otp = undefined;
  user.otpExpireTime = undefined;
  await user.save({ validateBeforeSave: false });
  const message = 'succssfully verify';
  createSendToken(user, 200, res, message)
})
exports.login = catchAsync(async (req, res, next) => {
  console.log("Working");
  const { email, password, role } = req.body;
  if (!(email, password)) {
    return next(new AppError('please provide email and password !', 400))
  }

  let user;
  user = await User.findOne({ email }).select('+password +isTrue')
  if (!user) {
    return next(new AppError('Email not found', 404))
  }

  let checkPassword;
  try {
    checkPassword = await bcrypt.compare(password, user.password);
  } catch (error) {
    return next(new AppError('Password error', 500))
  }

  if (!checkPassword) {
    return next(new AppError('Incorrect password', 401))
  }

  if (!user.isTrue) {
    return next(new AppError('You are not verified Please verify again!', 401))
  }
  createSendToken(user, 200, res)
}
)
exports.protect = catchAsync(async (req, res, next) => {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Beare')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) {
    return next(new AppError('you are not logeed in! please login again', 401))
  }
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decode.id)
  if (!currentUser) {
    return next(new AppError('The user dose not exist in this token', 401))
  }
  if (currentUser.changedPasswordAfter(decode.iat)) {
    return next(new AppError('Password recently change so please login again for new TOKEN', 401))
  }
  req.user = currentUser;
  next()
})
exports.forgotpassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('No user have with this email', 404))
  }
  const ResetOtp = await user.createotp()
  await user.save({ validateBeforeSave: false });
  const message = `Your Reset Password OTP is ${ResetOtp}`
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password reset otp (valid for 10 mint)',
      message
    })
    res.status(200).json({
      status: 'success',
      message: 'ResetPassword OTP send into email'
    });
  } catch (err) {
    user.otp = undefined;
    user.otpExpireTime = undefined;
    await user.save({ validateBeforeSave: false });
    return (new AppError('somting wrong to send email ', 500))
  }
})
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('OTP is invalid and expire', 400))
  }
  user.password = password
  user.passwordConfirm = passwordConfirm
  user.passwordResetotp = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  const message = 'Your Password Chaged succssfully';
  createSendToken(user, 200, res, message)

});
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  const { password, passwordConfirm } = req.body
  user.password = password
  user.passwordConfirm = passwordConfirm
  await user.save();
  createSendToken(user, 200, res);
}

)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.googleLogin = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Invalid data received', 422));
  }

  let payload;
  try {
    payload = await client.verifyIdToken({
      idToken: req.body.token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Error getting data', 500));
  }

  console.log({ payload });
  res.send('ok');
};