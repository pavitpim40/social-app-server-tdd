const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_not_valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('email_inuse');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_format'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((element) => {
        validationErrors[element.path] = req.t(element.msg);
      });
      return res.status(400).send({ validationErrors });
    }
    try {
      await UserService.save(req.body);
      return res.status(200).send({ message: req.t('user_created_success') });
    } catch (error) {
      return res.status(502).send({ message: req.t('email_failure') });
    }
  }
);

module.exports = router;
