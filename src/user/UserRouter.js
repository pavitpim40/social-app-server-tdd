const express = require('express');

const UserService = require('./UserService');
const router = express.Router();

const validation = (req, res, next) => {
  const user = req.body;
  req.validationErrors = {};
  if (user.username === null) req.validationErrors.username = 'Username cannot be null';
  if (user.email === null) req.validationErrors.email = 'Email cannot be null';
  next();
};

router.post('/api/1.0/users', validation, async (req, res) => {
  console.log(req.validationErrors);
  if (Object.keys(req.validationErrors).length > 0)
    return res.status(400).send({ validationErrors: req.validationErrors });
  try {
    await UserService.save(req.body);
    return res.status(200).send({ message: 'User created' });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
