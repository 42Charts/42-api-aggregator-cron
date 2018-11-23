const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const registerApps = (apps, cb) => {
  mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
    async.each(apps, (app, callback) => {
      const params = [app.id, app.name, app.description, app.image, app.website, app.public, app.owner.id, app.rate_limit];
      mysql.query('INSERT IGNORE INTO APPS (ID, name, description, imageUrl, website, public, ownerID, rateLimit) VALUES ?', [[params]], (err, result) => {
        if (err) {
          return callback(err);
        }
        const params2 = [app.name, app.description, app.image, app.website, app.public, app.owner.id, app.rate_limit, app.id];
        mysql.query('UPDATE APPS SET name=?, description=?, imageUrl=?, website=?, public=?, ownerID=?, rateLimit=?, updated=now() WHERE ID=?', params2, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback();
        });
      });

    }, (err) => cb(err));
  });
};

const updateApps = () => new Promise((resolve, reject) => {
  const pageSize = 50;
  let page = 1;
  let resLength = pageSize;
  async.whilst(
    () => resLength >= pageSize,
    (callback) => {
      api.apps(page, pageSize)
        .then((apps) => {
          resLength = apps.length;
          page += 1;
          registerApps(apps, (err) => callback(err));
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

module.exports = updateApps;
