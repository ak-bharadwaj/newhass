'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProfilePictureDisplayProps {
  pictureUrl?: string;
  firstName: string;
  lastName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

export default function ProfilePictureDisplay({
  pictureUrl,
  firstName,
  lastName,
  size = 'md',
  className = '',
  showBorder = true,
  showOnlineStatus = false,
  isOnline = false,
}: ProfilePictureDisplayProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  // Get initials from first and last name
  const getInitials = () => {
    const firstInitial = firstName?.[0]?.toUpperCase() || '';
    const lastInitial = lastName?.[0]?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  };

  // Generate consistent color based on name
  const getGradientColors = () => {
    const colors = [
      ['from-blue-500', 'to-purple-500'],
      ['from-green-500', 'to-teal-500'],
      ['from-pink-500', 'to-rose-500'],
      ['from-orange-500', 'to-amber-500'],
      ['from-indigo-500', 'to-blue-500'],
      ['from-purple-500', 'to-pink-500'],
      ['from-teal-500', 'to-cyan-500'],
      ['from-red-500', 'to-orange-500'],
    ];

    const nameHash = (firstName + lastName)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = nameHash % colors.length;
    return colors[colorIndex];
  };

  const [fromColor, toColor] = getGradientColors();

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-full
          overflow-hidden
          ${showBorder ? 'ring-2 ring-white/20' : ''}
          flex items-center justify-center
          font-semibold text-white
        `}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {pictureUrl ? (
          // Display uploaded picture
          <img
            src={pictureUrl}
            alt={`${firstName} ${lastName}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          // Display initials with gradient background
          <div
            className={`
              w-full h-full
              bg-gradient-to-br ${fromColor} ${toColor}
              flex items-center justify-center
            `}
          >
            {getInitials()}
          </div>
        )}
      </motion.div>

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <motion.div
          className={`
            absolute bottom-0 right-0
            ${statusSizeClasses[size]}
            rounded-full
            ${isOnline ? 'bg-green-500' : 'bg-gray-500'}
            ring-2 ring-gray-900
          `}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        />
      )}
    </div>
  );
}
