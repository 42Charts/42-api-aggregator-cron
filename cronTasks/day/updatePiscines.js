const async = require('async');
const moment = require('moment');
const _ = require('underscore');
const mysql = require('../../libraries/database');

const updatePools = (poolID, pool, callback) => {
  mysql.query('UPDATE POOLS SET nbUsers=?, nbStudents=?, averageLogTime=?, averageLogTimeStudents=?, updated=now() WHERE ID=?', [pool.nbUsers, pool.nbStudents, pool.averageLogTime, pool.averageLogTimeStudents, poolID], err => callback(err));
};

const addPools = (pool, callback) => {
  mysql.query('INSERT INTO POOLS (cursusID, campusID, nbUsers, nbStudents, averageLogTime, averageLogTimeStudents, year, month) VALUES ?',
    [[[
      pool.cursusID,
      pool.campusID,
      pool.nbUsers,
      pool.nbStudents,
      pool.averageLogTime,
      pool.averageLogTimeStudents,
      pool.poolYear,
      pool.poolMonth
    ]]],
    err => callback(err)
  );
};

const addUsersNumber = (pool, callback) => {
  let poolWithInfos = {
    cursusID: pool.cursusID,
    campusID: pool.campusID,
    poolYear: pool.poolYear,
    poolMonth: pool.poolMonth,
  };
  mysql.query('SELECT COUNT(u.ID) as total FROM USERS u INNER JOIN USERSCAMPUS c ON c.userID=u.ID WHERE u.poolYear=? AND u.poolMonth=? AND c.campusID=? AND c.isPrimary=1', [pool.poolYear, pool.poolMonth, pool.campusID], (err, result) => {
    if (err) {
      return callback(err);
    }
    poolWithInfos.nbUsers = result[0].total;
    mysql.query('SELECT COUNT(u.ID) as total FROM USERS u INNER JOIN USERSCAMPUS c ON c.userID=u.ID INNER JOIN USERSCURSUS cu ON cu.userID=u.ID WHERE u.poolYear=? AND u.poolMonth=? AND c.campusID=? AND cu.cursusID=1', [pool.poolYear, pool.poolMonth, pool.campusID], (err, result) => {
      if (err) {
        return callback(err);
      }
      poolWithInfos.nbStudents = result[0].total;
      callback(null, poolWithInfos);
    });
  });
};

const addAverageLogs = (pool, callback) => {
  let qr = 'SELECT ' +
  'SUM(l.logtimeInSeconds) as total ' +
  'FROM LOCATIONS l ' +
  'INNER JOIN USERS u ' +
  'ON l.userID=u.ID ' +
  'INNER JOIN USERSCAMPUS cp ' +
  'ON cp.userID=u.ID ' +
  'INNER JOIN HOSTS h ' +
  'ON l.hostID=h.ID ' +
  'WHERE h.deprecated=0 ' +
  'AND l.beginAt>=? AND l.endAt<=? ' +
  'AND u.poolMonth=? AND u.poolYear=? AND cp.campusID=? AND cp.isPrimary=1 AND l.logtimeInSeconds > 0 GROUP BY l.userID';
  const start = moment().startOf('year').year(pool.poolYear).month(pool.poolMonth).subtract(10, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS');
  const end = moment().startOf('year').year(pool.poolYear).month(pool.poolMonth).add(1, 'months').add(10, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS');
  mysql.query(qr, [start, end, pool.poolMonth, pool.poolYear, pool.campusID], (err, logs) => {
    if (err) {
      return callback(err);
    }
    if (!logs || !logs[0]) {
      return callback(null, pool);
    }
    let total = 0;
    logs.forEach((l) => {
      total += l.total;
    });
    pool.averageLogTime = total / pool.nbUsers;
    qr = 'SELECT ' +
    'SUM(l.logtimeInSeconds) as total ' +
    'FROM LOCATIONS l ' +
    'INNER JOIN USERS u ' +
    'ON l.userID=u.ID ' +
    'INNER JOIN USERSCAMPUS cp ' +
    'ON cp.userID=u.ID ' +
    'INNER JOIN USERSCURSUS ' +
    'cu ON cu.userID=u.ID ' +
    'INNER JOIN HOSTS h ' +
    'ON l.hostID=h.ID ' +
    'WHERE h.deprecated=0 ' +
    'AND l.beginAt>=? AND l.endAt<=? ' +
    'AND u.poolMonth=? AND u.poolYear=? AND cp.campusID=? AND cp.isPrimary=1 AND l.logtimeInSeconds > 0 AND cu.cursusID=1 GROUP BY l.userID';
    mysql.query(qr, [start, end, pool.poolMonth, pool.poolYear, pool.campusID], (err, logs) => {
      if (err) {
        return callback(err);
      }
      if (!logs || !logs[0]) {
        return callback(null, pool);
      }
      let total = 0;
      logs.forEach((l) => {
        total += l.total;
      });
      pool.averageLogTimeStudents = total / pool.nbStudents;
      callback(null, pool);
    });
  });
};

const updatePiscines = () => new Promise((resolve, reject) => {
  let qr = 'SELECT u.ID as id, cu.ID as usercId, u.poolMonth, u.poolYear, c.campusID as campusID, cu.cursusID as cursusID, cu.beginAt ' +
      'FROM USERS u INNER JOIN USERSCAMPUS c ON c.userID=u.ID INNER JOIN USERSCURSUS cu ON cu.userID=u.ID ' +
      'WHERE c.isPrimary=1 AND (cu.cursusID=4 OR cu.cursusID=6 OR cu.cursusID=7) AND u.poolMonth IS NOT NULL AND u.poolYear IS NOT NULL AND u.ID!=201';
  mysql.query(qr, (err, result) => {
    if (err) {
      return reject(err);
    }
    if (!result || !result[0]) {
      return resolve();
    }
    let doublonsRemoved = {};
    result.forEach((r) => {
      if (!doublonsRemoved[r.id]) {
        doublonsRemoved[r.id] = r;
      }
    });
    const piscines = [];
    for (const [userId, piscine] of Object.entries(doublonsRemoved)) {
      let currentPiscine = _.find(piscines, (pi) => {
        if (pi.poolMonth === piscine.poolMonth &&
          pi.poolYear === piscine.poolYear &&
          pi.campusID === piscine.campusID &&
          pi.cursusID === piscine.cursusID) {
            return 1;
          }
          return 0;
      });
      if (currentPiscine) {
        currentPiscine.nbUsers += 1;
      } else {
        currentPiscine = {
          nbUsers: 1,
          poolYear: piscine.poolYear,
          poolMonth: piscine.poolMonth,
          campusID: piscine.campusID,
          cursusID: piscine.cursusID,
        };
        piscines.push(currentPiscine);
      }
    }
    const realPiscines = [];
    piscines.forEach((piscine) => {
      if (piscine.nbUsers > 40) {
        realPiscines.push(piscine);
      }
    });
    async.each(realPiscines, (piscine, callback) => {
      addUsersNumber(piscine, (err, piscinesWithInfos) => {
        if (err) {
          return callback(err);
        }
        addAverageLogs(piscinesWithInfos, (err, piscinesWithInfos) => {
          if (err) {
            return callback(err);
          }
          const params = [
            piscine.poolYear,
            piscine.poolMonth,
            piscine.campusID,
            piscine.cursusID,
          ];
          mysql.query('SELECT ID FROM POOLS WHERE year=? AND month=? AND campusID=? AND cursusID=?', params, (err, result) => {
            if (err) {
              return callback(err);
            }
            if (result && result[0]) {
              return updatePools(result[0].ID, piscinesWithInfos, callback);
            }
            addPools(piscinesWithInfos, callback);
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

module.exports = updatePiscines;
