const moment = require('moment');
const async = require('async');
const mysql = require('../../libraries/database');
const api = require('../../libraries/api');

const parseHost = (host) => {
  let splited = host;
  let post;
  let zone;
  let row;
  let cluster;
  let zoneNumber = null;
  let clusterNumber = null;

  const regexpNumbers = new RegExp('[0-9]+', 'g');
  const regexZone = new RegExp('[z]+[0-9]+', 'g');
  const regexCluster = new RegExp('[e,f]+[0-9]+', 'g');
  const regexRow = new RegExp('[r]+[0-9]+', 'g');
  const regexPost = new RegExp('[p,s]+[0-9]+', 'g');

  post = splited.match(regexPost);
  row = splited.match(regexRow);
  zone = splited.match(regexZone);
  cluster = splited.match(regexCluster);
  if (!post || !row || (!zone && !cluster)) {
    return null;
  }
  if (zone) {
    zone = zone[0];
    zoneNumber = parseInt(zone.match(regexpNumbers)[0], 10);
  }
  if (cluster) {
    cluster = cluster[0];
    clusterNumber = parseInt(cluster.match(regexpNumbers)[0], 10);
  }
  return {
    hostNotParsed: host,
    zone: {
      name: zone,
      number: zoneNumber,
    },
    cluster: {
      name: cluster,
      number: clusterNumber,
    },
    row: {
      name: row[0],
      number: parseInt(row[0].match(regexpNumbers)[0], 10),
    },
    host: {
      name: post[0],
      number: parseInt(post[0].match(regexpNumbers)[0], 10),
    },
  };
};

const registerZone = (zone, campusID, clusterID, callback) => {
  if (!zone.name) {
    return callback();
  }
  let query = 'SELECT ID FROM ZONES WHERE name=? AND ((campusID=? AND campusID IS NOT NULL) OR (clusterID=? AND clusterID IS NOT NULL))';
  let values = [zone.name, campusID, clusterID];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result[0]) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    if (campusID && clusterID) {
      campusID = null;
    }
    valuesToAdd.push([ clusterID, campusID, zone.name, zone.number ]);
    let query = 'INSERT IGNORE INTO ZONES (clusterID, campusID, name, number) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result.insertId);
    });
  });
};

const registerCluster = (cluster, campusID, callback) => {
  if (!cluster.name) {
    return callback();
  }
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

const registerRow = (row, clusterID, zoneID, callback) => {
  let query = 'SELECT ID FROM `ROWS` WHERE name=? AND ((clusterID=? AND clusterID IS NOT NULL) OR (zoneID=? AND zoneID IS NOT NULL))';
  let values = [row.name, clusterID, zoneID];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result.length) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    if (clusterID && zoneID) {
      clusterID = null;
    }
    valuesToAdd.push([ clusterID, zoneID, row.name, row.number ]);
    let query = 'INSERT IGNORE INTO `ROWS` (clusterID, zoneID, name, number) VALUES ?';
    mysql.query(query, [valuesToAdd], (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result.insertId);
    });
  });
};

const registerHost = (hostNotParsed, host, rowID, callback) => {
  let query = 'SELECT ID FROM HOSTS WHERE name=? AND rowID=? AND fullname=?';
  let values = [host.name, rowID, hostNotParsed];
  mysql.query(query, values, (err, result) => {
    if (err) {
      return callback(err);
    }
    if (result && result.length) {
      return callback(null, result[0].ID);
    }
    const valuesToAdd = [];
    valuesToAdd.push([ rowID, host.name, hostNotParsed, host.number ]);
    let query = 'INSERT IGNORE INTO HOSTS (rowID, name, fullname, number) VALUES ?';
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
        registerZone(hostParsed.zone, location.campus_id, clusterID, (err, zoneID) => {
          if (err) {
            return callback(err);
          }
          registerRow(hostParsed.row, clusterID, zoneID, (err, rowID) => {
            if (err) {
              return callback(err);
            }
            registerHost(hostParsed.hostNotParsed, hostParsed.host, rowID, (err, hostID) => {
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

module.exports = updateLocations;
