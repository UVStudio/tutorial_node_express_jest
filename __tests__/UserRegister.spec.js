const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'password',
};

const invalidUsername = {
  username: null,
  email: 'user1@mail.com',
  password: 'password',
};

const invalidEmail = {
  username: 'user1',
  email: null,
  password: 'password',
};

const invalidPassword = {
  username: 'user1',
  email: 'user1@mail.com',
  password: null,
};

const postUser = (user = validUser) => {
  return request(app).post(userRoute).send(user);
};

const userRoute = '/api/1.0/users';

beforeAll(() => {
  //initialize database
  sequelize.sync();
});

beforeEach(() => {
  //deleting saved user from database before each 'it' test
  //or else users would accumulate in the DB
  User.destroy({ truncate: true });
});

describe('User registration', () => {
  it('returns 200 ok when sign up request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('user created');
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });
  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).toBeDefined();
    expect(savedUser.password).not.toBe('password');
  });

  it('returns 400 when username is null or empty string', async () => {
    const response = await postUser(invalidUsername);
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occur', async () => {
    const response = await postUser(invalidUsername);
    expect(response.body.validationErrors).toBeDefined();
  });

  it('returns Username cannot be null when username is null', async () => {
    const response = await postUser(invalidUsername);
    expect(response.body.validationErrors.username).toBe(
      'Username cannot be null'
    );
  });

  it('returns Email cannot be null when email is null', async () => {
    const response = await postUser(invalidEmail);
    expect(response.body.validationErrors.email).toBe('Email cannot be null');
  });

  it('returns errors when both username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'password',
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]); // the order of the array items is important, needs be same as order of middleware validation functions
  });

  it('returns Password cannot be null when password is null', async () => {
    const response = await postUser(invalidPassword);
    expect(response.body.validationErrors.password).toBe(
      'Password cannot be null'
    );
  });
});
