import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

/**
 * Shared bottom-sheet shell used by the mobile Compose/Detail/Fix sheets:
 * a dimmed scrim (tap to dismiss) + a rounded-top panel that rises from
 * the bottom edge, matching the mobile redesign's sheet radius/shadow.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, maxHeight }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-[28px] bg-aby-card px-5 pb-7 pt-2.5 shadow-2xl dark:bg-aby-card-dark"
            style={maxHeight ? { maxHeight } : undefined}
          >
            <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-aby-line dark:bg-aby-line-dark" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
