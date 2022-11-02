const express = require('express');
const app = express();
const UserRouter = require('./user/UserRouter');

app.use(express.json());

app.use(UserRouter);

console.log('env: ' + process.env.NODE_ENV);

module.exports = app;
