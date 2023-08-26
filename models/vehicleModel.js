const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const vehicleSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     company: { type: String ,required: true},
     model: { type: String ,required: true},
    type: { type: String ,required: true},
    regiterNo: { type: String ,required: true},
    drivingLicenseNo: { type: String, required: true },
    images: [{ type: String }],
    vehicleType: {
        type: String,
        enum: ['Truck', 'Car'],
      },
},
    { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);