import React, { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export interface MoodEntry {
	date: string; // YYYY-MM-DD
	mood: 'Great' | 'Good' | 'Okay' | 'Struggling' | 'Anxious';
	emoji: string;
}

export interface MoodCalendarHeatmapProps {
	entries: MoodEntry[];
	days?: number; // How many days to show (default 90)
}

const MOOD_COLORS: Record<string, string> = {
	Great: 'bg-green-500',
	Good: 'bg-blue-400',
	Okay: 'bg-yellow-400',
	Struggling: 'bg-orange-400',
	Anxious: 'bg-red-400'
};

const MOOD_TEXT_COLORS: Record<string, string> = {
	Great: 'text-green-700',
	Good: 'text-blue-700',
	Okay: 'text-yellow-700',
	Struggling: 'text-orange-700',
	Anxious: 'text-red-700'
};

export const MoodCalendarHeatmap: React.FC<MoodCalendarHeatmapProps> = ({
	entries,
	days = 90
}) => {
	const heatmapData = useMemo(() => {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - days);

		const entriesMap = new Map(
			entries.map(e => [e.date, e])
		);

		const data: Array<{
			date: Date;
			dateStr: string;
			entry: MoodEntry | null;
			weekday: number;
			weekIndex: number;
		}> = [];

		const current = new Date(startDate);
		let weekIndex = 0;

		while (current <= endDate) {
			const dateStr = current.toISOString().split('T')[0];
			const weekday = current.getDay();

			if (weekday === 0 && data.length > 0) {
				weekIndex++;
			}

			data.push({
				date: new Date(current),
				dateStr,
				entry: entriesMap.get(dateStr) || null,
				weekday,
				weekIndex
			});

			current.setDate(current.getDate() + 1);
		}

		return data;
	}, [entries, days]);

	const weeks = useMemo(() => {
		const weekCount = Math.max(...heatmapData.map(d => d.weekIndex)) + 1;
		return Array.from({ length: weekCount }, (_, i) => i);
	}, [heatmapData]);

	const getCellForDay = (weekIndex: number, weekday: number) => {
		return heatmapData.find(d => d.weekIndex === weekIndex && d.weekday === weekday);
	};

	const monthLabels = useMemo(() => {
		const labels: Array<{ month: string; weekIndex: number }> = [];
		let lastMonth = -1;

		heatmapData.forEach(d => {
			const month = d.date.getMonth();
			if (month !== lastMonth && d.weekday === 0) {
				labels.push({
					month: d.date.toLocaleDateString('en-US', { month: 'short' }),
					weekIndex: d.weekIndex
				});
				lastMonth = month;
			}
		});

		return labels;
	}, [heatmapData]);

	const moodSummary = useMemo(() => {
		const summary: Record<string, number> = {};
		entries.forEach(e => {
			summary[e.mood] = (summary[e.mood] || 0) + 1;
		});
		return summary;
	}, [entries]);

	const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

	if (entries.length === 0) {
		return (
			<Card className="border-2 shadow-lg">
				<CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-b">
					<CardTitle className="text-lg font-semibold">Mood Calendar</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-12 space-y-3">
						<div className="p-4 bg-primary/5 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
							<span className="text-3xl">📅</span>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium">No mood check-ins yet</p>
							<p className="text-xs text-muted-foreground">Start tracking your daily mood to see patterns</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
			<CardHeader className="bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 border-b">
				<CardTitle className="text-lg font-semibold flex items-center gap-2">
					<span className="text-xl">📅</span>
					Mood Calendar
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 p-6">
				<div className="overflow-x-auto rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4">
					<div className="inline-block min-w-full">
						{/* Month labels */}
						<div className="flex gap-1 mb-3 pl-8">
							{monthLabels.map((label, idx) => (
								<div
									key={idx}
									className="text-xs font-semibold text-foreground/70 bg-primary/5 px-2 py-1 rounded"
									style={{ marginLeft: idx === 0 ? 0 : `${(label.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0)) * 16 - 32}px` }}
								>
									{label.month}
								</div>
							))}
						</div>

						{/* Heatmap grid */}
						<div className="flex gap-1">
							{/* Weekday labels */}
							<div className="flex flex-col gap-1 pr-3">
								{weekdays.map((day, idx) => (
									<div
										key={idx}
										className="w-5 h-4 flex items-center justify-center text-xs font-medium text-muted-foreground"
									>
										{day}
									</div>
								))}
							</div>

							{/* Calendar cells */}
							{weeks.map(weekIndex => (
								<div key={weekIndex} className="flex flex-col gap-1">
									{[0, 1, 2, 3, 4, 5, 6].map(weekday => {
										const cell = getCellForDay(weekIndex, weekday);
										if (!cell) {
											return (
												<div
													key={weekday}
													className="w-4 h-4"
												/>
											);
										}

										const hasEntry = cell.entry !== null;
										const mood = cell.entry?.mood;

										return (
											<div
												key={weekday}
												className={`
													w-4 h-4 rounded-md shadow-sm
													${hasEntry && mood ? MOOD_COLORS[mood] : 'bg-muted/40 border border-muted-foreground/10'}
													hover:scale-150 hover:z-10 hover:shadow-lg cursor-pointer
													transition-all duration-200 relative
													${hasEntry && mood ? 'hover:brightness-110' : ''}
												`}
												title={hasEntry && cell.entry ? `${cell.dateStr}: ${cell.entry.emoji} ${cell.entry.mood}` : cell.dateStr}
											/>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Legend */}
				<div className="flex items-center justify-between pt-4 border-t-2">
					<div className="flex items-center gap-3 text-sm">
						<span className="font-medium text-muted-foreground">Less</span>
						<div className="flex gap-1.5">
							<div className="w-4 h-4 bg-muted/40 border border-muted-foreground/10 rounded-md shadow-sm" />
							<div className="w-4 h-4 bg-red-400 rounded-md shadow-sm" />
							<div className="w-4 h-4 bg-orange-400 rounded-md shadow-sm" />
							<div className="w-4 h-4 bg-yellow-400 rounded-md shadow-sm" />
							<div className="w-4 h-4 bg-blue-400 rounded-md shadow-sm" />
							<div className="w-4 h-4 bg-green-500 rounded-md shadow-sm" />
						</div>
						<span className="font-medium text-muted-foreground">More positive</span>
					</div>
				</div>

				{/* Mood summary */}
				{Object.keys(moodSummary).length > 0 && (
					<div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-4">
						{Object.entries(moodSummary)
							.sort((a, b) => {
								const order = ['Great', 'Good', 'Okay', 'Struggling', 'Anxious'];
								return order.indexOf(a[0]) - order.indexOf(b[0]);
							})
							.map(([mood, count]) => (
								<div key={mood} className="text-center p-3 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted-foreground/10 hover:border-primary/30 transition-colors">
									<div className={`text-2xl font-bold ${MOOD_TEXT_COLORS[mood]}`}>
										{count}
									</div>
									<div className="text-xs font-medium text-muted-foreground mt-1">{mood}</div>
								</div>
							))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
