var updateCoalitionsUsers = require('./updateCoalitionsUsers');
var updateCursusUsers = require('./updateCursusUsers');
var updateTotalLogtime = require('./updateTotalLogtime');
var updateApps = require('./updateApps');
var updatePiscines = require('./updatePiscines');

const dayTasks = () => Promise.all([
  updateCoalitionsUsers(),
  updateCursusUsers(),
  updateTotalLogtime(),
  updateApps(),
  updatePiscines(),
]);

module.exports = dayTasks;
