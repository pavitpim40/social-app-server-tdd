const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;

const validUser = {
  username: 'user1',
  email: 'user1@email.com',
  password: 'P4ssword',
};

const postUser = (user = validUser, options = { 'Accept-Language': 'en' }) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};
let lastMail, server;
let simulateSMTPFailure = false;
beforeAll(async () => {
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
  return sequelize.sync({ force: true });
});

beforeEach(() => {
  simulateSMTPFailure = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

// ########################################### REGISTER
describe('User Registration', () => {
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

  const username_null = 'Username cannot be null';
  const username_size = 'Must have min 4 and max 32 characters';
  const email_null = 'Email cannot be null';
  const email_not_valid = 'Email is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_format = 'Password must have 1 uppercase, 1 lowercase and 1 number';
  const email_inuse = 'Email in use';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${`abc`}           | ${username_size}
    ${'username'} | ${`a`.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_not_valid}
    ${'email'}    | ${'user.mail.com'} | ${email_not_valid}
    ${'email'}    | ${'user@mail'}     | ${email_not_valid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_format}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_format}
    ${'password'} | ${'123456789'}     | ${password_format}
    ${'password'} | ${'lowerandUPPER'} | ${password_format}
    ${'password'} | ${'lowerand1234'}  | ${password_format}
    ${'password'} | ${'UPPER1234'}     | ${password_format}
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

  // duplicate email
  it(`returns ${email_inuse} when same email is already in use`, async () => {
    // arrange
    await User.create({ ...validUser });

    // act
    const response = await postUser();

    // assert
    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it('returns errors for both username is null and email is in use', async () => {
    // arrage
    await User.create({ ...validUser });

    // act
    const response = await postUser({ username: null, email: validUser.email, password: validUser.password });

    // assert
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
    expect(body.validationErrors.username).toBe(username_null);
  });
});

// ########################################### ACTIVATION
describe('User Activation', () => {
  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body contains inactive false', async () => {
    await postUser({ ...validUser, inactive: false });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser({ ...validUser, inactive: false });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  // Email and Stub
  it('sends an Account activation email with activationToken', async () => {
    await postUser({ ...validUser });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain(validUser.email);
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    // Arrange - Test Double
    simulateSMTPFailure = true;
    // Action
    const response = await postUser({ ...validUser });

    // Acpect
    expect(response.status).toBe(502);
  });

  it('returns Email failure message when sending email fails', async () => {
    // Arrange - Test Double
    simulateSMTPFailure = true;

    // Action
    const response = await postUser({ ...validUser });

    // Acpect
    expect(response.body.message).toBe('Email Failure');
  });

  it('does not save user to database if send activation email fails', async () => {
    // Arrange - Test Double
    simulateSMTPFailure = true;
    // Action
    await postUser({ ...validUser });
    const users = await User.findAll();

    // Acpect
    expect(users.length).toBe(0);
  });
});

// ########################################### I18n
describe('Internationalization', () => {
  beforeAll(() => {
    return sequelize.sync({ force: true });
  });

  beforeEach(() => {
    return User.destroy({ truncate: true });
  });

  const username_null = 'กรุณาระบุชื่อผู้ใช้งาน';
  const username_size = 'ชื่อผู้ใช้งานต้องมีความอยาวระหว่าง 4 - 32 ตัวอักษร';
  const email_null = 'กรุณาระบุอีเมลล์';
  const email_not_valid = 'รูปแบบอีเมล์ไม่ถูกต้อง';
  const password_null = 'กรุณาระบุรหัสผ่าน';
  const password_size = 'รหัสผ่านต้องมีความยาวไม่ต่ำกว่า 6 ตัวอักษร';
  const password_format = 'รหัสผ่านต้องประกอบไปด้วยตัวอักษรใหญ่อย่างน้อย 1 ตัว,ตัวอักษรเล็ก 1 ตัว และตัวเลข 1 ตัว';
  const email_inuse = 'อีเมลล์นี้ถูกใช้งานแล้ว';
  const email_failure = 'การส่งอีเมลล์ล้มเหลว';

  const user_created_success = 'สร้างบัญชีผู้ใช้งานสำเร็จ';

  it('returns ${user_created_success} when signup request is valid', async () => {
    const response = await postUser({ ...validUser }, { language: 'th' });
    expect(response.body.message).toBe(user_created_success);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${`abc`}           | ${username_size}
    ${'username'} | ${`a`.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_not_valid}
    ${'email'}    | ${'user.mail.com'} | ${email_not_valid}
    ${'email'}    | ${'user@mail'}     | ${email_not_valid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_format}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_format}
    ${'password'} | ${'123456789'}     | ${password_format}
    ${'password'} | ${'lowerandUPPER'} | ${password_format}
    ${'password'} | ${'lowerand1234'}  | ${password_format}
    ${'password'} | ${'UPPER1234'}     | ${password_format}
  `(
    'returns $expectedMessage when $field is $value when language is Thai',
    async ({ field, value, expectedMessage }) => {
      const user = { ...validUser };
      user[field] = value;
      const response = await postUser(user, { language: 'th' });
      expect(response.body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  // duplicate email
  it(`returns ${email_inuse} when same email is already in use when language is Thai`, async () => {
    // arrange
    await User.create({ ...validUser });

    // act
    const response = await postUser({ ...validUser }, { language: 'th' });

    // assert
    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it('returns errors for both username is null and email is in use when language is Thai', async () => {
    // arrage
    await User.create({ ...validUser });

    // act
    const response = await postUser(
      { username: null, email: validUser.email, password: validUser.password },
      { language: 'th' }
    );

    // assert
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
    expect(body.validationErrors.username).toBe(username_null);
  });

  // Email
  it(`returns ${email_failure} message when sending email fails`, async () => {
    // Arrange - Test Double
    simulateSMTPFailure = true;

    // Action
    const response = await postUser({ ...validUser }, { language: 'th' });

    // Acpect
    expect(response.body.message).toBe(email_failure);
  });
});
