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
					color: 'red'
				}}
			/>
		</Tooltip>
	),
	not_approved: (
		<Tooltip title="Waiting on approval">
			<Flaky
				sx={{
					color: 'brown'
				}}
			/>
		</Tooltip>
	),
	approved: (
		<Tooltip title="Approved">
			<ThumbUp
				sx={{
					color: 'green'
				}}
			/>
		</Tooltip>
	),
	unchecked: (
		<Tooltip title="Unchecked">
			<HourglassTop
				sx={{
					color: 'orange'
				}}
			/>
		</Tooltip>
	),
	mergeable: (
		<Tooltip title="Mergeable">
			<Merge
				sx={{
					color: 'green'
				}}
			/>
		</Tooltip>
	),
	conflict: (
		<Tooltip title="Conflict">
			<Merge
				sx={{
					color: 'red'
				}}
			/>
		</Tooltip>
	),
	need_rebase: (
		<Tooltip title="Need rebase">
			<ReportGmailerrorred
				sx={{
					color: 'orange'
				}}
			/>
		</Tooltip>
	),
	broken_status: (
		<Tooltip title="Broken Status">
			<HeartBroken
				sx={{
					color: 'grey'
				}}
			/>
		</Tooltip>
	),
	accepted: (
		<Tooltip title="Approved">
			<ThumbUp
				sx={{
					color: 'green'
				}}
			/>
		</Tooltip>
	),
	'needs-review': (
		<Tooltip title="Unchecked">
			<HourglassTop
				sx={{
					color: 'orange'
				}}
			/>
		</Tooltip>
	),
	'needs-revision': (
		<Tooltip title="Changes requested">
			<ThumbDown
				sx={{
					color: 'red'
				}}
			/>
		</Tooltip>
	),
	abandoned: (
		<Tooltip title="Abandoned">
			<FlightTakeoff
				sx={{
					color: 'purple'
				}}
			/>
		</Tooltip>
	)
}

export default mapStatusToIcon
