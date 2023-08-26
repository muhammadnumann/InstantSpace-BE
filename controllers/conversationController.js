const { validationResult } = require('express-validator');

const AppError = require('../utils/appError');
const Conversation = require('../models/conversationModel');

/**
 * This function creates a new conversation between two members and saves it to the database.
 * @param req - req stands for request and it is an object that contains information about the incoming
 * HTTP request such as the request parameters, headers, body, etc.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It is an instance of the `http.ServerResponse` class in Node.js. The `res` object has
 * methods like `res.status()` and `res.json()` that are used to set
 * @param next - `next` is a function that is used to pass control to the next middleware function in
 * the stack. It is typically used to handle errors or to move on to the next function in the chain of
 * middleware functions. If an error occurs in the current middleware function, calling `next` with an
 * error
 * @returns This function is returning a JSON response with the newly created conversation object in
 * the "newConversation" property. The HTTP status code of the response is 201, indicating that a new
 * resource has been successfully created.
 */
const new_conversation = async (req, res, next) => {

    let checkConversation;
    try {
        checkConversation = await Conversation.find({
            members: { $in: [req.body.senderId && req.body.receiverId] }
        })
    } catch (error) {
        console.log(error);
        return next(new AppError('Error getting conversations', 500));
    };

    const checkExistingConversations = checkConversation.some(conv => conv.members.length > 2 || conv.members.length === 2);

    if (checkConversation.length === 0 || !checkExistingConversations) {
        const newConversation = new Conversation({
            members: [req.body.senderId, req.body.receiverId],
        });

        try {
            await newConversation.save();
        } catch (error) {
            console.log(error);
            return next(new AppError("Error starting new conversation", 500));
        }
    }

    res.status(201).json({ message: "Successful" });
};

/**
 * This function retrieves all existing conversations from a database and sends them as a JSON
 * response.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc. It is
 * passed as the first parameter to this middleware function.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It is an instance of the `http.ServerResponse` class in Node.js. In this code snippet,
 * `res` is used to send a JSON response containing an array of existing conversations fetched
 * @param next - `next` is a function that is called to pass control to the next middleware function.
 * It is typically used to handle errors or to move on to the next function in the middleware chain. If
 * an error occurs in the current middleware function, calling `next` with an error object will skip to
 * the
 * @returns This function returns a JSON object with a property called "conversations" that contains an
 * array of all existing conversations retrieved from the database.
 */
const all_conversations = async (req, res, next) => {

    let existingConversations;
    try {
        existingConversations = await Conversation.find({});
    } catch (error) {
        console.log(error);
        return next(new AppError('Error getting conversations from database', 500));
    };
    res.json({ conversations: existingConversations });
};

/**
 * This function retrieves all conversations that a user is a member of.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request parameters, headers, and body. It is passed as the first
 * parameter to the function.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It is an instance of the `http.ServerResponse` class in Node.js. The `res.json()`
 * method is used to send a JSON response to the client.
 * @param next - "next" is a function that is called when an error occurs or when the current
 * middleware function has completed its task and wants to pass control to the next middleware function
 * in the chain. It is typically used in Express.js middleware functions to handle errors or to pass
 * control to the next middleware function.
 * @returns This function is returning a JSON object that contains an array of conversations that the
 * user with the ID specified in the request parameters is a member of.
 */
const get_user_conversations = async (req, res, next) => {
    let userConversations;
    try {
        userConversations = await Conversation.find({
            members: { $in: [req.params.userId] }
        }).populate('members');
    } catch (error) {
        console.log(error);
        return next(new AppError('Error getting user conversations', 500));
    }

    res.json({ userConversations });
};

/**
 * This function adds a user to an existing conversation and returns a success message.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc. It is
 * passed as a parameter to the function.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It contains methods such as `json()` to send a JSON response, `send()` to send a plain
 * text response, and `status()` to set the HTTP status code of the response.
 * @param next - `next` is a function that is called when an error occurs in the current middleware
 * function. It passes control to the next middleware function in the chain.
 * @returns a JSON response with a message indicating whether the user was successfully added to the
 * conversation or not. If there are validation errors, it will return an AppError with a status code
 * of 422. If there is an error fetching or saving the conversation, it will return an AppError with a
 * status code of 500.
 */
const addUserToConversation = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError('Invalid data received', 422));
    }

    const { userId } = req.body;

    const convId = req.params.convId;

    let existingConversation;
    try {
        existingConversation = await Conversation.findById(convId);
    } catch (error) {
        console.log({ error });
        return next(new AppError('Error fetching conversation', 500));
    };

    if (existingConversation) {

        let conversationMembers = [...existingConversation.members, userId];


        existingConversation.members = conversationMembers;

        try {
            await existingConversation.save();
        } catch (error) {
            console.log(error);
            return next(new AppError("Error adding user to conversation", 500));
        }

        res.json({ message: 'User added to conversation successfully' });
    }

};

exports.new_conversation = new_conversation;
exports.get_user_conversations = get_user_conversations;
exports.all_conversations = all_conversations;
exports.addUserToConversation = addUserToConversation;