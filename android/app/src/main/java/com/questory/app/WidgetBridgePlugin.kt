package com.questory.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

// 純橋接：存快照、通知小工具刷新、讀寫待處理佇列。
// 不含任何任務/寵物業務邏輯——那些永遠只在 engines/task.js、engines/pet.js。
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    companion object {
        const val PREFS_NAME = "questory_widget_prefs"
        const val KEY_SNAPSHOT = "widget_snapshot_json"
        const val KEY_PENDING_ACTIONS = "pending_widget_actions"
        const val KEY_OPTIMISTIC_DONE = "optimistic_done_ids"
    }

    @PluginMethod
    fun pushSnapshot(call: PluginCall) {
        val tasks = call.getArray("tasks") ?: JSONArray()
        val pet = call.getObject("pet")
        val pets = call.getArray("pets") ?: JSONArray()
        val snapshot = JSObject()
        snapshot.put("tasks", tasks)
        if (pet != null) snapshot.put("pet", pet)
        snapshot.put("pets", pets)
        
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SNAPSHOT, snapshot.toString())
            .remove(KEY_OPTIMISTIC_DONE)
            .apply()
            
        requestWidgetUpdate(context)
        call.resolve()
    }

    @PluginMethod
    fun getPendingActions(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ids = prefs.getStringSet(KEY_PENDING_ACTIONS, emptySet()) ?: emptySet()
        val ret = JSObject()
        ret.put("ids", JSONArray(ids.toList()))
        call.resolve(ret)
    }

    @PluginMethod
    fun clearPendingActions(call: PluginCall) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().remove(KEY_PENDING_ACTIONS).apply()
        call.resolve()
    }

    private fun requestWidgetUpdate(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        
        val taskIds = mgr.getAppWidgetIds(ComponentName(ctx, TaskWidgetProvider::class.java))
        if (taskIds.isNotEmpty()) TaskWidgetProvider.updateAllWidgets(ctx, mgr, taskIds)
        
        val petIds = mgr.getAppWidgetIds(ComponentName(ctx, PetWidgetProvider::class.java))
        if (petIds.isNotEmpty()) PetWidgetProvider.updateAllWidgets(ctx, mgr, petIds)
        
        val taskOnlyIds = mgr.getAppWidgetIds(ComponentName(ctx, TaskOnlyWidgetProvider::class.java))
        if (taskOnlyIds.isNotEmpty()) TaskOnlyWidgetProvider.updateAllWidgets(ctx, mgr, taskOnlyIds)
    }
}