const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage(
      'Must have minimal of 4 characters and maximum of 32 characters'
    ),
  check('email')
    .notEmpty()
    .withMessage('Email cannot be null')
    .bail()
    .isEmail()
    .withMessage('Email is not valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('Email in use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/)
    .withMessage(
      'Password must have at least 1 uppercase, 1 lowercase and 1 number'
    ),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};

      errors
        .array()
        .forEach((error) => (validationErrors[error.param] = error.msg));
      return res.status(400).send({ validationErrors });
    }

    try {
      await UserService.createUser(req.body);
      return res.send({
        message: 'user created',
      });
    } catch (error) {
      res.status(502).send({ message: error.message });
    }
  }
);

module.exports = router;
