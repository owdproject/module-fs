<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">File System module</h1>
<h3 align="center">
    File System Module for Open Web Desktop.
</h3>

## Overview

This module enables a filesystem allowing [ZenFS](https://github.com/zen-fs/core) to be implemented in each theme or app.

## Features

- Implement a Node.js-like filesystem using `ZenFS`
- Allow different mounts like temp folders and zip files

## Installation

```bash
owd install-module @owdproject/module-fs
```

## Configuration

You could set this configuration in `/desktop/owd.config.ts`:

```json
fs: {
  mounts: {
    '/music/meteora': '/meteora.zip',
    '/home': 'WebStorage',
    '/tmp': 'InMemory',
  },
},
```

If you are mounting zips, place them in your `/desktop/public` folder.

## License

This module is released under the [MIT License](LICENSE).
