const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  phoneNo: {
    type: String,
  },
  dob: {
    type: Date,
  },
  bio: {
    type: String,
  },
  companyType: {
    type: String,
    enum: ['Individual', 'Company'],
  },
  companyPhone: {
    type: String,
  },
  companyLicenseNo: {
    type: String,
  },
  companyName: {
    type: String,
  },
  companyDoc: {
    type: String,
  },
  companyAddress: {
    type: String,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  slot: Object,
  role: {
    type: String,
    enum: ['Customer', 'Storage Owner', 'Service Provider', 'Admin', 'Truck Driver', 'Manager'],
    default: 'Customer'
  },
  managerOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  isTrue: {
    type: Boolean,
    default: false,
    select: false,
  },
  truckType: { type: String },
  drivingLicense: { type: String },
  driverAddress: { type: String },
  licensePhoto: { type: String },
  passwordChangedAt: Date,
  otp: String,
  managerToken: String,
  otpExpireTime: Date,
  customerId: { type: String, default: '' }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.correctotp = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.createotp = async function () {
  const otp = `${Math.floor(1000 + Math.random() * 900)}`
  const hashotp = await bcrypt.hash(otp, 12);
  this.otp = hashotp;
  this.otpExpireTime = Date.now() + 10 * 60 * 1000;
  return otp;
};
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};



const User = mongoose.model('User', userSchema);

module.exports = User;
