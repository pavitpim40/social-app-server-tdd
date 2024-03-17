const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hashPassword = await bcrypt.hash(password, 10);
  const user = { username, email, password: hashPassword, activationToken: generateToken(16) };
  await User.create(user);
};

const findByEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  return user;
};
module.exports = { save, findByEmail };
