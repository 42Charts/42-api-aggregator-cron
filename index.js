require('dotenv').config({ path: process.env.PATH_ENV });
const cron = require('node-cron');
const cronMinutes = require('./cronTasks/minute');
const cronWeeks = require('./cronTasks/week');
const cronDays = require('./cronTasks/day');

/*
var cronMonths = require('./cronTasks/month');
*/

cron.schedule('*/10 * * * *', () => {
  //every 10 minutes
  cronMinutes()
    .then(() => console.log('Minutes task done'))
    .catch(err => console.log('Minutes task error', err));
});

cron.schedule('0 0 * * Sun', () => {
  // every sunday at 00:00
  cronWeeks()
    .then(() => console.log('Weeks task done'))
    .catch(err => console.log('Weeks task error', err));
});

cron.schedule('0 2 * * *', () => {
  // every days at 2am
  cronDays()
    .then(() => console.log('Days task done'))
    .catch(err => console.log('Days task error', err));
});

/*

cron.schedule('0 0 1 * *', () => {
  // every month the first day at 00:00
  cronMonths()
    .then()
    .catch(err => console.log(err));
});
*/
