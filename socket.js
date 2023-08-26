const { Server } = require("socket.io");
const fileUpload = require('./middlewares/file-upload');
const Socket = require('./models/Socket.model.js');
const io = new Server(8900, {
  cors: {
    origin: '*',
  },
});
let users = [];
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log("userConnected");
  socket.on("join", async ({ userId }) => {
    // online user 
    addUser(userId, socket.id);
    io.emit("getUsers", users);

    let sockets = await Socket.find({ userId });
    if (!sockets.includes(socket.id)) {
      await Socket.updateOne(
        { userId, socketId: socket.id },
        { socketId: socket.id },
        { upsert: true }
      );
    }
  });

  //send and get message
  socket.on("sendMessage", async ({ senderId, receiverId, message, createdAt }) => {
    let sockets = await Socket.find({ userId: receiverId });
    for (let Socket of sockets) {
      io.to(Socket.socketId).emit("getMessage", {
        receiverId,
        senderId,
        message,
        createdAt
      });
    }
  });

  // send and get file


  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});
module.exports = io;

