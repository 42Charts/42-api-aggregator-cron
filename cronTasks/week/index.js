var checkLocationsThatDidntEnd = require('./checkLocationsThatDidntEnd');
var updateRanks = require('./updateRanks');

const weekTasks = () => Promise.all([
  checkLocationsThatDidntEnd(),
  updateRanks()
]);

module.exports = weekTasks;
