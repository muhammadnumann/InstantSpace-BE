const mongoose = require('mongoose');

const socketSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
});
 
module.exports = mongoose.model('Socket', socketSchema);
