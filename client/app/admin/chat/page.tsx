'use client';

import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChatApi } from '@/lib/api/chatApi';
import { useEffect, useState, useRef, useCallback } from 'react';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toCdnUrl } from '@/lib/utils/imageUtils';

// Import chat UI components
import {
	DateSeparator,
	EmptyConversation,
	LoadingMessages,
} from '@/components/chat/ui';
import { groupMessagesByDate } from '@/components/chat/utils/dateUtils';
import { formatTimeOnly } from '@/components/chat/utils/messageUtils';
import { ImageLightbox } from '@/components/ui';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

// Get full name from user
const getFullName = (user?: ChatUser | null) => {
	if (!user) return 'Inconnu';
	return (
		`${user.firstName || ''} ${user.lastName || ''}`.trim() ||
		user.email ||
		'Inconnu'
	);
};

// Admin-specific message bubble with avatar and no delete option
const AdminMessageBubble = ({
	message,
	isOwnerMessage,
	senderUser,
	onImageClick,
}: {
	message: ChatMessage;
	isOwnerMessage: boolean;
	senderUser: ChatUser | null;
	onImageClick?: (url: string) => void;
}) => {
	const hasAttachments =
		Array.isArray(message.attachments) && message.attachments.length > 0;
	const senderName = getFullName(senderUser);

	return (
		<div
			className={`flex items-end gap-2 mb-4 px-4 ${isOwnerMessage ? 'flex-row-reverse' : ''}`}
		>
			{/* Avatar - always show */}
			<div className="flex-shrink-0">
				{senderUser && <ProfileAvatar user={senderUser} size="sm" />}
			</div>

			{/* Message bubble */}
			<div
				className={`max-w-[70%] sm:max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
					isOwnerMessage
						? 'bg-brand text-white rounded-br-sm'
						: 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
				}`}
			>
				{/* Sender name */}
				<div
					className={`text-xs font-semibold mb-1 ${
						isOwnerMessage ? 'text-white/80' : 'text-gray-600'
					}`}
				>
					{senderName}
				</div>

				{/* Message text */}
				{message.text && (
					<p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
						{message.text}
					</p>
				)}

				{/* Legacy image */}
				{message.image && (
					<div className="mt-2">
						<Image
							src={toCdnUrl(message.image)}
							alt="Image"
							width={300}
							height={200}
							className="rounded cursor-pointer hover:opacity-90 transition-opacity"
							onClick={() =>
								onImageClick?.(toCdnUrl(message.image!))
							}
							unoptimized
						/>
					</div>
				)}

				{/* Attachments */}
				{hasAttachments && (
					<div className="mt-2 space-y-2">
						{message.attachments!.map((att, idx) => {
							const isImage =
								att.type === 'image' ||
								att.mime?.startsWith('image/');
							if (isImage) {
								return (
									<Image
										key={idx}
										src={toCdnUrl(
											att.thumbnailUrl || att.url,
										)}
										alt={att.name}
										width={300}
										height={200}
										className="rounded cursor-pointer hover:opacity-90 transition-opacity"
										onClick={() =>
											onImageClick?.(toCdnUrl(att.url))
										}
										unoptimized
									/>
								);
							}
							// Document attachment
							return (
								<a
									key={idx}
									href={toCdnUrl(att.url)}
									target="_blank"
									rel="noopener noreferrer"
									className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
										isOwnerMessage
											? 'bg-white/20 hover:bg-white/30'
											: 'bg-gray-100 hover:bg-gray-200'
									}`}
								>
									<div
										className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${
											att.type === 'pdf'
												? 'bg-red-500 text-white'
												: 'bg-blue-500 text-white'
										}`}
									>
										{att.type === 'pdf' ? 'PDF' : 'DOC'}
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium truncate">
											{att.name}
										</p>
										<p
											className={`text-[10px] ${
												isOwnerMessage
													? 'text-white/70'
													: 'text-gray-500'
											}`}
										>
											{(att.size / 1024).toFixed(1)} Ko
										</p>
									</div>
								</a>
							);
						})}
					</div>
				)}

				{/* Time */}
				<div
					className={`flex items-center justify-end mt-1 gap-1 ${
						isOwnerMessage ? 'text-white/70' : 'text-gray-400'
					}`}
				>
					<span className="text-[10px]">
						{formatTimeOnly(message.createdAt)}
					</span>
				</div>
			</div>
		</div>
	);
};

export default function AdminChatPage() {
	const params = useSearchParams();
	const collaborationId = params.get('collaborationId') || '';
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [ownerUser, setOwnerUser] = useState<ChatUser | null>(null);
	const [collaboratorUser, setCollaboratorUser] = useState<ChatUser | null>(
		null,
	);
	const [ownerId, setOwnerId] = useState<string>('');
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);

	// Lightbox state for viewing images full-size (same as real chat)
	const [isLightboxOpen, setIsLightboxOpen] = useState(false);
	const [lightboxImages, setLightboxImages] = useState<
		Array<{ url: string; alt?: string }>
	>([]);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// Handle image click from MessageBubble (same as real chat)
	const handleImageClick = useCallback(
		(imageUrl: string) => {
			// Collect all images from messages
			const allImages: Array<{ url: string; alt?: string }> = [];
			messages.forEach((msg) => {
				if (msg.image) {
					allImages.push({ url: msg.image, alt: 'Image' });
				}
				if (msg.attachments) {
					msg.attachments.forEach((att) => {
						if (
							att.type === 'image' ||
							att.mime?.startsWith('image/')
						) {
							allImages.push({ url: att.url, alt: att.name });
						}
					});
				}
			});

			const clickedIndex = allImages.findIndex(
				(img) => img.url === imageUrl,
			);
			setLightboxImages(allImages);
			setLightboxIndex(clickedIndex >= 0 ? clickedIndex : 0);
			setIsLightboxOpen(true);
		},
		[messages],
	);

	useEffect(() => {
		const load = async () => {
			if (!collaborationId) return;
			setLoading(true);
			try {
				const conv =
					await ChatApi.getConversationByCollaboration(
						collaborationId,
					);
				if (
					conv?.conversation?.ownerId &&
					conv.conversation.collaboratorId
				) {
					const owner = conv.conversation.ownerId;
					const collaborator = conv.conversation.collaboratorId;
					setOwnerId(owner);

					// Fetch messages (admin endpoint - doesn't mark as read)
					const msgs = await ChatApi.getMessagesBetween(
						owner,
						collaborator,
						200,
					);
					const allMessages = msgs.messages || [];
					setMessages(allMessages);

					// Fetch user details for owner and collaborator
					try {
						const [ownerData, collaboratorData] = await Promise.all(
							[
								ChatApi.getUserById(owner),
								ChatApi.getUserById(collaborator),
							],
						);
						setOwnerUser(ownerData);
						setCollaboratorUser(collaboratorData);
					} catch (userErr) {
						console.warn(
							'[AdminChatPage] user fetch error',
							userErr,
						);
					}
				}
			} catch (e) {
				console.error('[AdminChatPage] load error', e);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [collaborationId]);

	// Scroll to bottom when messages load
	useEffect(() => {
		if (!loading && messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [loading, messages.length]);

	// Group messages by date using the actual chat utility
	const groupedMessages = groupMessagesByDate(messages);

	return (
		<AdminLayout>
			<div className="flex flex-col h-[calc(100vh-10rem)] min-h-[500px]">
				{/* Header - same style as real chat */}
				<div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm rounded-t-xl">
					<Link
						href="/admin/collaborations"
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						title="Retour aux collaborations"
					>
						<ArrowLeft className="w-5 h-5 text-gray-600" />
					</Link>

					{/* Participants info */}
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="flex -space-x-2">
							{ownerUser && (
								<ProfileAvatar
									user={ownerUser}
									size="md"
									className="ring-2 ring-white"
								/>
							)}
							{collaboratorUser && (
								<ProfileAvatar
									user={collaboratorUser}
									size="md"
									className="ring-2 ring-white"
								/>
							)}
						</div>
						<div className="min-w-0">
							<h1 className="text-sm font-semibold text-gray-900 truncate">
								{getFullName(ownerUser)} ↔{' '}
								{getFullName(collaboratorUser)}
							</h1>
							<p className="text-xs text-gray-500 truncate">
								{messages.length} message
								{messages.length !== 1 ? 's' : ''} •
								Collaboration #{collaborationId.slice(-8)}
							</p>
						</div>
					</div>

					{/* Read-only indicator */}
					<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
						<Eye className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Lecture seule</span>
					</div>
				</div>

				{/* Messages area - same style as real chat */}
				<div
					ref={messagesContainerRef}
					className="flex-1 overflow-y-auto bg-gray-50"
				>
					{loading && <LoadingMessages />}

					{!loading && messages.length === 0 && (
						<EmptyConversation selectedUser={null} />
					)}

					{!loading && messages.length > 0 && (
						<div className="py-4">
							{groupedMessages.map((group) => (
								<div key={group.dateKey}>
									{/* Date separator */}
									<DateSeparator dateText={group.dateKey} />

									{/* Messages with avatars and no delete option */}
									{group.messages.map((msg) => {
										const isOwnerMessage =
											msg.senderId === ownerId;
										const senderUser = isOwnerMessage
											? ownerUser
											: collaboratorUser;
										return (
											<AdminMessageBubble
												key={msg._id}
												message={msg}
												isOwnerMessage={isOwnerMessage}
												senderUser={senderUser}
												onImageClick={handleImageClick}
											/>
										);
									})}
								</div>
							))}
							<div ref={messagesEndRef} />
						</div>
					)}
				</div>

				{/* Footer - read-only notice instead of input */}
				<div className="bg-white border-t border-gray-200 px-4 py-4 rounded-b-xl">
					<div className="flex items-center justify-center gap-3 text-gray-400">
						<Eye className="w-5 h-5" />
						<p className="text-sm">
							Historique en lecture seule • Les messages ne sont
							pas marqués comme lus
						</p>
					</div>
				</div>
			</div>

			{/* Image Lightbox - same as real chat */}
			<ImageLightbox
				images={lightboxImages}
				initialIndex={lightboxIndex}
				isOpen={isLightboxOpen}
				onClose={() => setIsLightboxOpen(false)}
			/>
		</AdminLayout>
	);
}
