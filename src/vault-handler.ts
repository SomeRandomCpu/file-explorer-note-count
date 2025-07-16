import FileExplorerNoteCount from 'main';
import { updateCount } from 'folder-count';
import { getParentPath } from 'misc';
import { App, debounce, TAbstractFile, Vault } from 'obsidian';

export class VaultHandler {
    waitingList: string[] = [];
    get app(): App {
        return this.plugin.app;
    }
    get vault(): Vault {
        return this.plugin.app.vault;
    }
    plugin: FileExplorerNoteCount;
    constructor(plugin: FileExplorerNoteCount) {
        this.plugin = plugin;
    }

    update = debounce(() => updateCount(this.waitingList, this.plugin), 500, true);

    handler = (...args: (string | TAbstractFile)[]) => {
        for (const arg of args) {
            const path = arg instanceof TAbstractFile ? arg.path : arg;
            // Only add to waiting list if the change affects an INBOX folder
            const folder = this.app.vault.getAbstractFileByPath(path);
            const parentPath = getParentPath(path);
            const parentFolder = parentPath ? this.app.vault.getAbstractFileByPath(parentPath) : null;
            
            // Check if the file/folder itself is INBOX or if its parent is INBOX
            if ((folder && folder.name === 'INBOX') || (parentFolder && parentFolder.name === 'INBOX')) {
                this.waitingList.push(path);
            }
        }
        this.update();
    };

    registerVaultEvent = () => {
        this.plugin.registerEvent(this.vault.on('create', this.handler));
        this.plugin.registerEvent(this.vault.on('rename', this.handler));
        this.plugin.registerEvent(this.vault.on('delete', this.handler));
    };
}
