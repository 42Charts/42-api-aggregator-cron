const moment = require('moment');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');
const registerUsers = require('../../tools/registerUsers');

const updateUsers = () => new Promise((resolve, reject) => {
  let now = new Date();
  let currentMonth = moment(now).startOf('month').format('YYYY-MM-DD HH:mm:ss');
  let previousMonth = moment(now).startOf('month').subtract(1, 'months').format('YYYY-MM-DD HH:mm:ss');
  mysql.query('SELECT userID as id FROM LOCATIONS WHERE beginAt>=? AND endAt<=? group by userID', [previousMonth, currentMonth], (err, result) => {
    if (err) {
      return reject(err);
    }
    if (!result || !result[0]) {
      return reject('No users found');
    }
    api.getCoalitions(1, 1) // force token
      .then(() => {
        registerUsers(result)
          .then(() => resolve())
          .catch(err => reject(err));
      }).catch(err => reject(err))
  });
});

module.exports = updateUsers;
