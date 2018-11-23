var updateLocations = require('./updateLocations');
var updateCoalitions = require('./updateCoalitions');

const minuteTasks = () => Promise.all([
  updateLocations(),
  updateCoalitions(),
]);

module.exports = minuteTasks;
