var checkLocationsThatDidntEnd = require('./checkLocationsThatDidntEnd');
var updateRanks = require('./updateRanks');
var getNewUsers = require('./getNewUsers');

const weekTasks = () => Promise.all([
  checkLocationsThatDidntEnd(),
  updateRanks(),
  getNewUsers(),
]);

module.exports = weekTasks;
