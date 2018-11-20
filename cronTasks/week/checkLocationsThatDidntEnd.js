const moment = require('moment');
const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const updateLocation = (res, callback) => {
  let query = 'UPDATE LOCATIONS SET endAt=?, logtimeInSeconds=?, updated=now() WHERE ID=?';
  const endAt = new Date(res.end_at);
  const beginAt = new Date(res.begin_at);
  logtimeInSeconds = (endAt.getTime() - beginAt.getTime()) / 1000;
  const values = [
    moment(endAt).format('YYYY-MM-DD HH:mm:ss'),
    logtimeInSeconds,
    res.ID,
  ];
  mysql.query(query, values, (err) => {
    callback(err);
  });
};

const checkLocationsThatDidntEnd = () => new Promise((resolve, reject) => {
  mysql.query('SELECT ID, beginAt, endAt FROM LOCATIONS WHERE endAt IS NULL', (err, result) => {
    if (err) {
      reject(err);
      return;
    }
    api.getSpecificLocation(7465809) // request to refresh token
      .then(() => {
        async.each(result, (location, callback) => {
          api.getSpecificLocation(location.ID)
            .then((res) => {
              if (res && res.end_at) {
                return updateLocation(res, callback);
              }
              callback();
            }).catch(err => callback(err));
        }, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      }).catch(err => reject(err));
  });
});

module.exports = checkLocationsThatDidntEnd;
