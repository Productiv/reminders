module.exports = function(app) {
  app.use('/api', require('./reminders'));
  app.use('/', require('./views'));
};
