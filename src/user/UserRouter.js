const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username').notEmpty().withMessage('Username cannot be null'),
  check('email').notEmpty().withMessage('Email cannot be null'),
  check('password').notEmpty().withMessage('Password cannot be null'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((element) => {
        console.log(element);
        validationErrors[element.path] = element.msg;
      });
      console.log(validationErrors);
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
