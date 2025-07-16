import './styles/folder-count.css';

import FileExplorerNoteCount from 'main';
import { AbstractFileFilter, getParentPath, isFolder, isParent, iterateItems, withSubfolderClass } from 'misc';
import { AFItem, FolderItem, TFolder } from 'obsidian';

const countFolderChildren = (folder: TFolder, filter: AbstractFileFilter) => {
    let count = 0;
    for (const af of folder.children) {
        if (filter(af)) count++;
        if (af instanceof TFolder) count += countFolderChildren(af, filter);
    }
    return count;
};

/** filter out all path that is the parent of existing path */
const filterParent = (pathList: string[]): Set<string> => {
    const list = Array.from(pathList);
    list.sort();
    for (let i = 0; i < list.length; i++) {
        if (i < list.length - 1 && (list[i] === list[i + 1] || isParent(list[i], list[i + 1]))) {
            list.shift();
            i--;
        }
    }
    return new Set(list);
};

/** get all parents and add to set if not exist */
const getAllParents = (path: string, set: Set<string>): void => {
    let parent = getParentPath(path);
    while (parent && !set.has(parent)) {
        set.add(parent);
        parent = getParentPath(parent);
    }
};

/**
 * Update folder count of target's parent
 */
export const updateCount = (targetList: string[], plugin: FileExplorerNoteCount): void => {
    const set = filterParent(targetList);
    for (const path of targetList) {
        getAllParents(path, set);
    }
    
    // Filter to only include INBOX folders and their parents
    const inboxPaths = new Set<string>();
    for (const path of set) {
        const folder = plugin.app.vault.getAbstractFileByPath(path);
        if (folder instanceof TFolder && folder.name === 'INBOX') {
            inboxPaths.add(path);
        }
    }
    
    // set count of path
    const { fileExplorer, fileFilter } = plugin;
    if (!fileExplorer) {
        console.error('fileExplorer missing');
        return;
    }
    for (const path of inboxPaths) {
        // check if path available
        if (!fileExplorer.fileItems[path]) continue;
        setCount(fileExplorer.fileItems[path] as FolderItem, fileFilter);
    }
    // Don't update root folder count since we only want INBOX
    // empty waitingList
    targetList.length = 0;
};

const setupRootCount = (plugin: FileExplorerNoteCount) => {
    if (plugin.rootFolderEl) {
        let rootFolderElChildren = plugin.rootFolderEl.children;
        if (rootFolderElChildren && rootFolderElChildren.length > 0) {
            let totalCount = countFolderChildren(plugin.app.vault.getAbstractFileByPath('/') as TFolder, plugin.fileFilter);
            rootFolderElChildren[0].setAttr('data-count', totalCount.toString());
        }
    }
};

export const setupCount = (plugin: FileExplorerNoteCount, revert = false) => {
    if (!plugin.fileExplorer) throw new Error('fileExplorer not found');
    // Don't setup root folder count since we only want INBOX
    // Iterate other items and include new counts
    iterateItems(plugin.fileExplorer.fileItems, (item: AFItem) => {
        if (!isFolder(item)) return;
        // Only process INBOX folders
        if (!revert && item.file.name !== 'INBOX') return;
        if (revert) removeCount(item);
        else setCount(item, plugin.fileFilter);
    });
};

export const setCount = (item: FolderItem, filter: AbstractFileFilter) => {
    // Only show count for folders named 'INBOX'
    if (item.file.name !== 'INBOX') return;
    
    const count = countFolderChildren(item.file, filter);
    item.selfEl.dataset['count'] = count.toString();
    item.selfEl.toggleClass(withSubfolderClass, Array.isArray(item.file.children) && item.file.children.some((af) => af instanceof TFolder));
};

const removeCount = (item: FolderItem) => {
    if (item.selfEl.dataset['count']) delete item.selfEl.dataset['count'];
    item.selfEl.removeClass(withSubfolderClass);
};
