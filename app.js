const express = require('express');
const path = require('path');
const morgan = require('morgan');
const nodemailer = require('nodemailer')
const userRouter = require('./routes/userRoutes');
const conversationRouter = require('./routes/conversationRoutes');
const messageRouter = require('./routes/messageRoutes');
const spaceRouter = require('./routes/spaceRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const vehicleRouter = require('./routes/vehicleRoutes');
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const hpp = require('hpp')
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const app = express();

const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const sanitizeHtml = require('sanitize-html');
app.use(express.json({ limit: '10kb' }));
function checkForHTMLTags(req, res, next) {
  const { body } = req;
  const keys = Object.keys(body);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = body[key];

    if (typeof value === 'string' && sanitizeHtml(value) !== value) {
      return res.status(400).json({ error: 'HTML tags are not allowed in the request body' });
    }
  }
  next();
}
app.use(
  session({
    secret: 'YOUR_SESSION_SECRET',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(checkForHTMLTags);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet({
  crossOriginResourcePolicy: false,
}))
app.use(mongoSanitize())
app.use(hpp({
  whitelist: [
    'duration',
    'price'
  ]
}))
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 100,
  message: 'To many request from this IP now please wait for an hour!'
})

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next();
});

app.use('/uploads/chat', express.static(path.join('uploads', 'chat')));
app.use('/uploads/space', express.static(path.join('uploads', 'space')));
app.use('/uploads/docs', express.static(path.join('uploads', 'docs')));
app.use('/uploads/profile', express.static(path.join('uploads', 'profile')));
app.use('/uploads/vehicle', express.static(path.join('uploads', 'vehicle')));
app.use('/uploads/driverProfile', express.static(path.join('uploads', 'driverProfile')));






app.use('/api', limiter)
app.use(express.json({ limit: '10kb' }));
app.use(express.static(`${__dirname}/public`))
app.use('/api/v1/users', userRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/spaces', spaceRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/vehicle', vehicleRouter);
app.post('/sendEmail', async (req, res) => {
  const { firstName, lastName, email, areaCode, phoneNumber, company, subject, details } = req.body;
  const emailBody = `
    First Name: ${firstName}
    Last Name: ${lastName}
    Email: ${email}
    Phone Number: ${areaCode}-${phoneNumber}
    Company: ${company}
    Subject: ${subject}
    Details: ${details}
  `;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sh.hafizhasnain@gmail.com',
      pass: 'kmskfcjdnewqidbl'
    }
  });
  const mailOptions = {
    from: 'info@prefabhedgehouse.com',
    to: ['peter@prefabhedgehouse.com' , 'peter@prefabhedgehouse.com'],
    subject: 'Contact Form Submission',
    text: emailBody
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
})






app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})
app.use(globalErrorHandler)
// io.on("connection", (socket) => {
//   console.log("userConnected");
// socket.on("join", async ({ userId }) => {
//   let sockets = await Socket.find({ userId });
//   if (!sockets.includes(socket.id)) {
//     await Socket.updateOne(
//       { userId, socketId: socket.id },
//       { socketId: socket.id },
//       { upsert: true }
//     );
//   }
// }); 
// });







module.exports = app;




