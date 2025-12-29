import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
	isLoading: boolean;
	message?: string;
	children: React.ReactNode;
	className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
	isLoading,
	message = 'Chargement...',
	children,
	className = '',
}) => {
	return (
		<div className={`relative ${className}`}>
			{children}
			{isLoading && (
				<div className="absolute inset-0 bg-white/75 flex flex-col items-center justify-center z-10 rounded-lg">
					<LoadingSpinner />
					{message && (
						<p className="mt-2 text-sm text-gray-600">{message}</p>
					)}
				</div>
			)}
		</div>
	);
};

interface LoadingStateProps {
	isLoading: boolean;
	error?: string | null;
	data?: unknown;
	loadingComponent?: React.ReactNode;
	errorComponent?: React.ReactNode;
	emptyComponent?: React.ReactNode;
	children: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
	isLoading,
	error,
	data,
	loadingComponent,
	errorComponent,
	emptyComponent,
	children,
}) => {
	if (isLoading) {
		return (
			<div className="flex justify-center items-center p-8">
				{loadingComponent || <LoadingSpinner />}
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center p-8">
				{errorComponent || (
					<div className="text-red-600">
						<p className="font-medium">Une erreur est survenue</p>
						<p className="text-sm text-gray-500 mt-1">{error}</p>
					</div>
				)}
			</div>
		);
	}

	if (
		data === null ||
		data === undefined ||
		(Array.isArray(data) && data.length === 0)
	) {
		return (
			<div className="text-center p-8">
				{emptyComponent || (
					<div className="text-gray-500">
						<p>Aucune donnée disponible</p>
					</div>
				)}
			</div>
		);
	}

	return <>{children}</>;
};

interface SkeletonProps {
	className?: string;
	count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
	className = 'h-4 bg-gray-200 rounded',
	count = 1,
}) => {
	return (
		<div className="animate-pulse space-y-2">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className={className} />
			))}
		</div>
	);
};

export const CardSkeleton: React.FC = () => (
	<div className="bg-white rounded-lg shadow p-6 animate-pulse">
		<div className="flex items-center space-x-4">
			<div className="rounded-full bg-gray-200 h-12 w-12" />
			<div className="flex-1 space-y-2">
				<div className="h-4 bg-gray-200 rounded w-3/4" />
				<div className="h-3 bg-gray-200 rounded w-1/2" />
			</div>
		</div>
		<div className="mt-4 space-y-3">
			<div className="h-3 bg-gray-200 rounded" />
			<div className="h-3 bg-gray-200 rounded w-5/6" />
		</div>
	</div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
	rows = 5,
	cols = 4,
}) => (
	<div className="animate-pulse">
		{Array.from({ length: rows }).map((_, i) => (
			<div
				key={i}
				className="flex space-x-4 py-3 border-b border-gray-200"
			>
				{Array.from({ length: cols }).map((_, j) => (
					<div
						key={j}
						className={`h-4 bg-gray-200 rounded ${j === 0 ? 'w-1/4' : j === cols - 1 ? 'w-1/6' : 'flex-1'}`}
					/>
				))}
			</div>
		))}
	</div>
);
