import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@mui/x-data-grid'
import {
	Alert,
	Container,
	FormControl,
	IconButton,
	MenuItem,
	Select,
	Tooltip,
	Checkbox,
	FormControlLabel,
	InputLabel,
	Link,
	Grid,
	Button,
	Box
} from '@mui/material'
import DraftsIcon from '@mui/icons-material/HourglassTop'
import { Star } from '@mui/icons-material'
import PropTypes from 'prop-types'
import mapStatusToIcon from '../utils/mapStatusToIcon.js'

const formatDate = (date) => {
	const isDateToday = (date) => {
		const today = new Date()
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		)
	}
	if (isDateToday(date)) {
		const options = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}
		return date.toLocaleTimeString(undefined, options)
	}
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
	return new Date(date).toLocaleDateString(undefined, options)
}

const RevisionsDataGrid = ({ revisions, isFetching }) => {
	const navigate = useNavigate()
	const [filterModel, setFilterModel] = useState(() => {
		const savedFilterModel = localStorage.getItem('dataGridFilterModel')
		try {
			return savedFilterModel
				? JSON.parse(savedFilterModel)
				: { items: [] }
		} catch (error) {
			console.error('Error parsing filterModel:', error)
			return { items: [] }
		}
	})
	const [filters, setFilters] = useState(() => {
		const saved = localStorage.getItem('revisionListFilters')
		const defaultFilters = {
			status: '',
			title: '',
			author: 'All',
			project: 'All',
			isDraft: false
		}
		try {
			return saved ? JSON.parse(saved) : defaultFilters
		} catch (e) {
			console.error('Error parsing saved filters', e)
			return defaultFilters
		}
	})
	// eslint-disable-next-line no-unused-vars
	const [userGroups, setUserGroups] = useState(() => {
		const savedUserGroups = localStorage.getItem('userGroups')
		try {
			return savedUserGroups ? JSON.parse(savedUserGroups) : []
		} catch (error) {
			console.error('Error parsing userGroups:', error)
			return []
		}
	})
	// eslint-disable-next-line no-unused-vars
	const [projectGroups, setProjectGroups] = useState(() => {
		const savedProjectGroups = localStorage.getItem('projectGroups')
		try {
			return savedProjectGroups ? JSON.parse(savedProjectGroups) : []
		} catch (error) {
			console.error('Error parsing projectGroups:', error)
			return []
		}
	})
	const [groupFilters, setGroupFilters] = useState(() => {
		const saved = localStorage.getItem('revisionListGroupFilters')
		const defaultGroupFilters = {
			userGroups: 'None',
			projectGroups: []
		} // userGroups should be 'None' initially based on MenuItem value
		try {
			const parsed = saved ? JSON.parse(saved) : defaultGroupFilters
			// Ensure userGroups is compatible with Select (string, not array if single value)
			if (
				Array.isArray(parsed.userGroups) &&
				parsed.userGroups.length <= 1
			) {
				parsed.userGroups = parsed.userGroups[0] || 'None'
			} else if (
				Array.isArray(parsed.userGroups) &&
				parsed.userGroups.length > 1
			) {
				// If multiple were saved somehow, reset to 'None' as the Select doesn't support multiple
				parsed.userGroups = 'None'
			}
			return parsed
		} catch (e) {
			console.error('Error parsing saved group filters', e)
			return defaultGroupFilters
		}
	})
	const [projects, setProjects] = useState(['All'])
	const [authors, setAuthors] = useState(['All'])
	const [filteredRevisions, setFilteredRevisions] = useState(
		Array.isArray(revisions) ? revisions : []
	)

	useEffect(() => {
		const validRevisions = Array.isArray(revisions) ? revisions : []
		// setFilteredRevisions(validRevisions); // Initial set removed, applyFilters handles it

		if (validRevisions && validRevisions.length > 0) {
			const allProjects = validRevisions
				.flat()
				.map((revision) => revision.project)
				.sort()
			const uniqueProjects = ['All', ...new Set(allProjects)]
			setProjects(uniqueProjects)

			const allAuthors = validRevisions
				.flat()
				.map((revision) => revision.author)
				.sort()
			const uniqueAuthors = ['All', ...new Set(allAuthors)]
			setAuthors(uniqueAuthors)

			// Apply the initially loaded filters (from localStorage or defaults)
			applyFilters(validRevisions, filters, groupFilters)
		} else {
			setFilteredRevisions([]) // Ensure it's empty if revisions are empty/invalid
			setProjects(['All'])
			setAuthors(['All'])
		}
		// Dependencies: revisions, filters, groupFilters to re-apply if initial state changes?
		// Let's only depend on revisions for now, as filters are applied via handlers.
	}, [revisions]) // Keep dependency only on revisions for setting options and initial filter application

	const applyFilters = (
		baseRevisions,
		currentFilters,
		currentGroupFilters
	) => {
		const validRevisions = Array.isArray(baseRevisions) ? baseRevisions : []
		let filtered = validRevisions.flat()

		// Apply standard filters
		filtered = filtered.filter((revision) => {
			const matchesStatus =
				!currentFilters.status ||
				revision.status === currentFilters.status
			const matchesTitle =
				!currentFilters.title ||
				revision.title
					.toLowerCase()
					.includes(currentFilters.title.toLowerCase())
			const matchesAuthor =
				!currentFilters.author ||
				currentFilters.author === 'All' ||
				revision.author
					.toLowerCase()
					.includes(currentFilters.author.toLowerCase())
			const matchesProject =
				currentFilters.project === 'All' ||
				revision.project === currentFilters.project
			const matchesIsDraft =
				!currentFilters.isDraft ||
				revision.isDraft === currentFilters.isDraft
			return (
				matchesStatus &&
				matchesTitle &&
				matchesAuthor &&
				matchesProject &&
				matchesIsDraft
			)
		})

		// Apply user group filters
		if (
			currentGroupFilters.userGroups &&
			currentGroupFilters.userGroups !== 'None'
		) {
			const validUserGroups = Array.isArray(userGroups) ? userGroups : []
			const selectedGroup = validUserGroups.find(
				(group) => group.name === currentGroupFilters.userGroups
			)
			if (selectedGroup) {
				const groupUsers = Array.isArray(selectedGroup.users)
					? selectedGroup.users
					: []
				filtered = filtered.filter((revision) =>
					groupUsers.includes(revision.author)
				)
			} else {
				console.error(
					'Selected group not found in applyFilters:',
					currentGroupFilters.userGroups
				)
			}
		}

		// Apply project group filters (if implemented later)
		// ...

		console.log('Filtered revisions (applyFilters):', filtered)
		setFilteredRevisions(filtered)
	}

	const handleFiltersChange = (newFilters) => {
		console.log('New filters:', newFilters)
		setFilters(newFilters)
		localStorage.setItem('revisionListFilters', JSON.stringify(newFilters)) // Save here
		applyFilters(revisions, newFilters, groupFilters) // Apply immediately

		/* // Remove old filtering logic from here
		const validRevisions = Array.isArray(revisions) ? revisions : []
		const newRevisions = validRevisions.flat().filter((revision) => {
			const matchesStatus =
				!newFilters.status || revision.status === newFilters.status
			const matchesTitle =
				!newFilters.title ||
				revision.title
					.toLowerCase()
					.includes(newFilters.title.toLowerCase())
			const matchesAuthor =
				!newFilters.author ||
				newFilters.author === 'All' ||
				revision.author
					.toLowerCase()
					.includes(newFilters.author.toLowerCase())
			const matchesProject =
				newFilters.project === 'All' ||
				revision.project === newFilters.project
			const matchesIsDraft =
				!newFilters.isDraft || revision.isDraft === newFilters.isDraft

			return (
				matchesStatus &&
				matchesTitle &&
				matchesAuthor &&
				matchesProject &&
				matchesIsDraft
			)
		})

		console.log('Filtered revisions:', newRevisions)
		setFilteredRevisions(newRevisions)
		*/
	}

	const handleSetUserGroupFilters = (newGroupFilters) => {
		setGroupFilters(newGroupFilters)
		localStorage.setItem(
			'revisionListGroupFilters',
			JSON.stringify(newGroupFilters)
		) // Save here
		console.log('New group filters:', newGroupFilters)
		applyFilters(revisions, filters, newGroupFilters)
	}

	const handleFilterModelChange = (newFilterModel) => {
		setFilterModel(newFilterModel)
		localStorage.setItem(
			'dataGridFilterModel',
			JSON.stringify(newFilterModel)
		)
	}

	const safeFilteredRevisions = Array.isArray(filteredRevisions)
		? filteredRevisions
		: []
	const rows = safeFilteredRevisions.flat().map((revision) => ({
		id: revision.id,
		title: revision.title,
		status: revision.status,
		url: revision.url,
		author: revision.author,
		dateModified: revision.dateModified,
		isDraft: revision.isDraft,
		project: revision.project,
		projectUrl: revision.projectUrl,
		projectId: revision.projectId,
		color: revision.color,
		iid: revision.iid || '',
		jiraId: revision.jiraId,
		following: revision.following,
		source: revision.source
	}))

	const columns = [
		{
			field: 'status',
			headerName: '',
			width: 50,
			renderCell: (cellValues) => {
				const getColorCode = (colorName) => {
					switch (colorName) {
						case 'blue':
							return '#a0d4f2'
						case 'orange':
							return '#f2caa0'
						case 'yellow':
							return '#fff9c4'
						case 'git-green':
							return '#bdde87'
						case 'phab-green':
							return '#92debe'
						default:
							return 'transparent'
					}
				}
				const bgColor = getColorCode(cellValues.row.color)

				return (
					<Box
						sx={{
							width: '100%',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: bgColor
						}}
					>
						<IconButton size="small">
							{mapStatusToIcon[cellValues.row.status]}
						</IconButton>
					</Box>
				)
			}
		},
		{
			field: 'ID',
			renderCell: (cellValues) => (
				<Link href={`${cellValues.row.url}`}>{cellValues.row.id}</Link>
			)
		},
		{
			field: 'title',
			headerName: 'Title',
			width: 500,
			renderCell: (cellValues) => {
				const handleTitleClick = (event) => {
					event.stopPropagation()
					navigate(
						`/detail/${cellValues.row.source}/${cellValues.row.id}`,
						{
							state: { revision: cellValues.row }
						}
					)
				}

				return (
					<Button
						variant="text"
						onClick={handleTitleClick}
						sx={{
							padding: 0,
							margin: 0,
							textAlign: 'left',
							textTransform: 'none',
							justifyContent: 'flex-start'
						}}
					>
						{cellValues.row.isDraft && (
							<Tooltip title="This is a draft">
								<DraftsIcon
									sx={{
										color: 'text.secondary',
										marginRight: 1,
										verticalAlign: 'middle'
									}}
								/>
							</Tooltip>
						)}
						{cellValues.row.title}
					</Button>
				)
			}
		},
		{
			field: 'author',
			headerName: 'Author',
			width: 200,
			renderCell: (cellValues) => {
				if (cellValues.row.following) {
					return (
						<>
							<b>{cellValues.row.author} </b>
							<Tooltip title="Following">
								<Star
									sx={{
										color: 'yellow',
										position: 'relative',
										top: '15%'
									}}
								/>
							</Tooltip>
						</>
					)
				}
				return cellValues.row.author
			}
		},
		{
			field: 'dateModified',
			headerName: 'Date Modified',
			width: 150,
			renderCell: (cellValues) => {
				const date = new Date(cellValues.row.dateModified)
				return formatDate(date)
			}
		},
		{
			field: 'Project',
			renderCell: (cellValues) => (
				<Link href={`${cellValues.row.projectUrl}`}>
					{cellValues.row.project}
				</Link>
			),
			width: 200
		},
		{
			field: 'Jira ID',
			headerName: 'Jira ID',
			width: 150,
			renderCell: (cellValues) => {
				if (cellValues.row.jiraId) {
					return (
						<Link
							href={`https://emplifi.atlassian.net/browse/${cellValues.row.jiraId}`}
						>
							{cellValues.row.jiraId}
						</Link>
					)
				}
				return 'No Jira ID'
			}
		}
	]

	const hasRevisionsToShow = safeFilteredRevisions.flat().length > 0

	return (
		<div data-testid="revisions-list">
			<Container maxWidth={false}>
				<Grid
					container
					spacing={2}
					sx={{
						mb: 2,
						alignItems: 'center',
						justifyContent: 'flex-start',
						marginTop: '20px'
					}}
				>
					<Grid item xs sx={{ minWidth: 200, mr: 2 }}>
						<FormControl fullWidth>
							<InputLabel id="project-filter-label">
								{' '}
								Project{' '}
							</InputLabel>
							<Select
								labelId="project-filter-label"
								id="project-filter-select"
								value={filters.project}
								onChange={(e) =>
									handleFiltersChange({
										...filters,
										project: e.target.value
									})
								}
								displayEmpty
								label="Project"
							>
								{projects.map((project, index) => (
									<MenuItem key={index} value={project}>
										{project}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Grid>

					<Grid item xs sx={{ minWidth: 200, mr: 2 }}>
						<FormControl fullWidth>
							<InputLabel id="author-filter-label">
								{' '}
								Author{' '}
							</InputLabel>
							<Select
								labelId="author-filter-label"
								id="author-filter-select"
								value={filters.author}
								onChange={(e) =>
									handleFiltersChange({
										...filters,
										author: e.target.value
									})
								}
								label="Author"
							>
								{authors.map((author, index) => (
									<MenuItem key={index} value={author}>
										{author}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Grid>

					<Grid item xs>
						<FormControlLabel
							control={
								<Checkbox
									id="draft-filter-checkbox"
									checked={filters.isDraft}
									onChange={(e) =>
										handleFiltersChange({
											...filters,
											isDraft: e.target.checked
										})
									}
								/>
							}
							label="Draft"
							labelPlacement="end"
							htmlFor="draft-filter-checkbox"
						/>
					</Grid>
				</Grid>
				<Grid
					container
					spacing={2}
					sx={{
						mb: 2,
						alignItems: 'center',
						justifyContent: 'flex-start'
					}}
				>
					<FormControl sx={{ minWidth: 200, mr: 2 }}>
						<InputLabel id="user-group-filter-label">
							{' '}
							User group{' '}
						</InputLabel>
						<Select
							labelId="user-group-filter-label"
							id="user-group-filter-select"
							value={groupFilters.userGroups}
							onChange={(e) => {
								console.log(
									'Selected user group:',
									e.target.value
								)
								handleSetUserGroupFilters({
									...groupFilters,
									userGroups: e.target.value
								})
							}}
							displayEmpty
							label="User group"
						>
							<MenuItem value="None">None</MenuItem>
							{userGroups.map((group, index) => (
								<MenuItem key={index} value={group.name}>
									{group.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>

				{(!revisions ||
					revisions.length === 0 ||
					!hasRevisionsToShow) &&
					!isFetching && (
						<Alert severity="info" color="warning">
							No revisions found
						</Alert>
					)}
				{hasRevisionsToShow && (
					<DataGrid
						rows={rows}
						columns={columns}
						filterModel={filterModel}
						onFilterModelChange={handleFilterModelChange}
						sx={
							{
								/*
							'& .row-color-blue': {
								backgroundColor: '#a0d4f2'
							},
							'& .row-color-orange': {
								backgroundColor: '#f2caa0'
							},
							'& .row-color-yellow': {
								backgroundColor: '#fff9c4'
							},
							'& .row-color-git-green': {
								backgroundColor: '#bdde87'
							},
							'& .row-color-phab-green': {
								backgroundColor: '#92debe'
							}
							*/
							}
						}
					/>
				)}
			</Container>
		</div>
	)
}

RevisionsDataGrid.propTypes = {
	revisions: PropTypes.array.isRequired,
	isFetching: PropTypes.bool.isRequired
}

export default RevisionsDataGrid
