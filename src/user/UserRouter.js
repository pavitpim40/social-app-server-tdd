const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('email').notEmpty().withMessage('Email cannot be null').bail().isEmail().withMessage('Email is not valid'),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must have 1 uppercase, 1 lowercase and 1 number'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((element) => {
        validationErrors[element.path] = element.msg;
      });
      return res.status(400).send({ validationErrors });
    }
    try {
      await UserService.save(req.body);
      return res.status(200).send({ message: 'User created' });
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
