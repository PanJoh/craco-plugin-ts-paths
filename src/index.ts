import { getLoaders, loaderByName } from '@craco/craco';
import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin';
import ModuleScopePluginMod from './module-scope-plugin-mod';
import { Configuration, ResolvePluginInstance } from 'webpack'
const path = require('path');
const fs = require('fs');

interface LoaderMatch {
    loader: {
        test: RegExp;
        include?: string | string[];
    };
}

function testLoaderMatch(match: any): match is LoaderMatch {
    return match.loader?.test instanceof RegExp;
}

function getBabelLoaders(webpackConfig: Configuration) {
    const { hasFoundAny, matches } = getLoaders(webpackConfig, loaderByName('babel-loader'));
    if (hasFoundAny) {
        return (matches as any[]).filter(match => {
            if (!testLoaderMatch(match)) {
                return;
            }
            if (match.loader?.test != null) {
                if (match.loader.test instanceof RegExp) {
                    return match.loader.test.test('.ts') || match.loader.test.test('.tsx');
                }
            }

            return false;
        }) as LoaderMatch[];
    }

    return [];
}

function processLoaders(matches: LoaderMatch[], paths: string[]) {
    matches.forEach(match => {
        let includes = match.loader.include ?? [];
        includes = Array.isArray(includes) ? includes : [includes];
        match.loader.include = [
            ...includes,
            ...paths,
        ];
    });
}

function collectPaths(tsconfig: any) {
    let baseUrl: any = null;
    let paths: {[ident: string]: string[]} = {};
    while(tsconfig != null) {
        if (baseUrl == null) {
            baseUrl = tsconfig.compilerOptions.baseUrl;
        }

        paths = {
            ...paths,
            ...tsconfig.compilerOptions.paths,
        };

        tsconfig = tsconfig.extends;
    }

    if (baseUrl == null) {
        throw new Error('No tsconfig baseurl given');
    }

    let absPaths: string[] = [];
    for (const [ident ,pathArray] of Object.entries(paths)) {
        const newPaths = pathArray.map(pathEntry => path.join(baseUrl, pathEntry));
        paths[ident] = newPaths;
        absPaths = [
            ...absPaths,
            ...newPaths,
        ];
    }

    return {paths, absPaths};

}

function loadTsConfig(filePath: string) {
    const currentDirName = path.dirname(filePath);
    const tsConfigJson = fs.readFileSync(filePath, { encoding: 'utf-8'});
    const tsConfig = JSON.parse(tsConfigJson);
    if (tsConfig.compilerOptions.baseUrl != null) {
        tsConfig.compilerOptions.baseUrl = path.resolve(currentDirName, tsConfig.compilerOptions.baseUrl);
    }
    if (tsConfig.extends != null) {
        tsConfig.extends = loadTsConfig(path.resolve(currentDirName, tsConfig.extends));
    }

    return tsConfig;
}

export function testLoadTsConfig(filePath: string, outPath: string) {
    const tsConfig = loadTsConfig(filePath);
    if (outPath != null ) {
        fs.writeFileSync(outPath, JSON.stringify(tsConfig, null, 2), { encoding: 'utf-8'});
    } else {
        return tsConfig;
    }

}

export function testCollectPaths(tsConfig: any, outPath: string) {
    const collectedPaths = collectPaths(tsConfig);
    if (outPath != null) {
        fs.writeFileSync(outPath, JSON.stringify(collectedPaths, null, 2), { encoding: 'utf-8'});
    } else { 
        return collectedPaths;
    }
}

export function createTypescriptPathsPlugin(tsConfigPath: any) {
    const tsConfig = loadTsConfig(tsConfigPath);
    const collectedPaths = collectPaths(tsConfig);

    return {
        plugin: {
            overrideWebpackConfig: ({webpackConfig}: {webpackConfig: Configuration}) => {
                const loaders = getBabelLoaders(webpackConfig);
                if (loaders.length !== 0) {
                    processLoaders(loaders, collectedPaths.absPaths);
                }

                const plugins = webpackConfig.resolve?.plugins?.map(plugin => 
                    plugin instanceof ModuleScopePlugin 
                        ? new ModuleScopePluginMod(plugin, collectedPaths.absPaths) as ResolvePluginInstance
                        : plugin,
                ) ?? [];

                // const moduleScopePlugin: any = webpackConfig.resolve?.plugins?.find(plugin => plugin instanceof ModuleScopePlugin);
                // if (moduleScopePlugin) {
                //     moduleScopePlugin.appSrcs = [
                //         ...moduleScopePlugin.appSrcs,
                //         ...collectedPaths.absPaths,
                //     ];
                // }
                
                const resolve = webpackConfig.resolve ?? {}
                const aliases = resolve.alias ?? {};
                webpackConfig.resolve = {
                    ...resolve,
                    alias: {
                        ...aliases,
                        ...collectedPaths.paths,
                    },
                    plugins,
                }

                return webpackConfig;
            }
        }
    }
} 