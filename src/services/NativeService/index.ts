import { autostart } from './autostart';
import { database } from './database';
import { log } from './log';
import { shortcut } from './shortcut';
import { window } from './window';

export type { PopupConfig, ShowPopupWindowParams, TauriLogPayload } from './types';

export { autostart, database, log, shortcut, window };

export const native = {
    window,
    shortcut,
    autostart,
    log,
    database,
} as const;
