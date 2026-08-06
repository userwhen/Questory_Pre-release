package com.questory.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

class TaskWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_TASK = "com.questory.app.ACTION_TOGGLE_TASK"
        const val EXTRA_TASK_ID = "extra_task_id"
        private const val MAX_ROWS = 5
        private val ROW_IDS = intArrayOf(R.id.task_row_0, R.id.task_row_1, R.id.task_row_2, R.id.task_row_3, R.id.task_row_4)
        private val CHECK_IDS = intArrayOf(R.id.task_check_0, R.id.task_check_1, R.id.task_check_2, R.id.task_check_3, R.id.task_check_4)
        private val TITLE_IDS = intArrayOf(R.id.task_title_0, R.id.task_title_1, R.id.task_title_2, R.id.task_title_3, R.id.task_title_4)
        private val ACCENT_IDS = intArrayOf(R.id.task_accent_0, R.id.task_accent_1, R.id.task_accent_2, R.id.task_accent_3, R.id.task_accent_4)

        private val PET_SLOT_IDS = intArrayOf(R.id.pet_slot_0, R.id.pet_slot_1)
        private val PET_IMAGE_IDS = intArrayOf(R.id.pet_image_0, R.id.pet_image_1)
        private val PET_BADGE_IDS = intArrayOf(R.id.pet_badge_0, R.id.pet_badge_1)
        private val PET_MOOD_IDS = intArrayOf(R.id.pet_mood_0, R.id.pet_mood_1)
        private val PET_FOOD_IDS = intArrayOf(R.id.pet_food_0, R.id.pet_food_1)

        // 分類名稱 → 固定顏色（同一分類永遠同一色，不用手動配色；分類是使用者自訂的動態清單）
        private val CATEGORY_PALETTE = intArrayOf(
            Color.parseColor("#f5a623"), Color.parseColor("#227A59"), Color.parseColor("#3b82f6"),
            Color.parseColor("#a855f7"), Color.parseColor("#e0546a"), Color.parseColor("#0f6e56"),
        )
        private fun colorForCategory(cat: String): Int {
            if (cat.isEmpty()) return CATEGORY_PALETTE[0]
            val hash = cat.fold(0) { acc, c -> acc * 31 + c.code }
            return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.size]
        }

        fun updateAllWidgets(context: Context, mgr: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val snapshotJson = prefs.getString(WidgetBridgePlugin.KEY_SNAPSHOT, null)
            val optimisticDone = prefs.getStringSet(WidgetBridgePlugin.KEY_OPTIMISTIC_DONE, emptySet()) ?: emptySet()
            for (widgetId in ids) {
                mgr.updateAppWidget(widgetId, buildRemoteViews(context, snapshotJson, optimisticDone))
            }
        }

        private fun buildRemoteViews(context: Context, snapshotJson: String?, optimisticDone: Set<String>): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_task_list)

            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { openAppIntent ->
                val openAppPending = PendingIntent.getActivity(
                    context, 0, openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, openAppPending)
            }

            val snapshot = try { snapshotJson?.let { JSONObject(it) } } catch (e: Exception) { null }
            renderTasks(context, views, snapshot?.optJSONArray("tasks"), optimisticDone)
            renderMergedPets(context, views, snapshot?.optJSONArray("pets"))
            return views
        }

        internal fun renderTasks(context: Context, views: RemoteViews, tasks: JSONArray?, optimisticDone: Set<String>, providerClass: Class<out AppWidgetProvider> = TaskWidgetProvider::class.java) {
            val count = tasks?.length() ?: 0
            for (i in 0 until MAX_ROWS) {
                if (i >= count) {
                    views.setViewVisibility(ROW_IDS[i], View.GONE)
                    continue
                }
                val t = tasks!!.getJSONObject(i)
                val id = t.optString("id")
                val title = t.optString("title")
                val cat = t.optString("cat", "")
                val pinned = t.optBoolean("pinned", false)
                val isDone = optimisticDone.contains(id)

                views.setViewVisibility(ROW_IDS[i], View.VISIBLE)
                views.setTextViewText(TITLE_IDS[i], (if (pinned) "📌 " else "") + title)
                views.setImageViewResource(CHECK_IDS[i], if (isDone) R.drawable.widget_check_on else R.drawable.widget_check_off)
                views.setInt(
                    TITLE_IDS[i], "setPaintFlags",
                    if (isDone) Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG else Paint.ANTI_ALIAS_FLAG
                )
                views.setFloat(ROW_IDS[i], "setAlpha", if (isDone) 0.55f else 1f)
                views.setInt(ACCENT_IDS[i], "setBackgroundColor", colorForCategory(cat))

                val toggleIntent = Intent(context, providerClass).apply {
                    action = ACTION_TOGGLE_TASK
                    putExtra(EXTRA_TASK_ID, id)
                    data = Uri.parse("questory://widget/task/$id")
                }
                val togglePending = PendingIntent.getBroadcast(
                    context, id.hashCode(), toggleIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(ROW_IDS[i], togglePending)
            }
            views.setViewVisibility(R.id.widget_empty_text, if (count == 0) View.VISIBLE else View.GONE)
        }

        // 合併版只有兩格寵物版位（跟原本版面一致），純寵物小工具走 PetWidgetProvider 自己那份三格版面
        private fun renderMergedPets(context: Context, views: RemoteViews, pets: JSONArray?) {
            val count = pets?.length() ?: 0
            views.setViewVisibility(R.id.pet_section, if (count == 0) View.GONE else View.VISIBLE)
            for (i in PET_SLOT_IDS.indices) {
                if (i >= count) {
                    views.setViewVisibility(PET_SLOT_IDS[i], View.GONE)
                    continue
                }
                val p = pets!!.getJSONObject(i)
                views.setViewVisibility(PET_SLOT_IDS[i], View.VISIBLE)

                val mood = p.optInt("mood", 0)
                val food = p.optInt("food", 0)
                val isSick = p.optBoolean("isSick", false)

                views.setProgressBar(PET_MOOD_IDS[i], 100, mood, false)
                views.setProgressBar(PET_FOOD_IDS[i], 100, food, false)

                val resName = p.optString("id", "").lowercase().replace(Regex("[^a-z0-9_]"), "_")
                val resId = if (resName.isNotEmpty()) context.resources.getIdentifier(resName, "drawable", context.packageName) else 0
                views.setImageViewResource(PET_IMAGE_IDS[i], if (resId != 0) resId else R.mipmap.ic_launcher)
                if (isSick) views.setInt(PET_IMAGE_IDS[i], "setColorFilter", Color.argb(180, 150, 150, 150))

                val badge = when {
                    isSick -> "🤧"
                    p.optBoolean("isPregnant", false) -> "💖"
                    p.optBoolean("pendingExplore", false) -> "❗"
                    mood >= 70 -> "😊"
                    mood >= 30 -> "😐"
                    else -> "😢"
                }
                views.setTextViewText(PET_BADGE_IDS[i], badge)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAllWidgets(context, appWidgetManager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_TOGGLE_TASK) return
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return

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
        val ids = mgr.getAppWidgetIds(ComponentName(context, TaskWidgetProvider::class.java))
        if (ids.isNotEmpty()) updateAllWidgets(context, mgr, ids)
    }
}