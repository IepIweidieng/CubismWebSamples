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
  // Canvas width and height pixel values, or dynamic screen size ('auto').
  CanvasSize: { width: number; height: number } | 'auto';

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

  // モデルの後ろにある背景の画像ファイル
  BackImageName: string;

  // 歯車
  GearImageName: string;

  // 終了ボタン
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
}
