import './styles/patch.css';

import { AbstractFileFilter, showAllNumbersClass, withSubfolderClass, doWithFileExplorer } from 'misc';
import { around } from 'monkey-around';
import { FileExplorer, Plugin, TFile } from 'obsidian';
import { VaultHandler } from 'vault-handler';

import { setupCount } from './folder-count';
import { DEFAULT_SETTINGS, FENoteCountSettingTab } from './settings';

export default class FileExplorerNoteCount extends Plugin {
    settings = DEFAULT_SETTINGS;
    fileExplorer?: FileExplorer;
    vaultHandler = new VaultHandler(this);
    rootFolderEl: Element | null = null;
    explorerNavHeaderSelector: string = '.workspace-leaf-content[data-type="file-explorer"] .nav-header';
    rootFolderClassName: string = 'oz-explorer-root-folder';

    async onload() {
        console.log('loading FileExplorerNoteCount');
        this.addSettingTab(new FENoteCountSettingTab(this.app, this));
        await this.loadSettings();
        this.app.workspace.onLayoutReady(this.initialize);
    }

    onunload() {
        console.log('unloading FileExplorerNoteCount');
        this.initialize(true);
    }

    async loadSettings() {
        this.settings = { ...this.settings, ...(await this.loadData()) };
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    initialize = (revert = false) => {
        let plugin = this;

        const getViewHandler = (revert: boolean) => (view: FileExplorer) => {
            this.fileExplorer = view;
            setupCount(this, revert);
            if (!revert) {
                this.registerEvent(this.app.workspace.on('css-change', this.setupRootFolder));
                this.vaultHandler.registerVaultEvent();
                if (this.settings.showAllNumbers) document.body.addClass('oz-show-all-num');
            } else {
                for (const el of document.getElementsByClassName(withSubfolderClass)) {
                    el.removeClass(withSubfolderClass);
                }
                document.body.removeClass(showAllNumbersClass);
            }
            if (!revert) {
                // when file explorer is closed (workspace changed)
                // try to update fehanlder with new file explorer instance
                this.register(
                    around(view, {
                        onClose: (next) =>
                            function (this: FileExplorer) {
                                setTimeout(() => doWithFileExplorer(plugin, getViewHandler(false)), 1e3);
                                return next.apply(this);
                            },
                    })
                );
            }
        };
        doWithFileExplorer(plugin, getViewHandler(revert));
    };

    setupRootFolder = (revert = false) => {
        // Root folder functionality disabled since we only want INBOX counts
        return;
    };

    reloadCount() {
        setupCount(this);
    }

    get fileFilter(): AbstractFileFilter {
        let list = this.settings.filterList;
        return (af) => {
            if (af instanceof TFile) {
                const { extension: target } = af;
                // if list is empty, filter nothing
                if (list.length === 0) return true;
                else if (this.settings.blacklist) return !list.includes(target);
                else return list.includes(target);
            } else return false;
        };
    }
}
