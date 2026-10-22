const { app } = require('@azure/functions');
const { handler } = require('./handler');

app.http('clientIP', {
  route: '{*path}',
  authLevel: 'anonymous',
  handler,
});
