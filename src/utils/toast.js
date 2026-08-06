/* src/utils/toast.js */
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export function toast(msg) {
  EventBus.emit(Events.System.TOAST, msg);
}
