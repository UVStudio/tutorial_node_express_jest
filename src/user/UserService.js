const User = require('./User');
const bcrypt = require('bcrypt');

const createUser = async (body) => {
  const hash = await bcrypt.hash(body.password, 10);
  //override req.body.password from user entered string 'password' to hash
  const user = { ...body, password: hash };
  await User.create(user);
};

module.exports = { createUser };
