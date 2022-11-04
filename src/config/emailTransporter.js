const nodemail = require('nodemailer');
const nodeMailerStub = require('nodemailer-stub');

const transporter = nodemail.createTransport(nodeMailerStub.stubTransport);
module.exports = transporter;
