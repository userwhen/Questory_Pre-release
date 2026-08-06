package com.questory.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

class PetWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val MAX_PETS = 3
        private val SLOT_IDS = intArrayOf(R.id.pet_slot_0, R.id.pet_slot_1, R.id.pet_slot_2)
        private val IMAGE_IDS = intArrayOf(R.id.pet_image_0, R.id.pet_image_1, R.id.pet_image_2)
        private val BADGE_IDS = intArrayOf(R.id.pet_badge_0, R.id.pet_badge_1, R.id.pet_badge_2)
        private val MOOD_IDS = intArrayOf(R.id.pet_mood_0, R.id.pet_mood_1, R.id.pet_mood_2)
        private val FOOD_IDS = intArrayOf(R.id.pet_food_0, R.id.pet_food_1, R.id.pet_food_2)

        fun updateAllWidgets(context: Context, mgr: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val snapshotJson = prefs.getString(WidgetBridgePlugin.KEY_SNAPSHOT, null)
            for (widgetId in ids) {
                mgr.updateAppWidget(widgetId, buildRemoteViews(context, snapshotJson))
            }
        }

        private fun buildRemoteViews(context: Context, snapshotJson: String?): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_pet_status)

            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { openAppIntent ->
                val openAppPending = PendingIntent.getActivity(
                    context, 1, openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.pet_widget_root, openAppPending)
            }

            val snapshot = try { snapshotJson?.let { JSONObject(it) } } catch (e: Exception) { null }
            renderPets(context, views, snapshot?.optJSONArray("pets"))
            return views
        }

        private fun renderPets(context: Context, views: RemoteViews, pets: JSONArray?) {
            val count = pets?.length() ?: 0
            for (i in 0 until MAX_PETS) {
                if (i >= count) {
                    views.setViewVisibility(SLOT_IDS[i], View.GONE)
                    continue
                }
                val p = pets!!.getJSONObject(i)
                views.setViewVisibility(SLOT_IDS[i], View.VISIBLE)

                val mood = p.optInt("mood", 0)
                val food = p.optInt("food", 0)
                val isSick = p.optBoolean("isSick", false)

                views.setProgressBar(MOOD_IDS[i], 100, mood, false)
                views.setProgressBar(FOOD_IDS[i], 100, food, false)

                val resName = p.optString("id", "").lowercase().replace(Regex("[^a-z0-9_]"), "_")
                val resId = if (resName.isNotEmpty()) context.resources.getIdentifier(resName, "drawable", context.packageName) else 0
                views.setImageViewResource(IMAGE_IDS[i], if (resId != 0) resId else R.mipmap.ic_launcher)
                if (isSick) views.setInt(IMAGE_IDS[i], "setColorFilter", Color.argb(180, 150, 150, 150))

                val badge = when {
                    isSick -> "🤧"
                    p.optBoolean("isPregnant", false) -> "💖"
                    p.optBoolean("pendingExplore", false) -> "❗"
                    mood >= 70 -> "😊"
                    mood >= 30 -> "😐"
                    else -> "😢"
                }
                views.setTextViewText(BADGE_IDS[i], badge)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAllWidgets(context, appWidgetManager, appWidgetIds)
    }
}