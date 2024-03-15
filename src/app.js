const express = require('express');
const userRouter = require('./user/UserRouter');

const app = express();
app.use(express.json());

app.use(userRouter);

console.log('env: ' + process.env.NODE_ENV);
module.exports = app;
