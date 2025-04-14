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
	Grid
} from '@mui/material'
import DraftsIcon from '@mui/icons-material/HourglassTop'
import { Star } from '@mui/icons-material'
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
	const [filters, setFilters] = useState({
		status: '',
		title: '',
		author: 'All',
		project: 'All',
		isDraft: false
	})
	const [userGroups, setUserGroups] = useState(() => {
		const savedUserGroups = localStorage.getItem('userGroups')
		try {
			return savedUserGroups ? JSON.parse(savedUserGroups) : []
		} catch (error) {
			console.error('Error parsing userGroups:', error)
			return []
		}
	})
	const [projectGroups, setProjectGroups] = useState(() => {
		const savedProjectGroups = localStorage.getItem('projectGroups')
		try {
			return savedProjectGroups ? JSON.parse(savedProjectGroups) : []
		} catch (error) {
			console.error('Error parsing projectGroups:', error)
			return []
		}
	})
	const [groupFilters, setGroupFilters] = useState({
		userGroups: ['None'],
		projectGroups: []
	})
	const [projects, setProjects] = useState(['All'])
	const [authors, setAuthors] = useState(['All'])
	const [filteredRevisions, setFilteredRevisions] = useState(
		Array.isArray(revisions) ? revisions : []
	)

	useEffect(() => {
		const validRevisions = Array.isArray(revisions) ? revisions : []
		setFilteredRevisions(validRevisions)

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
		}
	}, [revisions])

	const handleFiltersChange = (newFilters) => {
		console.log('New filters:', newFilters)
		setFilters(newFilters)

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
	}

	const handleSetUserGroupFilters = (newGroupFilters) => {
		setGroupFilters(newGroupFilters)
		console.log('New group filters:', newGroupFilters)

		const validRevisions = Array.isArray(revisions) ? revisions : []

		if (
			newGroupFilters.userGroups === 'None' ||
			!newGroupFilters.userGroups ||
			newGroupFilters.userGroups.length === 0
		) {
			setFilteredRevisions(validRevisions.flat())
			return
		}

		const validUserGroups = Array.isArray(userGroups) ? userGroups : []
		const selectedGroup = validUserGroups.find(
			(group) => group.name === newGroupFilters.userGroups
		)

		if (!selectedGroup) {
			console.error(
				'Selected group not found:',
				newGroupFilters.userGroups
			)
			setFilteredRevisions(validRevisions.flat())
			return
		}

		console.log('User group authors:', selectedGroup.users)

		const groupUsers = Array.isArray(selectedGroup.users)
			? selectedGroup.users
			: []
		const newFilteredRevisions = validRevisions
			.flat()
			.filter((revision) => groupUsers.includes(revision.author))

		setFilteredRevisions(newFilteredRevisions)
	}

	const handleRowClick = (params) => {
		console.log(params)
		navigate(`/detail/${params.row.source}/${params.row.id}`, {
			state: { revision: params.row }
		})
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
				return (
					<IconButton disabled={true}>
						{mapStatusToIcon[cellValues.row.status]}
					</IconButton>
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
				if (cellValues.row.isDraft) {
					return (
						<>
							<Tooltip title="This is a draft">
								<DraftsIcon
									sx={{
										color: 'white',
										position: 'relative',
										top: '15%'
									}}
								/>
							</Tooltip>
							{cellValues.row.title}
						</>
					)
				}
				return cellValues.row.title
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

	const handleFilterModelChange = (newFilterModel) => {
		setFilterModel(newFilterModel)
		localStorage.setItem(
			'dataGridFilterModel',
			JSON.stringify(newFilterModel)
		)
	}

	const hasRevisionsToShow = safeFilteredRevisions.flat().length > 0

	return (
		<div data-testid="revisions-list">
			{!isFetching && !hasRevisionsToShow && (
				<Alert severity="info" color="warning">
					No revisions found
				</Alert>
			)}
			{hasRevisionsToShow && (
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

					<DataGrid
						rows={rows}
						columns={columns}
						filterModel={filterModel}
						onFilterModelChange={handleFilterModelChange}
						onRowClick={handleRowClick}
						getRowClassName={(params) =>
							`row-color-${params.row.color}`
						}
						sx={{
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
						}}
					/>
				</Container>
			)}
		</div>
	)
}

export default RevisionsDataGrid
