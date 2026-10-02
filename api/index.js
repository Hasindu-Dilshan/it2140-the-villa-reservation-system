const path = require('path');
const app = require(path.join(__dirname, '..', 'backend', 'server'));

// Vercel Serverless Function entry point for root deployment
module.exports = app;
