const { generateProjectDocs } = require('./helper');

module.exports = {
  execute: (site = 'default', sourceKey) => generateProjectDocs(site, { sourceKey }),
};
