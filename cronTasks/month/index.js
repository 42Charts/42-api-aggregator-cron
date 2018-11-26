var updateUsers = require('./updateUsers');

const monthTasks = () => Promise.all([
  updateUsers(),
]);

module.exports = monthTasks;
