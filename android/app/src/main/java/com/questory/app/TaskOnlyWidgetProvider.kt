package com.questory.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class TaskOnlyWidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateAllWidgets(context: Context, mgr: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val snapshotJson = prefs.getString(WidgetBridgePlugin.KEY_SNAPSHOT, null)
            val optimisticDone = prefs.getStringSet(WidgetBridgePlugin.KEY_OPTIMISTIC_DONE, emptySet()) ?: emptySet()
            for (widgetId in ids) {
                val views = RemoteViews(context.packageName, R.layout.widget_task_only)
                context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { openAppIntent ->
                    val openAppPending = PendingIntent.getActivity(
                        context, 2, openAppIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_root, openAppPending)
                }
                val snapshot = try { snapshotJson?.let { JSONObject(it) } } catch (e: Exception) { null }
                TaskWidgetProvider.renderTasks(context, views, snapshot?.optJSONArray("tasks"), optimisticDone, TaskOnlyWidgetProvider::class.java)
                mgr.updateAppWidget(widgetId, views)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAllWidgets(context, appWidgetManager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != TaskWidgetProvider.ACTION_TOGGLE_TASK) return
        val taskId = intent.getStringExtra(TaskWidgetProvider.EXTRA_TASK_ID) ?: return

        val prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val pending = HashSet(prefs.getStringSet(WidgetBridgePlugin.KEY_PENDING_ACTIONS, emptySet()) ?: emptySet())
        pending.add(taskId)
        val optimistic = HashSet(prefs.getStringSet(WidgetBridgePlugin.KEY_OPTIMISTIC_DONE, emptySet()) ?: emptySet())
        optimistic.add(taskId)
        prefs.edit()
            .putStringSet(WidgetBridgePlugin.KEY_PENDING_ACTIONS, pending)
            .putStringSet(WidgetBridgePlugin.KEY_OPTIMISTIC_DONE, optimistic)
            .apply()

        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(ComponentName(context, TaskOnlyWidgetProvider::class.java))
        if (ids.isNotEmpty()) updateAllWidgets(context, mgr, ids)
    }
}