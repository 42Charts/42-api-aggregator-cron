var updateCoalitionsUsers = require('./updateCoalitionsUsers');
var updateCursusUsers = require('./updateCursusUsers');
var updateTotalLogtime = require('./updateTotalLogtime');

const dayTasks = () => Promise.all([
  updateCoalitionsUsers(),
  updateCursusUsers(),
  updateTotalLogtime()
]);

module.exports = dayTasks;
