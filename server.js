const mongoose = require('mongoose');
mongoose.set('debug', false);
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const app = require('./app');
const Socket = require('./models/Socket.model.js');
const server = require('http').createServer(app);

const DB = process.env.DATABASE
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

const io = require('socket.io')(server, {

  cors: {
    origin: "*",
    methods: ["PUT", "GET", "POST", "DELETE", "OPTIONS"],
    credentials: false
  }
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
  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    let sockets = await Socket.find({ userId: receiverId });
    for (let Socket of sockets) {
      io.to(Socket.socketId).emit("getMessage", {
        receiverId,
        senderId,
        message,
      });
    }
  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});