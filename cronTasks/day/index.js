var updateCoalitionsUsers = require('./updateCoalitionsUsers');
var updateCursusUsers = require('./updateCursusUsers');
var updateTotalLogtime = require('./updateTotalLogtime');
var updateApps = require('./updateApps');

const dayTasks = () => Promise.all([
  updateCoalitionsUsers(),
  updateCursusUsers(),
  updateTotalLogtime(),
  updateApps()
]);

module.exports = dayTasks;
