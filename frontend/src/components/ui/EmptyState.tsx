/**
 * Empty State component for better UX when no data is available
 */
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = ''
}) => {
  const ActionIcon = action?.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
    >
      {/* Animated Icon Circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="relative w-24 h-24 mb-6"
      >
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl"></div>
        {/* Icon container */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
          <Icon className="w-12 h-12 text-blue-400" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold text-white mb-3 text-center"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-400 text-center max-w-md mb-8 leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={action.onClick}
          className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:from-blue-500 group-hover:to-purple-500 transition-all"></div>
          
          {/* Shine Effect on Hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </div>

          {/* Button Content */}
          <span className="relative flex items-center gap-2">
            {ActionIcon && <ActionIcon className="w-5 h-5" />}
            {action.label}
          </span>
        </motion.button>
      )}
    </motion.div>
  );
};

// Preset Empty States for common scenarios
export const NoDataEmptyState: React.FC<{ 
  title?: string; 
  description?: string;
  onRefresh?: () => void;
}> = ({ 
  title = "No Data Available", 
  description = "There's no data to display at the moment. Try adjusting your filters or check back later.",
  onRefresh
}) => {
  const { Database } = require('lucide-react');
  const { RefreshCw } = require('lucide-react');
  
  return (
    <EmptyState
      icon={Database}
      title={title}
      description={description}
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        icon: RefreshCw
      } : undefined}
    />
  );
};

export const NoPatientsEmptyState: React.FC<{ onCreatePatient: () => void }> = ({ onCreatePatient }) => {
  const { Users } = require('lucide-react');
  const { UserPlus } = require('lucide-react');
  
  return (
    <EmptyState
      icon={Users}
      title="No Patients Found"
      description="Get started by registering your first patient. You can add their details, medical history, and more."
      action={{
        label: "Register New Patient",
        onClick: onCreatePatient,
        icon: UserPlus
      }}
    />
  );
};

export const NoAppointmentsEmptyState: React.FC<{ onCreateAppointment: () => void }> = ({ onCreateAppointment }) => {
  const { Calendar } = require('lucide-react');
  const { CalendarPlus } = require('lucide-react');
  
  return (
    <EmptyState
      icon={Calendar}
      title="No Appointments Scheduled"
      description="Your schedule is clear. Book a new appointment to get started with patient consultations."
      action={{
        label: "Schedule Appointment",
        onClick: onCreateAppointment,
        icon: CalendarPlus
      }}
    />
  );
};

export const NoMessagesEmptyState: React.FC = () => {
  const { MessageSquare } = require('lucide-react');
  
  return (
    <EmptyState
      icon={MessageSquare}
      title="No Messages Yet"
      description="Your inbox is empty. Messages from colleagues and system notifications will appear here."
    />
  );
};

export const NoSearchResultsEmptyState: React.FC<{ query: string; onClear: () => void }> = ({ query, onClear }) => {
  const { Search } = require('lucide-react');
  const { X } = require('lucide-react');
  
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={`We couldn't find anything matching "${query}". Try different keywords or clear your search.`}
      action={{
        label: "Clear Search",
        onClick: onClear,
        icon: X
      }}
    />
  );
};

export const NoAnalyticsDataEmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { BarChart3 } = require('lucide-react');
  const { RefreshCw } = require('lucide-react');
  
  return (
    <EmptyState
      icon={BarChart3}
      title="No Analytics Data"
      description="Analytics data will appear once you have patient visits, appointments, and other activities recorded."
      action={{
        label: "Refresh Data",
        onClick: onRefresh,
        icon: RefreshCw
      }}
    />
  );
};
