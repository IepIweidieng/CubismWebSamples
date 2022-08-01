/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LogLevel } from '@framework/live2dcubismframework';
import appConfigDefault from '../lappconfigdefault.json';

export { appConfigDefault };
export const appConfig: IAppConfig = JSON.parse(
  JSON.stringify(appConfigDefault)
) as IAppConfig;

/**
 * Sample Appで使用する定数
 */
export interface IAppConfig {
  // Use the canvas with this ID, or use a newly created canvas ('' or any invalid ID)
  _CanvasId: string;

  // Canvas width and height pixel values, or dynamic screen size ('auto').
  CanvasSize: { width: number; height: number } | 'auto';

  // Enable high DPI display (for devices whose 1 CSS pixel !== 1 real pixel)
  // require the width and height of the canvas to be set by CSS if CanvasSize is 'auto'
  _CanvasHighDpi: boolean;

  // 画面
  ViewScale: number;
  ViewMaxScale: number;
  ViewMinScale: number;

  ViewLogicalLeft: number;
  ViewLogicalRight: number;
  ViewLogicalBottom: number;
  ViewLogicalTop: number;

  ViewLogicalMaxLeft: number;
  ViewLogicalMaxRight: number;
  ViewLogicalMaxBottom: number;
  ViewLogicalMaxTop: number;

  // 相対パス
  ResourcesPath: string;

  // モデルの後ろにある背景の画像ファイル, or disable the image ('' or any invalid path)
  BackImageName: string;

  // 歯車, or disable the image ('' or any invalid path)
  GearImageName: string;

  // 終了ボタン, or disable the image ('' or any invalid path)
  PowerImageName: string;

  // モデル定義---------------------------------------------
  // モデルを配置したディレクトリ名の配列
  // ディレクトリ名とmodel3.jsonの名前を一致させておくこと
  ModelDir: string[];
  ModelDirSize: number;

  // 外部定義ファイル（json）と合わせる
  MotionGroupIdle: string; // アイドリング
  MotionGroupTapBody: string; // 体をタップしたとき

  // 外部定義ファイル（json）と合わせる
  HitAreaNameHead: string;
  HitAreaNameBody: string;

  // モーションの優先度定数
  PriorityNone: number;
  PriorityIdle: number;
  PriorityNormal: number;
  PriorityForce: number;

  // デバッグ用ログの表示オプション
  DebugLogEnable: boolean;
  DebugTouchLogEnable: boolean;

  // Frameworkから出力するログのレベル設定
  CubismLoggingLevel: LogLevel;

  // デフォルトのレンダーターゲットサイズ
  RenderTargetWidth: number;
  RenderTargetHeight: number;

  // Set the render screen to this color when the screen is cleared
  // [red, green, blue, alpha] (0.0 to 1.0)
  _RenderClearColor: [number, number, number, number];

  // Set the playback volumn of motion sound
  // Normal: 100% (1.0), mute: 0% (0.0)
  _SoundPlaybackVolumn: number;

  // Relative path to the custom configuration file
  _ConfigFileName: string;
}

/**
 * App configuration manager
 */
export class LAppDefine {
  /**
   * Reset the configuration to the default.
   * @return whether the operation successed
   */
  public static reset(): boolean {
    Object.keys(appConfig).forEach(key => delete appConfig[key]);
    Object.assign(
      appConfig,
      JSON.parse(JSON.stringify(appConfigDefault)) as IAppConfig
    );
    return true;
  }

  /**
   * Load the configuration. Not specified options kept their old value.
   * @param config an object containing options
   * @return whether the operation successed
   */
  public static load(config: IAppConfig): boolean {
    Object.assign(appConfig, config);
    return true;
  }

  /**
   * Load the configuration from a config file. Not specified options kept their old value.
   * @param configFile an JSON file containing an object for options
   * @param whether the loading is required to success
   * @return a Promise whose resolved value indicates whether the operation successed
   */
  public static async loadFromFile(
    configFile: string,
    required = false
  ): Promise<boolean> {
    return fetch(configFile)
      .then(response => response.json())
      .then(config => {
        Object.assign(appConfig, config as IAppConfig);
        return true;
      })
      .catch(e => {
        if (required) {
          throw e;
        }
        return false;
      });
  }
}
