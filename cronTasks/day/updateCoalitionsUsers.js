const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const registerUsersCoalitions = (usersCoalitions, cb) => {
  mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
    async.each(usersCoalitions, (row, callback) => {
      const params = [row.id, row.user_id || null, row.coalition_id, row.score, row.rank];
      mysql.query('INSERT IGNORE INTO USERSCOALITIONS (id, userID, coalitionID, score, rank) VALUES ?', [[params]], (err, result) => {
        if (err) {
          return callback(err);
        }
        const params2 = [row.score, row.rank, row.id];
        mysql.query('UPDATE USERSCOALITIONS SET score=?, rank=?, updated=now() WHERE ID=?', params2, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback();
        });
      });

    }, (err) => cb(err));
  });
};

const updateCursusUsers = () => new Promise((resolve, reject) => {
  const pageSize = 50;
  let page = 1;
  let resLength = pageSize;
  async.whilst(
    () => resLength >= pageSize,
    (callback) => {
      api.usersCoalitions(page, pageSize)
        .then((usersCoalitions) => {
          resLength = usersCoalitions.length;
          page += 1;
          registerUsersCoalitions(usersCoalitions, (err) => callback(err));
        })
        .catch(err => callback(err));
    },
    (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    }
  );
});

module.exports = updateCursusUsers;
