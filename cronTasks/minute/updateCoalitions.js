const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const registerCoalitions = (coalitions, cb) => {
  mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
    async.each(coalitions, (coalition, callback) => {
      const params = [coalition.id, coalition.score, coalition.color, coalition.image_url];
      mysql.query('INSERT IGNORE INTO COALITIONS (ID, score, color, imageUrl) VALUES ?', [[params]], (err, result) => {
        if (err) {
          return callback(err);
        }
        const params2 = [coalition.score, coalition.color, coalition.image_url, coalition.id];
        mysql.query('UPDATE COALITIONS SET score=?, color=?, imageUrl=?, updated=now() WHERE ID=?', params2, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback();
        });
      });

    }, (err) => cb(err));
  });
};

const updateCoalitions = () => new Promise((resolve, reject) => {
  const pageSize = 50;
  let page = 1;
  let resLength = pageSize;
  async.whilst(
    () => resLength >= pageSize,
    (callback) => {
      api.getCoalitions(page, pageSize)
        .then((coalitions) => {
          resLength = coalitions.length;
          page += 1;
          registerCoalitions(coalitions, (err) => callback(err));
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

module.exports = updateCoalitions;
