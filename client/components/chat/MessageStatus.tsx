'use client';

import React from 'react';
import { getUserStatusText } from './utils/userUtils';
import { formatMessageTime } from './utils/messageUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface User {
	_id: string;
	firstName?: string;
	lastName?: string;
	name?: string;
	email: string;
	isOnline?: boolean;
	lastSeen?: string;
}

interface MessageStatusProps {
	/** Currently selected user */
	selectedUser: User | null;
	/** Custom styling classes */
	className?: string;
}

interface ReadReceiptProps {
	/** Whether the message has been read */
	isRead: boolean;
	/** Custom color classes */
	colorClass?: string;
}

interface MessageTimestampProps {
	/** ISO timestamp string */
	timestamp: string;
	/** Whether this is the current user's message */
	isMyMessage: boolean;
	/** Custom styling classes */
	className?: string;
}

// ============================================================================
// PURE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get status indicator color
 */
const getStatusColor = (isOnline?: boolean): string => {
	return isOnline ? 'text-brand' : 'text-gray-500';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Single checkmark for message sent
 */
const SingleCheckmark: React.FC<{ className?: string }> = React.memo(
	({ className = '' }) => (
		<svg
			className={`w-3 h-3 ${className}`}
			fill="currentColor"
			viewBox="0 0 20 20"
			aria-label="Message envoyé"
		>
			<path
				fillRule="evenodd"
				d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
				clipRule="evenodd"
			/>
		</svg>
	),
);

SingleCheckmark.displayName = 'SingleCheckmark';

/**
 * Double checkmark for message read
 */
const DoubleCheckmark: React.FC<{ className?: string }> = React.memo(
	({ className = '' }) => (
		<svg
			className={`w-3 h-3 -ml-2 ${className}`}
			fill="currentColor"
			viewBox="0 0 20 20"
			aria-label="Message lu"
		>
			<path
				fillRule="evenodd"
				d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
				clipRule="evenodd"
			/>
		</svg>
	),
);

DoubleCheckmark.displayName = 'DoubleCheckmark';

// Removed local OnlineIndicator - now using the one from ui components

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

/**
 * ReadReceipt Component
 *
 * Shows read receipt indicators for sent messages
 * - Single checkmark: Message sent
 * - Double checkmark: Message read
 *
 * @param isRead - Whether the message has been read
 * @param colorClass - Custom color classes for styling
 */
export const ReadReceipt: React.FC<ReadReceiptProps> = React.memo(
	({ isRead, colorClass = 'text-white/70' }) => (
		<div className="flex items-center space-x-1">
			<SingleCheckmark className={colorClass} />
			{isRead && <DoubleCheckmark className="text-white/90" />}
		</div>
	),
);

ReadReceipt.displayName = 'ReadReceipt';

/**
 * MessageTimestamp Component
 *
 * Displays formatted timestamp for messages
 *
 * @param timestamp - ISO timestamp string
 * @param isMyMessage - Whether this is the current user's message
 * @param className - Custom styling classes
 */
export const MessageTimestamp: React.FC<MessageTimestampProps> = React.memo(
	({ timestamp, isMyMessage, className = '' }) => {
		const formattedTime = formatMessageTime(timestamp);
		const textColor = isMyMessage ? 'text-white/70' : 'text-gray-500';

		return (
			<span className={`text-xs ${textColor} ${className}`}>
				{formattedTime}
			</span>
		);
	},
);

MessageTimestamp.displayName = 'MessageTimestamp';

/**
 * MessageStatus Component
 *
 * Displays chat status information including:
 * - User online/offline status
 * - Last seen information
 * - Ready to chat indicators
 *
 * @param selectedUser - Currently selected user in chat
 * @param className - Custom styling classes
 */
const MessageStatus: React.FC<MessageStatusProps> = React.memo(
	({ selectedUser, className = '' }) => {
		const statusText = getUserStatusText(selectedUser);
		const statusColor = getStatusColor(selectedUser?.isOnline);

		return (
			<div
				className={`text-xs px-4 pb-2 flex items-center space-x-2 ${className}`}
			>
				{selectedUser?.isOnline && (
					<span
						className="w-2 h-2 bg-green-500 rounded-full"
						aria-label="En ligne"
					></span>
				)}
				<span className={statusColor}>{statusText}</span>
			</div>
		);
	},
);

MessageStatus.displayName = 'MessageStatus';

export default MessageStatus;
