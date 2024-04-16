const { execSync } = require('child_process');

const { rm, resolveSiteSrcPath, copyProjectDocTheme } = require('./helper');

module.exports = {
  execute: (site = 'default') => {
    const srcPath = resolveSiteSrcPath(site);
    const flags = [
      `--source ${srcPath}`,
      `--cwd ${srcPath}`,
      `--config ${srcPath}/_config.yml`,
      '-b',
      '-f',
    ];

    copyProjectDocTheme(site);
    rm([`${srcPath}/db.json`, `${srcPath}/public`]);

    execSync(`cd ${srcPath} && hexo generate ${flags.join(' ')}`, { stdio: 'inherit' });
  }
};
