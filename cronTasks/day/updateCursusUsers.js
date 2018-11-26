const async = require('async');
const moment = require('moment');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const registerUsersCursus = (usersCursus, cb) => {
  async.each(usersCursus, (row, callback) => {
    let endAt = null;
    let beginAt = moment(row.begin_at).format('YYYY-MM-DD HH:mm:ss');
    if (row.end_at) {
      endAt = moment(row.end_at).format('YYYY-MM-DD HH:mm:ss');
    }
    const params = [row.id, row.grade, row.user.id || null, row.cursus.id, row.level, beginAt, endAt];
    mysql.query('INSERT IGNORE INTO USERSCURSUS (ID, grade, userID, cursusID, level, beginAt, endAt) VALUES ?', [[params]], (err, result) => {
      if (err) {
        return callback(err);
      }
      const params2 = [row.level, row.grade, endAt, row.id];
      mysql.query('UPDATE USERSCURSUS SET level=?, grade=?, endAt=?, updated=now() WHERE ID=?', params2, (err, result) => {
        if (err) {
          return callback(err);
        }
        callback();
      });
    });
  }, (err) => cb(err));
};

const updateCursusUsers = () => new Promise((resolve, reject) => {
  const pageSize = 50;
  let page = 1;
  let resLength = pageSize;
  async.whilst(
    () => resLength >= pageSize,
    (callback) => {
      api.usersCursus(page, pageSize)
        .then((usersCursus) => {
          resLength = usersCursus.length;
          page += 1;
          mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
            if (err) {
              return callback(err);
            }
            registerUsersCursus(usersCursus, (err) => callback(err));
          });
        })
        .catch(err => callback());
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
