'use client';

import React from 'react';
import { chatStore } from '@/store/chatStore';
import Image from 'next/image';
import { ReadReceipt } from './MessageStatus';
import { MessageTime } from './ui';
import { formatTimeOnly, formatFileSize } from './utils/messageUtils';
import { getIconForMime } from './ui/FileTypeIcons';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { logger } from '@/lib/utils/logger';
import { toCdnUrl } from '@/lib/utils/imageUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type Attachment = {
	url: string;
	name: string;
	mime: string;
	size: number;
	type: 'image' | 'pdf' | 'doc' | 'docx' | 'file';
	thumbnailUrl?: string;
};

interface Message {
	_id: string;
	senderId: string;
	receiverId: string;
	text?: string;
	image?: string;
	attachments?: Attachment[];
	createdAt: string;
	isRead?: boolean;
}

interface MessageBubbleProps {
	/** Message object to display */
	message: Message;
	/** Whether this is the current user's message */
	isMyMessage: boolean;
	className?: string;
	/** Open a full-screen viewer for a clicked image URL */
	onImageClick?: (imageUrl: string) => void;
}

interface MessageContentProps {
	/** Message text content */
	text?: string;
	/** Legacy single image */
	image?: string;
	/** Modern attachments array */
	attachments?: Attachment[];
	/** Image click handler */
	onImageClick?: (imageUrl: string) => void;
}

interface MessageFooterProps {
	/** Message creation timestamp */
	createdAt: string;
	/** Whether this is the current user's message */
	isMyMessage: boolean;
	/** Whether the message has been read */
	isRead?: boolean;
}

// ============================================================================
// PURE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get bubble styling classes based on message ownership
 */
const getBubbleClasses = (isMyMessage: boolean): string => {
	const baseClasses =
		'max-w-[70%] sm:max-w-[85%] rounded-lg px-4 py-2 shadow-sm';

	if (isMyMessage) {
		return `${baseClasses} bg-brand text-white rounded-br-sm`;
	}

	return `${baseClasses} bg-white text-gray-800 border border-gray-200 rounded-bl-sm`;
};

/**
 * Get container alignment classes based on message ownership
 */
const getContainerClasses = (isMyMessage: boolean): string => {
	return `flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4 px-4`;
};

/**
 * Handle image click events
 */
const handleImageClick = (imageUrl: string): void => {
	// Could implement image preview/modal here
	logger.debug('Image clicked:', imageUrl);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Message text content with proper formatting
 */
const MessageText: React.FC<{ text: string }> = React.memo(({ text }) => (
	<p className="text-sm leading-relaxed break-words">{text}</p>
));

MessageText.displayName = 'MessageText';

/**
 * Message image with loading and interaction
 */
const MessageImage: React.FC<{
	imageUrl: string;
	altText?: string;
	onClick?: (url: string) => void;
}> = React.memo(({ imageUrl, altText = 'Message attachment', onClick }) => (
	<div className="mt-2">
		<Image
			src={toCdnUrl(imageUrl)}
			alt={altText}
			width={600}
			height={400}
			className="h-auto w-auto max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
			onClick={() =>
				onClick
					? onClick(toCdnUrl(imageUrl))
					: handleImageClick(toCdnUrl(imageUrl))
			}
		/>
	</div>
));

MessageImage.displayName = 'MessageImage';

const DocTile: React.FC<{
	url: string;
	name: string;
	mime: string;
	size?: number;
}> = ({ url, name, mime, size }) => {
	const fileSize =
		typeof size === 'number' ? formatFileSize(size) : undefined;
	const lower = mime.toLowerCase();
	const isPdf = lower.includes('pdf');
	const isWord =
		lower.includes('word') ||
		lower.includes('msword') ||
		lower.includes('officedocument.word');
	const isExcel =
		lower.includes('sheet') ||
		lower.includes('spreadsheet') ||
		lower.includes('excel') ||
		lower.includes('csv');
	const isPpt =
		lower.includes('presentation') || lower.includes('powerpoint');

	const docLabel = isPdf
		? 'PDF Document'
		: isWord
			? 'Microsoft Word Document'
			: isExcel
				? 'Excel Spreadsheet'
				: isPpt
					? 'PowerPoint Presentation'
					: mime;

	const badgeBg = isPdf
		? 'bg-error'
		: isWord
			? 'bg-info'
			: isExcel
				? 'bg-success'
				: isPpt
					? 'bg-accent'
					: 'bg-gray-600';

	// Brand-colored container using project accent
	return (
		<div className="mt-2 w-full max-w-[420px] rounded-xl border border-brand bg-brand text-white shadow-card">
			<div className="flex items-center gap-3 px-4 pt-3">
				<div
					className={`h-12 w-12 ${badgeBg} rounded-xl flex items-center justify-center select-none`}
					aria-hidden
				>
					{(() => {
						const Icon = getIconForMime(mime);
						return <Icon className="w-6 h-6" />;
					})()}
				</div>
				<div className="min-w-0">
					<div className="truncate font-semibold leading-tight">
						{name || 'Document'}
					</div>
					<div className="text-white/90 text-sm">
						{fileSize ? `${fileSize}, ${docLabel}` : docLabel}
					</div>
				</div>
			</div>
			<div className="flex gap-3 px-4 py-3">
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					className="flex-1 text-center rounded-md bg-white/15 hover:bg-white/25 px-3 py-2 text-sm font-semibold"
				>
					Open
				</a>
				<a
					href={url}
					download
					className="flex-1 text-center rounded-md bg-white/15 hover:bg-white/25 px-3 py-2 text-sm font-semibold"
				>
					Save as...
				</a>
			</div>
		</div>
	);
};
/**
 * Message content container for text and/or images
 */
const MessageContent: React.FC<MessageContentProps> = React.memo(
	({ text, image, attachments, onImageClick }) => (
		<>
			{text && <MessageText text={text} />}
			{image && (
				<MessageImage
					imageUrl={toCdnUrl(image)}
					onClick={onImageClick}
				/>
			)}
			{attachments && attachments.length > 0 && (
				<div className="flex flex-col">
					{attachments.map((att, idx) =>
						att.type === 'image' ? (
							<MessageImage
								key={idx}
								imageUrl={toCdnUrl(att.url)}
								altText={att.name}
								onClick={onImageClick}
							/>
						) : (
							<DocTile
								key={idx}
								url={toCdnUrl(att.url)}
								name={att.name}
								mime={att.mime}
								size={att.size}
							/>
						),
					)}
				</div>
			)}
		</>
	),
);

MessageContent.displayName = 'MessageContent';

/**
 * Message footer with timestamp and read receipts
 */
const MessageFooter: React.FC<MessageFooterProps> = React.memo(
	({ createdAt, isMyMessage, isRead }) => (
		<div className="flex items-center justify-end mt-1 space-x-1">
			<MessageTime
				timestamp={createdAt}
				isMyMessage={isMyMessage}
				format={formatTimeOnly}
			/>

			{/* Show read receipts only for sent messages */}
			{isMyMessage && (
				<ReadReceipt
					isRead={Boolean(isRead)}
					colorClass="text-white/70"
				/>
			)}
		</div>
	),
);

MessageFooter.displayName = 'MessageFooter';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * MessageBubble Component
 *
 * Renders an individual message bubble with:
 * - Proper alignment based on sender
 * - Text and/or image content
 * - Timestamp display
 * - Read receipt indicators
 * - Responsive design
 * - Optimized with React.memo for performance
 *
 * Features:
 * - WhatsApp-style design
 * - Rounded corners with sender-specific styling
 * - Image preview capabilities
 * - Accessibility support
 * - Mobile-responsive layout
 *
 * @param message - Message object containing all message data
 * @param isMyMessage - Whether this message was sent by current user
 * @param className - Optional custom styling classes
 */
const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
	({ message, isMyMessage, className = '', onImageClick }) => {
		const containerClasses = getContainerClasses(isMyMessage);
		const bubbleClasses = getBubbleClasses(isMyMessage);

		// Resolve sender user to display name (only for received messages)
		const senderUser = !isMyMessage
			? chatStore.getState().users.find((u) => u._id === message.senderId)
			: null;
		const senderName = senderUser
			? [senderUser.firstName, senderUser.lastName]
					.filter(Boolean)
					.join(' ') || senderUser.email
			: '';

		const [confirmOpen, setConfirmOpen] = React.useState(false);
		const [deleting, setDeleting] = React.useState(false);
		const openConfirm = (e?: React.MouseEvent) => {
			e?.preventDefault();
			setConfirmOpen(true);
		};
		const handleConfirmDelete = async () => {
			setDeleting(true);
			try {
				await chatStore.deleteMessage(message._id);
			} catch (e) {
				logger.error('Failed to delete message', e);
			} finally {
				setDeleting(false);
				setConfirmOpen(false);
			}
		};

		return (
			<div
				className={`${containerClasses} ${className}`}
				data-message-id={message._id}
			>
				<div className={`${bubbleClasses} relative group`}>
					{/* Sender name (for incoming messages) */}
					{!isMyMessage && senderName && (
						<div className="mb-1 text-xs font-semibold text-gray-600">
							{senderName}
						</div>
					)}
					{/* Hover-only delete icon for my messages */}
					{isMyMessage && (
						<button
							onClick={openConfirm}
							className="hidden group-hover:flex items-center justify-center absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow hover:bg-red-700"
							title="Delete message"
							aria-label="Delete message"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="w-4 h-4"
							>
								<path d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6H4a1 1 0 1 1 0-2h5V3Zm2 1h2V4h-2V4Zm6 3H7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6Zm-7 3a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0V9Zm4 0a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0V9Z" />
							</svg>
						</button>
					)}
					<MessageContent
						text={message.text}
						image={message.image}
						attachments={message.attachments}
						onImageClick={onImageClick}
					/>

					<MessageFooter
						createdAt={message.createdAt}
						isMyMessage={isMyMessage}
						isRead={message.isRead}
					/>

					{/* Confirm dialog */}
					{isMyMessage && (
						<ConfirmDialog
							isOpen={confirmOpen}
							title="Prêt à supprimer ceci ?"
							description="Êtes-vous sûr de vouloir supprimer ce message ? Cette action ne peut pas être annulée."
							onConfirm={handleConfirmDelete}
							onCancel={() => setConfirmOpen(false)}
							confirmText="Supprimer"
							cancelText="Annuler"
							variant="danger"
							loading={deleting}
						/>
					)}
				</div>
			</div>
		);
	},
);

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
