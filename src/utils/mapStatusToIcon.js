import {
	ThumbDown,
	ThumbUp,
	Merge,
	HeartBroken,
	Flaky,
	ReportGmailerrorred,
	FlightTakeoff,
	HourglassTop
} from '@mui/icons-material'
import { Tooltip } from '@mui/material'

const mapStatusToIcon = {
	requested_changes: (
		<Tooltip title="Changes requested">
			<ThumbDown
				sx={{
					color: 'red',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	not_approved: (
		<Tooltip title="Waiting on approval">
			<Flaky
				sx={{
					color: 'brown',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	approved: (
		<Tooltip title="Approved">
			<ThumbUp
				sx={{
					color: 'green',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	unchecked: (
		<Tooltip title="Unchecked">
			<HourglassTop
				sx={{
					color: 'orange',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	mergeable: (
		<Tooltip title="Mergeable">
			<Merge
				sx={{
					color: 'green',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	conflict: (
		<Tooltip title="Conflict">
			<Merge
				sx={{
					color: 'red',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	need_rebase: (
		<Tooltip title="Need rebase">
			<ReportGmailerrorred
				sx={{
					color: 'orange',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	broken_status: (
		<Tooltip title="Broken Status">
			<HeartBroken
				sx={{
					color: 'grey',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	accepted: (
		<Tooltip title="Approved">
			<ThumbUp
				sx={{
					color: 'green',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	'needs-review': (
		<Tooltip title="Unchecked">
			<HourglassTop
				sx={{
					color: 'orange',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	'needs-revision': (
		<Tooltip title="Changes requested">
			<ThumbDown
				sx={{
					color: 'red',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	),
	abandoned: (
		<Tooltip title="Abandoned">
			<FlightTakeoff
				sx={{
					color: 'purple',
					position: 'relative',
					top: '15%'
				}}
			/>
		</Tooltip>
	)
}

export default mapStatusToIcon
