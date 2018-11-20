const moment = require('moment');
const async = require('async');
const mysql = require('../../libraries/database');

const global = (ranks, cb) => {
  let query = 'UPDATE USERS SET allRank=?, updated=now() WHERE ID=?';
  async.each(ranks, (rank, callback) => {
    values = [
      rank.rank,
      rank.userID,
    ];
    mysql.query(query, values, (err, result) => {
      callback(err, result);
    });
  }, (err) => {
    cb(err);
  });
};

const byPromo = (ranks, cb) => {
  let query = 'UPDATE USERS SET promoRank=?, updated=now() WHERE ID=?';
  async.eachLimit(ranks, 5, (rank, callback) => {
    values = [
      rank.rank,
      rank.userID,
    ];
    mysql.query(query, values, (err, result) => {
      callback(err, result);
    });
  }, (err) => {
    cb(err);
  });
};

const updateRanks = () => new Promise((resolve, reject) => {
  mysql.query('SELECT l.userID, l.level, l.beginAt FROM USERSCURSUS l INNER JOIN USERS u ON u.ID=l.userID WHERE l.cursusID=1', (err, result) => {
    if (err) {
      reject(err);
      return;
    }
    async.each(result, (user, callback) => {
      let resultWithRanks;
      mysql.query('SELECT COUNT(*) as rank FROM USERS u INNER JOIN USERSCURSUS uc ON uc.userID=u.ID WHERE uc.cursusID=1 AND uc.level>?', [user.level], (err, result) => {
        if (err) {
          return callback(err);
        }
        resultWithRanks = [{
          rank: result[0].rank + 1,
          userID: user.userID,
        }];
        global(resultWithRanks, (err) => {
          if (err) {
            return callback(err);
          }
          const yearBottom = moment(user.beginAt).startOf('year').format('YYYY-MM-DDTHH:mm:ss.SSS');
          const yearTop = moment(user.beginAt).startOf('year').add(1, 'year').format('YYYY-MM-DDTHH:mm:ss.SSS');
          mysql.query('SELECT COUNT(*) as rank FROM USERS u INNER JOIN USERSCURSUS uc ON uc.userID=u.ID WHERE uc.cursusID=1 AND uc.level>? AND uc.beginAt>=? AND uc.beginAt<?', [user.level, yearBottom, yearTop], (err, result) => {
            if (err) {
              return callback(err);
            }
            resultWithRanks = [{
              rank: result[0].rank + 1,
              userID: user.userID,
            }];
            byPromo(resultWithRanks, (err) => {
              if (err) {
                return callback(err);
              }
              callback();
            });
          });
        });
      });
    }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
});

module.exports = updateRanks;
