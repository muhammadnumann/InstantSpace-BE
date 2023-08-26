const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    details: { type: Object, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    price: { type: Number, required: true },
    payment: { type: Boolean, default: false },
    paymentId: { type: String, required: true },
  },
  { timestamps: true }
);

bookingSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Booking', bookingSchema);
