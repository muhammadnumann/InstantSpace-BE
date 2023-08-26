const AppError = require('../utils/appError');
const Message = require('../models/messageModel');

/**
 * This function creates and saves a new message in a database and returns a JSON response with the new
 * message.
 * @param req - req stands for request and it is an object that contains information about the incoming
 * HTTP request such as the request parameters, headers, body, etc.
 * @param res - `res` stands for response. It is an object that represents the HTTP response that an
 * Express app sends when it receives an HTTP request. It contains methods for setting the HTTP status
 * code, headers, and body of the response. In this specific code snippet, `res` is used to send a
 * @param next - `next` is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain. If
 * an error occurs in the current middleware function, calling `next` with an error object will trigger
 * @returns a JSON response with the newly created message object and a status code of 201 (created).
 */
const new_message = async (req, res, next) => {
    const newMessage = new Message(req.body);

    try {
        await newMessage.save();
    } catch (error) {
        console.log(error);
        return next(new AppError("Error sending new message", 500));
    }
    res.status(201).json({ newMessage });
};

/**
 * This function retrieves messages from a database based on a given conversation ID and sends them as
 * a JSON response.
 * @param req - req stands for request and it is an object that contains information about the incoming
 * HTTP request such as the request parameters, headers, body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client. It
 * is an instance of the `http.ServerResponse` class in Node.js. The `json()` method is used to send a
 * JSON response to the client.
 * @param next - `next` is a function that is called when an error occurs or when the current
 * middleware function has completed its task and wants to pass control to the next middleware function
 * in the chain. It is typically used in Express.js middleware functions to handle errors or to pass
 * control to the next middleware function.
 * @returns This function is returning a JSON object containing an array of messages that belong to a
 * specific conversation, identified by the `conversationId` parameter passed in the request. If there
 * is an error while retrieving the messages, the function will return a `AppError` object with a 500
 * status code.
 */
const get_conversation_messages = async (req, res, next) => {
    let messages;
    try {
        messages = await Message.find({
            conversationId: req.params.conversationId
        }).populate("conversationId");
    } catch (error) {
        console.log(error);
        return next(new AppError('Error getting messages', 500));
    }

    res.json({ messages });
};

/**
 * This function saves a new media message to a conversation and returns the saved message.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send the response back to the client
 * making the request. It contains methods like `status()` to set the HTTP status code, `json()` to
 * send a JSON response, and `send()` to send a plain text response.
 * @param next - `next` is a function that is called to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next middleware function after
 * completing a task.
 * @returns The function `mediaMessage` is returning a JSON response with the newly created message
 * object in the `newMessage` variable. The response has a status code of 201 (Created).
 */
const mediaMessage = async (req, res, next) => {

    const { conversationId, sender } = req.body;

    const newMessage = new Message({
        conversationId,
        sender,
        message: req.file?.path
    });

    try {
        await newMessage.save();
    } catch (error) {
        console.log(error);
        return next(new AppError("Error sending new message", 500));
    }

    res.status(201).json({ newMessage });
};

exports.new_message = new_message;
exports.get_conversation_messages = get_conversation_messages;
exports.mediaMessage = mediaMessage;