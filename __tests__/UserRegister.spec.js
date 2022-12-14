const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;

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

const postUser = (user = validUser) => {
  return request(app).post(userRoute).send(user);
};

const userRoute = '/api/1.0/users';

let lastMail, server;
let simulateSMTPFailure = false;

beforeAll(async () => {
  //initialize email server
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSMTPFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, 'localhost');

  //initialize database
  return sequelize.sync();
});

beforeEach(() => {
  //default SMTP is to not fail. Tests that simulate email fail are set to true
  simulateSMTPFailure = false;
  //deleting saved user from database before each 'it' test
  //or else users would accumulate in the DB
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

describe('User registration', () => {
  //VALID USER INPUT
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

  //INVALID USER INPUT
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

  //USER CREATION - INACTIVE AND TOKEN
  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode, even if the req body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activation token for user', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  //ACTIVATION EMAIL
  it('sends an activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSMTPFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('returns Email failure when sending email fails', async () => {
    simulateSMTPFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe('Email failure');
  });

  it('does not save user to DB if activation email fails', async () => {
    simulateSMTPFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  //USER INPUT VALIDATIONS ERROR MESSAGES
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

describe('Account Activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate account when token is wrong', async () => {
    await postUser();
    const token = 'this-is-wrong-token';

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    let users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-is-wrong-token';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    tokenStatus  | message
    ${'wrong'}   | ${'Invalid Token'}
    ${'correct'} | ${'Account is activated'}
  `(
    'returns $message when $tokenStatus token is sent',
    async ({ tokenStatus, message }) => {
      await postUser();
      let token = 'this-is-wrong-token';
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      }

      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});
