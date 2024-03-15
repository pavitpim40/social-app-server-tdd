const express = require('express');
const userRouter = require('./user/UserRouter');

const app = express();
app.use(express.json());

app.use(userRouter);
module.exports = app;
