/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismFramework, Option } from '@framework/live2dcubismframework';

import { appConfig } from './lappdefine';
import { LAppLive2DManager } from './lapplive2dmanager';
import { LAppPal } from './lapppal';
import { LAppTextureManager } from './lapptexturemanager';
import { LAppView } from './lappview';

export let canvas: HTMLCanvasElement = null;
export let canvasPixelRatio = 1;
export let s_instance: LAppDelegate = null;
export let gl: WebGLRenderingContext = null;
export let frameBuffer: WebGLFramebuffer = null;

/**
 * アプリケーションクラス。
 * Cubism SDKの管理を行う。
 */
export class LAppDelegate {
  /**
   * クラスのインスタンス（シングルトン）を返す。
   * インスタンスが生成されていない場合は内部でインスタンスを生成する。
   *
   * @return クラスのインスタンス
   */
  public static getInstance(): LAppDelegate {
    if (s_instance == null) {
      s_instance = new LAppDelegate();
    }

    return s_instance;
  }

  /**
   * クラスのインスタンス（シングルトン）を解放する。
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance.release();
    }

    s_instance = null;
  }

  /**
   * APPに必要な物を初期化する。
   */
  public initialize(): boolean {
    // try to attach canvas
    const canvasById = document
      .getElementsByTagName('canvas')
      .namedItem(appConfig._CanvasId);
    canvas = canvasById;

    // キャンバスの作成
    if (!canvasById) {
      canvas = document.createElement('canvas');
      // make the newly created canvas fit the window
      if (appConfig.CanvasSize === 'auto') {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
    }

    this._initializeCanvasSize();

    // glコンテキストを初期化
    // @ts-ignore
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      alert('Cannot initialize WebGL. This browser does not support.');
      gl = null;

      (canvasById || document.body).innerHTML =
        'This browser does not support the <code>&lt;canvas&gt;</code> element.';

      // gl初期化失敗
      return false;
    }

    if (!canvasById) {
      // キャンバスを DOM に追加
      document.body.appendChild(canvas);
    }

    // set up the resizing handling
    if (appConfig.CanvasSize === 'auto' || appConfig._CanvasHighDpi) {
      this._initializeResizeHandler();
    }

    if (!frameBuffer) {
      frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }

    // 透過設定
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const supportTouch: boolean = 'ontouchend' in canvas;

    if (supportTouch) {
      // タッチ関連コールバック関数登録
      canvas.ontouchstart = onTouchBegan;
      canvas.ontouchmove = onTouchMoved;
      canvas.ontouchend = onTouchEnded;
      canvas.ontouchcancel = onTouchCancel;
    } else {
      // マウス関連コールバック関数登録
      canvas.onmousedown = onClickBegan;
      canvas.onmousemove = onMouseMoved;
      canvas.onmouseup = onClickEnded;
    }

    // AppViewの初期化
    this._view.initialize();

    // Cubism SDKの初期化
    this.initializeCubism();

    return true;
  }

  /**
   * Resize canvas and re-initialize view.
   */
  public onResize(): void {
    this._resizeCanvas();
    this._view.initialize();
    this._view.initializeSprite();

    // キャンバスサイズを渡す
    const viewport: number[] = [0, 0, canvas.width, canvas.height];

    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
  }

  /**
   * 解放する。
   */
  public release(): void {
    this._resizeObserver.disconnect();
    this._resizeObserver = null;

    this._textureManager.release();
    this._textureManager = null;

    this._view.release();
    this._view = null;

    // リソースを解放
    LAppLive2DManager.releaseInstance();

    // Cubism SDKの解放
    CubismFramework.dispose();
  }

  /**
   * 実行処理。
   */
  public run(): void {
    // メインループ
    const loop = (): void => {
      // インスタンスの有無の確認
      if (s_instance == null) {
        return;
      }

      // 時間更新
      LAppPal.updateTime();

      // 画面の初期化
      gl.clearColor(
        appConfig._RenderClearColor[0],
        appConfig._RenderClearColor[1],
        appConfig._RenderClearColor[2],
        appConfig._RenderClearColor[3]
      );

      // 深度テストを有効化
      gl.enable(gl.DEPTH_TEST);

      // 近くにある物体は、遠くにある物体を覆い隠す
      gl.depthFunc(gl.LEQUAL);

      // カラーバッファや深度バッファをクリアする
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.clearDepth(1.0);

      // 透過設定
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // 描画更新
      this._view.render();

      // ループのために再帰呼び出し
      requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * シェーダーを登録する。
   */
  public createShader(): WebGLProgram {
    // バーテックスシェーダーのコンパイル
    const vertexShaderId = gl.createShader(gl.VERTEX_SHADER);

    if (vertexShaderId == null) {
      LAppPal.printMessage('failed to create vertexShader');
      return null;
    }

    const vertexShader: string =
      'precision mediump float;' +
      'attribute vec3 position;' +
      'attribute vec2 uv;' +
      'varying vec2 vuv;' +
      'void main(void)' +
      '{' +
      '   gl_Position = vec4(position, 1.0);' +
      '   vuv = uv;' +
      '}';

    gl.shaderSource(vertexShaderId, vertexShader);
    gl.compileShader(vertexShaderId);

    // フラグメントシェーダのコンパイル
    const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER);

    if (fragmentShaderId == null) {
      LAppPal.printMessage('failed to create fragmentShader');
      return null;
    }

    const fragmentShader: string =
      'precision mediump float;' +
      'varying vec2 vuv;' +
      'uniform sampler2D texture;' +
      'void main(void)' +
      '{' +
      '   gl_FragColor = texture2D(texture, vuv);' +
      '}';

    gl.shaderSource(fragmentShaderId, fragmentShader);
    gl.compileShader(fragmentShaderId);

    // プログラムオブジェクトの作成
    const programId = gl.createProgram();
    gl.attachShader(programId, vertexShaderId);
    gl.attachShader(programId, fragmentShaderId);

    gl.deleteShader(vertexShaderId);
    gl.deleteShader(fragmentShaderId);

    // リンク
    gl.linkProgram(programId);

    gl.useProgram(programId);

    return programId;
  }

  /**
   * View情報を取得する。
   */
  public getView(): LAppView {
    return this._view;
  }

  public getTextureManager(): LAppTextureManager {
    return this._textureManager;
  }

  /**
   * コンストラクタ
   */
  constructor() {
    this._captured = false;
    this._mouseX = 0.0;
    this._mouseY = 0.0;
    this._isEnd = false;

    this._cubismOption = new Option();
    this._view = new LAppView();
    this._textureManager = new LAppTextureManager();

    this._canvasSize = [0, 0];
  }

  /**
   * Cubism SDKの初期化
   */
  public initializeCubism(): void {
    // setup cubism
    this._cubismOption.logFunction = LAppPal.printMessage;
    this._cubismOption.loggingLevel = appConfig.CubismLoggingLevel;
    CubismFramework.startUp(this._cubismOption);

    // initialize cubism
    CubismFramework.initialize();

    // load model
    LAppLive2DManager.getInstance();

    LAppPal.updateTime();

    this._view.initializeSprite();
  }

  /**
   * Initialize the size of the canvas to fit the element.
   */
  private _initializeCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    const pr = appConfig._CanvasHighDpi ? dpr : 1;
    canvasPixelRatio = pr;

    if (appConfig.CanvasSize === 'auto') {
      canvas.width = Math.round(pr * canvas.clientWidth);
      canvas.height = Math.round(pr * canvas.clientHeight);
    } else {
      canvas.width = Math.round(pr * appConfig.CanvasSize.width);
      canvas.height = Math.round(pr * appConfig.CanvasSize.height);
      // set the CSS size for high DPI display
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;
    }
    this._canvasSize = [canvas.width, canvas.height];
  }

  /**
   * Initialize the resize handlers for the canvas.
   */
  private _initializeResizeHandler(): void {
    const updateCanvasSize = (entries: ResizeObserverEntry[]): void => {
      const entry = entries.find(entry => entry.target === canvas);

      // get the size object
      const dpSize =
        (appConfig._CanvasHighDpi &&
          entry.devicePixelContentBoxSize &&
          entry.devicePixelContentBoxSize[0]) ||
        null;
      const size =
        dpSize ||
        (entry.contentBoxSize &&
          ((entry.contentBoxSize[0] ||
            (entry.contentBoxSize as unknown)) as ResizeObserverSize));

      // get the size parameters
      const w: number = size ? size.inlineSize : entry.contentRect.width;
      const h: number = size ? size.blockSize : entry.contentRect.height;
      const pr = dpSize ? 1 : canvasPixelRatio;

      // calculate the size
      const dw = Math.round(pr * w);
      const dh = Math.round(pr * h);

      if (dw !== this._canvasSize[0] || dh !== this._canvasSize[1]) {
        this._canvasSize = [dw, dh];
        this.onResize();
      }
    };

    this._resizeObserver = new ResizeObserver(updateCanvasSize);

    try {
      // allow to get the canvas size in device pixels
      this._resizeObserver.observe(canvas, {
        box: 'device-pixel-content-box'
      });
    } catch (e) {
      // device-pixel-content-box is not supported; fallback
      this._resizeObserver.observe(canvas, { box: 'content-box' });
    }

    // handle pixel ratio changes
    const updateCanvasPixelRatio = (): void => {
      if (s_instance == null) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const pr = appConfig._CanvasHighDpi ? dpr : 1;
      if (pr !== canvasPixelRatio) {
        canvasPixelRatio = pr;
        this.onResize();
      }

      // listen for a further change
      matchMedia(`(resolution: ${dpr}dppx)`).addEventListener(
        'change',
        updateCanvasPixelRatio,
        { once: true }
      );
    };

    updateCanvasPixelRatio();
  }

  /**
   * Resize the canvas to fit the element.
   */
  private _resizeCanvas(): void {
    canvas.width = this._canvasSize[0];
    canvas.height = this._canvasSize[1];
  }

  _cubismOption: Option; // Cubism SDK Option
  _view: LAppView; // View情報
  _captured: boolean; // クリックしているか
  _mouseX: number; // マウスX座標
  _mouseY: number; // マウスY座標
  _isEnd: boolean; // APP終了しているか
  _textureManager: LAppTextureManager; // テクスチャマネージャー
  _resizeObserver: ResizeObserver; // For getting the pending canvas size
  _canvasSize: [number, number]; // The pending size of the canvas
}

/**
 * クリックしたときに呼ばれる。
 */
function onClickBegan(e: MouseEvent): void {
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }
  LAppDelegate.getInstance()._captured = true;

  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = canvasPixelRatio * (e.clientX - rect.left);
  const posY: number = canvasPixelRatio * (e.clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesBegan(posX, posY);
}

/**
 * マウスポインタが動いたら呼ばれる。
 */
function onMouseMoved(e: MouseEvent): void {
  if (!LAppDelegate.getInstance()._captured) {
    return;
  }

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = canvasPixelRatio * (e.clientX - rect.left);
  const posY: number = canvasPixelRatio * (e.clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesMoved(posX, posY);
}

/**
 * クリックが終了したら呼ばれる。
 */
function onClickEnded(e: MouseEvent): void {
  LAppDelegate.getInstance()._captured = false;
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = canvasPixelRatio * (e.clientX - rect.left);
  const posY: number = canvasPixelRatio * (e.clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}

/**
 * タッチしたときに呼ばれる。
 */
function onTouchBegan(e: TouchEvent): void {
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  LAppDelegate.getInstance()._captured = true;

  const rect = (e.target as Element).getBoundingClientRect();
  const posX = canvasPixelRatio * (e.changedTouches[0].clientX - rect.left);
  const posY = canvasPixelRatio * (e.changedTouches[0].clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesBegan(posX, posY);
}

/**
 * スワイプすると呼ばれる。
 */
function onTouchMoved(e: TouchEvent): void {
  if (!LAppDelegate.getInstance()._captured) {
    return;
  }

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = canvasPixelRatio * (e.changedTouches[0].clientX - rect.left);
  const posY = canvasPixelRatio * (e.changedTouches[0].clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesMoved(posX, posY);
}

/**
 * タッチが終了したら呼ばれる。
 */
function onTouchEnded(e: TouchEvent): void {
  LAppDelegate.getInstance()._captured = false;

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = canvasPixelRatio * (e.changedTouches[0].clientX - rect.left);
  const posY = canvasPixelRatio * (e.changedTouches[0].clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}

/**
 * タッチがキャンセルされると呼ばれる。
 */
function onTouchCancel(e: TouchEvent): void {
  LAppDelegate.getInstance()._captured = false;

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = canvasPixelRatio * (e.changedTouches[0].clientX - rect.left);
  const posY = canvasPixelRatio * (e.changedTouches[0].clientY - rect.top);

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}
