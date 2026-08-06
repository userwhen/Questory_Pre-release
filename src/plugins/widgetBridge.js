/* src/plugins/widgetBridge.js */
import { registerPlugin } from '@capacitor/core';

// 對應原生端 WidgetBridgePlugin.kt（@CapacitorPlugin(name = "WidgetBridge")）
// 純橋接，不含任何業務邏輯
export const WidgetBridge = registerPlugin('WidgetBridge');