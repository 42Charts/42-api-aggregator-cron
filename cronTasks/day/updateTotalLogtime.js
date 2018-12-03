var async = require('async');
const mysql = require('../../libraries/database');

const updateTotalLogsTimes = () => new Promise((resolve, reject) => {
  let query = 'SELECT u.ID as id, SUM(l.logtimeInSeconds) as totalLogTimeInSeconds from USERS u INNER JOIN USERSCURSUS uc ON uc.userID=u.ID INNER JOIN LOCATIONS l ON l.userID=u.ID INNER JOIN HOSTS h ON h.ID=l.hostID INNER JOIN CURSUS c ON c.ID=uc.cursusID WHERE h.deprecated=0 AND c.ID=1 GROUP BY u.ID';
  mysql.query(query, (err, result) => {
    if (err) {
      return reject(err);
    }
    async.each(result, (row, callback) => {
      mysql.query('UPDATE USERS SET totalLogTime=? WHERE ID=?', [row.totalLogTimeInSeconds, row.id], (err, result) => {
        if (err) {
          return callback(err);
        }
        callback();
      });
    }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
});

module.exports = updateTotalLogsTimes;
