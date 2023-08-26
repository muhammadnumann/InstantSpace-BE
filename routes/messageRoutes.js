const express = require('express');

const messageController = require('../controllers/messageController');
const fileUpload = require('../middlewares/file-upload');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/:conversationId', authController.protect, messageController.get_conversation_messages);

router.post('/', authController.protect, messageController.new_message);

router.post('/media_message', authController.protect, fileUpload.single('chat_img'), messageController.mediaMessage);

module.exports = router;