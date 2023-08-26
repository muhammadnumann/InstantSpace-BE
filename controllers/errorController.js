const AppError = require('./../utils/appError')
const mongoose = require('mongoose')
const handleCastErrorDB = err => {
  console.log(err)
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};
const handleDublicateFieldsDB = err => {
  const message = `Duplicate field value ${JSON.stringify(err.keyValue)}: please use another`;
  const value = JSON.stringify(err.keyValue.name);
  return new AppError(`Duplicate field value ${value}: please use another`, 400);
};
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    // stack: err.stack
  });
};
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'fail',
      message: err.message
    });
  } else {
    // 1) Log error
    console.error('ERROR', err);
    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',

    });
  }
};

module.exports = ((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error'
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res)
  }
  else if (process.env.NODE_ENV === 'production') {
    let error = { ...err }
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDublicateFieldsDB(error);
    }
    if (err instanceof mongoose.Error.ValidationError) {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res)

  }


})





