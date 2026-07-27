import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ShieldOff, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';

interface DndZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

type PermissionStatus = 'unknown' | 'prompt' | 'granted' | 'denied';

const DND_STORAGE_KEY = 'aby-dnd-zones';

function loadDndZones(): DndZone[] {
  try {
    const raw = localStorage.getItem(DND_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface LocationPermissionProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocationPermission: React.FC<LocationPermissionProps> = ({ isOpen, onClose }) => {
  const { isRtl } = useLanguageStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [status, setStatus] = useState<PermissionStatus>('unknown');
  const [tracking, setTracking] = useState(false);
  const [current, setCurrent] = useState<{ lat: number; lng: number } | null>(null);
  const [dndZones, setDndZones] = useState<DndZone[]>(loadDndZones);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!('permissions' in navigator)) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((res) => {
        setStatus(res.state as PermissionStatus);
        res.onchange = () => setStatus(res.state as PermissionStatus);
      })
      .catch(() => setStatus('unknown'));
  }, []);

  useEffect(() => {
    localStorage.setItem(DND_STORAGE_KEY, JSON.stringify(dndZones));
  }, [dndZones]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const persistLocation = async (lat: number, lng: number) => {
    try {
      await api.put('/users/profile', {
        location: {
          coordinates: { type: 'Point', coordinates: [lng, lat] },
        },
      });
      updateUser({ location: { ...(useAuthStore.getState().user?.location || {}) } });
    } catch (err) {
      // Non-fatal: the tracking UI still works even if the sync fails.
      console.error('Failed to persist location:', err);
    }
  };

  const enableTracking = () => {
    if (!('geolocation' in navigator)) {
      toast.error('הדפדפן אינו תומך במיקום');
      return;
    }

    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrent({ lat: latitude, lng: longitude });
        setStatus('granted');
        persistLocation(latitude, longitude);
      },
      (err) => {
        setTracking(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          toast.error('הרשאת המיקום נדחתה');
        } else {
          toast.error('לא ניתן לאתר את המיקום');
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
  };

  const addDndZone = () => {
    if (!current) {
      toast.error('אין מיקום נוכחי לסימון');
      return;
    }
    const label = window.prompt('שם האזור (למשל: בית, עבודה)') || 'אזור שקט';
    setDndZones((zones) => [
      ...zones,
      { id: `${Date.now()}`, label, lat: current.lat, lng: current.lng },
    ]);
    toast.success('האזור נוסף לרשימת "נא לא להפריע"');
  };

  const removeDndZone = (id: string) => {
    setDndZones((zones) => zones.filter((z) => z.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            dir={isRtl ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-glow dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <MapPin className="h-5 w-5" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                  הרשאות מיקום
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="סגור"
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              כדי לקבל התראות חכמות לפי מיקום (למשל כשאתה נמצא ליד עסק רלוונטי),
              נשתמש במיקום הרקע של המכשיר. ניתן להגדיר אזורים שבהם לא תופרע.
            </p>

            <div className="mt-5">
              {status === 'granted' && current ? (
                <div className="rounded-xl bg-success-50 p-3 text-sm text-success-700 dark:bg-success-900/20 dark:text-success-300">
                  המיקום פעיל: {current.lat.toFixed(4)}, {current.lng.toFixed(4)}
                </div>
              ) : (
                <button
                  onClick={enableTracking}
                  disabled={tracking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {tracking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      ממתין למיקום...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      הפעל מעקב מיקום
                    </>
                  )}
                </button>
              )}
              {status === 'denied' && (
                <p className="mt-2 text-xs text-error-600 dark:text-error-400">
                  ההרשאה נדחתה. יש לאפשר מיקום בהגדרות הדפדפן.
                </p>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                  <ShieldOff className="h-4 w-4" />
                  <span className="text-sm font-semibold">אזורי "נא לא להפריע"</span>
                </div>
                <button
                  onClick={addDndZone}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300"
                >
                  <Plus className="h-3 w-3" />
                  הוסף מיקום נוכחי
                </button>
              </div>

              <ul className="mt-3 space-y-2">
                {dndZones.length === 0 && (
                  <li className="text-xs text-neutral-400">לא הוגדרו אזורים שקטים.</li>
                )}
                {dndZones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-700/50"
                  >
                    <span className="text-neutral-700 dark:text-neutral-200">
                      {zone.label}
                      <span className="ms-2 text-xs text-neutral-400">
                        {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}
                      </span>
                    </span>
                    <button
                      onClick={() => removeDndZone(zone.id)}
                      aria-label="הסר"
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermission;
