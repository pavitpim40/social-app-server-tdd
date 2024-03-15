const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

describe('User Registration', () => {
  beforeAll(() => {
    return sequelize.sync();
  });

  beforeEach(() => {
    return User.destroy({ truncate: true });
  });

  const validUser = {
    username: 'user1',
    email: 'user1@email.com',
    password: 'P4ssword',
  };

  const postUser = (user = validUser) => {
    return request(app).post('/api/1.0/users').send(user);
  };

  // ## SUCCESS
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
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
    expect(savedUser.email).toBe('user1@email.com');
  });

  it('hashes the password database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  // ## Error
  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });

    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username cannot be null'}
    ${'username'} | ${`abc`}           | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${`a`.repeat(33)}  | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}            | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}      | ${'Email is not valid'}
    ${'email'}    | ${'user.mail.com'} | ${'Email is not valid'}
    ${'email'}    | ${'user@mail'}     | ${'Email is not valid'}
    ${'password'} | ${null}            | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}         | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}  | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}  | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'123456789'}     | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'lowerandUPPER'} | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'lowerand1234'}  | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
    ${'password'} | ${'UPPER1234'}     | ${'Password must have 1 uppercase, 1 lowercase and 1 number'}
  `('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
    const user = { ...validUser };
    user[field] = value;
    const response = await postUser(user);
    expect(response.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('returns errors for both  when username and email are null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });
});
