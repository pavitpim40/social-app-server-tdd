const User = require('./User');
const bcrypt = require('bcrypt');

const save = async (body) => {
  const hashPassword = await bcrypt.hash(body.password, 10);
  const user = { ...body, password: hashPassword };
  await User.create(user);
};

module.exports = { save };
