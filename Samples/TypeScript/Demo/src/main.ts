/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import { appConfig, LAppDefine } from './lappdefine';

export { appConfig, LAppDefine };

/**
 * ブラウザロード後の処理
 */
window.onload = async (): Promise<void> => {
  // try to load the custom configuration; skip when loading fails
  await LAppDefine.loadFromFile(appConfig._ConfigFileName);
  // create the application instance
  if (LAppDelegate.getInstance().initialize() == false) {
    return;
  }

  LAppDelegate.getInstance().run();
};

/**
 * 終了時の処理
 */
window.onbeforeunload = (): void => LAppDelegate.releaseInstance();
