const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const conversationSchema = new Schema({
    members: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
},
    { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);