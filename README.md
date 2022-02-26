# A plugin for craco to add paths specified in tsconfig.json file

## Instalation
    npm install craco-plugin-ts-paths

## Usage
in your carco config import the following function

    const {createTypescriptPathsPlugin} = require('craco-plugin-ts-paths')

and then add the plugin in the plugins section with

    plugins: [
        ...
        createTypescriptPathsPlugin(path_to_tsconfig_file),
        ...
    ]

