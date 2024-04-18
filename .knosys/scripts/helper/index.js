const { resolve: resolvePath } = require('path');
const { pick } = require('@ntks/toolbox');
const themeUtils = require('@nop-community/hexo-theme-site');

const ksUtils = require('./knosys');

const { resolveRootPath, getConfig, readData, saveData, ensureDirExists, copyFileDeeply } = ksUtils;
const rootPath = resolveRootPath();

function resolveSiteSrcPath(site) {
  return resolvePath(rootPath, themeUtils.resolveSiteSrcDir(site));
}

function copyProjectDocTheme(site) {
  if (getConfig(`site.${site}.generator`) !== 'hexo') {
    return;
  }

  const siteSrcPath = resolveSiteSrcPath(site);
  const pkg = readData(`${rootPath}/package.json`);
  const themeDistPath = `${siteSrcPath}/themes/nop-project`;

  ensureDirExists(themeDistPath, true);
  copyFileDeeply(`${rootPath}/node_modules/@nop-community/hexo-theme-site`, themeDistPath, ['README.md', 'CHANGELOG.md', 'package.json', 'index.js']);

  saveData(`${siteSrcPath}/package.json`, { name: `${pkg.name}-site`, ...pick(pkg, ['version', 'private', 'hexo', 'dependencies']) });
}

module.exports = { ...ksUtils, ...themeUtils, resolveSiteSrcPath, copyProjectDocTheme };
