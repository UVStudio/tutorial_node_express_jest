const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

const validateUsername = (req, res, next) => {
  //the req.body is the .send(data) from the test file
  const user = req.body;
  if (user.username === null || user.username === '') {
    req.validationErrors = {
      username: 'Username cannot be null',
    };
  }
  next();
};

const validateEmail = (req, res, next) => {
  const user = req.body;
  if (user.email === null || user.email === '') {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'Email cannot be null',
    };
  }
  next();
};

const validatePassword = (req, res, next) => {
  const user = req.body;
  if (user.password === null || user.password === '') {
    req.validationErrors = {
      ...req.validationErrors,
      password: 'Password cannot be null',
    };
  }
  next();
};

router.post(
  '/api/1.0/users',
  validateUsername,
  validateEmail,
  validatePassword,
  async (req, res) => {
    if (req.validationErrors) {
      const response = {
        validationErrors: {
          ...req.validationErrors,
        },
      };
      return res.status(400).send(response);
    }

    await UserService.createUser(req.body);
    return res.send({
      message: 'user created',
    });
  }
);

module.exports = router;
