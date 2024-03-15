const express = require('express');

const UserService = require('./UserService');
const router = express.Router();

router.post('/api/1.0/users', async (req, res) => {
  /*
  {
    validationErrors : {
      username : 'Username cannot be null',
      email : 'Email cannot be null',
    }
  }
  
  */
  const user = req.body;
  if (user.username === null) {
    return res.status(400).send({
      validationErrors: {
        username: 'Username cannot be null',
      },
    });
  }
  try {
    await UserService.save(req.body);
    return res.status(200).send({ message: 'User created' });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
