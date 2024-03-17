const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hashPassword = await bcrypt.hash(password, 10);
  const user = { username, email, password: hashPassword, activationToken: generateToken(16) };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  return user;
};
module.exports = { save, findByEmail };
