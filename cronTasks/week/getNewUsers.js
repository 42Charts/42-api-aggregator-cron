const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');
const registerUsers = require('../../tools/registerUsers');

const getNewUsers = () => new Promise((resolve, reject) => {
  mysql.query('SELECT ID FROM USERS ORDER BY ID DESC LIMIT 0,1', (err, result) => {
    if (err) {
      return reject(err);
    }
    const pageSize = 50;
    let page = 1;
    let resLength = pageSize;
    async.whilst(
      () => resLength >= pageSize,
      (callback) => {
        api.getUsers(page, pageSize, result[0].ID)
          .then((users) => {
            resLength = users.length;
            page += 1;
            registerUsers(users)
              .then(() => callback())
              .catch(err => callback(err));
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
});

module.exports = getNewUsers;
