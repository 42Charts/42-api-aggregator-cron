const moment = require('moment');
const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const parseHost = (host) => {
  let splited = host;
  const regexp = new RegExp('[^0-9]+[0-9]+', 'g');
  const regexpNumbers = new RegExp('[0-9]+', 'g');

  splited = splited.match(regexp);
  if (!splited || !splited.length || !splited[0] || !splited[1] || !splited[2]) {
    return null;
  }
  return {
    hostNotParsed: host,
    cluster: {
      name: splited[0],
      number: parseInt(splited[0].match(regexpNumbers)[0], 10),
    },
    row: {
      name: splited[1],
      number: parseInt(splited[1].match(regexpNumbers)[0], 10),
    },
    host: {
      name: splited[2],
      number: parseInt(splited[2].match(regexpNumbers)[0], 10),
    },
  };
};

const registerCluster = (cluster, campusID, callback) => {
  let query = 'SELECT ID FROM CLUSTERS WHERE name=? AND campusID=?';
  let values = [cluster.name, campusID];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result.length) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    valuesToAdd.push([ campusID, cluster.name, cluster.number ]);
    let query = 'INSERT IGNORE INTO CLUSTERS (campusID, name, number) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result.insertId);
    });
  });
};

const registerRow = (row, clusterID, callback) => {
  let query = 'SELECT ID FROM `ROWS` WHERE name=? AND clusterID=?';
  let values = [row.name, clusterID];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result.length) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    valuesToAdd.push([ clusterID, row.name, row.number ]);
    let query = 'INSERT IGNORE INTO `ROWS` (clusterID, name, number) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result.insertId);
    });
  });
};

const registerHost = (host, rowID, callback) => {
  let query = 'SELECT ID FROM HOSTS WHERE name=? AND rowID=?';
  let values = [host.name, rowID];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result.length) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    valuesToAdd.push([ rowID, host.name, host.number ]);
    let query = 'INSERT IGNORE INTO HOSTS (rowID, name, number) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result.insertId);
    });
  });
};

const registerLocations = (locations) => new Promise((resolve, reject) => {
  const valuesToAdd = [];
  const updateToAdd = [];
  async.eachLimit(locations, 1, (location, callback) => {
    const hostParsed = parseHost(location.host);
    if (!hostParsed) {
      return callback();
    }
    mysql.query('SET FOREIGN_KEY_CHECKS = 0', (err, result) => {
      registerCluster(hostParsed.cluster, location.campus_id, (err, clusterID) => {
        if (err) {
          return callback(err);
        }
        registerRow(hostParsed.row, clusterID, (err, rowID) => {
          if (err) {
            return callback(err);
          }
          registerHost(hostParsed.host, rowID, (err, hostID) => {
            if (err) {
              return callback(err);
            }
            const beginAt = new Date(location.begin_at);
            let endAt = null;
            let logtimeInSeconds = null;
            let parsedEndAt = null;
            if (location.end_at) {
              endAt = new Date(location.end_at);
              logtimeInSeconds = (endAt.getTime() - beginAt.getTime()) / 1000;
              parsedEndAt = moment(endAt).format('YYYY-MM-DD HH:mm:ss');
            }
            if (!location.user) {
              return callback();
            }
            valuesToAdd.push([
              location.id,
              hostID,
              location.user.id,
              logtimeInSeconds,
              moment(beginAt).format('YYYY-MM-DD HH:mm:ss'),
              parsedEndAt,
            ]);
            updateToAdd.push([
              logtimeInSeconds,
              parsedEndAt,
              location.id
            ]);
            callback();
          });
        });
      });
    });
  }, (err) => {
    if (err) {
      return reject(err);
    }
    if (!valuesToAdd.length) {
      return resolve();
    }
    let query = 'INSERT IGNORE INTO LOCATIONS (id, hostID, userID, logtimeInSeconds, beginAt, endAt) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return reject(err);
      }
      query = '';
      updateToAdd.forEach((u) => {
        query += mysql.format('UPDATE LOCATIONS SET logtimeInSeconds=?, endAt=?, updated=now() WHERE ID=?; ', u);
      });
      mysql.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
});

const updateLocations = () => new Promise((resolve, reject) => {
  const now = moment().format('YYYY-MM-DDTHH:mm:ss.SSS');
  const lastDay = moment().subtract(1, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS');

  const pageSize = 50;
  let page = 1;
  let resLength = pageSize;
  async.whilst(
    () => resLength >= pageSize,
    (callback) => {
      api.getLocations(page, pageSize, lastDay, now)
        .then((locations) => {
          resLength = locations.length;
          page += 1;
          registerLocations(locations)
            .then(() => callback())
            .catch(err => callback(err));
        })
        .catch(err => {
          callback(err);
        });
    },
    (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    }
  );
});

module.exports = updateLocations;
