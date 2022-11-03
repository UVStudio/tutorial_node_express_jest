const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const invalidUsername = {
  username: null,
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const invalidEmail = {
  username: 'user1',
  email: null,
  password: 'P4ssword',
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
  return sequelize.sync();
});

beforeEach(() => {
  //deleting saved user from database before each 'it' test
  //or else users would accumulate in the DB
  return User.destroy({ truncate: true });
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
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null or empty string', async () => {
    const response = await postUser(invalidUsername);
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occur', async () => {
    const response = await postUser(invalidUsername);
    expect(response.body.validationErrors).toBeDefined();
  });

  it('returns errors when both username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]); // the order of the array items is important, needs be same as order of middleware validation functions
  });

  it.each`
    field         | value                 | expectedMessage
    ${'username'} | ${null}               | ${'Username cannot be null'}
    ${'username'} | ${'usr'}              | ${'Must have minimal of 4 characters and maximum of 32 characters'}
    ${'username'} | ${'a'.repeat(33)}     | ${'Must have minimal of 4 characters and maximum of 32 characters'}
    ${'email'}    | ${null}               | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}         | ${'Email is not valid'}
    ${'email'}    | ${'user.mail.com'}    | ${'Email is not valid'}
    ${'email'}    | ${'user@mail.c3fdhd'} | ${'Email is not valid'}
    ${'password'} | ${null}               | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}            | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}     | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}     | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'1234567'}          | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'lowerANDUPPER'}    | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'lowerand11222'}    | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'UPPERAND21343'}    | ${'Password must have at least 1 uppercase, 1 lowercase and 1 number'}
  `(
    'return $expectedMessage when $field is $value',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user);
      expect(response.body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it('returns Email in use, when same email is already in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser);
    expect(response.body.validationErrors.email).toBe('Email in use');
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]);
  });
});
