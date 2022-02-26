import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin';

interface ModuleScopePluginProps {
    appSrcs: string[];
    allowedFiles: Set<string>;
}

function createPluginModParams(
    plugin: ModuleScopePlugin,
    appSrcs: ReadonlyArray<string>,
    allowedFiles: ReadonlyArray<string> = []
): [ReadonlyArray<string>, ReadonlyArray<string>] {
    const pluginProps = (plugin as any as ModuleScopePluginProps);
    return [
        [
            ...pluginProps.appSrcs,
            ...appSrcs,
        ],
        [
            ...pluginProps.allowedFiles,
            ...allowedFiles,
        ],
    ];
}

export default class ModuleScopePluginMod extends ModuleScopePlugin {
    constructor(plugin: ModuleScopePlugin, appSrcs: ReadonlyArray<string>, allowedFiles: ReadonlyArray<string> = []) {
        super(...createPluginModParams(plugin, appSrcs, allowedFiles));
    }
}