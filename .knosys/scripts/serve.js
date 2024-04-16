const { resolve: resolvePath } = require('path');
const { pick } = require('@ntks/toolbox');

const { resolveRootPath, getConfig, readData, saveData, ensureDirExists, copyFileDeeply, execute } = require('./helper');

module.exports = {
  execute: (site = 'default') => {
    const { generator, source } =  getConfig(`site.${site}`);

    if (generator === 'hexo') {
      const rootPath = resolveRootPath();
      const siteSrcPath = resolvePath(rootPath, source || `./.knosys/sites/${site}`);
      const pkg = readData(`${rootPath}/package.json`);
      const themeDistPath = `${siteSrcPath}/themes/nop-project`;

      ensureDirExists(themeDistPath);
      copyFileDeeply(`${rootPath}/node_modules/@nop-community/hexo-theme-site`, themeDistPath, ['README.md', 'CHANGELOG.md', 'package.json', 'index.js']);

      saveData(`${siteSrcPath}/package.json`, { name: `${pkg.name}-site`, ...pick(pkg, ['version', 'private', 'hexo', 'dependencies']) });
    }

    execute('site', 'serve', site);
  }
};
