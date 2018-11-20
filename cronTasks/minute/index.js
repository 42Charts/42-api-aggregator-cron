var updateLocations = require('./updateLocations');

const minuteTasks = () => Promise.all([ updateLocations() ]);

module.exports = minuteTasks;
