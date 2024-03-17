const transporter = require('../config/emailTransporter');

const sendAccountActivation = async (destinationEmail, token) => {
  await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: destinationEmail,
    subject: 'Account Activation',
    html: `Token is ${token}`,
  });
};

module.exports = { sendAccountActivation };
