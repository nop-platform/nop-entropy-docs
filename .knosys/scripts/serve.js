const { execute, copyProjectDocTheme } = require('./helper');

module.exports = {
  execute: (site = 'default') => {
    copyProjectDocTheme(site);
    execute('site', 'serve', site);
  }
};
